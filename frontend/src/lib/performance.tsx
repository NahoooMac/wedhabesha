import React from 'react';

// Performance monitoring utilities

// Web Vitals tracking
export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Performance observer for monitoring
class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Monitor Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry;
          this.metrics.set('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Monitor First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.set('FID', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Monitor Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.set('CLS', clsValue);
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // Monitor resource loading
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              this.trackResourceTiming(resourceEntry);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource observer not supported');
      }
    }
  }

  private trackResourceTiming(entry: PerformanceResourceTiming) {
    const duration = entry.responseEnd - entry.startTime;
    const resourceType = this.getResourceType(entry.name);
    
    // Track slow resources
    if (duration > 1000) { // Resources taking more than 1 second
      console.warn(`Slow resource detected: ${entry.name} (${duration.toFixed(2)}ms)`);
    }

    // Update metrics
    const currentSlowest = this.metrics.get(`slowest_${resourceType}`) || 0;
    if (duration > currentSlowest) {
      this.metrics.set(`slowest_${resourceType}`, duration);
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  // Get current metrics
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  // Mark custom performance points
  mark(name: string) {
    if ('performance' in window && performance.mark) {
      performance.mark(name);
    }
  }

  // Measure between two marks
  measure(name: string, startMark: string, endMark?: string) {
    if ('performance' in window && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        this.metrics.set(name, measure.duration);
        return measure.duration;
      } catch (e) {
        console.warn(`Failed to measure ${name}:`, e);
      }
    }
    return 0;
  }

  // Public method to set metrics (for use in hooks)
  setMetric(name: string, value: number) {
    this.metrics.set(name, value);
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Bundle size analyzer
export function analyzeBundleSize() {
  if ('performance' in window && performance.getEntriesByType) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    const totalJSSize = jsResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);
    
    const totalCSSSize = cssResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);

    return {
      totalJS: totalJSSize,
      totalCSS: totalCSSSize,
      jsFiles: jsResources.length,
      cssFiles: cssResources.length,
      largestJS: Math.max(...jsResources.map(r => r.transferSize || 0)),
      largestCSS: Math.max(...cssResources.map(r => r.transferSize || 0)),
    };
  }
  
  return null;
}

// Memory usage monitoring
export function getMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    };
  }
  return null;
}

// React component performance wrapper
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.forwardRef<any, P>((props, ref) => {
    React.useEffect(() => {
      performanceMonitor.mark(`${componentName}_mount_start`);
      
      return () => {
        performanceMonitor.mark(`${componentName}_unmount`);
        performanceMonitor.measure(
          `${componentName}_lifecycle`,
          `${componentName}_mount_start`,
          `${componentName}_unmount`
        );
      };
    }, []);

    React.useLayoutEffect(() => {
      performanceMonitor.mark(`${componentName}_mount_end`);
      performanceMonitor.measure(
        `${componentName}_mount_time`,
        `${componentName}_mount_start`,
        `${componentName}_mount_end`
      );
    });

    return <Component {...(props as any)} ref={ref} />;
  });
}

// Hook for tracking render performance
export function useRenderTracking(componentName: string, dependencies: any[] = []) {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(Date.now());

  React.useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (renderCount.current > 1) {
      performanceMonitor.setMetric(
        `${componentName}_render_interval`,
        timeSinceLastRender
      );
    }

    // Warn about excessive re-renders
    if (renderCount.current > 10 && timeSinceLastRender < 100) {
      console.warn(
        `${componentName} is re-rendering frequently (${renderCount.current} times, last interval: ${timeSinceLastRender}ms)`
      );
    }
  }, dependencies);

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
  };
}

// Performance budget checker
export interface PerformanceBudget {
  LCP: number; // Largest Contentful Paint (ms)
  FID: number; // First Input Delay (ms)
  CLS: number; // Cumulative Layout Shift
  bundleSize: number; // Total bundle size (bytes)
  apiResponseTime: number; // Average API response time (ms)
}

const DEFAULT_BUDGET: PerformanceBudget = {
  LCP: 2500, // 2.5 seconds
  FID: 100,  // 100ms
  CLS: 0.1,  // 0.1
  bundleSize: 1024 * 1024, // 1MB
  apiResponseTime: 500, // 500ms
};

export function checkPerformanceBudget(budget: Partial<PerformanceBudget> = {}) {
  const fullBudget = { ...DEFAULT_BUDGET, ...budget };
  const metrics = performanceMonitor.getMetrics();
  const bundleInfo = analyzeBundleSize();
  
  const results = {
    LCP: {
      value: metrics.LCP || 0,
      budget: fullBudget.LCP,
      passed: (metrics.LCP || 0) <= fullBudget.LCP,
    },
    FID: {
      value: metrics.FID || 0,
      budget: fullBudget.FID,
      passed: (metrics.FID || 0) <= fullBudget.FID,
    },
    CLS: {
      value: metrics.CLS || 0,
      budget: fullBudget.CLS,
      passed: (metrics.CLS || 0) <= fullBudget.CLS,
    },
    bundleSize: {
      value: bundleInfo ? bundleInfo.totalJS + bundleInfo.totalCSS : 0,
      budget: fullBudget.bundleSize,
      passed: bundleInfo ? (bundleInfo.totalJS + bundleInfo.totalCSS) <= fullBudget.bundleSize : true,
    },
  };

  const allPassed = Object.values(results).every(result => result.passed);
  
  if (!allPassed) {
    console.warn('Performance budget exceeded:', results);
  }

  return {
    passed: allPassed,
    results,
  };
}

// Cleanup function
export function cleanupPerformanceMonitoring() {
  performanceMonitor.disconnect();
}