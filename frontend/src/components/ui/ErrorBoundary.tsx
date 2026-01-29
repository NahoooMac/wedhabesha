import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'global';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Store error info for debugging
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, this would send to a service like Sentry
    console.error('Error logged to monitoring service:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  private handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: this.state.retryCount + 1
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorMessage = () => {
    const { error } = this.state;
    const { level } = this.props;

    if (!error) return 'An unexpected error occurred';

    // Provide user-friendly messages based on error type
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'The application needs to be refreshed. Please reload the page.';
    }

    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }

    if (level === 'global') {
      return 'A critical error occurred. Please refresh the page or contact support if the problem persists.';
    }

    if (level === 'page') {
      return 'This page encountered an error. Please try navigating back or refreshing.';
    }

    return 'Something went wrong with this component. Please try again.';
  };

  private shouldShowReload = () => {
    const { error } = this.state;
    return error && (
      error.message.includes('ChunkLoadError') || 
      error.message.includes('Loading chunk') ||
      this.state.retryCount >= 2
    );
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isGlobalError = this.props.level === 'global';
      const shouldShowReload = this.shouldShowReload();

      return (
        <div className={`${isGlobalError ? 'min-h-screen' : 'min-h-[200px]'} flex items-center justify-center p-4 ${isGlobalError ? 'bg-secondary-50' : ''}`}>
          <Card className="w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-600 mb-2">
                {isGlobalError ? 'Application Error' : 'Something went wrong'}
              </h2>
              <p className="text-secondary-600 mb-4">
                {this.getErrorMessage()}
              </p>
              {this.state.retryCount > 0 && (
                <p className="text-sm text-secondary-500 mb-4">
                  Retry attempts: {this.state.retryCount}
                </p>
              )}
            </div>
            
            <div className="text-center space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-red-50 p-4 rounded-md">
                  <summary className="cursor-pointer text-sm font-medium text-red-800 mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs text-red-800 overflow-auto whitespace-pre-wrap">
                    {this.state.error.message}
                    {this.state.error.stack && '\n\nStack trace:\n' + this.state.error.stack}
                    {this.state.errorInfo?.componentStack && '\n\nComponent stack:\n' + this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2 justify-center flex-wrap">
                {!shouldShowReload && (
                  <Button onClick={this.handleReset}>
                    Try Again
                  </Button>
                )}
                
                {shouldShowReload && (
                  <Button onClick={this.handleReload}>
                    Reload Page
                  </Button>
                )}
                
                {!isGlobalError && (
                  <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                  >
                    Go Back
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                >
                  Go Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;