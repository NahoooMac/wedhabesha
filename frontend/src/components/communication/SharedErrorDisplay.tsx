/**
 * @fileoverview SharedErrorDisplay Component
 * 
 * Unified error display component that provides consistent error handling UI
 * across both Couple Dashboard and Vendor Portal messaging interfaces.
 * Uses the unified design system for consistent colors, typography, and spacing.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Features:
 * - Unified design system with consistent colors
 * - Multiple display variants (inline, modal, toast)
 * - Retry functionality with loading states
 * - Auto-dismiss capability
 * - Accessible error messages
 * - Mobile-optimized touch targets
 * - Icon support for different error types
 * - Customizable actions
 * 
 * Requirements satisfied:
 * - 1.1, 1.2, 1.4, 1.5: UI Design Consistency
 * - 2.5, 7.1, 7.4, 7.5: Error Handling with Retry
 * - 5.1, 5.2, 5.4, 5.5: Mobile Responsiveness
 */

import React, { useEffect, useState } from 'react';
import '../../styles/messaging-design-tokens.css';

interface SharedErrorDisplayProps {
  error: string | Error;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  variant?: 'inline' | 'modal' | 'toast';
  autoHide?: boolean;
  autoHideDelay?: number; // in milliseconds
  showIcon?: boolean;
  title?: string;
  retryText?: string;
  dismissText?: string;
  className?: string;
  colorScheme?: 'blue' | 'rose'; // Temporary for migration, defaults to blue
}

/**
 * SharedErrorDisplay Component
 * 
 * Provides unified error display with consistent styling, retry functionality,
 * and multiple display variants. Ensures consistent error handling experience
 * across both couple and vendor messaging interfaces.
 * 
 * @component
 * @param {SharedErrorDisplayProps} props - Component props
 * @returns {JSX.Element} Rendered SharedErrorDisplay component
 * 
 * @example
 * ```tsx
 * <SharedErrorDisplay
 *   error="Failed to send message"
 *   onRetry={handleRetry}
 *   onDismiss={handleDismiss}
 *   variant="inline"
 *   autoHide={true}
 *   autoHideDelay={5000}
 *   showIcon={true}
 *   title="Message Error"
 *   retryText="Try Again"
 *   dismissText="Dismiss"
 * />
 * ```
 * 
 * @satisfies Requirements 1.1, 1.2, 1.4, 1.5, 2.5, 5.1, 5.2, 5.4, 5.5, 7.1, 7.4, 7.5
 */
