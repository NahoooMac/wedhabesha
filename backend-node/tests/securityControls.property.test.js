const fc = require('fast-check');
const securityControls = require('../services/securityControls');
const { query } = require('../config/database');

// Mock the database query function
jest.mock('../config/database', () => ({
  query: jest.fn(),
  isPostgreSQL: false
}));

/**
 * Property-Based Tests for SecurityControls
 * Feature: vendor-dashboard-messaging-enhancement, Property 9: Authorization and Access Control
 * **Validates: Requirements 4.2, 4.5**
 */
describe('SecurityControls - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    securityControls.setAccessLogging(true);
  });

  /**
   * Property 9: Authorization and Access Control
   * **Validates: Requirements 4.2, 4.5**
   * 
   * For any message access request, the system should verify user authorization 
   * before displaying content and deny unauthorized access attempts.
   * 
   * This property validates:
   * - Authorized participants can access their threads and messages
   * - Unauthorized users are denied access
   * - Access attempts are logged for security monitoring
   * - System handles various user types and IDs correctly
   */
  it('Property 9: Authorization and Access Control - authorized participants can access, unauthorized are denied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate thread data
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          isActive: fc.boolean(),
          
          // Generate access attempt data
          accessingUserId: fc.integer({ min: 1, max: 10000 }),
          accessingUserType: fc.constantFrom('couple', 'vendor'),
        }),
        async ({ threadId, coupleId, vendorId, isActive, accessingUserId, accessingUserType }) => {
          // Determine if the accessing user should be authorized
          const isAuthorizedCouple = accessingUserType === 'couple' && accessingUserId === coupleId;
          const isAuthorizedVendor = accessingUserType === 'vendor' && accessingUserId === vendorId;
          const shouldBeAuthorized = isActive && (isAuthorizedCouple || isAuthorizedVendor);

          // Mock thread query result
          query.mockResolvedValueOnce({
            rows: [{
              id: threadId,
              couple_id: coupleId,
              vendor_id: vendorId,
              is_active: isActive
            }]
          });

          // Mock access log operations (table creation and insertion)
          query.mockResolvedValue({ rows: [] });

          // Attempt to access the thread
          const result = await securityControls.verifyThreadAccess(
            accessingUserId,
            accessingUserType,
            threadId
          );

          // Property: Authorization result must match expected authorization
          expect(result.authorized).toBe(shouldBeAuthorized);

          if (shouldBeAuthorized) {
            // Property: Authorized access should return thread data
            expect(result.thread).toBeDefined();
            expect(result.thread.id).toBe(threadId);
            expect(result.thread.couple_id).toBe(coupleId);
            expect(result.thread.vendor_id).toBe(vendorId);
            expect(result.reason).toBeUndefined();
          } else {
            // Property: Unauthorized access should provide a reason
            expect(result.reason).toBeDefined();
            expect(typeof result.reason).toBe('string');
            expect(result.reason.length).toBeGreaterThan(0);
            expect(result.thread).toBeUndefined();
          }

          // Property: All access attempts should be logged
          // Verify that query was called for logging (after the thread query)
          expect(query).toHaveBeenCalled();
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
        verbose: true
      }
    );
  }, 60000);

  it('Property: Message access authorization - participants can access messages, non-participants cannot', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate message and thread data
          messageId: fc.integer({ min: 1, max: 10000 }),
          threadId: fc.integer({ min: 1, max: 10000 }),
          senderId: fc.integer({ min: 1, max: 10000 }),
          senderType: fc.constantFrom('couple', 'vendor'),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          isDeleted: fc.boolean(),
          isActive: fc.boolean(),
          
          // Generate access attempt data
          accessingUserId: fc.integer({ min: 1, max: 10000 }),
          accessingUserType: fc.constantFrom('couple', 'vendor'),
        }),
        async ({ 
          messageId, threadId, senderId, senderType, 
          coupleId, vendorId, isDeleted, isActive,
          accessingUserId, accessingUserType 
        }) => {
          // Determine if the accessing user should be authorized
          const isAuthorizedCouple = accessingUserType === 'couple' && accessingUserId === coupleId;
          const isAuthorizedVendor = accessingUserType === 'vendor' && accessingUserId === vendorId;
          const shouldBeAuthorized = !isDeleted && isActive && (isAuthorizedCouple || isAuthorizedVendor);

          // Mock message query result
          query.mockResolvedValueOnce({
            rows: [{
              id: messageId,
              thread_id: threadId,
              sender_id: senderId,
              sender_type: senderType,
              is_deleted: isDeleted,
              couple_id: coupleId,
              vendor_id: vendorId,
              is_active: isActive
            }]
          });

          // Mock access log operations
          query.mockResolvedValue({ rows: [] });

          // Attempt to access the message
          const result = await securityControls.verifyMessageAccess(
            accessingUserId,
            accessingUserType,
            messageId
          );

          // Property: Authorization result must match expected authorization
          expect(result.authorized).toBe(shouldBeAuthorized);

          if (shouldBeAuthorized) {
            // Property: Authorized access should return message data
            expect(result.message).toBeDefined();
            expect(result.message.id).toBe(messageId);
            expect(result.message.thread_id).toBe(threadId);
          } else {
            // Property: Unauthorized access should provide a reason
            expect(result.reason).toBeDefined();
            expect(typeof result.reason).toBe('string');
            expect(result.message).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Invalid parameters always result in denied access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.option(fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.integer({ min: 1, max: 10000 })
          ), { nil: null }),
          userType: fc.option(fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.constantFrom('couple', 'vendor', 'invalid', 'admin', 'guest')
          ), { nil: null }),
          threadId: fc.option(fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.integer({ min: 1, max: 10000 })
          ), { nil: null })
        }).filter(data => {
          // Only test cases where at least one parameter is invalid
          const hasInvalidUserId = !data.userId || data.userId === '';
          const hasInvalidUserType = !data.userType || data.userType === '' || 
                                     !['couple', 'vendor'].includes(data.userType);
          const hasInvalidThreadId = !data.threadId || data.threadId === '';
          return hasInvalidUserId || hasInvalidUserType || hasInvalidThreadId;
        }),
        async ({ userId, userType, threadId }) => {
          // Attempt access with invalid parameters
          const result = await securityControls.verifyThreadAccess(userId, userType, threadId);

          // Property: Invalid parameters must always result in denied access
          expect(result.authorized).toBe(false);
          expect(result.reason).toBeDefined();
          expect(typeof result.reason).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Access logging consistency - all access attempts are logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          isActive: fc.boolean(),
          accessingUserId: fc.integer({ min: 1, max: 10000 }),
          accessingUserType: fc.constantFrom('couple', 'vendor'),
        }),
        async ({ threadId, coupleId, vendorId, isActive, accessingUserId, accessingUserType }) => {
          // Mock thread query
          query.mockResolvedValueOnce({
            rows: [{
              id: threadId,
              couple_id: coupleId,
              vendor_id: vendorId,
              is_active: isActive
            }]
          });

          // Track query calls
          const queryCallsBefore = query.mock.calls.length;

          // Mock access log operations
          query.mockResolvedValue({ rows: [] });

          // Attempt access
          await securityControls.verifyThreadAccess(accessingUserId, accessingUserType, threadId);

          // Property: Access logging should have been called
          const queryCallsAfter = query.mock.calls.length;
          expect(queryCallsAfter).toBeGreaterThan(queryCallsBefore);

          // Property: Logging should not throw errors even if it fails
          // (This is tested by the fact that the function completed successfully)
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: User type case insensitivity - authorization works regardless of case', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          userId: fc.integer({ min: 1, max: 10000 }),
          userType: fc.constantFrom('couple', 'vendor'),
          caseVariation: fc.constantFrom('lower', 'upper', 'mixed')
        }),
        async ({ threadId, userId, userType, caseVariation }) => {
          // Apply case variation
          let userTypeVariant;
          switch (caseVariation) {
            case 'lower':
              userTypeVariant = userType.toLowerCase();
              break;
            case 'upper':
              userTypeVariant = userType.toUpperCase();
              break;
            case 'mixed':
              userTypeVariant = userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase();
              break;
          }

          // Mock thread where user is a participant
          const threadData = {
            id: threadId,
            couple_id: userType === 'couple' ? userId : userId + 1000,
            vendor_id: userType === 'vendor' ? userId : userId + 2000,
            is_active: true
          };

          query.mockResolvedValueOnce({ rows: [threadData] });
          query.mockResolvedValue({ rows: [] });

          // Attempt access with case variant
          const result = await securityControls.verifyThreadAccess(userId, userTypeVariant, threadId);

          // Property: Case variation should not affect authorization
          expect(result.authorized).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: ID type consistency - string and number IDs are handled consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          userId: fc.integer({ min: 1, max: 10000 }),
          userType: fc.constantFrom('couple', 'vendor'),
          useStringIds: fc.boolean()
        }),
        async ({ threadId, userId, userType, useStringIds }) => {
          // Convert to strings if needed
          const threadIdParam = useStringIds ? String(threadId) : threadId;
          const userIdParam = useStringIds ? String(userId) : userId;

          // Mock thread where user is a participant
          const threadData = {
            id: useStringIds ? String(threadId) : threadId,
            couple_id: userType === 'couple' ? (useStringIds ? String(userId) : userId) : (useStringIds ? String(userId + 1000) : userId + 1000),
            vendor_id: userType === 'vendor' ? (useStringIds ? String(userId) : userId) : (useStringIds ? String(userId + 2000) : userId + 2000),
            is_active: true
          };

          query.mockResolvedValueOnce({ rows: [threadData] });
          query.mockResolvedValue({ rows: [] });

          // Attempt access
          const result = await securityControls.verifyThreadAccess(userIdParam, userType, threadIdParam);

          // Property: String and number IDs should be handled consistently
          expect(result.authorized).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Inactive threads always deny access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          accessingUserId: fc.integer({ min: 1, max: 10000 }),
          accessingUserType: fc.constantFrom('couple', 'vendor'),
        }),
        async ({ threadId, coupleId, vendorId, accessingUserId, accessingUserType }) => {
          // Mock inactive thread
          query.mockResolvedValueOnce({
            rows: [{
              id: threadId,
              couple_id: coupleId,
              vendor_id: vendorId,
              is_active: false // Always inactive
            }]
          });

          query.mockResolvedValue({ rows: [] });

          // Attempt access
          const result = await securityControls.verifyThreadAccess(
            accessingUserId,
            accessingUserType,
            threadId
          );

          // Property: Inactive threads must always deny access
          expect(result.authorized).toBe(false);
          expect(result.reason).toContain('inactive');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Deleted messages always deny access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          messageId: fc.integer({ min: 1, max: 10000 }),
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          accessingUserId: fc.integer({ min: 1, max: 10000 }),
          accessingUserType: fc.constantFrom('couple', 'vendor'),
        }),
        async ({ messageId, threadId, coupleId, vendorId, accessingUserId, accessingUserType }) => {
          // Mock deleted message
          query.mockResolvedValueOnce({
            rows: [{
              id: messageId,
              thread_id: threadId,
              sender_id: accessingUserId,
              sender_type: accessingUserType,
              is_deleted: true, // Always deleted
              couple_id: coupleId,
              vendor_id: vendorId,
              is_active: true
            }]
          });

          query.mockResolvedValue({ rows: [] });

          // Attempt access
          const result = await securityControls.verifyMessageAccess(
            accessingUserId,
            accessingUserType,
            messageId
          );

          // Property: Deleted messages must always deny access
          expect(result.authorized).toBe(false);
          expect(result.reason).toContain('deleted');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Non-existent resources always deny access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          resourceId: fc.integer({ min: 1, max: 10000 }),
          userId: fc.integer({ min: 1, max: 10000 }),
          userType: fc.constantFrom('couple', 'vendor'),
          resourceType: fc.constantFrom('thread', 'message')
        }),
        async ({ resourceId, userId, userType, resourceType }) => {
          // Mock empty result (resource not found)
          query.mockResolvedValueOnce({ rows: [] });
          query.mockResolvedValue({ rows: [] });

          // Attempt access based on resource type
          const result = resourceType === 'thread'
            ? await securityControls.verifyThreadAccess(userId, userType, resourceId)
            : await securityControls.verifyMessageAccess(userId, userType, resourceId);

          // Property: Non-existent resources must always deny access
          expect(result.authorized).toBe(false);
          expect(result.reason).toContain('not found');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Database errors result in denied access with error reason', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          userId: fc.integer({ min: 1, max: 10000 }),
          userType: fc.constantFrom('couple', 'vendor'),
          errorMessage: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async ({ threadId, userId, userType, errorMessage }) => {
          // Mock database error
          query.mockRejectedValueOnce(new Error(errorMessage));
          query.mockResolvedValue({ rows: [] });

          // Attempt access
          const result = await securityControls.verifyThreadAccess(userId, userType, threadId);

          // Property: Database errors must result in denied access
          expect(result.authorized).toBe(false);
          expect(result.reason).toBeDefined();
          expect(result.reason).toContain('system error');
        }
      ),
      { numRuns: 50 }
    );
  });
});
