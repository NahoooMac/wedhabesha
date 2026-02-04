/**
 * Comprehensive Error Handling Service
 * Provides centralized error handling, logging, and user-friendly error messages
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

export interface ErrorDetails {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  statusCode?: number;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: number;
  userMessage: string;
  recoveryActions?: string[];
}

class ErrorHandlerService {
  private errorLog: ErrorDetails[] = [];
  private readonly MAX_LOG_SIZE = 50;

  /**
   * Handle and categorize errors
   */
  public handleError(error: unknown, context?: Record<string, any>): ErrorDetails {
    const errorDetails = this.categorizeError(error, context);
    this.logError(errorDetails);
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorDetails);
    }

    return errorDetails;
  }

  /**
   * Categorize error and provide user-friendly messages
   */
  private categorizeError(error: unknown, context?: Record<string, any>): ErrorDetails {
    const timestamp = Date.now();

    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'Network request failed',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        originalError: error,
        context,
        timestamp,
        userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
        recoveryActions: [
          'Check your internet connection',
          'Refresh the page',
          'Try again in a few moments',
        ],
      };
    }

    // API errors
    if (this.isApiError(error)) {
      const apiError = error as any;
      const statusCode = apiError.status || apiError.statusCode;

      if (statusCode === 401) {
        return {
          message: 'Authentication failed',
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.HIGH,
          statusCode,
          originalError: error as Error,
          context,
          timestamp,
          userMessage: 'Your session has expired. Please log in again.',
          recoveryActions: ['Log in again', 'Refresh the page'],
        };
      }

      if (statusCode === 403) {
        return {
          message: 'Access denied',
          category: ErrorCategory.AUTHORIZATION,
          severity: ErrorSeverity.MEDIUM,
          statusCode,
          originalError: error as Error,
          context,
          timestamp,
          userMessage: 'You don\'t have permission to perform this action.',
          recoveryActions: ['Contact support if you believe this is an error'],
        };
      }

      if (statusCode === 404) {
        return {
          message: 'Resource not found',
          category: ErrorCategory.NOT_FOUND,
          severity: ErrorSeverity.LOW,
          statusCode,
          originalError: error as Error,
          context,
          timestamp,
          userMessage: 'The requested resource was not found.',
          recoveryActions: ['Go back', 'Return to dashboard'],
        };
      }

      if (statusCode >= 500) {
        return {
          message: 'Server error',
          category: ErrorCategory.SERVER,
          severity: ErrorSeverity.CRITICAL,
          statusCode,
          originalError: error as Error,
          context,
          timestamp,
          userMessage: 'The server encountered an error. Our team has been notified.',
          recoveryActions: [
            'Try again in a few moments',
            'Contact support if the problem persists',
          ],
        };
      }

      if (statusCode >= 400) {
        return {
          message: 'Bad request',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          statusCode,
          originalError: error as Error,
          context,
          timestamp,
          userMessage: apiError.message || 'The request could not be processed. Please check your input.',
          recoveryActions: ['Check your input and try again'],
        };
      }
    }

    // Validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return {
        message: error.message,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        originalError: error,
        context,
        timestamp,
        userMessage: 'Please check your input and try again.',
        recoveryActions: ['Review the form for errors', 'Ensure all required fields are filled'],
      };
    }

    // Generic error
    if (error instanceof Error) {
      return {
        message: error.message,
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        originalError: error,
        context,
        timestamp,
        userMessage: 'An unexpected error occurred. Please try again.',
        recoveryActions: ['Refresh the page', 'Try again', 'Contact support if the problem persists'],
      };
    }

    // Unknown error type
    return {
      message: String(error),
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      context,
      timestamp,
      userMessage: 'An unexpected error occurred. Please try again.',
      recoveryActions: ['Refresh the page', 'Try again'],
    };
  }

  /**
   * Check if error is an API error
   */
  private isApiError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      ('status' in error || 'statusCode' in error)
    );
  }

  /**
   * Log error to internal log
   */
  private logError(errorDetails: ErrorDetails): void {
    this.errorLog.push(errorDetails);

    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.shift();
    }

    // Console log based on severity
    const logMethod = this.getLogMethod(errorDetails.severity);
    logMethod(
      `[${errorDetails.category}] ${errorDetails.message}`,
      errorDetails
    );
  }

  /**
   * Get appropriate console method based on severity
   */
  private getLogMethod(severity: ErrorSeverity): typeof console.error {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return console.error;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.LOW:
      default:
        return console.error; // Changed from console.log to console.error
    }
  }

  /**
   * Send error to monitoring service (placeholder)
   */
  private sendToMonitoring(errorDetails: ErrorDetails): void {
    // In a real application, this would send to Sentry, LogRocket, etc.
    // Removed console.log for production
  }

  /**
   * Get error log
   */
  public getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  /**
   * Get errors by category
   */
  public getErrorsByCategory(category: ErrorCategory): ErrorDetails[] {
    return this.errorLog.filter(e => e.category === category);
  }

  /**
   * Get errors by severity
   */
  public getErrorsBySeverity(severity: ErrorSeverity): ErrorDetails[] {
    return this.errorLog.filter(e => e.severity === severity);
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get user-friendly error message
   */
  public getUserMessage(error: unknown): string {
    const errorDetails = this.categorizeError(error);
    return errorDetails.userMessage;
  }

  /**
   * Get recovery actions for an error
   */
  public getRecoveryActions(error: unknown): string[] {
    const errorDetails = this.categorizeError(error);
    return errorDetails.recoveryActions || [];
  }
}

// Singleton instance
export const errorHandler = new ErrorHandlerService();

/**
 * React Hook for error handling
 */
export function useErrorHandler() {
  const handleError = React.useCallback((error: unknown, context?: Record<string, any>) => {
    return errorHandler.handleError(error, context);
  }, []);

  const getUserMessage = React.useCallback((error: unknown) => {
    return errorHandler.getUserMessage(error);
  }, []);

  const getRecoveryActions = React.useCallback((error: unknown) => {
    return errorHandler.getRecoveryActions(error);
  }, []);

  return {
    handleError,
    getUserMessage,
    getRecoveryActions,
  };
}

// Import React for the hook
import React from 'react';
