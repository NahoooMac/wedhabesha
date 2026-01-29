/**
 * @fileoverview useResponsiveMessaging Hook
 * 
 * React hook for managing responsive messaging layout state across
 * both Couple Dashboard and Vendor Portal messaging interfaces.
 * Provides consistent mobile behavior and layout management.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Features:
 * - Responsive layout state management
 * - Breakpoint detection and updates
 * - Mobile navigation state
 * - Touch device detection
 * - Viewport size tracking
 * - Debounced resize handling
 * 
 * Requirements satisfied:
 * - 1.3, 5.1, 5.2, 5.4, 5.5: Mobile Responsiveness
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MobileLayoutConfig,
  createMobileLayoutConfig,
  getResponsiveLayoutMode,
  isMobileDevice,
  isTouchDevice,
  getViewportWidth,
  getViewportHeight,
  debounce,
  ResponsiveLayoutMode
} from '../utils/messaging-responsive';

/**
 * Responsive messaging hook state
 */
export interface ResponsiveMessagingState extends MobileLayoutConfig {
  viewportWidth: number;
  viewportHeight: number;
  layoutMode: ResponsiveLayoutMode;
  isMobileDevice: boolean;
  isTouchDevice: boolean;
  isLandscape: boolean;
}

/**
 * Responsive messaging hook actions
 */
export interface ResponsiveMessagingActions {
  selectThread: (threadId: string | null) => void;
  goBackToThreadList: () => void;
  toggleThreadList: () => void;
  updateViewport: () => void;
}

/**
 * Combined hook return type
 */
export interface UseResponsiveMessagingReturn {
  state: ResponsiveMessagingState;
  actions: ResponsiveMessagingActions;
}

/**
 * Hook options
 */
export interface UseResponsiveMessagingOptions {
  initialThreadId?: string | null;
  debounceDelay?: number;
  enableViewportTracking?: boolean;
}

/**
 * useResponsiveMessaging Hook
 * 
 * Manages responsive layout state for messaging components, providing
 * consistent mobile behavior across both couple and vendor interfaces.
 * Handles viewport changes, thread selection, and mobile navigation.
 * 
 * @param options - Hook configuration options
 * @returns Responsive messaging state and actions
 * 
 * @example
 * ```tsx
 * const { state, actions } = useResponsiveMessaging({
 *   initialThreadId: 'thread-123',
 *   debounceDelay: 150,
 *   enableViewportTracking: true
 * });
 * 
 * // Use state for conditional rendering
 * if (state.isMobile && state.selectedThread) {
 *   return <MessageView threadId={state.selectedThread} onBack={actions.goBackToThreadList} />;
 * }
 * 
 * // Use actions for navigation
 * const handleThreadSelect = (threadId: string) => {
 *   actions.selectThread(threadId);
 * };
 * ```
 */
