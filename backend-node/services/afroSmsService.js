/**
 * AfroSMS Service
 * 
 * Handles SMS notifications via AfroSMS API for unread messages.
 * Sends SMS alerts when messages remain unread for 24 hours.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-29
 */

const axios = require('axios');
const { query } = require('../config/database');

class AfroSmsService {
  constructor() {
    this.apiUrl = process.env.AFROSMS_API_URL || 'https://api.afrosms.com/api/v1/send';
    this.apiKey = process.env.AFROSMS_API_KEY || '';
    this.senderId = process.env.AFROSMS_SENDER_ID || 'WedHabesha';
    this.enabled = process.env.SMS_NOTIFICATION_ENABLED === 'true';
    this.testNumber = process.env.SMS_TEST_NUMBER || '0901959439';
    this.delayHours = parseInt(process.env.SMS_NOTIFICATION_DELAY_HOURS || '24');
  }

  /**
   * Send SMS notification via AfroSMS API
   * 
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - SMS message content
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendSMS(phoneNumber, message) {
    if (!this.enabled) {
      console.log('📱 SMS notifications are disabled');
      return {
        success: false,
        error: 'SMS notifications are disabled'
      };
    }

    if (!this.apiKey) {
      console.error('❌ AfroSMS API key not configured');
      return {
        success: false,
        error: 'AfroSMS API key not configured'
      };
    }

    try {
      console.log(`📱 Sending SMS to ${phoneNumber}: ${message}`);

      // Format phone number (remove spaces, dashes, etc.)
      const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

      // Prepare request payload
      const payload = {
        sender: this.senderId,
        to: formattedPhone,
        message: message,
        callback_url: process.env.AFROSMS_CALLBACK_URL || undefined
      };

      // Send SMS via AfroSMS API
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data && response.data.success) {
        console.log(`✅ SMS sent successfully to ${phoneNumber}`);
        return {
          success: true,
          messageId: response.data.message_id || response.data.id
        };
      } else {
        console.error('❌ AfroSMS API returned error:', response.data);
        return {
          success: false,
          error: response.data.message || 'Unknown error from AfroSMS API'
        };
      }

    } catch (error) {
      console.error('❌ Failed to send SMS:', error.message);
      
      if (error.response) {
        // API returned an error response
        return {
          success: false,
          error: error.response.data?.message || error.message
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          error: 'No response from AfroSMS API'
        };
      } else {
        // Error setting up the request
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  /**
   * Send SMS notification for unread message
   * 
   * @param {object} message - Message object
   * @param {object} thread - Thread object
   * @param {string} recipientPhone - Recipient phone number
   * @param {string} senderName - Sender name
   * @returns {Promise<{success: boolean, notificationId?: number, error?: string}>}
   */
  async sendUnreadMessageNotification(message, thread, recipientPhone, senderName) {
    try {
      // Check if SMS notification already sent for this message
      const existingNotification = await query(
        `SELECT id FROM sms_notifications 
         WHERE message_id = ? AND delivery_status = 'sent'`,
        [message.id]
      );

      if (existingNotification.rows.length > 0) {
        console.log(`⏭️  SMS notification already sent for message ${message.id}`);
        return {
          success: false,
          error: 'SMS notification already sent for this message'
        };
      }

      // Format SMS message
      const smsContent = `You have unread messages from ${senderName} on WedHabesha. Visit wedhabesha.com to reply.`;

      // Send SMS
      const smsResult = await this.sendSMS(recipientPhone, smsContent);

      // Record SMS notification in database
      const insertResult = await query(
        `INSERT INTO sms_notifications (
          message_id, thread_id, recipient_phone, sms_content,
          sent_at, delivery_status, afrosms_message_id, error_message
        ) VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?)`,
        [
          message.id,
          thread.id,
          recipientPhone,
          smsContent,
          smsResult.success ? 'sent' : 'failed',
          smsResult.messageId || null,
          smsResult.error || null
        ]
      );

      const notificationId = insertResult.lastID || insertResult.rows[0]?.id;

      if (smsResult.success) {
        console.log(`✅ SMS notification sent for message ${message.id}`);
        return {
          success: true,
          notificationId: notificationId
        };
      } else {
        console.error(`❌ Failed to send SMS notification for message ${message.id}:`, smsResult.error);
        return {
          success: false,
          error: smsResult.error
        };
      }

    } catch (error) {
      console.error('❌ Failed to send unread message notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check for unread messages older than configured delay and send SMS notifications
   * 
   * @returns {Promise<{success: boolean, notificationsSent: number, errors: number}>}
   */
  async checkAndNotifyUnreadMessages() {
    if (!this.enabled) {
      console.log('📱 SMS notifications are disabled');
      return {
        success: true,
        notificationsSent: 0,
        errors: 0
      };
    }

    try {
      console.log(`🔍 Checking for unread messages older than ${this.delayHours} hours...`);

      // Calculate cutoff time
      const cutoffTime = new Date(Date.now() - this.delayHours * 60 * 60 * 1000);

      // Find unread messages older than cutoff time that haven't been notified
      const unreadMessages = await query(
        `SELECT 
          m.id, m.thread_id, m.sender_id, m.sender_type, m.content, m.created_at,
          mt.couple_id, mt.vendor_id,
          c.user_id as couple_user_id,
          v.user_id as vendor_user_id,
          c.phone as couple_phone, c.partner1_name as couple_name,
          v.phone as vendor_phone, v.business_name as vendor_name
        FROM messages m
        JOIN message_threads mt ON m.thread_id = mt.id
        LEFT JOIN couples c ON mt.couple_id = c.id
        LEFT JOIN vendors v ON mt.vendor_id = v.id
        WHERE m.delivery_status IN ('sent', 'delivered')
        AND m.created_at <= datetime(?)
        AND m.id NOT IN (
          SELECT message_id FROM sms_notifications 
          WHERE delivery_status = 'sent'
        )
        AND m.is_deleted = 0`,
        [cutoffTime.toISOString()]
      );

      console.log(`📬 Found ${unreadMessages.rows.length} unread messages to notify`);

      let notificationsSent = 0;
      let errors = 0;

      // Process each unread message
      for (const msg of unreadMessages.rows) {
        try {
          // Determine recipient (opposite of sender)
          let recipientPhone, senderName;

          if (msg.sender_type === 'couple') {
            // Message from couple, notify vendor
            recipientPhone = msg.vendor_phone;
            senderName = msg.couple_name || 'a couple';
          } else {
            // Message from vendor, notify couple
            recipientPhone = msg.couple_phone;
            senderName = msg.vendor_name || 'a vendor';
          }

          // Skip if no phone number available
          if (!recipientPhone) {
            console.warn(`⚠️  No phone number available for message ${msg.id}`);
            continue;
          }

          // Send notification
          const result = await this.sendUnreadMessageNotification(
            { id: msg.id, content: msg.content, created_at: msg.created_at },
            { id: msg.thread_id },
            recipientPhone,
            senderName
          );

          if (result.success) {
            notificationsSent++;
          } else {
            errors++;
          }

          // Add delay between SMS sends to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Error processing message ${msg.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ SMS notification check complete: ${notificationsSent} sent, ${errors} errors`);

      return {
        success: true,
        notificationsSent,
        errors
      };

    } catch (error) {
      console.error('❌ Failed to check and notify unread messages:', error);
      return {
        success: false,
        notificationsSent: 0,
        errors: 1,
        error: error.message
      };
    }
  }

  /**
   * Get SMS notification statistics
   * 
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
   */
  async getNotificationStats(startDate, endDate) {
    try {
      const stats = await query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM sms_notifications
        WHERE created_at BETWEEN ? AND ?`,
        [startDate.toISOString(), endDate.toISOString()]
      );

      return {
        success: true,
        stats: stats.rows[0]
      };

    } catch (error) {
      console.error('❌ Failed to get notification stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test SMS sending with test number
   * 
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async testSMS() {
    const testMessage = 'This is a test message from WedHabesha messaging system.';
    return await this.sendSMS(this.testNumber, testMessage);
  }
}

// Create singleton instance
const afroSmsService = new AfroSmsService();

module.exports = afroSmsService;
