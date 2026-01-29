/**
 * @fileoverview Messaging Error Handler Service
 * 
 * Provides comprehensive error handling for messaging operations with
 * automatic retry mechanisms, error categorization, and consistent
 * error recovery strategies across both couple and vendor interfaces.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Features:
 * - Error categorization and classification
 * - Automatic retry with exponential backoff
 * - Network error detection and handling
 * - Rate limiting detection and backoff
 * - User-friendly error messages
 * - Consistent error recovery strategies
 * 
 * Requirements satisfied:
 * - 2.5: Error handling for failed operations
 * - 7.1: Clear error messages with retry options
 * - 7.4: Loading states and success confirmation
 * - 7.5: Automatic error clearing when resolved
 */

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorDetails {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  retryDelay: number; // milliseconds
  maxRetries: number;
  userMessage: string;
  technicalMessage: string;
  code?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class MessagingErrorHandler {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  };

  /**
   * Categorize and analyze an error to determine appropriate handling strategy
   */
  public categorizeError(error: Error | string, statusCode?: number): ErrorDetails {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : undefined;

    // Network errors
    if (this.isNetworkError(errorMessage, statusCode)) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: true,
        retryDelay: 2000,
        maxRetries: 3,
        userMessage: 'Connection problem. Please check your internet connection.',
        technicalMessage: errorMessage,
        code: errorCode
      };
    }

    // Authentication errors
    if (this.isAuthenticationError(errorMessage, statusCode)) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        isRetryable: false,
        retryDelay: 0,
        maxRetries: 0,
        userMessage: 'Authentication failed. Please log in again.',
        technicalMessage: errorMessage,
        code: errorCode
      };
    }

    // Rate limiting errors
    if (this.isRateLimitError(errorMessage, statusCode)) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: true,
        retryDelay: 5000,
        maxRetries: 2,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        technicalMessage: errorMessage,
        code: errorCode
      };
    }

    // Validation errors
    if (this.isValidationError(errorMessage, statusCode)) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        isRetryable: false,
        retryDelay: 0,
        maxRetries: 0,
        userMessage: 'Please check your input and try again.',
        technicalMessage: errorMessage,
        code: errorCode
      };
    }

    // Server errors
    if (this.isServerError(errorMessage, statusCode)) {
      return {
        category: ErrorCategory.SERVER,
        severity: ErrorSeverity.HIGH,
        isRetryable: true,
        retryDelay: 3000,
        maxRetries: 2,
        userMessage: 'Server error. Please try again in a moment.',
        technicalMessage: errorMessage,
        code: errorCode
      };
    }

    // Unknown errors
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: true,
      retryDelay: 2000,
      maxRetries: 2,
      userMessage: 'Something went wrong. Please try again.',
      technicalMessage: errorMessage,
      code: errorCode
    };
  }

  /**
   * Execute an operation with automatic retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...customConfig };
    let lastError: Error;
    let attempt = 0;

    while (attempt < config.maxAttempts) {
      try {
        const result = await operation();
        
        // Success - log if this was a retry
        if (attempt > 0) {
          console.log(`✅ ${operationName} succeeded after ${attempt + 1} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        // Analyze error to determine if we should retry
        const errorDetails = this.categorizeError(lastError);
        
        if (!errorDetails.isRetryable || attempt >= config.maxAttempts) {
          console.error(`❌ ${operationName} failed after ${attempt} attempts:`, lastError);
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        console.warn(`⚠️ ${operationName} failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, lastError.message);

        // Wait before retrying
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Handle messaging operation errors with appropriate user feedback
   */
  public handleMessagingError(
    error: Error | string,
    operation: string,
    statusCode?: number
  ): ErrorDetails {
    const errorDetails = this.categorizeError(error, statusCode);
    
    // Log error with appropriate level
    switch (errorDetails.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(`🚨 CRITICAL ${operation} error:`, errorDetails);
        break;
      case ErrorSeverity.HIGH:
        console.error(`❌ HIGH ${operation} error:`, errorDetails);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(`⚠️ MEDIUM ${operation} error:`, errorDetails);
        break;
      case ErrorSeverity.LOW:
        console.info(`ℹ️ LOW ${operation} error:`, errorDetails);
        break;
    }

    return errorDetails;
  }

  /**
   * Create a retry function for a specific operation
   */
  public createRetryFunction<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): () => Promise<T> {
    return () => this.executeWithRetry(operation, operationName, customConfig);
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(message: string, statusCode?: number): boolean {
    const networkKeywords = [
      'network', 'connection', 'timeout', 'offline', 'fetch',
      'cors', 'net::', 'failed to fetch', 'network error'
    ];
    
    const messageCheck = networkKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    const statusCheck = statusCode === 0 || statusCode === undefined;
    
    return messageCheck || statusCheck;
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(message: string, statusCode?: number): boolean {
    const authKeywords = [
      'unauthorized', 'authentication', 'token', 'login',
      'session', 'expired', 'invalid credentials'
    ];
    
    const messageCheck = authKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    const statusCheck = statusCode === 401 || statusCode === 403;
    
    return messageCheck || statusCheck;
  }

  /**
   * Check if error is rate limiting-related
   */
  private isRateLimitError(message: string, statusCode?: number): boolean {
    const rateLimitKeywords = [
      'rate limit', 'too many requests', 'quota', 'throttle'
    ];
    
    const messageCheck = rateLimitKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    const statusCheck = statusCode === 429;
    
    return messageCheck || statusCheck;
  }

  /**
   * Check if error is validation-related
   */
  private isValidationError(message: string, statusCode?: number): boolean {
    const validationKeywords = [
      'validation', 'invalid', 'required', 'format',
      'missing', 'bad request', 'malformed'
    ];
    
    const messageCheck = validationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    const statusCheck = statusCode === 400 || statusCode === 422;
    
    return messageCheck || statusCheck;
  }

  /**
   * Check if error is server-related
   */
  private isServerError(message: string, statusCode?: number): boolean {
    const serverKeywords = [
      'server error', 'internal error', 'service unavailable',
      'database', 'timeout', '500', '502', '503', '504'
    ];
    
    const messageCheck = serverKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    const statusCheck = statusCode && statusCode >= 500 && statusCode < 600;
    
    return messageCheck || statusCheck;
  }

  /**
   * Utility function to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const messagingErrorHandler = new MessagingErrorHandler();
export default messagingErrorHandler;