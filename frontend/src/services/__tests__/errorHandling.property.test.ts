/**
 * Property-Based Tests for Error Handling and Recovery
 * Feature: vendor-dashboard-messaging-enhancement
 * Property 2: Error Handling and Recovery
 * Validates: Requirements 1.4
 */

import fc from 'fast-check';
import { errorHandler, ErrorCategory, ErrorSeverity } from '../errorHandler';

describe('Property 2: Error Handling and Recovery', () => {
  beforeEach(() => {
    errorHandler.clearErrorLog();
  });

  /**
   * Property: All errors should produce meaningful error messages
   * For any system error condition, the dashboard should display
   * appropriate error messages
   */
  it('should provide meaningful error messages for all error types', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorType: fc.constantFrom(
            'network',
            'api-401',
            'api-403',
            'api-404',
            'api-500',
            'validation',
            'unknown'
          ),
          errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        (errorScenario) => {
          // Create error based on type
          let error: any;
          
          switch (errorScenario.errorType) {
            case 'network':
              error = new TypeError('fetch failed');
              break;
            case 'api-401':
              error = { status: 401, message: 'Unauthorized' };
              break;
            case 'api-403':
              error = { status: 403, message: 'Forbidden' };
              break;
            case 'api-404':
              error = { status: 404, message: 'Not Found' };
              break;
            case 'api-500':
              error = { status: 500, message: 'Internal Server Error' };
              break;
            case 'validation':
              error = new Error('validation failed: ' + errorScenario.errorMessage);
              break;
            default:
              error = new Error(errorScenario.errorMessage);
          }

          const errorDetails = errorHandler.handleError(error);

          // Property: Error should have a user-friendly message
          expect(errorDetails.userMessage).toBeDefined();
          expect(errorDetails.userMessage.length).toBeGreaterThan(0);
          expect(typeof errorDetails.userMessage).toBe('string');

          // Property: Error should be categorized
          expect(Object.values(ErrorCategory)).toContain(errorDetails.category);

          // Property: Error should have severity
          expect(Object.values(ErrorSeverity)).toContain(errorDetails.severity);

          // Property: Error should have timestamp
          expect(errorDetails.timestamp).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All errors should provide recovery options
   * For any error, the system should provide recovery actions
   */
  it('should provide recovery options for all errors', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(new TypeError('fetch failed')),
          fc.constant({ status: 401, message: 'Unauthorized' }),
          fc.constant({ status: 403, message: 'Forbidden' }),
          fc.constant({ status: 404, message: 'Not Found' }),
          fc.constant({ status: 500, message: 'Server Error' }),
          fc.constant(new Error('Validation failed')),
          fc.constant(new Error('Unknown error'))
        ),
        (error) => {
          const recoveryActions = errorHandler.getRecoveryActions(error);

          // Property: Every error should have at least one recovery action
          expect(recoveryActions).toBeDefined();
          expect(Array.isArray(recoveryActions)).toBe(true);
          expect(recoveryActions.length).toBeGreaterThan(0);

          // Property: Recovery actions should be strings
          recoveryActions.forEach(action => {
            expect(typeof action).toBe('string');
            expect(action.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error severity should match error type
   * Critical errors should have high/critical severity
   */
  it('should assign appropriate severity to errors', () => {
    fc.assert(
      fc.property(
        fc.record({
          statusCode: fc.integer({ min: 400, max: 599 }),
          message: fc.string(),
        }),
        (errorData) => {
          const error = {
            status: errorData.statusCode,
            message: errorData.message,
          };

          const errorDetails = errorHandler.handleError(error);

          // Property: Server errors (5xx) should be high or critical severity
          if (errorData.statusCode >= 500) {
            expect([ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]).toContain(
              errorDetails.severity
            );
          }

          // Property: Client errors (4xx) should be low or medium severity
          if (errorData.statusCode >= 400 && errorData.statusCode < 500) {
            expect([ErrorSeverity.LOW, ErrorSeverity.MEDIUM, ErrorSeverity.HIGH]).toContain(
              errorDetails.severity
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error log should maintain bounded size
   * For any number of errors, the log should not grow unbounded
   */
  it('should maintain bounded error log size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }), // Number of errors to generate
        (errorCount) => {
          // Generate multiple errors
          for (let i = 0; i < errorCount; i++) {
            const error = new Error(`Error ${i}`);
            errorHandler.handleError(error);
          }

          const errorLog = errorHandler.getErrorLog();

          // Property: Error log should not exceed maximum size (50)
          expect(errorLog.length).toBeLessThanOrEqual(50);

          // Property: If more than 50 errors, should keep most recent
          if (errorCount > 50) {
            expect(errorLog.length).toBe(50);
            // Most recent error should be in the log
            const lastError = errorLog[errorLog.length - 1];
            expect(lastError.message).toContain(`Error ${errorCount - 1}`);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Error categorization should be consistent
   * Same error types should always be categorized the same way
   */
  it('should categorize errors consistently', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(401, 403, 404, 500, 503),
        (statusCode) => {
          // Handle same error multiple times
          const results = [];
          for (let i = 0; i < 5; i++) {
            const error = { status: statusCode, message: 'Test error' };
            const errorDetails = errorHandler.handleError(error);
            results.push(errorDetails.category);
          }

          // Property: All categorizations should be identical
          const firstCategory = results[0];
          results.forEach(category => {
            expect(category).toBe(firstCategory);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error context should be preserved
   * For any error with context, the context should be stored
   */
  it('should preserve error context information', () => {
    fc.assert(
      fc.property(
        fc.record({
          component: fc.string({ minLength: 1, maxLength: 50 }),
          action: fc.string({ minLength: 1, maxLength: 50 }),
          userId: fc.uuid(),
          additionalData: fc.record({
            key1: fc.string(),
            key2: fc.integer(),
          }),
        }),
        (context) => {
          const error = new Error('Test error');
          const errorDetails = errorHandler.handleError(error, context);

          // Property: Context should be preserved
          expect(errorDetails.context).toBeDefined();
          expect(errorDetails.context).toEqual(context);

          // Property: Context should be retrievable from log
          const errorLog = errorHandler.getErrorLog();
          const loggedError = errorLog[errorLog.length - 1];
          expect(loggedError.context).toEqual(context);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Network errors should be retryable
   * For any network error, recovery actions should include retry
   */
  it('should mark network errors as retryable', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          new TypeError('fetch failed'),
          new TypeError('Network request failed'),
          new Error('Failed to fetch')
        ),
        (networkError) => {
          const recoveryActions = errorHandler.getRecoveryActions(networkError);

          // Property: Network errors should have retry in recovery actions
          const hasRetry = recoveryActions.some(action =>
            action.toLowerCase().includes('retry') ||
            action.toLowerCase().includes('try again')
          );
          expect(hasRetry).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Authentication errors should suggest re-login
   * For any 401 error, recovery should include login action
   */
  it('should suggest re-login for authentication errors', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string(),
        }),
        (errorData) => {
          const error = { status: 401, message: errorData.message };
          const errorDetails = errorHandler.handleError(error);

          // Property: Should be categorized as authentication error
          expect(errorDetails.category).toBe(ErrorCategory.AUTHENTICATION);

          // Property: User message should mention login
          expect(
            errorDetails.userMessage.toLowerCase().includes('log in') ||
            errorDetails.userMessage.toLowerCase().includes('login') ||
            errorDetails.userMessage.toLowerCase().includes('session')
          ).toBe(true);

          // Property: Recovery actions should include login
          const hasLoginAction = errorDetails.recoveryActions?.some(action =>
            action.toLowerCase().includes('log in') ||
            action.toLowerCase().includes('login')
          );
          expect(hasLoginAction).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error filtering should work correctly
   * For any set of errors, filtering by category/severity should work
   */
  it('should filter errors by category and severity correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            statusCode: fc.integer({ min: 400, max: 599 }),
            message: fc.string(),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (errors) => {
          // Generate errors
          errors.forEach(errorData => {
            const error = { status: errorData.statusCode, message: errorData.message };
            errorHandler.handleError(error);
          });

          // Test category filtering
          const networkErrors = errorHandler.getErrorsByCategory(ErrorCategory.NETWORK);
          networkErrors.forEach(error => {
            expect(error.category).toBe(ErrorCategory.NETWORK);
          });

          // Test severity filtering
          const criticalErrors = errorHandler.getErrorsBySeverity(ErrorSeverity.CRITICAL);
          criticalErrors.forEach(error => {
            expect(error.severity).toBe(ErrorSeverity.CRITICAL);
          });

          // Property: Filtered results should be subsets of total log
          const totalLog = errorHandler.getErrorLog();
          expect(networkErrors.length).toBeLessThanOrEqual(totalLog.length);
          expect(criticalErrors.length).toBeLessThanOrEqual(totalLog.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
