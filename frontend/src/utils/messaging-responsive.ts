/**
 * @fileoverview Messaging Responsive Utilities
 * 
 * Unified responsive system for messaging components to ensure consistent
 * mobile behavior across both Couple Dashboard and Vendor Portal interfaces.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Features:
 * - Consistent breakpoint definitions
 * - Mobile detection utilities
 * - Responsive layout configurations
 * - Touch target size helpers
 * - Viewport utilities
 * 
 * Requirements satisfied:
 * - 1.3, 5.1, 5.2, 5.4, 5.5: Mobile Responsiveness
 */

/**
 * Breakpoint definitions matching CSS design tokens
 */
export const MESSAGING_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Mobile layout configuration interface
 */
export interface MobileLayoutConfig {
  showThreadList: boolean;
  showMessageView: boolean;
  selectedThread: string | null;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Touch target size constants for accessibility
 */
export const TOUCH_TARGET_SIZES = {
  minimum: 44, // iOS/Android minimum recommended touch target size
  comfortable: 48, // More comfortable touch target size
  large: 56, // Large touch target for primary actions
} as const;

/**
 * Responsive layout modes
 */
export type ResponsiveLayoutMode = 'mobile' | 'tablet' | 'desktop';

/**
 * Get current viewport width
 */
export const getViewportWidth = (): number => {
  if (typeof window === 'undefined') return 1024; // Default for SSR
  return window.innerWidth;
};

/**
 * Get current viewport height
 */
export const getViewportHeight = (): number => {
  if (typeof window === 'undefined') return 768; // Default for SSR
  return window.innerHeight;
};

/**
 * Check if current viewport is mobile
 */
export const isMobile = (): boolean => {
  return getViewportWidth() < MESSAGING_BREAKPOINTS.md;
};

/**
 * Check if current viewport is tablet
 */
export const isTablet = (): boolean => {
  const width = getViewportWidth();
  return width >= MESSAGING_BREAKPOINTS.md && width < MESSAGING_BREAKPOINTS.lg;
};

/**
 * Check if current viewport is desktop
 */
export const isDesktop = (): boolean => {
  return getViewportWidth() >= MESSAGING_BREAKPOINTS.lg;
};

/**
 * Get current responsive layout mode
 */
export const getResponsiveLayoutMode = (): ResponsiveLayoutMode => {
  const width = getViewportWidth();
  
  if (width < MESSAGING_BREAKPOINTS.md) {
    return 'mobile';
  } else if (width < MESSAGING_BREAKPOINTS.lg) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

/**
 * Check if device is likely a mobile device based on user agent
 */
export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Get optimal touch target size based on device and context
 */
export const getOptimalTouchTargetSize = (
  context: 'primary' | 'secondary' | 'icon' = 'secondary'
): number => {
  if (!isTouchDevice()) {
    // Non-touch devices can use smaller targets
    return context === 'icon' ? 32 : 36;
  }
  
  switch (context) {
    case 'primary':
      return TOUCH_TARGET_SIZES.large;
    case 'secondary':
      return TOUCH_TARGET_SIZES.comfortable;
    case 'icon':
      return TOUCH_TARGET_SIZES.minimum;
    default:
      return TOUCH_TARGET_SIZES.comfortable;
  }
};

/**
 * Create mobile layout configuration
 */
export const createMobileLayoutConfig = (
  selectedThreadId?: string | null
): MobileLayoutConfig => {
  const layoutMode = getResponsiveLayoutMode();
  
  return {
    showThreadList: layoutMode !== 'mobile' || !selectedThreadId,
    showMessageView: layoutMode !== 'mobile' || !!selectedThreadId,
    selectedThread: selectedThreadId || null,
    isMobile: layoutMode === 'mobile',
    isTablet: layoutMode === 'tablet',
    isDesktop: layoutMode === 'desktop',
  };
};

/**
 * Get responsive padding based on viewport
 */
export const getResponsivePadding = (): string => {
  const layoutMode = getResponsiveLayoutMode();
  
  switch (layoutMode) {
    case 'mobile':
      return 'var(--messaging-space-3)'; // 12px
    case 'tablet':
      return 'var(--messaging-space-4)'; // 16px
    case 'desktop':
      return 'var(--messaging-space-6)'; // 24px
    default:
      return 'var(--messaging-space-4)';
  }
};

/**
 * Get responsive font size based on viewport
 */
export const getResponsiveFontSize = (
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' = 'base'
): string => {
  const layoutMode = getResponsiveLayoutMode();
  const isMobileLayout = layoutMode === 'mobile';
  
  // Slightly larger fonts on mobile for better readability
  const sizeMap = {
    xs: isMobileLayout ? 'var(--messaging-font-size-sm)' : 'var(--messaging-font-size-xs)',
    sm: isMobileLayout ? 'var(--messaging-font-size-base)' : 'var(--messaging-font-size-sm)',
    base: 'var(--messaging-font-size-base)',
    lg: 'var(--messaging-font-size-lg)',
    xl: 'var(--messaging-font-size-xl)',
  };
  
  return sizeMap[size];
};

/**
 * Get responsive grid columns for thread list
 */
export const getThreadListColumns = (): number => {
  const layoutMode = getResponsiveLayoutMode();
  
  switch (layoutMode) {
    case 'mobile':
      return 1; // Full width on mobile
    case 'tablet':
      return 1; // Still full width on tablet for better UX
    case 'desktop':
      return 1; // Thread list is always single column
    default:
      return 1;
  }
};

/**
 * Get responsive message bubble max width
 */
export const getMessageBubbleMaxWidth = (): string => {
  const layoutMode = getResponsiveLayoutMode();
  
  switch (layoutMode) {
    case 'mobile':
      return '85%'; // More space on mobile
    case 'tablet':
      return '75%';
    case 'desktop':
      return '60%';
    default:
      return '70%';
  }
};

/**
 * Hook for responsive layout state management
 */
export const useResponsiveLayout = (selectedThreadId?: string | null) => {
  const [layoutConfig, setLayoutConfig] = React.useState<MobileLayoutConfig>(
    () => createMobileLayoutConfig(selectedThreadId)
  );

  React.useEffect(() => {
    const handleResize = () => {
      setLayoutConfig(createMobileLayoutConfig(selectedThreadId));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedThreadId]);

  React.useEffect(() => {
    setLayoutConfig(createMobileLayoutConfig(selectedThreadId));
  }, [selectedThreadId]);

  return layoutConfig;
};

/**
 * CSS media query strings for consistent breakpoints
 */
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${MESSAGING_BREAKPOINTS.md - 1}px)`,
  tablet: `(min-width: ${MESSAGING_BREAKPOINTS.md}px) and (max-width: ${MESSAGING_BREAKPOINTS.lg - 1}px)`,
  desktop: `(min-width: ${MESSAGING_BREAKPOINTS.lg}px)`,
  touch: '(hover: none) and (pointer: coarse)',
  hover: '(hover: hover) and (pointer: fine)',
} as const;

/**
 * Generate responsive CSS classes
 */
export const getResponsiveClasses = (
  baseClass: string,
  variants?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  }
): string => {
  const layoutMode = getResponsiveLayoutMode();
  const classes = [baseClass];
  
  if (variants) {
    switch (layoutMode) {
      case 'mobile':
        if (variants.mobile) classes.push(variants.mobile);
        break;
      case 'tablet':
        if (variants.tablet) classes.push(variants.tablet);
        break;
      case 'desktop':
        if (variants.desktop) classes.push(variants.desktop);
        break;
    }
  }
  
  return classes.join(' ');
};

/**
 * Debounce function for resize events
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * React import for hooks (will be available when used in React components)
 */
declare const React: any;