export const useResponsiveMessaging = (
  options: UseResponsiveMessagingOptions = {}
): UseResponsiveMessagingReturn => {
  const {
    initialThreadId = null,
    debounceDelay = 150,
    enableViewportTracking = true
  } = options;

  // Initialize state
  const [selectedThread, setSelectedThread] = useState<string | null>(initialThreadId);
  const [viewportWidth, setViewportWidth] = useState(() => getViewportWidth());
  const [viewportHeight, setViewportHeight] = useState(() => getViewportHeight());
  const [layoutMode, setLayoutMode] = useState<ResponsiveLayoutMode>(() => getResponsiveLayoutMode());
  const [deviceInfo, setDeviceInfo] = useState(() => ({
    isMobileDevice: isMobileDevice(),
    isTouchDevice: isTouchDevice()
  }));

  // Create layout configuration based on current state
  const layoutConfig = createMobileLayoutConfig(selectedThread);

  // Calculate additional state
  const isLandscape = viewportWidth > viewportHeight;

  // Combined state object
  const state: ResponsiveMessagingState = {
    ...layoutConfig,
    viewportWidth,
    viewportHeight,
    layoutMode,
    isMobileDevice: deviceInfo.isMobileDevice,
    isTouchDevice: deviceInfo.isTouchDevice,
    isLandscape
  };

  // Update viewport dimensions and layout mode
  const updateViewport = useCallback(() => {
    const newWidth = getViewportWidth();
    const newHeight = getViewportHeight();
    const newLayoutMode = getResponsiveLayoutMode();

    setViewportWidth(newWidth);
    setViewportHeight(newHeight);
    setLayoutMode(newLayoutMode);
  }, []);

  // Debounced resize handler
  const debouncedUpdateViewport = useCallback(
    debounce(updateViewport, debounceDelay),
    [updateViewport, debounceDelay]
  );

  // Set up resize listener
  useEffect(() => {
    if (!enableViewportTracking) return;

    window.addEventListener('resize', debouncedUpdateViewport);
    window.addEventListener('orientationchange', debouncedUpdateViewport);

    return () => {
      window.removeEventListener('resize', debouncedUpdateViewport);
      window.removeEventListener('orientationchange', debouncedUpdateViewport);
    };
  }, [debouncedUpdateViewport, enableViewportTracking]);

  // Update device info on mount (in case of SSR)
  useEffect(() => {
    setDeviceInfo({
      isMobileDevice: isMobileDevice(),
      isTouchDevice: isTouchDevice()
    });
  }, []);

  // Actions
  const actions: ResponsiveMessagingActions = {
    /**
     * Select a thread and update mobile navigation state
     */
    selectThread: useCallback((threadId: string | null) => {
      setSelectedThread(threadId);
    }, []),

    /**
     * Go back to thread list (mobile navigation)
     */
    goBackToThreadList: useCallback(() => {
      setSelectedThread(null);
    }, []),

    /**
     * Toggle thread list visibility (mobile navigation)
     */
    toggleThreadList: useCallback(() => {
      if (state.isMobile) {
        // On mobile, toggle between thread list and message view
        setSelectedThread(selectedThread ? null : selectedThread);
      }
      // On desktop, thread list is always visible
    }, [state.isMobile, selectedThread]),

    /**
     * Manually update viewport (useful for testing or forced updates)
     */
    updateViewport
  };

  return {
    state,
    actions
  };
};

/**
 * Hook for simple mobile detection
 * Lightweight alternative when full responsive state is not needed
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() => getResponsiveLayoutMode() === 'mobile');

  useEffect(() => {
    const handleResize = debounce(() => {
      setIsMobile(getResponsiveLayoutMode() === 'mobile');
    }, 150);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

/**
 * Hook for viewport dimensions
 * Provides current viewport width and height with debounced updates
 */
export const useViewportSize = (debounceDelay: number = 150): { width: number; height: number } => {
  const [size, setSize] = useState(() => ({
    width: getViewportWidth(),
    height: getViewportHeight()
  }));

  useEffect(() => {
    const handleResize = debounce(() => {
      setSize({
        width: getViewportWidth(),
        height: getViewportHeight()
      });
    }, debounceDelay);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [debounceDelay]);

  return size;
};

/**
 * Hook for device capabilities
 * Provides information about device type and capabilities
 */
export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState(() => ({
    isMobileDevice: isMobileDevice(),
    isTouchDevice: isTouchDevice(),
    supportsHover: window.matchMedia('(hover: hover)').matches,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }));

  useEffect(() => {
    // Update capabilities on mount (handles SSR)
    setCapabilities({
      isMobileDevice: isMobileDevice(),
      isTouchDevice: isTouchDevice(),
      supportsHover: window.matchMedia('(hover: hover)').matches,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    });

    // Listen for media query changes
    const hoverQuery = window.matchMedia('(hover: hover)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleHoverChange = (e: MediaQueryListEvent) => {
      setCapabilities(prev => ({ ...prev, supportsHover: e.matches }));
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setCapabilities(prev => ({ ...prev, prefersReducedMotion: e.matches }));
    };

    hoverQuery.addEventListener('change', handleHoverChange);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      hoverQuery.removeEventListener('change', handleHoverChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return capabilities;
};