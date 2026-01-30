const smsService = require('./smsService');
const notificationService = require('./notificationService');
const { query } = require('../config/database');

class SMSReminderService {
  constructor() {
    this.reminderTimeouts = new Map(); // Store active reminder timeouts
    this.reminderDelay = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.fallbackPhone = '+251901959439'; // Fallback SMS number for 500 errors
    
    console.log('✅ SMS Reminder Service initialized');
    console.log('📋 Configuration:');
    console.log('  - Reminder delay:', this.reminderDelay / 1000 / 60, 'minutes');
    console.log('  - Fallback phone:', this.fallbackPhone);
  }

  /**
   * Schedule SMS reminder for unread message
   * @param {string} userId - User ID who should receive the reminder
   * @param {string} threadId - Thread ID with unread messages
   * @param {Object} messageInfo - Information about the message
   */
  async scheduleUnreadReminder(userId, threadId, messageInfo) {
    try {
      // Create unique key for this reminder
      const reminderKey = `${userId}-${threadId}`;
      
      // Cancel existing reminder for this user-thread combination
      if (this.reminderTimeouts.has(reminderKey)) {
        clearTimeout(this.reminderTimeouts.get(reminderKey));
        this.reminderTimeouts.delete(reminderKey);
      }

      // Schedule new reminder
      const timeoutId = setTimeout(async () => {
        await this.sendUnreadReminder(userId, threadId, messageInfo);
        this.reminderTimeouts.delete(reminderKey);
      }, this.reminderDelay);

      this.reminderTimeouts.set(reminderKey, timeoutId);
      
      console.log(`📅 SMS reminder scheduled for user ${userId} in thread ${threadId} (30 minutes)`);
      
    } catch (error) {
      console.error('❌ Failed to schedule SMS reminder:', error);
    }
  }

  /**
   * Cancel SMS reminder for a thread (when messages are read)
   * @param {string} userId - User ID
   * @param {string} threadId - Thread ID
   */
  cancelUnreadReminder(userId, threadId) {
    try {
      const reminderKey = `${userId}-${threadId}`;
      
      if (this.reminderTimeouts.has(reminderKey)) {
        clearTimeout(this.reminderTimeouts.get(reminderKey));
        this.reminderTimeouts.delete(reminderKey);
        console.log(`❌ SMS reminder cancelled for user ${userId} in thread ${threadId}`);
      }
    } catch (error) {
      console.error('❌ Failed to cancel SMS reminder:', error);
    }
  }

  /**
   * Send SMS reminder for unread messages
   * @param {string} userId - User ID
   * @param {string} threadId - Thread ID
   * @param {Object} messageInfo - Message information
   */
  async sendUnreadReminder(userId, threadId, messageInfo) {
    try {
      console.log(`📱 Sending SMS reminder for user ${userId} in thread ${threadId}`);

      // Get user details
      const userResult = await query(`
        SELECT u.*, 
               CASE 
                 WHEN u.user_type = 'COUPLE' THEN c.phone
                 WHEN u.user_type = 'VENDOR' THEN v.phone
               END as phone,
               CASE 
                 WHEN u.user_type = 'COUPLE' THEN CONCAT(c.partner1_name, ' & ', c.partner2_name)
                 WHEN u.user_type = 'VENDOR' THEN v.business_name
               END as display_name
        FROM users u
        LEFT JOIN couples c ON u.id = c.user_id AND u.user_type = 'COUPLE'
        LEFT JOIN vendors v ON u.id = v.user_id AND u.user_type = 'VENDOR'
        WHERE u.id = ?
      `, [userId]);

      if (userResult.rows.length === 0) {
        console.error('❌ User not found for SMS reminder:', userId);
        return;
      }

      const user = userResult.rows[0];
      
      if (!user.phone) {
        console.log('⚠️ No phone number found for user:', userId);
        return;
      }

      // Check if there are still unread messages in this thread
      const unreadCount = await this.getUnreadCount(userId, threadId);
      if (unreadCount === 0) {
        console.log('✅ No unread messages found, skipping SMS reminder');
        return;
      }

      // Get sender information
      const senderName = messageInfo.senderName || 'someone';
      const messagePreview = messageInfo.content ? 
        messageInfo.content.substring(0, 100) + (messageInfo.content.length > 100 ? '...' : '') : 
        'New message';

      // Create SMS message
      const smsMessage = `Hi ${user.display_name || 'there'}! You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''} from ${senderName}: "${messagePreview}". Check your WedHabesha messages to reply.`;

      // Try to send SMS
      try {
        const result = await smsService.sendSMS(user.phone, smsMessage);
        
        if (result.success) {
          console.log(`✅ SMS reminder sent successfully to ${user.phone}`);
          
          // Log the reminder in database
          await this.logSMSReminder(userId, threadId, user.phone, smsMessage, 'sent');
        } else {
          console.error('❌ SMS reminder failed:', result.error);
          
          // Send fallback SMS on failure
          await this.sendFallbackSMS(smsMessage, result.error);
          
          // Log the failed reminder
          await this.logSMSReminder(userId, threadId, user.phone, smsMessage, 'failed', result.error);
        }
      } catch (smsError) {
        console.error('❌ SMS reminder error:', smsError);
        
        // Send fallback SMS on error
        await this.sendFallbackSMS(smsMessage, smsError.message);
        
        // Log the error
        await this.logSMSReminder(userId, threadId, user.phone, smsMessage, 'error', smsError.message);
      }

    } catch (error) {
      console.error('❌ Failed to send SMS reminder:', error);
    }
  }

