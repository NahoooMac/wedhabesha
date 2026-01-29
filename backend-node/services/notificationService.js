const smsService = require('./smsService');
const { query } = require('../config/database');
const redis = require('redis');

class NotificationService {
  constructor() {
    // Initialize Redis client for notification queuing
    this.redisClient = null;
    this.initRedis();
  }

  /**
   * Initialize Redis connection for offline notification queuing
   */
  async initRedis() {
    try {
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis max reconnection attempts reached');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis connected for notification queuing');
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      // Continue without Redis - notifications will still work but without queuing
    }
  }
  /**
   * Send vendor verification notification
   * @param {number} vendorId - Vendor ID
   * @param {string} status - Verification status ('verified', 'rejected')
   * @param {string} reason - Reason for rejection (optional)
   */
  async sendVendorVerificationNotification(vendorId, status, reason = null) {
    try {
      // Get vendor details
      const vendorResult = await query(`
        SELECT v.*, u.email 
        FROM vendors v 
        JOIN users u ON v.user_id = u.id 
        WHERE v.id = ?
      `, [vendorId]);

      if (vendorResult.rows.length === 0) {
        throw new Error('Vendor not found');
      }

      const vendor = vendorResult.rows[0];

      // Create notification record
      await this.createNotification({
        user_id: vendor.user_id,
        type: 'vendor_verification',
        title: status === 'verified' ? 'Account Verified!' : 'Verification Update',
        message: this.getVerificationMessage(status, reason),
        data: {
          vendor_id: vendorId,
          status,
          reason
        }
      });

      // Send SMS notification if phone is available and verified
      if (vendor.phone && vendor.phone_verified) {
        await this.sendVerificationSMS(vendor.phone, vendor.business_name, status, reason);
      }

      console.log(`✅ Verification notification sent to vendor ${vendorId} (${status})`);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to send verification notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message notification to recipient
   * @param {string} recipientId - User ID of the recipient
   * @param {Object} message - Message object containing sender info and content
   * @param {Object} preferences - User notification preferences
   */
  async sendMessageNotification(recipientId, message, preferences = null) {
    try {
      // Get recipient details
      const userResult = await query(`
        SELECT id, email, phone 
        FROM users 
        WHERE id = ?
      `, [recipientId]);

      if (userResult.rows.length === 0) {
        throw new Error('Recipient not found');
      }

      const recipient = userResult.rows[0];

      // Get or use default preferences
      const userPrefs = preferences || await this.getUserNotificationPreferences(recipientId);

      // Check if user is online
      const isOnline = await this.isUserOnline(recipientId);

      // Create notification record
      const notification = {
        user_id: recipientId,
        type: 'new_message',
        title: 'New Message',
        message: `You have a new message from ${message.senderName || 'a user'}`,
        data: {
          message_id: message.id,
          thread_id: message.threadId,
          sender_id: message.senderId,
          sender_name: message.senderName,
          preview: message.content ? message.content.substring(0, 100) : '',
          priority: message.priority || 'normal'
        },
        priority: message.priority || 'normal'
      };

      await this.createNotification(notification);

      // If user is offline, queue notification for later delivery
      if (!isOnline) {
        await this.queueNotificationForOfflineUser(recipientId, notification);
      }

      // Send push notification if enabled
      if (userPrefs.pushNotifications && !this.isInQuietHours(userPrefs.quietHours)) {
        await this.sendPushNotification(recipientId, notification);
      }

      // Send SMS if enabled and phone is verified
      if (userPrefs.smsNotifications && recipient.phone && recipient.phone_verified) {
        await this.sendMessageSMS(recipient.phone, message);
      }

      console.log(`✅ Message notification sent to user ${recipientId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to send message notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send typing indicator notification
   * @param {string} recipientId - User ID of the recipient
   * @param {string} threadId - Thread ID
   * @param {string} senderName - Name of the user typing
   */
  async sendTypingNotification(recipientId, threadId, senderName) {
    try {
      // Typing notifications are real-time only, no persistence needed
      // This is handled by WebSocket in connectionManager
      // But we can log it for analytics
      console.log(`📝 Typing notification: ${senderName} is typing in thread ${threadId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send typing notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Queue notification for offline user using Redis
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  async queueNotificationForOfflineUser(userId, notification) {
    try {
      if (!this.redisClient || !this.redisClient.isOpen) {
        console.warn('⚠️ Redis not available, skipping notification queuing');
        return { success: false, error: 'Redis not available' };
      }

      const queueKey = `offline_notifications:${userId}`;
      const notificationData = JSON.stringify({
        ...notification,
        queued_at: new Date().toISOString()
      });

      await this.redisClient.rPush(queueKey, notificationData);
      
      // Set expiry for 7 days
      await this.redisClient.expire(queueKey, 7 * 24 * 60 * 60);

      console.log(`✅ Notification queued for offline user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to queue notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deliver queued notifications when user comes online
   * @param {string} userId - User ID
   */
  async deliverQueuedNotifications(userId) {
    try {
      if (!this.redisClient || !this.redisClient.isOpen) {
        console.warn('⚠️ Redis not available, skipping queued notification delivery');
        return { success: false, error: 'Redis not available' };
      }

      const queueKey = `offline_notifications:${userId}`;
      const queuedNotifications = await this.redisClient.lRange(queueKey, 0, -1);

      if (queuedNotifications.length === 0) {
        return { success: true, delivered: 0 };
      }

      // Parse and deliver each notification
      const notifications = queuedNotifications.map(n => JSON.parse(n));
      
      for (const notification of notifications) {
        // Send push notification for queued items
        await this.sendPushNotification(userId, notification);
      }

      // Clear the queue
      await this.redisClient.del(queueKey);

      console.log(`✅ Delivered ${notifications.length} queued notifications to user ${userId}`);
      return { success: true, delivered: notifications.length };

    } catch (error) {
      console.error('❌ Failed to deliver queued notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is currently online
   * @param {string} userId - User ID
   */
  async isUserOnline(userId) {
    try {
      const result = await query(`
        SELECT is_online 
        FROM user_connection_status 
        WHERE user_id = ?
      `, [userId]);

      return result.rows.length > 0 && result.rows[0].is_online;
    } catch (error) {
      console.error('❌ Failed to check user online status:', error);
      return false;
    }
  }

  /**
   * Send push notification (placeholder for actual push service integration)
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  async sendPushNotification(userId, notification) {
    try {
      // TODO: Integrate with actual push notification service (Firebase, OneSignal, etc.)
      // For now, we'll just log it
      console.log(`📱 Push notification would be sent to user ${userId}:`, {
        title: notification.title,
        message: notification.message,
        priority: notification.priority || 'normal'
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification for new message
   * @param {string} phone - Phone number
   * @param {Object} message - Message object
   */
  async sendMessageSMS(phone, message) {
    try {
      const smsText = `New message from ${message.senderName || 'a user'}: ${message.content ? message.content.substring(0, 100) : 'View in app'}`;
      await smsService.sendSMS(phone, smsText);
      console.log(`✅ SMS message notification sent to ${phone}`);
    } catch (error) {
      console.error('❌ Failed to send SMS message notification:', error);
      // Don't throw - SMS failure shouldn't break notification flow
    }
  }

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   */
  async getUserNotificationPreferences(userId) {
    try {
      const result = await query(`
        SELECT * FROM notification_preferences 
        WHERE user_id = ?
      `, [userId]);

      if (result.rows.length === 0) {
        // Return default preferences
        return {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          quietHours: {
            start: '22:00',
            end: '08:00'
          }
        };
      }

      const prefs = result.rows[0];
      return {
        emailNotifications: prefs.email_notifications,
        pushNotifications: prefs.push_notifications,
        smsNotifications: prefs.sms_notifications,
        quietHours: prefs.quiet_hours ? JSON.parse(prefs.quiet_hours) : { start: '22:00', end: '08:00' }
      };

    } catch (error) {
      console.error('❌ Failed to get notification preferences:', error);
      // Return defaults on error
      return {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      };
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Notification preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      // Create table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          email_notifications BOOLEAN DEFAULT TRUE,
          push_notifications BOOLEAN DEFAULT TRUE,
          sms_notifications BOOLEAN DEFAULT FALSE,
          quiet_hours TEXT, -- JSON: {start: "22:00", end: "08:00"}
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Check if preferences exist
      const existing = await query(`
        SELECT id FROM notification_preferences WHERE user_id = ?
      `, [userId]);

      const quietHoursJson = preferences.quietHours ? JSON.stringify(preferences.quietHours) : null;

      if (existing.rows.length === 0) {
        // Insert new preferences
        await query(`
          INSERT INTO notification_preferences 
          (user_id, email_notifications, push_notifications, sms_notifications, quiet_hours)
          VALUES (?, ?, ?, ?, ?)
        `, [
          userId,
          preferences.emailNotifications !== undefined ? preferences.emailNotifications : true,
          preferences.pushNotifications !== undefined ? preferences.pushNotifications : true,
          preferences.smsNotifications !== undefined ? preferences.smsNotifications : false,
          quietHoursJson
        ]);
      } else {
        // Update existing preferences
        await query(`
          UPDATE notification_preferences 
          SET email_notifications = ?,
              push_notifications = ?,
              sms_notifications = ?,
              quiet_hours = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [
          preferences.emailNotifications !== undefined ? preferences.emailNotifications : true,
          preferences.pushNotifications !== undefined ? preferences.pushNotifications : true,
          preferences.smsNotifications !== undefined ? preferences.smsNotifications : false,
          quietHoursJson,
          userId
        ]);
      }

      console.log(`✅ Notification preferences updated for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to update notification preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if current time is within quiet hours
   * @param {Object} quietHours - Quiet hours object with start and end times
   */
  isInQuietHours(quietHours) {
    if (!quietHours || !quietHours.start || !quietHours.end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Create in-app notification
   */
  async createNotification(notificationData) {
    // Create notifications table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT, -- JSON data
        priority TEXT DEFAULT 'normal', -- normal, high, urgent
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await query(`
      INSERT INTO notifications (user_id, type, title, message, data, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      notificationData.user_id,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      JSON.stringify(notificationData.data || {}),
      notificationData.priority || 'normal'
    ]);
  }

  /**
   * Send SMS verification notification
   */
  async sendVerificationSMS(phone, businessName, status, reason) {
    try {
      let message;
      
      if (status === 'verified') {
        message = `🎉 Great news! Your ${businessName} account has been verified by WedHabesha. You are now visible to customers and can start receiving leads. Welcome to our verified vendor community!`;
      } else if (status === 'rejected') {
        message = `Your ${businessName} verification was not approved. ${reason ? `Reason: ${reason}` : 'Please review your profile and resubmit.'} Contact support for assistance.`;
      } else {
        message = `Your ${businessName} verification status has been updated to: ${status}. Check your dashboard for details.`;
      }

      await smsService.sendSMS(phone, message);
      console.log(`✅ SMS verification notification sent to ${phone}`);
      
    } catch (error) {
      console.error('❌ Failed to send SMS verification notification:', error);
      // Don't throw error - SMS failure shouldn't break the verification process
    }
  }

  /**
   * Get verification message based on status
   */
  getVerificationMessage(status, reason) {
    switch (status) {
      case 'verified':
        return 'Congratulations! Your account has been verified. You are now visible to customers and can start receiving leads.';
      case 'rejected':
        return reason 
          ? `Your verification was not approved. Reason: ${reason}. Please update your profile and resubmit.`
          : 'Your verification was not approved. Please review your profile and resubmit for verification.';
      default:
        return `Your verification status has been updated to: ${status}`;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const result = await query(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);

      return {
        success: true,
        notifications: result.rows.map(notification => ({
          ...notification,
          data: notification.data ? JSON.parse(notification.data) : {}
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      await query(`
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE id = ? AND user_id = ?
      `, [notificationId, userId]);

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const result = await query(`
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ? AND is_read = FALSE
      `, [userId]);

      return {
        success: true,
        count: result.rows[0]?.count || 0
      };
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup() {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.quit();
        console.log('✅ Redis connection closed');
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

module.exports = new NotificationService();