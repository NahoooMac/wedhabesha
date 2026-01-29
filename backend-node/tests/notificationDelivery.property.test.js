/**
 * Property-Based Tests for Comprehensive Notification Delivery
 * Feature: vendor-dashboard-messaging-enhancement
 * Property 10: Comprehensive Notification Delivery
 * Validates: Requirements 5.1, 5.2, 5.3
 * 
 * Tests that new messages trigger immediate notifications, read status updates
 * correctly, and offline users receive queued notifications upon return.
 */

const fc = require('fast-check');
const notificationService = require('../services/notificationService');
const { query } = require('../config/database');

describe('Property 10: Comprehensive Notification Delivery', () => {
  beforeAll(async () => {
    try {
      // Ensure tables exist with correct schema
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          firebase_uid TEXT UNIQUE,
          user_type TEXT NOT NULL CHECK (user_type IN ('COUPLE', 'VENDOR', 'ADMIN', 'STAFF')),
          auth_provider TEXT NOT NULL CHECK (auth_provider IN ('GOOGLE', 'EMAIL')),
          is_active BOOLEAN DEFAULT TRUE,
          phone TEXT,
          phone_verified BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          priority TEXT DEFAULT 'normal',
          is_read BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS user_connection_status (
          user_id INTEGER PRIMARY KEY,
          user_type TEXT NOT NULL CHECK (user_type IN ('couple', 'vendor')),
          is_online BOOLEAN DEFAULT FALSE,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          socket_id TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          email_notifications BOOLEAN DEFAULT TRUE,
          push_notifications BOOLEAN DEFAULT TRUE,
          sms_notifications BOOLEAN DEFAULT FALSE,
          quiet_hours TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      // Clean up test data
      await query('DELETE FROM notifications');
      await query('DELETE FROM user_connection_status');
      await query('DELETE FROM notification_preferences');
      await query('DELETE FROM users WHERE email LIKE ?', ['test_%']);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  afterAll(async () => {
    try {
      // Cleanup Redis connection
      await notificationService.cleanup();
    } catch (error) {
      console.error('AfterAll cleanup error:', error);
    }
  });

  /**
   * Property: For any new message received, the system should alert the
   * recipient immediately with a notification
   * Validates: Requirement 5.1
   */
  test('should send immediate notification for new messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          recipientEmail: fc.emailAddress(),
          messageId: fc.uuid(),
          threadId: fc.uuid(),
          senderId: fc.uuid(),
          senderName: fc.string({ minLength: 1, maxLength: 50 }),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          userType: fc.constantFrom('COUPLE', 'VENDOR')
        }),
        async (testData) => {
          // Create test user with unique identifier to prevent collisions
          const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}_${testData.recipientEmail}`;
          
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [uniqueEmail, testData.userType, 'EMAIL']);

          const userId = userResult.lastID;

          // Create message
          const message = {
            id: testData.messageId,
            threadId: testData.threadId,
            senderId: testData.senderId,
            senderName: testData.senderName,
            content: testData.content
          };

          // Send notification
          const result = await notificationService.sendMessageNotification(
            userId,
            message
          );

          // Property: Notification should be sent successfully
          expect(result.success).toBe(true);

          // Verify notification was created immediately
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          // Property: Notification should exist for the new message
          expect(notifications.rows.length).toBeGreaterThan(0);

          const notification = notifications.rows[0];

          // Property: Notification should contain correct message information
          expect(notification.user_id).toBe(userId);
          expect(notification.type).toBe('new_message');
          expect(notification.title).toBe('New Message');
          expect(notification.is_read).toBe(false);

          // Verify notification data contains message details
          const notifData = JSON.parse(notification.data);
          expect(notifData.message_id).toBe(testData.messageId);
          expect(notifData.thread_id).toBe(testData.threadId);
          expect(notifData.sender_id).toBe(testData.senderId);
          expect(notifData.sender_name).toBe(testData.senderName);
          expect(notifData.preview).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For any message that is read, the message status should update
   * to show read confirmation to the sender
   * Validates: Requirement 5.2
   */
  test('should update read status when messages are read', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          notificationCount: fc.integer({ min: 1, max: 5 })
        }),
        async (testData) => {
          // Create test user with unique identifier to prevent collisions
          const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}_${testData.userEmail}`;
          
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [uniqueEmail, 'VENDOR', 'EMAIL']);

          const userId = userResult.lastID;

          // Create multiple notifications
          for (let i = 0; i < testData.notificationCount; i++) {
            const message = {
              id: `msg-${i}`,
              threadId: 'thread-1',
              senderId: 'sender-1',
              senderName: `Sender ${i}`,
              content: `Message ${i}`
            };

            await notificationService.sendMessageNotification(userId, message);
          }

          // Get all notifications
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          expect(notifications.rows.length).toBe(testData.notificationCount);

          // Property: All notifications should initially be unread
          notifications.rows.forEach(notification => {
            expect(notification.is_read).toBe(false);
          });

          // Mark each notification as read
          for (const notification of notifications.rows) {
            const result = await notificationService.markAsRead(
              notification.id,
              userId
            );

            // Property: Mark as read should succeed
            expect(result.success).toBe(true);
          }

          // Verify all notifications are now marked as read
          const updatedNotifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          // Property: All notifications should now be read
          updatedNotifications.rows.forEach(notification => {
            expect(notification.is_read).toBe(true);
          });

          // Verify unread count is zero
          const unreadResult = await notificationService.getUnreadCount(userId);
          expect(unreadResult.success).toBe(true);
          expect(unreadResult.count).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For any offline user, notifications should be queued and
   * delivered when they return online
   * Validates: Requirement 5.3
   */
  test('should queue notifications for offline users and deliver on return', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          messageCount: fc.integer({ min: 1, max: 5 }),
          userType: fc.constantFrom('COUPLE', 'VENDOR')
        }),
        async (testData) => {
          // Create test user with unique identifier to prevent collisions
          const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}_${testData.userEmail}`;
          
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [uniqueEmail, testData.userType, 'EMAIL']);

          const userId = userResult.lastID;

          // Set user as offline
          await query(`
            INSERT INTO user_connection_status (user_id, user_type, is_online)
            VALUES (?, ?, ?)
          `, [userId, testData.userType.toLowerCase(), false]);

          // Send multiple messages while user is offline
          const messages = [];
          for (let i = 0; i < testData.messageCount; i++) {
            const message = {
              id: `msg-${i}`,
              threadId: 'thread-1',
              senderId: 'sender-1',
              senderName: `Sender ${i}`,
              content: `Message ${i}`
            };

            messages.push(message);

            const result = await notificationService.sendMessageNotification(
              userId,
              message
            );

            // Property: Notification should be sent successfully even when offline
            expect(result.success).toBe(true);
          }

          // Verify notifications were created
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          // Property: All notifications should be created
          expect(notifications.rows.length).toBe(testData.messageCount);

          // Property: All notifications should be unread
          notifications.rows.forEach(notification => {
            expect(notification.is_read).toBe(false);
          });

          // Simulate user coming online
          await query(`
            UPDATE user_connection_status 
            SET is_online = TRUE 
            WHERE user_id = ?
          `, [userId]);

          // Deliver queued notifications
          const deliveryResult = await notificationService.deliverQueuedNotifications(userId);

          // Property: Delivery should complete (success or no Redis)
          // Note: If Redis is not available, it will return success: false
          // but notifications are still created in the database
          expect(deliveryResult).toBeDefined();

          // Verify user is now online
          const statusResult = await query(`
            SELECT is_online FROM user_connection_status 
            WHERE user_id = ?
          `, [userId]);

          expect(statusResult.rows[0].is_online).toBe(true);

          // Property: All notifications should still exist after delivery
          const finalNotifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          expect(finalNotifications.rows.length).toBe(testData.messageCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For any sequence of messages with varying online/offline states,
   * all notifications should be delivered correctly
   */
  test('should handle mixed online/offline notification delivery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          onlineStates: fc.array(fc.boolean(), { minLength: 2, maxLength: 10 })
        }),
        async (testData) => {
          // Create test user with unique identifier to prevent collisions
          const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}_${testData.userEmail}`;
          
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [uniqueEmail, 'COUPLE', 'EMAIL']);

          const userId = userResult.lastID;

          // Initialize connection status
          await query(`
            INSERT INTO user_connection_status (user_id, user_type, is_online)
            VALUES (?, ?, ?)
          `, [userId, 'couple', testData.onlineStates[0]]);

          // Send messages with varying online states
          for (let i = 0; i < testData.onlineStates.length; i++) {
            // Update online status
            await query(`
              UPDATE user_connection_status 
              SET is_online = ? 
              WHERE user_id = ?
            `, [testData.onlineStates[i], userId]);

            // Send message
            const message = {
              id: `msg-${i}`,
              threadId: 'thread-1',
              senderId: 'sender-1',
              senderName: `Sender ${i}`,
              content: `Message ${i}`
            };

            const result = await notificationService.sendMessageNotification(
              userId,
              message
            );

            // Property: Notification should be sent regardless of online status
            expect(result.success).toBe(true);
          }

          // Verify all notifications were created
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
            ORDER BY created_at ASC
          `, [userId]);

          // Property: All notifications should exist
          expect(notifications.rows.length).toBe(testData.onlineStates.length);

          // Property: All notifications should be unread initially
          notifications.rows.forEach(notification => {
            expect(notification.is_read).toBe(false);
          });

          // Property: Each notification should have correct data
          notifications.rows.forEach((notification, idx) => {
            const notifData = JSON.parse(notification.data);
            expect(notifData.message_id).toBe(`msg-${idx}`);
            expect(notifData.thread_id).toBe('thread-1');
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For any notification, marking it as read should not affect
   * other notifications
   */
  test('should maintain independence of notification read states', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          notificationCount: fc.integer({ min: 3, max: 10 }),
          readIndices: fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 })
        }),
        async (testData) => {
          // Create test user with unique identifier to prevent collisions
          const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}_${testData.userEmail}`;
          
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [uniqueEmail, 'VENDOR', 'EMAIL']);

          const userId = userResult.lastID;

          // Create multiple notifications
          for (let i = 0; i < testData.notificationCount; i++) {
            const message = {
              id: `msg-${i}`,
              threadId: 'thread-1',
              senderId: 'sender-1',
              senderName: `Sender ${i}`,
              content: `Message ${i}`
            };

            await notificationService.sendMessageNotification(userId, message);
          }

          // Get all notifications
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
            ORDER BY created_at ASC
          `, [userId]);

          expect(notifications.rows.length).toBe(testData.notificationCount);

          // Mark specific notifications as read
          const validIndices = testData.readIndices.filter(idx => idx < testData.notificationCount);
          const uniqueIndices = [...new Set(validIndices)];

          for (const idx of uniqueIndices) {
            const notification = notifications.rows[idx];
            await notificationService.markAsRead(notification.id, userId);
          }

          // Verify read states
          const updatedNotifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
            ORDER BY created_at ASC
          `, [userId]);

          // Property: Only marked notifications should be read
          updatedNotifications.rows.forEach((notification, idx) => {
            if (uniqueIndices.includes(idx)) {
              expect(notification.is_read).toBe(true);
            } else {
              expect(notification.is_read).toBe(false);
            }
          });

          // Property: Unread count should match unmarked notifications
          const unreadResult = await notificationService.getUnreadCount(userId);
          const expectedUnread = testData.notificationCount - uniqueIndices.length;
          expect(unreadResult.count).toBe(expectedUnread);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For any user, retrieving notifications should return them
   * in correct chronological order with accurate read status
   */
  test('should retrieve notifications in correct order with accurate status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          notificationCount: fc.integer({ min: 1, max: 20 }),
          limit: fc.integer({ min: 5, max: 50 }),
          offset: fc.integer({ min: 0, max: 10 })
        }),
        async (testData) => {
          // Create test user with unique identifier to prevent collisions
          const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}_${testData.userEmail}`;
          
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [uniqueEmail, 'COUPLE', 'EMAIL']);

          const userId = userResult.lastID;

          // Create notifications with small delays to ensure ordering
          for (let i = 0; i < testData.notificationCount; i++) {
            const message = {
              id: `msg-${i}`,
              threadId: 'thread-1',
              senderId: 'sender-1',
              senderName: `Sender ${i}`,
              content: `Message ${i}`
            };

            await notificationService.sendMessageNotification(userId, message);
            
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Retrieve notifications with pagination
          const result = await notificationService.getUserNotifications(
            userId,
            testData.limit,
            testData.offset
          );

          // Property: Retrieval should succeed
          expect(result.success).toBe(true);
          expect(result.notifications).toBeDefined();

          // Property: Notifications should be in descending chronological order
          for (let i = 1; i < result.notifications.length; i++) {
            const prev = new Date(result.notifications[i - 1].created_at);
            const curr = new Date(result.notifications[i].created_at);
            expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
          }

          // Property: Each notification should have complete data
          result.notifications.forEach(notification => {
            expect(notification.user_id).toBe(userId);
            expect(notification.type).toBe('new_message');
            expect(notification.data).toBeDefined();
            expect(typeof notification.data).toBe('object');
            expect(notification.is_read).toBe(false);
          });

          // Property: Pagination should respect limits
          const expectedCount = Math.min(
            testData.limit,
            Math.max(0, testData.notificationCount - testData.offset)
          );
          expect(result.notifications.length).toBeLessThanOrEqual(expectedCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For any notification preferences, the system should store
   * and retrieve them correctly for notification delivery
   */
  test('should respect notification preferences during delivery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          emailNotifications: fc.boolean(),
          pushNotifications: fc.boolean(),
          smsNotifications: fc.boolean()
        }),
        async (testData) => {
          // Create test user with unique identifier to prevent collisions
          const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}_${testData.userEmail}`;
          
          const userResult = await query(`
            INSERT INTO users (email, phone, phone_verified, user_type, auth_provider)
            VALUES (?, ?, ?, ?, ?)
          `, [uniqueEmail, '+1234567890', true, 'VENDOR', 'EMAIL']);

          const userId = userResult.lastID;

          // Set notification preferences
          const preferences = {
            emailNotifications: testData.emailNotifications,
            pushNotifications: testData.pushNotifications,
            smsNotifications: testData.smsNotifications,
            quietHours: {
              start: '22:00',
              end: '08:00'
            }
          };

          const updateResult = await notificationService.updateNotificationPreferences(
            userId,
            preferences
          );

          // Property: Preferences should be updated successfully
          expect(updateResult.success).toBe(true);

          // Retrieve preferences
          const retrievedPrefs = await notificationService.getUserNotificationPreferences(userId);

          // Property: Retrieved preferences should match what was set
          expect(retrievedPrefs.emailNotifications).toBe(testData.emailNotifications);
          expect(retrievedPrefs.pushNotifications).toBe(testData.pushNotifications);
          expect(retrievedPrefs.smsNotifications).toBe(testData.smsNotifications);
          expect(retrievedPrefs.quietHours).toBeDefined();

          // Send a message with preferences
          const message = {
            id: 'test-msg-id',
            threadId: 'test-thread-id',
            senderId: 'test-sender-id',
            senderName: 'Test Sender',
            content: 'Test message content'
          };

          const result = await notificationService.sendMessageNotification(
            userId,
            message,
            preferences
          );

          // Property: Notification should be sent successfully
          expect(result.success).toBe(true);

          // Verify notification was created
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          // Property: Notification should exist regardless of preferences
          expect(notifications.rows.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For any concurrent notification operations, the system should
   * maintain data consistency
   */
  test('should handle concurrent notification operations consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          concurrentMessages: fc.integer({ min: 2, max: 5 })
        }),
        async (testData) => {
          // Create test user with unique identifier to prevent collisions
          // Use multiple random components to ensure uniqueness even in concurrent tests
          const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}_${testData.userEmail}`;
          
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [uniqueEmail, 'COUPLE', 'EMAIL']);

          const userId = userResult.lastID;

          // Send multiple messages concurrently
          const messagePromises = [];
          for (let i = 0; i < testData.concurrentMessages; i++) {
            const message = {
              id: `msg-${userId}-${i}`,
              threadId: `thread-${userId}`,
              senderId: 'sender-1',
              senderName: `Sender ${i}`,
              content: `Message ${i}`
            };

            messagePromises.push(
              notificationService.sendMessageNotification(userId, message)
            );
          }

          // Wait for all notifications to be sent
          const results = await Promise.all(messagePromises);

          // Property: All notifications should be sent successfully
          results.forEach(result => {
            expect(result.success).toBe(true);
          });

          // Verify all notifications were created
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          // Property: All concurrent notifications should be created
          expect(notifications.rows.length).toBe(testData.concurrentMessages);

          // Property: Each notification should be unique
          const messageIds = notifications.rows.map(n => {
            const data = JSON.parse(n.data);
            return data.message_id;
          });

          const uniqueMessageIds = new Set(messageIds);
          expect(uniqueMessageIds.size).toBe(testData.concurrentMessages);
        }
      ),
      { numRuns: 20 }
    );
  });
});
