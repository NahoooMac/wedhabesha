/**
 * Enhanced React Hook for Messaging Error Handling
 * Provides comprehensive error handling functionality with retry mechanisms,
 * automatic error clearing, and consistent error categorization
 */

import { useState, useCallback, useRef } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string;
  operation: string;
  timestamp: Date;
  retryCount: number;
  isRetryable: boolean;
}

export interface UseMessagingErrorHandlerReturn {
  handleError: (error: Error | string, operation: string, isRetryable?: boolean) => void;
  retryOperation: (operation: string, retryFn: () => Promise<void>) => Promise<void>;
  clearError: () => void;
  clearErrorAfterDelay: (delay?: number) => void;
  error: ErrorInfo | null;
  isRetrying: boolean;
  canRetry: boolean;
}

const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_CLEAR_DELAY = 5000; // 5 seconds

export const useMessagingErrorHandler = (): UseMessagingErrorHandlerReturn => {
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleError = useCallback((
    error: Error | string, 
    operation: string, 
    isRetryable: boolean = true
  ) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : undefined;
    
    console.error(`Error in ${operation}:`, error);
    
    const errorInfo: ErrorInfo = {
      message: errorMessage,
      code: errorCode,
      operation,
      timestamp: new Date(),
      retryCount: 0,
      isRetryable
    };
    
    setError(errorInfo);
    
    // Clear any existing timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }
  }, []);

  const retryOperation = useCallback(async (operation: string, retryFn: () => Promise<void>) => {
    if (!error || !error.isRetryable || error.retryCount >= MAX_RETRY_ATTEMPTS) {
      return;
    }

    setIsRetrying(true);
    
    try {
      await retryFn();
      
      // Success - clear error
      setError(null);
      
      // Clear any pending timeout
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
      
    } catch (err) {
      console.error(`Retry failed for ${operation}:`, err);
      
      const newRetryCount = error.retryCount + 1;
      const errorMessage = err instanceof Error ? err.message : 'Retry failed';
      
      setError(prev => prev ? {
        ...prev,
        message: errorMessage,
        retryCount: newRetryCount,
        timestamp: new Date(),
        isRetryable: newRetryCount < MAX_RETRY_ATTEMPTS
      } : null);
      
    } finally {
      setIsRetrying(false);
    }
  }, [error]);

  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
    
    // Clear any pending timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
  }, []);

  const clearErrorAfterDelay = useCallback((delay: number = DEFAULT_CLEAR_DELAY) => {
    // Clear any existing timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }
    
    clearTimeoutRef.current = setTimeout(() => {
      setError(null);
      setIsRetrying(false);
      clearTimeoutRef.current = null;
    }, delay);
  }, []);

  const canRetry = error?.isRetryable && error.retryCount < MAX_RETRY_ATTEMPTS && !isRetrying;

  return {
    handleError,
    retryOperation,
    clearError,
    clearErrorAfterDelay,
    error,
    isRetrying,
    canRetry
  };
};