export const SharedErrorDisplay: React.FC<SharedErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
  autoHide = false,
  autoHideDelay = 5000,
  showIcon = true,
  title = 'Error',
  retryText = 'Retry',
  dismissText = 'Dismiss',
  className = '',
  colorScheme = 'blue' // Default to blue for consistency
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const errorMessage = error instanceof Error ? error.message : error;

  // Auto-hide functionality
  useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const ErrorIcon = () => (
    <svg 
      className="w-5 h-5 flex-shrink-0" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      style={{ color: 'var(--messaging-error-500)' }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const RetryIcon = () => (
    <svg 
      className="w-4 h-4" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );

  const CloseIcon = () => (
    <svg 
      className="w-4 h-4" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );

  const baseStyles = {
    backgroundColor: 'var(--messaging-error-50)',
    borderColor: 'var(--messaging-error-200)',
    borderRadius: 'var(--messaging-radius-lg)',
    padding: 'var(--messaging-space-4)',
    border: '1px solid'
  };

  const buttonStyles = {
    backgroundColor: 'var(--messaging-error-100)',
    color: 'var(--messaging-error-700)',
    borderRadius: 'var(--messaging-radius-base)',
    padding: 'var(--messaging-space-2) var(--messaging-space-3)',
    fontSize: 'var(--messaging-font-size-sm)',
    fontWeight: 'var(--messaging-font-weight-medium)',
    transition: 'all var(--messaging-transition-fast)',
    border: 'none',
    cursor: 'pointer'
  };

  const iconButtonStyles = {
    color: 'var(--messaging-error-400)',
    transition: 'color var(--messaging-transition-fast)',
    padding: 'var(--messaging-space-1)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--messaging-radius-base)'
  };

  if (variant === 'modal') {
    return (
      <div 
        className={`fixed inset-0 flex items-center justify-center p-4 ${className}`}
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 'var(--messaging-z-modal)'
        }}
      >
        <div 
          className="max-w-md w-full"
          style={{
            ...baseStyles,
            backgroundColor: 'white',
            boxShadow: 'var(--messaging-shadow-lg)'
          }}
        >
          <div className="flex items-start gap-3">
            {showIcon && <ErrorIcon />}
            <div className="flex-1">
              <h3 
                className="font-semibold mb-2"
                style={{ 
                  color: 'var(--messaging-error-600)',
                  fontSize: 'var(--messaging-font-size-lg)',
                  fontWeight: 'var(--messaging-font-weight-semibold)'
                }}
              >
                {title}
              </h3>
              <p 
                className="text-sm"
                style={{ 
                  color: 'var(--messaging-error-600)',
                  fontSize: 'var(--messaging-font-size-sm)',
                  lineHeight: 'var(--messaging-line-height-normal)'
                }}
              >
                {errorMessage}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="messaging-mobile-touch-target"
                style={buttonStyles}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--messaging-error-200)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--messaging-error-100)';
                }}
              >
                {dismissText}
              </button>
            )}
            {onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="messaging-mobile-touch-target flex items-center gap-2"
                style={{
                  ...buttonStyles,
                  backgroundColor: 'var(--messaging-primary-500)',
                  color: 'white',
                  opacity: isRetrying ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isRetrying) {
                    e.currentTarget.style.backgroundColor = 'var(--messaging-primary-600)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--messaging-primary-500)';
                }}
              >
                {isRetrying ? (
                  <>
                    <div 
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                      style={{ borderRadius: 'var(--messaging-radius-full)' }}
                    />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RetryIcon />
                    {retryText}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div 
        className={`fixed top-4 right-4 max-w-sm w-full ${className}`}
        style={{ 
          zIndex: 'var(--messaging-z-tooltip)',
          ...baseStyles,
          backgroundColor: 'white',
          boxShadow: 'var(--messaging-shadow-lg)'
        }}
      >
        <div className="flex items-start gap-3">
          {showIcon && <ErrorIcon />}
          <div className="flex-1">
            <h4 
              className="font-medium mb-1"
              style={{ 
                color: 'var(--messaging-error-600)',
                fontSize: 'var(--messaging-font-size-sm)',
                fontWeight: 'var(--messaging-font-weight-medium)'
              }}
            >
              {title}
            </h4>
            <p 
              className="text-xs"
              style={{ 
                color: 'var(--messaging-error-500)',
                fontSize: 'var(--messaging-font-size-xs)',
                lineHeight: 'var(--messaging-line-height-normal)'
              }}
            >
              {errorMessage}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="messaging-mobile-touch-target"
                style={iconButtonStyles}
                title={retryText}
                onMouseEnter={(e) => {
                  if (!isRetrying) {
                    e.currentTarget.style.color = 'var(--messaging-error-600)';
                    e.currentTarget.style.backgroundColor = 'var(--messaging-error-100)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--messaging-error-400)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isRetrying ? (
                  <div 
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                    style={{ borderRadius: 'var(--messaging-radius-full)' }}
                  />
                ) : (
                  <RetryIcon />
                )}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="messaging-mobile-touch-target"
                style={iconButtonStyles}
                title={dismissText}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--messaging-error-600)';
                  e.currentTarget.style.backgroundColor = 'var(--messaging-error-100)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--messaging-error-400)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div 
      className={`${className}`}
      style={baseStyles}
    >
      <div className="flex items-start gap-3">
        {showIcon && <ErrorIcon />}
        <div className="flex-1">
          <h4 
            className="font-medium mb-1"
            style={{ 
              color: 'var(--messaging-error-600)',
              fontSize: 'var(--messaging-font-size-sm)',
              fontWeight: 'var(--messaging-font-weight-medium)'
            }}
          >
            {title}
          </h4>
          <p 
            className="text-sm"
            style={{ 
              color: 'var(--messaging-error-500)',
              fontSize: 'var(--messaging-font-size-sm)',
              lineHeight: 'var(--messaging-line-height-normal)'
            }}
          >
            {errorMessage}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="messaging-mobile-touch-target flex items-center gap-1"
              style={{
                ...buttonStyles,
                opacity: isRetrying ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isRetrying) {
                  e.currentTarget.style.backgroundColor = 'var(--messaging-error-200)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--messaging-error-100)';
              }}
            >
              {isRetrying ? (
                <>
                  <div 
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                    style={{ borderRadius: 'var(--messaging-radius-full)' }}
                  />
                  Retrying...
                </>
              ) : (
                <>
                  <RetryIcon />
                  {retryText}
                </>
              )}
            </button>
          )}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="messaging-mobile-touch-target"
              style={iconButtonStyles}
              title={dismissText}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--messaging-error-600)';
                e.currentTarget.style.backgroundColor = 'var(--messaging-error-100)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--messaging-error-400)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedErrorDisplay;