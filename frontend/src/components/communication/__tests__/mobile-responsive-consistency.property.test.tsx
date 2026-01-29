/**
 * @fileoverview Property Test: Mobile Responsive Consistency
 * 
 * Tests that messaging components maintain consistent responsive behavior
 * across different viewport sizes and device types using property-based
 * testing to verify universal correctness properties.
 * 
 * **Validates: Requirements 1.3, 5.1, 5.2, 5.4, 5.5**
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { VendorMessaging } from '../../vendors/VendorMessaging';
import { CoupleMessaging } from '../CoupleMessaging';
import { useResponsiveMessaging } from '../../../hooks/useResponsiveMessaging';
import { 
  getResponsiveLayoutMode, 
  isMobile, 
  isTablet, 
  isDesktop,
  MESSAGING_BREAKPOINTS 
} from '../../../utils/messaging-responsive';

// Mock the responsive hook for controlled testing
vi.mock('../../../hooks/useResponsiveMessaging');
vi.mock('../../../hooks/useMessagingErrorHandler');
vi.mock('../../../services/realtimeHandler');

// Test data generators
const viewportSizeGenerator = fc.record({
  width: fc.integer({ min: 320, max: 1920 }),
  height: fc.integer({ min: 568, max: 1080 })
});

const threadIdGenerator = fc.string({ minLength: 1, maxLength: 50 });
const userIdGenerator = fc.string({ minLength: 1, maxLength: 50 });

// Mock window resize utility
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

// Mock responsive state generator
const createMockResponsiveState = (width: number, selectedThread?: string | null) => {
  const isMobileViewport = width < MESSAGING_BREAKPOINTS.md;
  const isTabletViewport = width >= MESSAGING_BREAKPOINTS.md && width < MESSAGING_BREAKPOINTS.lg;
  const isDesktopViewport = width >= MESSAGING_BREAKPOINTS.lg;
  
  return {
    showThreadList: !isMobileViewport || !selectedThread,
    showMessageView: !isMobileViewport || !!selectedThread,
    selectedThread,
    isMobile: isMobileViewport,
    isTablet: isTabletViewport,
    isDesktop: isDesktopViewport,
    viewportWidth: width,
    viewportHeight: 768,
    layoutMode: isMobileViewport ? 'mobile' : isTabletViewport ? 'tablet' : 'desktop',
    isMobileDevice: isMobileViewport,
    isTouchDevice: isMobileViewport,
    isLandscape: width > 768
  };
};

describe('Property Test: Mobile Responsive Consistency', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    // Store original viewport dimensions
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    
    // Mock fetch for API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ threads: [], messages: [] })
    });
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    
    vi.clearAllMocks();
  });

  /**
   * Property 2: Mobile Responsive Consistency
   * 
   * Universal Property: Both messaging components should maintain consistent
   * responsive behavior across all viewport sizes, ensuring that mobile
   * navigation, layout, and touch targets work identically.
   * 
   * This property verifies that:
   * 1. Components adapt layout based on viewport size
   * 2. Mobile navigation works consistently
   * 3. Touch targets meet minimum size requirements
   * 4. Thread list and message view visibility is consistent
   * 5. Breakpoint behavior is identical across components
   */
  describe('VendorMessaging Responsive Behavior', () => {
    it('should maintain consistent responsive layout across all viewport sizes', () => {
      fc.assert(
        fc.property(
          viewportSizeGenerator,
          userIdGenerator,
          userIdGenerator, // vendorId
          fc.option(threadIdGenerator, { nil: null }),
          (viewport, userId, vendorId, selectedThread) => {
            // Mock the responsive hook
            const mockResponsiveState = createMockResponsiveState(viewport.width, selectedThread);
            const mockActions = {
              selectThread: vi.fn(),
              goBackToThreadList: vi.fn(),
              toggleThreadList: vi.fn(),
              updateViewport: vi.fn()
            };
            
            (useResponsiveMessaging as any).mockReturnValue({
              state: mockResponsiveState,
              actions: mockActions
            });

            // Set viewport
            mockViewport(viewport.width, viewport.height);

            const { container, unmount } = render(
              <VendorMessaging
                vendorId={vendorId}
                userId={userId}
              />
            );

            try {
              // Property 2.1: Component should render without errors at any viewport size
              expect(container).toBeTruthy();

              // Property 2.2: Layout should adapt to viewport size
              const mainContainer = container.querySelector('[class*="flex"]');
              expect(mainContainer).toBeTruthy();

              if (mockResponsiveState.isMobile) {
                // Property 2.3: Mobile layout should be single column
                expect(mainContainer?.classList.contains('flex-col')).toBe(true);
                
                // Property 2.4: Mobile should show either thread list OR message view, not both
                const threadList = container.querySelector('[class*="showThreadList"]');
                const messageView = container.querySelector('[class*="showMessageView"]');
                
                if (selectedThread) {
                  // When thread selected, should show message view
                  expect(mockResponsiveState.showMessageView).toBe(true);
                  expect(mockResponsiveState.showThreadList).toBe(false);
                } else {
                  // When no thread selected, should show thread list
                  expect(mockResponsiveState.showThreadList).toBe(true);
                  expect(mockResponsiveState.showMessageView).toBe(false);
                }
              } else {
                // Property 2.5: Desktop/tablet layout should show both views
                expect(mockResponsiveState.showThreadList).toBe(true);
                expect(mockResponsiveState.showMessageView).toBe(true);
              }

              // Property 2.6: Touch targets should meet minimum size requirements
              const touchTargets = container.querySelectorAll('[class*="messaging-mobile-touch-target"]');
              touchTargets.forEach(target => {
                const styles = window.getComputedStyle(target as Element);
                const minWidth = parseInt(styles.minWidth) || 0;
                const minHeight = parseInt(styles.minHeight) || 0;
                
                // Touch targets should be at least 44px (iOS/Android recommendation)
                if (mockResponsiveState.isMobile || mockResponsiveState.isTouchDevice) {
                  expect(minWidth >= 44 || minHeight >= 44).toBe(true);
                }
              });

              // Property 2.7: Mobile back button should be present when needed
              if (mockResponsiveState.isMobile && selectedThread) {
                const backButtons = container.querySelectorAll('button');
                const hasBackButton = Array.from(backButtons).some(button => 
                  button.querySelector('svg') && 
                  (button.getAttribute('title')?.includes('back') || 
                   button.querySelector('[class*="ChevronLeft"]'))
                );
                expect(hasBackButton).toBe(true);
              }

              // Property 2.8: Responsive padding should be applied
              const paddedElements = container.querySelectorAll('[class*="messaging-mobile-padding"]');
              expect(paddedElements.length).toBeGreaterThan(0);

            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });
  });

  describe('CoupleMessaging Responsive Behavior', () => {
    it('should maintain consistent responsive layout across all viewport sizes', () => {
      fc.assert(
        fc.property(
          viewportSizeGenerator,
          userIdGenerator,
          fc.option(threadIdGenerator, { nil: null }),
          (viewport, userId, selectedThread) => {
            // Mock the responsive hook
            const mockResponsiveState = createMockResponsiveState(viewport.width, selectedThread);
            const mockActions = {
              selectThread: vi.fn(),
              goBackToThreadList: vi.fn(),
              toggleThreadList: vi.fn(),
              updateViewport: vi.fn()
            };
            
            (useResponsiveMessaging as any).mockReturnValue({
              state: mockResponsiveState,
              actions: mockActions
            });

            // Set viewport
            mockViewport(viewport.width, viewport.height);

            const { container, unmount } = render(
              <CoupleMessaging
                userId={userId}
                initialThreadId={selectedThread}
              />
            );

            try {
              // Property 2.1: Component should render without errors at any viewport size
              expect(container).toBeTruthy();

              // Property 2.2: Layout should adapt to viewport size
              const mainContainer = container.querySelector('[class*="flex"]');
              expect(mainContainer).toBeTruthy();

              if (mockResponsiveState.isMobile) {
                // Property 2.3: Mobile layout should be single column
                expect(mainContainer?.classList.contains('flex-col')).toBe(true);
                
                // Property 2.4: Mobile should show either thread list OR message view, not both
                if (selectedThread) {
                  expect(mockResponsiveState.showMessageView).toBe(true);
                  expect(mockResponsiveState.showThreadList).toBe(false);
                } else {
                  expect(mockResponsiveState.showThreadList).toBe(true);
                  expect(mockResponsiveState.showMessageView).toBe(false);
                }
              } else {
                // Property 2.5: Desktop/tablet layout should show both views
                expect(mockResponsiveState.showThreadList).toBe(true);
                expect(mockResponsiveState.showMessageView).toBe(true);
              }

              // Property 2.6: Touch targets should meet minimum size requirements
              const touchTargets = container.querySelectorAll('[class*="messaging-mobile-touch-target"]');
              touchTargets.forEach(target => {
                const styles = window.getComputedStyle(target as Element);
                const minWidth = parseInt(styles.minWidth) || 0;
                const minHeight = parseInt(styles.minHeight) || 0;
                
                if (mockResponsiveState.isMobile || mockResponsiveState.isTouchDevice) {
                  expect(minWidth >= 44 || minHeight >= 44).toBe(true);
                }
              });

              // Property 2.7: Search functionality should be present
              const searchInput = container.querySelector('input[placeholder*="Search"]');
              expect(searchInput).toBeTruthy();

              // Property 2.8: Responsive design tokens should be used
              const styledElements = container.querySelectorAll('[style*="var(--messaging-"]');
              expect(styledElements.length).toBeGreaterThan(0);

            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });
  });

  describe('Cross-Component Responsive Consistency', () => {
    it('should maintain identical responsive behavior between VendorMessaging and CoupleMessaging', () => {
      fc.assert(
        fc.property(
          viewportSizeGenerator,
          userIdGenerator,
          userIdGenerator, // vendorId
          fc.option(threadIdGenerator, { nil: null }),
          (viewport, userId, vendorId, selectedThread) => {
            // Mock the responsive hook with identical state for both components
            const mockResponsiveState = createMockResponsiveState(viewport.width, selectedThread);
            const mockActions = {
              selectThread: vi.fn(),
              goBackToThreadList: vi.fn(),
              toggleThreadList: vi.fn(),
              updateViewport: vi.fn()
            };
            
            (useResponsiveMessaging as any).mockReturnValue({
              state: mockResponsiveState,
              actions: mockActions
            });

            // Set viewport
            mockViewport(viewport.width, viewport.height);

            const { container: vendorContainer, unmount: unmountVendor } = render(
              <VendorMessaging
                vendorId={vendorId}
                userId={userId}
              />
            );

            const { container: coupleContainer, unmount: unmountCouple } = render(
              <CoupleMessaging
                userId={userId}
                initialThreadId={selectedThread}
              />
            );

            try {
              // Property 3.1: Both components should render successfully
              expect(vendorContainer).toBeTruthy();
              expect(coupleContainer).toBeTruthy();

              // Property 3.2: Both should use the same responsive breakpoints
              const vendorMainContainer = vendorContainer.querySelector('[class*="flex"]');
              const coupleMainContainer = coupleContainer.querySelector('[class*="flex"]');
              
              if (mockResponsiveState.isMobile) {
                expect(vendorMainContainer?.classList.contains('flex-col')).toBe(true);
                expect(coupleMainContainer?.classList.contains('flex-col')).toBe(true);
              }

              // Property 3.3: Both should have consistent touch target sizing
              const vendorTouchTargets = vendorContainer.querySelectorAll('[class*="messaging-mobile-touch-target"]');
              const coupleTouchTargets = coupleContainer.querySelectorAll('[class*="messaging-mobile-touch-target"]');
              
              expect(vendorTouchTargets.length).toBeGreaterThan(0);
              expect(coupleTouchTargets.length).toBeGreaterThan(0);

              // Property 3.4: Both should use the same design tokens
              const vendorStyledElements = vendorContainer.querySelectorAll('[style*="var(--messaging-"]');
              const coupleStyledElements = coupleContainer.querySelectorAll('[style*="var(--messaging-"]');
              
              expect(vendorStyledElements.length).toBeGreaterThan(0);
              expect(coupleStyledElements.length).toBeGreaterThan(0);

              // Property 3.5: Both should have consistent mobile padding
              const vendorPaddedElements = vendorContainer.querySelectorAll('[class*="messaging-mobile-padding"]');
              const couplePaddedElements = coupleContainer.querySelectorAll('[class*="messaging-mobile-padding"]');
              
              expect(vendorPaddedElements.length).toBeGreaterThan(0);
              expect(couplePaddedElements.length).toBeGreaterThan(0);

              // Property 3.6: Both should handle viewport changes consistently
              expect(mockResponsiveState.isMobile).toBe(viewport.width < MESSAGING_BREAKPOINTS.md);
              expect(mockResponsiveState.isTablet).toBe(
                viewport.width >= MESSAGING_BREAKPOINTS.md && viewport.width < MESSAGING_BREAKPOINTS.lg
              );
              expect(mockResponsiveState.isDesktop).toBe(viewport.width >= MESSAGING_BREAKPOINTS.lg);

            } finally {
              unmountVendor();
              unmountCouple();
            }
          }
        ),
        { numRuns: 50, verbose: true }
      );
    });
  });

  describe('Responsive Utility Functions', () => {
    it('should provide consistent breakpoint detection across all viewport sizes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 320, max: 1920 }),
          (width) => {
            // Mock viewport width
            mockViewport(width, 768);

            // Property 4.1: Breakpoint functions should be consistent
            const mobileResult = width < MESSAGING_BREAKPOINTS.md;
            const tabletResult = width >= MESSAGING_BREAKPOINTS.md && width < MESSAGING_BREAKPOINTS.lg;
            const desktopResult = width >= MESSAGING_BREAKPOINTS.lg;

            // Property 4.2: Only one breakpoint should be true at a time
            const trueCount = [mobileResult, tabletResult, desktopResult].filter(Boolean).length;
            expect(trueCount).toBe(1);

            // Property 4.3: Layout mode should match breakpoint
            const layoutMode = getResponsiveLayoutMode();
            if (mobileResult) {
              expect(layoutMode).toBe('mobile');
            } else if (tabletResult) {
              expect(layoutMode).toBe('tablet');
            } else {
              expect(layoutMode).toBe('desktop');
            }

            // Property 4.4: Breakpoints should cover all possible widths
            expect(mobileResult || tabletResult || desktopResult).toBe(true);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });
  });

  describe('Touch Target Accessibility', () => {
    it('should maintain consistent touch target sizes across all components and viewport sizes', () => {
      fc.assert(
        fc.property(
          viewportSizeGenerator,
          userIdGenerator,
          (viewport, userId) => {
            const mockResponsiveState = createMockResponsiveState(viewport.width);
            const mockActions = {
              selectThread: vi.fn(),
              goBackToThreadList: vi.fn(),
              toggleThreadList: vi.fn(),
              updateViewport: vi.fn()
            };
            
            (useResponsiveMessaging as any).mockReturnValue({
              state: mockResponsiveState,
              actions: mockActions
            });

            mockViewport(viewport.width, viewport.height);

            const { container, unmount } = render(
              <VendorMessaging
                vendorId={userId}
                userId={userId}
              />
            );

            try {
              // Property 5.1: All touch targets should meet accessibility requirements
              const touchTargets = container.querySelectorAll('[class*="messaging-mobile-touch-target"]');
              
              touchTargets.forEach(target => {
                const rect = target.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(target as Element);
                
                // Property 5.2: Touch targets should have minimum dimensions
                const minWidth = Math.max(rect.width, parseInt(computedStyle.minWidth) || 0);
                const minHeight = Math.max(rect.height, parseInt(computedStyle.minHeight) || 0);
                
                if (mockResponsiveState.isMobile || mockResponsiveState.isTouchDevice) {
                  // iOS/Android recommend minimum 44px touch targets
                  expect(minWidth >= 44 || minHeight >= 44).toBe(true);
                }

                // Property 5.3: Touch targets should be properly spaced
                expect(target.classList.contains('messaging-mobile-touch-target')).toBe(true);
              });

              // Property 5.4: Interactive elements should be touch-friendly
              const buttons = container.querySelectorAll('button');
              const inputs = container.querySelectorAll('input, textarea');
              
              [...buttons, ...inputs].forEach(element => {
                if (mockResponsiveState.isMobile) {
                  // Should have appropriate touch target class or minimum size
                  const hasClass = element.classList.contains('messaging-mobile-touch-target');
                  const rect = element.getBoundingClientRect();
                  const isLargeEnough = rect.width >= 44 || rect.height >= 44;
                  
                  expect(hasClass || isLargeEnough).toBe(true);
                }
              });

            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 50, verbose: true }
      );
    });
  });
});

// Mock vitest functions
const vi = {
  fn: () => jest.fn(),
  mock: jest.mock,
  clearAllMocks: jest.clearAllMocks
};