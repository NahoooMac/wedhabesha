import { useCallback } from 'react';
import { useErrorToast, useWarningToast } from '../components/ui/Toast';
import { ApiError, NetworkError, TimeoutError } from '../lib/api';

interface ErrorHandlerOptions {
  showToast?: boolean;
  customMessage?: string;
  onRetry?: () => void;
}

export const useErrorHandler = () => {
  const showErrorToast = useErrorToast();
  const showWarningToast = useWarningToast();

  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const { showToast = true, customMessage, onRetry } = options;

    console.error('Error handled:', error);

    if (!showToast) return;

    // Handle different error types
    if (error instanceof ApiError) {
      const title = customMessage || getApiErrorTitle(error.status);
      const message = error.message;
      
      if (error.status >= 500) {
        showErrorToast(title, message, onRetry ? {
          label: 'Retry',
          onClick: onRetry
        } : undefined);
      } else if (error.status === 401) {
        showWarningToast('Authentication Required', 'Please log in to continue');
      } else if (error.status === 403) {
        showWarningToast('Access Denied', 'You don\'t have permission to perform this action');
      } else {
        showWarningToast(title, message);
      }
    } else if (error instanceof NetworkError) {
      showErrorToast(
        customMessage || 'Connection Problem',
        'Please check your internet connection and try again',
        onRetry ? {
          label: 'Retry',
          onClick: onRetry
        } : undefined
      );
    } else if (error instanceof TimeoutError) {
      showErrorToast(
        customMessage || 'Request Timeout',
        'The request took too long to complete',
        onRetry ? {
          label: 'Retry',
          onClick: onRetry
        } : undefined
      );
    } else if (error instanceof Error) {
      // Generic error handling
      const title = customMessage || 'Something went wrong';
      const message = error.message || 'An unexpected error occurred';
      
      showErrorToast(title, message, onRetry ? {
        label: 'Retry',
        onClick: onRetry
      } : undefined);
    } else {
      // Unknown error type
      showErrorToast(
        customMessage || 'Unknown Error',
        'An unexpected error occurred',
        onRetry ? {
          label: 'Retry',
          onClick: onRetry
        } : undefined
      );
    }
  }, [showErrorToast, showWarningToast]);

  return { handleError };
};

const getApiErrorTitle = (status: number): string => {
  switch (status) {
    case 400:
      return 'Invalid Request';
    case 401:
      return 'Authentication Required';
    case 403:
      return 'Access Denied';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation Error';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    default:
      return `Error ${status}`;
  }
};

// Hook for handling query errors specifically
export const useQueryErrorHandler = () => {
  const { handleError } = useErrorHandler();

  return useCallback((error: Error | unknown, retry?: () => void) => {
    handleError(error, {
      onRetry: retry,
    });
  }, [handleError]);
};

// Hook for handling mutation errors specifically
export const useMutationErrorHandler = () => {
  const { handleError } = useErrorHandler();

  return useCallback((error: Error | unknown, customMessage?: string) => {
    handleError(error, {
      customMessage,
    });
  }, [handleError]);
};