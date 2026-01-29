/**
 * Property-Based Tests for Priority Notification Handling
 * Feature: vendor-dashboard-messaging-enhancement
 * Property 11: Priority Notification Handling
 * Validates: Requirements 5.4, 5.5
 * 
 * Tests that urgent messages provide priority alerts with distinct indicators
 * and notification preferences are respected for alert frequency and methods.
 */

const fc = require('fast-check');
const notificationService = require('../services/notificationService');
const { query } = require('../config/database');

describe('Property 11: Priority Notification Handling', () => {
  beforeAll(async () => {
    try {
      // Ensure tables exist with correct schema matching the application
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
      await query('DELETE FROM notification_preferences');
      await query('DELETE FROM users WHERE email LIKE ?', ['test_%@example.com']);
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
   * Property: For any urgent message, the system should create a notification
   * with priority set to 'urgent' and provide distinct indicators
   */
  test('should handle urgent messages with priority alerts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          recipientEmail: fc.emailAddress(),
          messageId: fc.uuid(),
          threadId: fc.uuid(),
          senderId: fc.uuid(),
          senderName: fc.string({ minLength: 1, maxLength: 50 }),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          priority: fc.constantFrom('normal', 'high', 'urgent')
        }),
        async (testData) => {
          // Create test user
          const userResult = await query(`
            INSERT INTO users (email, phone, phone_verified, user_type, auth_provider)
            VALUES (?, ?, ?, ?, ?)
          `, [`test_${testData.recipientEmail}`, null, false, 'COUPLE', 'EMAIL']);

          const userId = userResult.lastID;

          // Create message with priority
          const message = {
            id: testData.messageId,
            threadId: testData.threadId,
            senderId: testData.senderId,
            senderName: testData.senderName,
            content: testData.content,
            priority: testData.priority
          };

          // Send notification
          const result = await notificationService.sendMessageNotification(
            userId,
            message
          );

          // Verify notification was created
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          // Property: Notification should be created with correct priority
          expect(result.success).toBe(true);
          expect(notifications.rows.length).toBeGreaterThan(0);

          const notification = notifications.rows[0];
          expect(notification.priority).toBe(testData.priority);

          // Property: Urgent messages should have distinct indicators
          if (testData.priority === 'urgent') {
            // Verify notification data contains priority information
            const notifData = JSON.parse(notification.data);
            expect(notifData.priority).toBe('urgent');
            
            // Urgent notifications should be clearly marked
            expect(notification.priority).toBe('urgent');
          }

          // Property: All priority levels should be preserved correctly
          expect(['normal', 'high', 'urgent']).toContain(notification.priority);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any notification preference configuration, the system
   * should respect user choices for alert frequency and methods
   */
  test('should respect notification preferences for all priority levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          emailNotifications: fc.boolean(),
          pushNotifications: fc.boolean(),
          smsNotifications: fc.boolean(),
          priority: fc.constantFrom('normal', 'high', 'urgent')
        }),
        async (testData) => {
          // Create test user
          const userResult = await query(`
            INSERT INTO users (email, phone, phone_verified, user_type, auth_provider)
            VALUES (?, ?, ?, ?, ?)
          `, [`test_${testData.userEmail}`, '+1234567890', true, 'VENDOR', 'EMAIL']);

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

          await notificationService.updateNotificationPreferences(
            userId,
            preferences
          );

          // Create message with priority
          const message = {
            id: 'test-msg-id',
            threadId: 'test-thread-id',
            senderId: 'test-sender-id',
            senderName: 'Test Sender',
            content: 'Test message content',
            priority: testData.priority
          };

          // Send notification
          const result = await notificationService.sendMessageNotification(
            userId,
            message,
            preferences
          );

          // Property: Notification should be sent successfully
          expect(result.success).toBe(true);

          // Verify preferences were respected
          const retrievedPrefs = await notificationService.getUserNotificationPreferences(userId);
          
          // Property: Preferences should match what was set
          expect(retrievedPrefs.emailNotifications).toBe(testData.emailNotifications);
          expect(retrievedPrefs.pushNotifications).toBe(testData.pushNotifications);
          expect(retrievedPrefs.smsNotifications).toBe(testData.smsNotifications);

          // Verify notification was created with correct priority
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          expect(notifications.rows.length).toBeGreaterThan(0);
          expect(notifications.rows[0].priority).toBe(testData.priority);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any quiet hours configuration, urgent notifications
   * should still be delivered but respect the quiet hours setting
   */
  test('should handle quiet hours with priority consideration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          quietHoursStart: fc.constantFrom('20:00', '21:00', '22:00', '23:00'),
          quietHoursEnd: fc.constantFrom('06:00', '07:00', '08:00', '09:00'),
          priority: fc.constantFrom('normal', 'high', 'urgent')
        }),
        async (testData) => {
          // Create test user
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [`test_${testData.userEmail}`, 'COUPLE', 'EMAIL']);

          const userId = userResult.lastID;

          // Set notification preferences with quiet hours
          const preferences = {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            quietHours: {
              start: testData.quietHoursStart,
              end: testData.quietHoursEnd
            }
          };

          await notificationService.updateNotificationPreferences(
            userId,
            preferences
          );

          // Verify quiet hours were saved correctly
          const retrievedPrefs = await notificationService.getUserNotificationPreferences(userId);
          
          // Property: Quiet hours should be stored correctly
          expect(retrievedPrefs.quietHours.start).toBe(testData.quietHoursStart);
          expect(retrievedPrefs.quietHours.end).toBe(testData.quietHoursEnd);

          // Test isInQuietHours function
          const isQuiet = notificationService.isInQuietHours(retrievedPrefs.quietHours);
          
          // Property: isInQuietHours should return a boolean
          expect(typeof isQuiet).toBe('boolean');

          // Create message with priority
          const message = {
            id: 'test-msg-id',
            threadId: 'test-thread-id',
            senderId: 'test-sender-id',
            senderName: 'Test Sender',
            content: 'Test message content',
            priority: testData.priority
          };

          // Send notification
          const result = await notificationService.sendMessageNotification(
            userId,
            message,
            preferences
          );

          // Property: Notification should be created regardless of quiet hours
          expect(result.success).toBe(true);

          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          expect(notifications.rows.length).toBeGreaterThan(0);
          expect(notifications.rows[0].priority).toBe(testData.priority);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any sequence of notifications with different priorities,
   * the system should maintain correct priority ordering and indicators
   */
  test('should maintain priority ordering for multiple notifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          notificationCount: fc.integer({ min: 2, max: 10 })
        }),
        async (testData) => {
          // Create test user
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [`test_${testData.userEmail}`, 'VENDOR', 'EMAIL']);

          const userId = userResult.lastID;

          // Create notifications with different priorities
          const priorities = ['normal', 'high', 'urgent'];
          const createdNotifications = [];

          for (let i = 0; i < testData.notificationCount; i++) {
            const priority = priorities[i % priorities.length];
            
            const message = {
              id: `msg-${i}`,
              threadId: 'thread-1',
              senderId: 'sender-1',
              senderName: `Sender ${i}`,
              content: `Message ${i}`,
              priority: priority
            };

            await notificationService.sendMessageNotification(userId, message);
            createdNotifications.push({ index: i, priority });
          }

          // Retrieve all notifications
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
            ORDER BY created_at DESC
          `, [userId]);

          // Property: All notifications should be created
          expect(notifications.rows.length).toBe(testData.notificationCount);

          // Property: Each notification should have correct priority
          notifications.rows.forEach((notification, idx) => {
            const expectedPriority = createdNotifications[testData.notificationCount - 1 - idx].priority;
            expect(notification.priority).toBe(expectedPriority);
            
            // Verify priority is one of the valid values
            expect(['normal', 'high', 'urgent']).toContain(notification.priority);
          });

          // Property: Urgent notifications should be identifiable
          const urgentNotifications = notifications.rows.filter(n => n.priority === 'urgent');
          urgentNotifications.forEach(notification => {
            expect(notification.priority).toBe('urgent');
            const data = JSON.parse(notification.data);
            expect(data.priority).toBe('urgent');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any priority level, notification data should contain
   * complete information including priority indicators
   */
  test('should include priority indicators in notification data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          messageId: fc.uuid(),
          threadId: fc.uuid(),
          senderId: fc.uuid(),
          senderName: fc.string({ minLength: 1, maxLength: 50 }),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          priority: fc.constantFrom('normal', 'high', 'urgent')
        }),
        async (testData) => {
          // Create test user
          const userResult = await query(`
            INSERT INTO users (email, user_type, auth_provider)
            VALUES (?, ?, ?)
          `, [`test_${testData.userEmail}`, 'COUPLE', 'EMAIL']);

          const userId = userResult.lastID;

          // Create message with priority
          const message = {
            id: testData.messageId,
            threadId: testData.threadId,
            senderId: testData.senderId,
            senderName: testData.senderName,
            content: testData.content,
            priority: testData.priority
          };

          // Send notification
          await notificationService.sendMessageNotification(userId, message);

          // Retrieve notification
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          expect(notifications.rows.length).toBeGreaterThan(0);

          const notification = notifications.rows[0];
          const notifData = JSON.parse(notification.data);

          // Property: Notification data should contain all required fields
          expect(notifData.message_id).toBe(testData.messageId);
          expect(notifData.thread_id).toBe(testData.threadId);
          expect(notifData.sender_id).toBe(testData.senderId);
          expect(notifData.sender_name).toBe(testData.senderName);
          expect(notifData.priority).toBe(testData.priority);

          // Property: Priority should be consistent between notification and data
          expect(notification.priority).toBe(notifData.priority);

          // Property: Content preview should be included
          expect(notifData.preview).toBeDefined();
          expect(typeof notifData.preview).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any combination of notification preferences and priorities,
   * the system should handle all valid configurations correctly
   */
  test('should handle all preference and priority combinations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          emailNotifications: fc.boolean(),
          pushNotifications: fc.boolean(),
          smsNotifications: fc.boolean(),
          priority: fc.constantFrom('normal', 'high', 'urgent'),
          phoneVerified: fc.boolean()
        }),
        async (testData) => {
          // Create test user
          const userResult = await query(`
            INSERT INTO users (email, phone, phone_verified, user_type, auth_provider)
            VALUES (?, ?, ?, ?, ?)
          `, [
            `test_${testData.userEmail}`,
            testData.phoneVerified ? '+1234567890' : null,
            testData.phoneVerified,
            'VENDOR',
            'EMAIL'
          ]);

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

          await notificationService.updateNotificationPreferences(
            userId,
            preferences
          );

          // Create message with priority
          const message = {
            id: 'test-msg-id',
            threadId: 'test-thread-id',
            senderId: 'test-sender-id',
            senderName: 'Test Sender',
            content: 'Test message content',
            priority: testData.priority
          };

          // Send notification
          const result = await notificationService.sendMessageNotification(
            userId,
            message,
            preferences
          );

          // Property: Notification should be sent successfully for all combinations
          expect(result.success).toBe(true);

          // Verify notification was created
          const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND type = 'new_message'
          `, [userId]);

          expect(notifications.rows.length).toBeGreaterThan(0);

          const notification = notifications.rows[0];

          // Property: Priority should be preserved
          expect(notification.priority).toBe(testData.priority);

          // Property: Notification should be unread initially
          expect(notification.is_read).toBe(false);

          // Property: Notification type should be correct
          expect(notification.type).toBe('new_message');
        }
      ),
      { numRuns: 100 }
    );
  });
});