  /**
   * Send fallback SMS to test number when main SMS fails
   * @param {string} originalMessage - Original message that failed
   * @param {string} errorReason - Reason for failure
   */
  async sendFallbackSMS(originalMessage, errorReason) {
    try {
      const fallbackMessage = `[FALLBACK SMS] Original message failed (${errorReason}): ${originalMessage}`;
      
      const result = await smsService.sendSMS(this.fallbackPhone, fallbackMessage);
      
      if (result.success) {
        console.log(`✅ Fallback SMS sent to ${this.fallbackPhone}`);
      } else {
        console.error('❌ Fallback SMS also failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Fallback SMS error:', error);
    }
  }

  /**
   * Get unread message count for user in specific thread
   * @param {string} userId - User ID
   * @param {string} threadId - Thread ID
   */
  async getUnreadCount(userId, threadId) {
    try {
      // Get user type
      const userResult = await query('SELECT user_type FROM users WHERE id = ?', [userId]);
      if (userResult.rows.length === 0) return 0;

      const userType = userResult.rows[0].user_type;

      let countQuery;
      let countParams;

      if (userType === 'COUPLE') {
        // Get couple ID
        const coupleResult = await query('SELECT id FROM couples WHERE user_id = ?', [userId]);
        if (coupleResult.rows.length === 0) return 0;
        
        countQuery = `
          SELECT COUNT(*) as count
          FROM messages m
          JOIN message_threads t ON m.thread_id = t.id
          WHERE t.id = ? AND t.couple_id = ? AND m.is_read = 0 AND m.sender_type != 'couple'
        `;
        countParams = [threadId, coupleResult.rows[0].id];
      } else if (userType === 'VENDOR') {
        // Get vendor ID
        const vendorResult = await query('SELECT id FROM vendors WHERE user_id = ?', [userId]);
        if (vendorResult.rows.length === 0) return 0;
        
        countQuery = `
          SELECT COUNT(*) as count
          FROM messages m
          JOIN message_threads t ON m.thread_id = t.id
          WHERE t.id = ? AND t.vendor_id = ? AND m.is_read = 0 AND m.sender_type != 'vendor'
        `;
        countParams = [threadId, vendorResult.rows[0].id];
      } else {
        return 0;
      }

      const result = await query(countQuery, countParams);
      return parseInt(result.rows[0]?.count) || 0;

    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Log SMS reminder attempt
   * @param {string} userId - User ID
   * @param {string} threadId - Thread ID
   * @param {string} phone - Phone number
   * @param {string} message - SMS message
   * @param {string} status - Status (sent, failed, error)
   * @param {string} errorReason - Error reason if failed
   */
  async logSMSReminder(userId, threadId, phone, message, status, errorReason = null) {
    try {
      // Create table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS sms_reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          thread_id TEXT NOT NULL,
          phone TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT NOT NULL,
          error_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      await query(`
        INSERT INTO sms_reminders (user_id, thread_id, phone, message, status, error_reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, threadId, phone, message, status, errorReason]);

      console.log(`📝 SMS reminder logged: ${status} for user ${userId}`);

    } catch (error) {
      console.error('❌ Failed to log SMS reminder:', error);
    }
  }

  /**
   * Get SMS reminder statistics
   * @param {string} userId - User ID (optional)
   * @param {Date} startDate - Start date (optional)
   * @param {Date} endDate - End date (optional)
   */
  async getReminderStats(userId = null, startDate = null, endDate = null) {
    try {
      let statsQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM sms_reminders
        WHERE 1=1
      `;
      const params = [];

      if (userId) {
        statsQuery += ' AND user_id = ?';
        params.push(userId);
      }

      if (startDate) {
        statsQuery += ' AND created_at >= ?';
        params.push(startDate.toISOString());
      }

      if (endDate) {
        statsQuery += ' AND created_at <= ?';
        params.push(endDate.toISOString());
      }

      statsQuery += ' GROUP BY status, DATE(created_at) ORDER BY created_at DESC';

      const result = await query(statsQuery, params);
      return result.rows;

    } catch (error) {
      console.error('❌ Failed to get reminder stats:', error);
      return [];
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  cleanup() {
    try {
      // Cancel all pending reminders
      for (const [key, timeoutId] of this.reminderTimeouts) {
        clearTimeout(timeoutId);
      }
      this.reminderTimeouts.clear();
      console.log('✅ SMS reminder service cleaned up');
    } catch (error) {
      console.error('❌ Error during SMS reminder cleanup:', error);
    }
  }
}

module.exports = new SMSReminderService();