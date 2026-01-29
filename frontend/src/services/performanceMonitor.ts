/**
 * Performance Monitoring Service
 * Tracks component render times, API calls, and resource loading
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  type: 'render' | 'api' | 'resource';
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 100;
  private readonly SLOW_THRESHOLD = 3000; // 3 seconds

  /**
   * Mark the start of a performance measurement
   */
  public startMeasure(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * Mark the end of a performance measurement and record the metric
   */
  public endMeasure(
    name: string,
    type: 'render' | 'api' | 'resource' = 'render',
    metadata?: Record<string, any>
  ): number | null {
    if (typeof performance === 'undefined') return null;

    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      const duration = measure?.duration || 0;

      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        type,
        metadata,
      });

      // Warn about slow operations
      if (duration > this.SLOW_THRESHOLD) {
        console.warn(`⚠️ Slow ${type}: ${name} took ${duration.toFixed(2)}ms`);
      }

      // Cleanup
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);

      return duration;
    } catch (error) {
      console.error('Performance measurement error:', error);
      return null;
    }
  }

  /**
   * Record a metric without using performance API
   */
  public recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Get all recorded metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by type
   */
  public getMetricsByType(type: 'render' | 'api' | 'resource'): PerformanceMetric[] {
    return this.metrics.filter(m => m.type === type);
  }

  /**
   * Get average duration for a specific metric name
   */
  public getAverageDuration(name: string): number {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / relevantMetrics.length;
  }

  /**
   * Get slow metrics (above threshold)
   */
  public getSlowMetrics(threshold: number = this.SLOW_THRESHOLD): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Generate performance report
   */
  public generateReport(): {
    totalMetrics: number;
    averageRenderTime: number;
    averageApiTime: number;
    slowOperations: PerformanceMetric[];
  } {
    const renderMetrics = this.getMetricsByType('render');
    const apiMetrics = this.getMetricsByType('api');

    const avgRender = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.duration, 0) / renderMetrics.length
      : 0;

    const avgApi = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length
      : 0;

    return {
      totalMetrics: this.metrics.length,
      averageRenderTime: avgRender,
      averageApiTime: avgApi,
      slowOperations: this.getSlowMetrics(),
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook for measuring component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const renderTime = Date.now() - startTime.current;
    performanceMonitor.recordMetric({
      name: componentName,
      duration: renderTime,
      timestamp: Date.now(),
      type: 'render',
    });
  });

  return {
    startMeasure: (name: string) => performanceMonitor.startMeasure(name),
    endMeasure: (name: string, type?: 'render' | 'api' | 'resource', metadata?: Record<string, any>) =>
      performanceMonitor.endMeasure(name, type, metadata),
  };
}

// Import React for the hook
import React from 'react';
