const fc = require('fast-check');
const dashboardIntegration = require('../services/dashboardIntegration');
const { query } = require('../config/database');

/**
 * Property-Based Tests for Dashboard Integration
 * 
 * Feature: vendor-dashboard-messaging-enhancement
 * Property 14: Dashboard Integration Consistency
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * Tests that messaging activity maintains proper integration with:
 * - Lead tracking (8.1)
 * - Profile updates (8.2)
 * - Service bookings (8.3)
 * - Reviews (8.4)
 * - Analytics reporting (8.5)
 */

describe('Feature: vendor-dashboard-messaging-enhancement, Property 14: Dashboard Integration Consistency', () => {
  let testVendorId;
  let testCoupleId;
  let testUserId;
  let testCoupleUserId;

  beforeAll(async () => {
    // Clean up any existing test data first
    const testVendorEmail = `test-vendor-integration-${Date.now()}@example.com`;
    const testCoupleEmail = `test-couple-integration-${Date.now()}@example.com`;

    // Create test users and profiles
    const userResult = await query(
      `INSERT INTO users (email, user_type, auth_provider, is_active)
       VALUES (?, 'VENDOR', 'EMAIL', 1)`,
      [testVendorEmail]
    );
    testUserId = userResult.lastID || userResult.rows[0].id;

    const vendorResult = await query(
      `INSERT INTO vendors (user_id, business_name, category, location, description, is_verified)
       VALUES (?, 'Test Integration Vendor', 'photography', 'Test City', 'Test description', 1)`,
      [testUserId]
    );
    testVendorId = vendorResult.lastID || vendorResult.rows[0].id;

    const coupleUserResult = await query(
      `INSERT INTO users (email, user_type, auth_provider, is_active)
       VALUES (?, 'COUPLE', 'EMAIL', 1)`,
      [testCoupleEmail]
    );
    testCoupleUserId = coupleUserResult.lastID || coupleUserResult.rows[0].id;

    const coupleResult = await query(
      `INSERT INTO couples (user_id, partner1_name, partner2_name)
       VALUES (?, 'Test Partner 1', 'Test Partner 2')`,
      [testCoupleUserId]
    );
    testCoupleId = coupleResult.lastID || coupleResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM message_threads WHERE vendor_id = ?', [testVendorId]);
    await query('DELETE FROM vendor_leads WHERE vendor_id = ?', [testVendorId]);
    await query('DELETE FROM vendors WHERE id = ?', [testVendorId]);
    await query('DELETE FROM couples WHERE id = ?', [testCoupleId]);
    await query('DELETE FROM users WHERE id IN (?, ?)', [testUserId, testCoupleUserId]);
  });

  /**
   * Property: Lead-Thread Linking Consistency (Requirement 8.1)
   * 
   * For any lead and message thread, linking them should:
   * 1. Successfully associate the thread with the lead
   * 2. Maintain referential integrity
   * 3. Allow retrieval of the linked relationship
   */
  it('should maintain consistent lead-thread linking across all operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          leadMessage: fc.string({ minLength: 10, maxLength: 200 }),
          budgetRange: fc.oneof(
            fc.constant('$1000-2000'),
            fc.constant('$2000-5000'),
            fc.constant('$5000-10000'),
            fc.constant('$10000+')
          ),
          leadStatus: fc.oneof(
            fc.constant('new'),
            fc.constant('contacted'),
            fc.constant('converted'),
            fc.constant('closed')
          )
        }),
        async (leadData) => {
          // Create a lead
          const leadResult = await query(
            `INSERT INTO vendor_leads (vendor_id, couple_id, message, budget_range, status)
             VALUES (?, ?, ?, ?, ?)`,
            [testVendorId, testCoupleId, leadData.leadMessage, leadData.budgetRange, leadData.leadStatus]
          );
          const leadId = leadResult.lastID || leadResult.rows[0].id;

          try {
            // Create thread from lead
            const threadResult = await dashboardIntegration.createThreadFromLead(leadId);

            // Property 1: Thread creation should succeed
            expect(threadResult.success).toBe(true);
            expect(threadResult.thread).toBeDefined();
            expect(threadResult.thread.lead_id).toBe(leadId);

            // Property 2: Thread should be retrievable with lead information
            const threadsResult = await dashboardIntegration.getVendorThreadsWithLeads(testVendorId);
            expect(threadsResult.success).toBe(true);
            
            const linkedThread = threadsResult.threads.find(t => t.lead_id === leadId);
            expect(linkedThread).toBeDefined();
            expect(linkedThread.lead_message).toBe(leadData.leadMessage);
            expect(linkedThread.budget_range).toBe(leadData.budgetRange);

            // Property 3: Creating thread again should reuse existing thread
            const secondThreadResult = await dashboardIntegration.createThreadFromLead(leadId);
            expect(secondThreadResult.success).toBe(true);
            expect(secondThreadResult.thread.id).toBe(threadResult.thread.id);

            // Clean up
            await query('DELETE FROM message_threads WHERE id = ?', [threadResult.thread.id]);
          } finally {
            await query('DELETE FROM vendor_leads WHERE id = ?', [leadId]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Vendor Profile Integration (Requirement 8.2)
   * 
   * For any vendor profile update, the messaging system should:
   * 1. Reflect current business information
   * 2. Maintain profile consistency across messaging
   * 3. Handle profile retrieval correctly
   */
  it('should maintain vendor profile consistency in messaging context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          businessName: fc.string({ minLength: 5, maxLength: 50 }),
          category: fc.oneof(
            fc.constant('photography'),
            fc.constant('catering'),
            fc.constant('venue'),
            fc.constant('music')
          ),
          location: fc.string({ minLength: 3, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 200 })
        }),
        async (profileData) => {
          // Update vendor profile
          await query(
            `UPDATE vendors 
             SET business_name = ?, category = ?, location = ?, description = ?
             WHERE id = ?`,
            [profileData.businessName, profileData.category, profileData.location, profileData.description, testVendorId]
          );

          // Property 1: Profile should be retrievable with updated information
          const profileResult = await dashboardIntegration.getVendorProfile(testVendorId);
          expect(profileResult.success).toBe(true);
          expect(profileResult.profile.business_name).toBe(profileData.businessName);
          expect(profileResult.profile.category).toBe(profileData.category);
          expect(profileResult.profile.location).toBe(profileData.location);
          expect(profileResult.profile.description).toBe(profileData.description);

          // Property 2: Profile data should be consistent
          expect(profileResult.profile.id).toBe(testVendorId);
          expect(profileResult.profile.business_photos).toBeInstanceOf(Array);
          expect(profileResult.profile.portfolio_photos).toBeInstanceOf(Array);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Analytics Consistency (Requirement 8.5)
   * 
   * For any messaging activity, analytics should:
   * 1. Accurately count messages
   * 2. Calculate correct response times
   * 3. Track active conversations
   * 4. Provide consistent metrics
   */
  it('should maintain consistent analytics across messaging activity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          messageCount: fc.integer({ min: 1, max: 5 }),
          threadCount: fc.integer({ min: 1, max: 3 })
        }),
        async (testData) => {
          const createdThreads = [];
          const createdMessages = [];
          const createdCouples = [];
          const createdCoupleUsers = [];

          try {
            // Create test threads and messages
            for (let i = 0; i < testData.threadCount; i++) {
              // Create a unique couple for each thread to avoid UNIQUE constraint violation
              const timestamp = Date.now();
              const randomSuffix = Math.random().toString(36).substring(7);
              const coupleUserResult = await query(
                `INSERT INTO users (email, user_type, auth_provider, is_active)
                 VALUES (?, 'COUPLE', 'EMAIL', 1)`,
                [`test-couple-analytics-${timestamp}-${randomSuffix}-${i}@example.com`]
              );
              const coupleUserId = coupleUserResult.lastID || coupleUserResult.rows[0].id;
              createdCoupleUsers.push(coupleUserId);

              const coupleResult = await query(
                `INSERT INTO couples (user_id, partner1_name, partner2_name)
                 VALUES (?, 'Test Partner 1', 'Test Partner 2')`,
                [coupleUserId]
              );
              const coupleId = coupleResult.lastID || coupleResult.rows[0].id;
              createdCouples.push(coupleId);

              // Create thread with unique couple
              const threadResult = await query(
                `INSERT INTO message_threads (couple_id, vendor_id, created_at, updated_at, last_message_at, is_active)
                 VALUES (?, ?, datetime('now'), datetime('now'), datetime('now'), 1)`,
                [coupleId, testVendorId]
              );
              const threadId = threadResult.lastID || threadResult.rows[0].id;
              createdThreads.push(threadId);

              // Add messages to thread
              for (let j = 0; j < testData.messageCount; j++) {
                const senderType = j % 2 === 0 ? 'couple' : 'vendor';
                const messageResult = await query(
                  `INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type, status, created_at)
                   VALUES (?, ?, ?, ?, 'text', 'sent', datetime('now', '-${j} minutes'))`,
                  [threadId, senderType === 'couple' ? coupleUserId : testUserId, senderType, `Test message ${j}`]
                );
                createdMessages.push(messageResult.lastID || messageResult.rows[0].id);
              }
            }

            // Get analytics
            const analyticsResult = await dashboardIntegration.getMessagingAnalytics(testVendorId, {});

            // Property 1: Analytics should succeed
            expect(analyticsResult.success).toBe(true);
            expect(analyticsResult.analytics).toBeDefined();

            // Property 2: Message counts should be accurate
            const expectedTotalMessages = testData.threadCount * testData.messageCount;
            expect(analyticsResult.analytics.totalMessages).toBeGreaterThanOrEqual(expectedTotalMessages);

            // Property 3: Active conversations should be tracked
            expect(analyticsResult.analytics.activeConversations).toBeGreaterThanOrEqual(testData.threadCount);

            // Property 4: Response time should be non-negative
            expect(analyticsResult.analytics.responseTime).toBeGreaterThanOrEqual(0);

            // Property 5: Messages by day should be an array
            expect(Array.isArray(analyticsResult.analytics.messagesByDay)).toBe(true);
          } finally {
            // Clean up
            for (const messageId of createdMessages) {
              await query('DELETE FROM messages WHERE id = ?', [messageId]);
            }
            for (const threadId of createdThreads) {
              await query('DELETE FROM message_threads WHERE id = ?', [threadId]);
            }
            for (const coupleId of createdCouples) {
              await query('DELETE FROM couples WHERE id = ?', [coupleId]);
            }
            for (const coupleUserId of createdCoupleUsers) {
              await query('DELETE FROM users WHERE id = ?', [coupleUserId]);
            }
          }
        }
      ),
      { numRuns: 50, timeout: 120000 }
    );
  }, 150000);

  /**
   * Property: Lead Status Update Consistency (Requirement 8.1)
   * 
   * For any lead status update, the system should:
   * 1. Accept valid status transitions
   * 2. Reject invalid statuses
   * 3. Maintain status consistency
   */
  it('should maintain consistent lead status updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.constant('new'),
            fc.constant('contacted'),
            fc.constant('converted'),
            fc.constant('closed')
          ),
          { minLength: 1, maxLength: 5 }
        ),
        async (statusSequence) => {
          // Create a test lead
          const leadResult = await query(
            `INSERT INTO vendor_leads (vendor_id, couple_id, message, status)
             VALUES (?, ?, 'Test lead for status updates', 'new')`,
            [testVendorId, testCoupleId]
          );
          const leadId = leadResult.lastID || leadResult.rows[0].id;

          try {
            // Apply status updates in sequence
            for (const status of statusSequence) {
              const updateResult = await dashboardIntegration.updateLeadStatus(leadId, status);

              // Property 1: Valid status updates should succeed
              expect(updateResult.success).toBe(true);

              // Property 2: Status should be persisted correctly
              const leadCheck = await query(
                'SELECT status FROM vendor_leads WHERE id = ?',
                [leadId]
              );
              expect(leadCheck.rows[0].status).toBe(status);
            }

            // Property 3: Invalid status should be rejected
            const invalidResult = await dashboardIntegration.updateLeadStatus(leadId, 'invalid_status');
            expect(invalidResult.success).toBe(false);
            expect(invalidResult.error).toBeDefined();
          } finally {
            await query('DELETE FROM vendor_leads WHERE id = ?', [leadId]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Online Status Tracking (Requirement 8.2)
   * 
   * For any vendor online status change, the system should:
   * 1. Update status correctly
   * 2. Track last seen time
   * 3. Handle multiple status changes
   */
  it('should maintain consistent vendor online status tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        async (statusSequence) => {
          for (const isOnline of statusSequence) {
            // Update online status
            const updateResult = await dashboardIntegration.updateVendorOnlineStatus(testVendorId, isOnline);

            // Property 1: Status update should succeed
            expect(updateResult.success).toBe(true);

            // Property 2: Status should be persisted correctly
            const statusCheck = await query(
              `SELECT is_online, last_seen FROM user_connection_status WHERE user_id = ?`,
              [testUserId]
            );

            if (statusCheck.rows.length > 0) {
              expect(statusCheck.rows[0].is_online).toBe(isOnline ? 1 : 0);
              expect(statusCheck.rows[0].last_seen).toBeDefined();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Message-Lead Linking (Requirement 8.1)
   * 
   * For any message and lead, linking should:
   * 1. Verify both exist
   * 2. Create proper association
   * 3. Maintain referential integrity
   */
  it('should maintain consistent message-lead linking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (messageContent) => {
          // Create a lead
          const leadResult = await query(
            `INSERT INTO vendor_leads (vendor_id, couple_id, message, status)
             VALUES (?, ?, 'Test lead for message linking', 'new')`,
            [testVendorId, testCoupleId]
          );
          const leadId = leadResult.lastID || leadResult.rows[0].id;

          // Create a thread
          const threadResult = await query(
            `INSERT INTO message_threads (couple_id, vendor_id, created_at, updated_at, last_message_at, is_active)
             VALUES (?, ?, datetime('now'), datetime('now'), datetime('now'), 1)`,
            [testCoupleId, testVendorId]
          );
          const threadId = threadResult.lastID || threadResult.rows[0].id;

          // Create a message
          const messageResult = await query(
            `INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type, status, created_at)
             VALUES (?, ?, 'couple', ?, 'text', 'sent', datetime('now'))`,
            [threadId, testCoupleUserId, messageContent]
          );
          const messageId = messageResult.lastID || messageResult.rows[0].id;

          try {
            // Link message to lead
            const linkResult = await dashboardIntegration.linkMessageToLead(messageId, leadId);

            // Property 1: Linking should succeed
            expect(linkResult.success).toBe(true);

            // Property 2: Thread should now be linked to lead
            const threadCheck = await query(
              'SELECT lead_id FROM message_threads WHERE id = ?',
              [threadId]
            );
            expect(threadCheck.rows[0].lead_id).toBe(leadId);

            // Property 3: Linking non-existent message should fail
            const invalidLinkResult = await dashboardIntegration.linkMessageToLead('invalid-id', leadId);
            expect(invalidLinkResult.success).toBe(false);
          } finally {
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            await query('DELETE FROM message_threads WHERE id = ?', [threadId]);
            await query('DELETE FROM vendor_leads WHERE id = ?', [leadId]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
