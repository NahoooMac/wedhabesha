import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import { ToastProvider, useErrorToast } from '../../components/ui/Toast';
import { ApiError, NetworkError, TimeoutError } from '../../lib/api';

// Test component that throws errors
const ErrorThrowingComponent: React.FC<{ errorType: string }> = ({ errorType }) => {
  if (errorType === 'render') {
    throw new Error('Render error occurred');
  }
  if (errorType === 'api') {
    throw new ApiError('API error occurred', 400, 'VALIDATION_ERROR');
  }
  if (errorType === 'network') {
    throw new NetworkError('Network connection failed');
  }
  if (errorType === 'timeout') {
    throw new TimeoutError('Request timed out');
  }
  return <div>No error</div>;
};

// Test component for toast notifications
const ToastTestComponent: React.FC = () => {
  const showErrorToast = useErrorToast();

  const handleApiError = () => {
    const error = new ApiError('Invalid request data', 400, 'VALIDATION_ERROR');
    showErrorToast('API Error', error.message);
  };

  const handleNetworkError = () => {
    const error = new NetworkError('Connection failed');
    showErrorToast('Network Error', error.message, {
      label: 'Retry',
      onClick: () => {}, // Empty function instead of console.log
    });
  };

  const handleTimeoutError = () => {
    const error = new TimeoutError('Request took too long');
    showErrorToast('Timeout Error', error.message);
  };

  return (
    <div>
      <button onClick={handleApiError}>Trigger API Error</button>
      <button onClick={handleNetworkError}>Trigger Network Error</button>
      <button onClick={handleTimeoutError}>Trigger Timeout Error</button>
    </div>
  );
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Suppress console.error for expected errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Error boundary catches and displays render errors', async () => {
    const onError = jest.fn();

    render(
      <TestWrapper>
        <ErrorBoundary onError={onError} level="component">
          <ErrorThrowingComponent errorType="render" />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Should show error boundary UI
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();

    // Should show try again button
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();

    // Should call onError callback
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  test('Error boundary retry functionality', async () => {
    let shouldThrowError = true;

    const ConditionalErrorComponent = () => {
      if (shouldThrowError) {
        throw new Error('Conditional error');
      }
      return <div>Component loaded successfully</div>;
    };

    render(
      <TestWrapper>
        <ErrorBoundary level="component">
          <ConditionalErrorComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Should show error initially
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Disable error for retry
    shouldThrowError = false;

    // Click try again
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    // Should show successful component
    await waitFor(() => {
      expect(screen.getByText('Component loaded successfully')).toBeInTheDocument();
    });
  });

  test('Error boundary shows different messages based on error type', async () => {
    const { rerender } = render(
      <TestWrapper>
        <ErrorBoundary level="global">
          <ErrorThrowingComponent errorType="none" />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Test chunk loading error
    const ChunkErrorComponent = () => {
      throw new Error('Loading chunk 1 failed');
    };

    rerender(
      <TestWrapper>
        <ErrorBoundary level="global">
          <ChunkErrorComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Should show reload message for chunk errors
    expect(screen.getByText(/the application needs to be refreshed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  test('Toast notifications for different error types', async () => {
    render(
      <TestWrapper>
        <ToastTestComponent />
      </TestWrapper>
    );

    // Test API error toast
    const apiErrorButton = screen.getByRole('button', { name: /trigger api error/i });
    fireEvent.click(apiErrorButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid request data')).toBeInTheDocument();
    });

    // Test network error toast with retry action
    const networkErrorButton = screen.getByRole('button', { name: /trigger network error/i });
    fireEvent.click(networkErrorButton);

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    // Test timeout error toast
    const timeoutErrorButton = screen.getByRole('button', { name: /trigger timeout error/i });
    fireEvent.click(timeoutErrorButton);

    await waitFor(() => {
      expect(screen.getByText('Timeout Error')).toBeInTheDocument();
      expect(screen.getByText('Request took too long')).toBeInTheDocument();
    });
  });

  test('Toast dismissal functionality', async () => {
    render(
      <TestWrapper>
        <ToastTestComponent />
      </TestWrapper>
    );

    // Trigger an error toast
    const apiErrorButton = screen.getByRole('button', { name: /trigger api error/i });
    fireEvent.click(apiErrorButton);

    // Should show toast
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    // Find and click dismiss button
    const dismissButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(dismissButton);

    // Toast should be removed
    await waitFor(() => {
      expect(screen.queryByText('API Error')).not.toBeInTheDocument();
    });
  });

  test('Multiple toast notifications', async () => {
    render(
      <TestWrapper>
        <ToastTestComponent />
      </TestWrapper>
    );

    // Trigger multiple error toasts
    const apiErrorButton = screen.getByRole('button', { name: /trigger api error/i });
    const networkErrorButton = screen.getByRole('button', { name: /trigger network error/i });

    fireEvent.click(apiErrorButton);
    fireEvent.click(networkErrorButton);

    // Should show both toasts
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });

    // Should stack toasts vertically
    const toastContainer = screen.getByText('API Error').closest('.fixed');
    expect(toastContainer).toHaveClass('space-y-2');
  });

  test('Error boundary with different levels', async () => {
    // Test page-level error boundary
    render(
      <TestWrapper>
        <ErrorBoundary level="page">
          <ErrorThrowingComponent errorType="render" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText(/this page encountered an error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();

    // Test global-level error boundary
    const { rerender } = render(
      <TestWrapper>
        <ErrorBoundary level="global">
          <ErrorThrowingComponent errorType="render" />
        </ErrorBoundary>
      </TestWrapper>
    );

    rerender(
      <TestWrapper>
        <ErrorBoundary level="global">
          <ErrorThrowingComponent errorType="render" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText(/application error/i)).toBeInTheDocument();
    expect(screen.getByText(/a critical error occurred/i)).toBeInTheDocument();
  });

  test('Error boundary retry count tracking', async () => {
    let attemptCount = 0;

    const RetryTrackingComponent = () => {
      attemptCount++;
      if (attemptCount <= 2) {
        throw new Error(`Attempt ${attemptCount} failed`);
      }
      return <div>Success after {attemptCount} attempts</div>;
    };

    render(
      <TestWrapper>
        <ErrorBoundary level="component">
          <RetryTrackingComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Should show error initially
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // First retry
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    // Should still show error but with retry count
    expect(screen.getByText(/retry attempts: 1/i)).toBeInTheDocument();

    // Second retry
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Should show success
    await waitFor(() => {
      expect(screen.getByText(/success after 3 attempts/i)).toBeInTheDocument();
    });
  });

  test('Error boundary shows reload option after multiple retries', async () => {
    let shouldThrowError = true;

    const PersistentErrorComponent = () => {
      if (shouldThrowError) {
        throw new Error('Persistent error');
      }
      return <div>Component loaded</div>;
    };

    render(
      <TestWrapper>
        <ErrorBoundary level="component">
          <PersistentErrorComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Retry multiple times
    for (let i = 0; i < 3; i++) {
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(tryAgainButton);
      
      await waitFor(() => {
        expect(screen.getByText(`Retry attempts: ${i + 1}`)).toBeInTheDocument();
      });
    }

    // After 3 retries, should show reload option
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});