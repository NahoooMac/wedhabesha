const { query } = require('../config/database');

/**
 * SecurityControls - Handles authorization and security monitoring for messaging system
 * 
 * Implements user authorization verification for message access
 * Provides comprehensive access logging for security monitoring
 * Validates user permissions before allowing message operations
 */
class SecurityControls {
  constructor() {
    this.accessLogEnabled = true;
    this.maxAccessLogsPerUser = 10000; // Prevent log table bloat
  }

  /**
   * Verify if a user has authorization to access a specific message thread
   * 
   * @param {string|number} userId - User ID attempting to access the thread
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @param {string|number} threadId - Thread ID being accessed
   * @returns {Promise<{authorized: boolean, reason?: string}>}
   */
  async verifyThreadAccess(userId, userType, threadId) {
    try {
      // Validate inputs
      if (!userId || !userType || !threadId) {
        return {
          authorized: false,
          reason: 'Invalid parameters: userId, userType, and threadId are required'
        };
      }

      // Validate user type
      const validUserTypes = ['couple', 'vendor'];
      if (!validUserTypes.includes(userType.toLowerCase())) {
        return {
          authorized: false,
          reason: `Invalid user type: must be 'couple' or 'vendor'`
        };
      }

      // Check if thread exists and user is a participant
      const threadQuery = `
        SELECT id, couple_id, vendor_id, is_active
        FROM message_threads
        WHERE id = ?
      `;
      
      const threadResult = await query(threadQuery, [threadId]);

      if (threadResult.rows.length === 0) {
        await this.logAccessAttempt(userId, userType, threadId, null, 'denied', 'Thread not found');
        return {
          authorized: false,
          reason: 'Thread not found'
        };
      }

      const thread = threadResult.rows[0];

      // Check if thread is active
      if (!thread.is_active) {
        await this.logAccessAttempt(userId, userType, threadId, null, 'denied', 'Thread is inactive');
        return {
          authorized: false,
          reason: 'Thread is inactive'
        };
      }

      // Verify user is a participant in the thread
      const normalizedUserType = userType.toLowerCase();
      let isParticipant = false;

      if (normalizedUserType === 'couple' && String(thread.couple_id) === String(userId)) {
        isParticipant = true;
      } else if (normalizedUserType === 'vendor' && String(thread.vendor_id) === String(userId)) {
        isParticipant = true;
      }

      if (!isParticipant) {
        await this.logAccessAttempt(userId, userType, threadId, null, 'denied', 'User is not a participant in this thread');
        return {
          authorized: false,
          reason: 'User is not a participant in this thread'
        };
      }

      // Authorization successful
      await this.logAccessAttempt(userId, userType, threadId, null, 'granted', 'Access granted');
      
      return {
        authorized: true,
        thread: thread
      };

    } catch (error) {
      console.error('❌ Thread access verification failed:', error);
      await this.logAccessAttempt(userId, userType, threadId, null, 'error', error.message);
      
      return {
        authorized: false,
        reason: 'Authorization check failed due to system error'
      };
    }
  }

  /**
   * Verify if a user has authorization to access a specific message
   * 
   * @param {string|number} userId - User ID attempting to access the message
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @param {string|number} messageId - Message ID being accessed
   * @returns {Promise<{authorized: boolean, reason?: string, message?: object}>}
   */
  async verifyMessageAccess(userId, userType, messageId) {
    try {
      // Validate inputs
      if (!userId || !userType || !messageId) {
        return {
          authorized: false,
          reason: 'Invalid parameters: userId, userType, and messageId are required'
        };
      }

      // Get message and its thread
      const messageQuery = `
        SELECT m.id, m.thread_id, m.sender_id, m.sender_type, m.is_deleted,
               t.couple_id, t.vendor_id, t.is_active
        FROM messages m
        JOIN message_threads t ON m.thread_id = t.id
        WHERE m.id = ?
      `;
      
      const messageResult = await query(messageQuery, [messageId]);

      if (messageResult.rows.length === 0) {
        await this.logAccessAttempt(userId, userType, null, messageId, 'denied', 'Message not found');
        return {
          authorized: false,
          reason: 'Message not found'
        };
      }

      const message = messageResult.rows[0];

      // Check if message is deleted
      if (message.is_deleted) {
        await this.logAccessAttempt(userId, userType, message.thread_id, messageId, 'denied', 'Message is deleted');
        return {
          authorized: false,
          reason: 'Message is deleted'
        };
      }

      // Check if thread is active
      if (!message.is_active) {
        await this.logAccessAttempt(userId, userType, message.thread_id, messageId, 'denied', 'Thread is inactive');
        return {
          authorized: false,
          reason: 'Thread is inactive'
        };
      }

      // Verify user is a participant in the thread
      const normalizedUserType = userType.toLowerCase();
      let isParticipant = false;

      if (normalizedUserType === 'couple' && String(message.couple_id) === String(userId)) {
        isParticipant = true;
      } else if (normalizedUserType === 'vendor' && String(message.vendor_id) === String(userId)) {
        isParticipant = true;
      }

      if (!isParticipant) {
        await this.logAccessAttempt(userId, userType, message.thread_id, messageId, 'denied', 'User is not a participant in this thread');
        return {
          authorized: false,
          reason: 'User is not a participant in this thread'
        };
      }

      // Authorization successful
      await this.logAccessAttempt(userId, userType, message.thread_id, messageId, 'granted', 'Access granted');
      
      return {
        authorized: true,
        message: message
      };

    } catch (error) {
      console.error('❌ Message access verification failed:', error);
      await this.logAccessAttempt(userId, userType, null, messageId, 'error', error.message);
      
      return {
        authorized: false,
        reason: 'Authorization check failed due to system error'
      };
    }
  }

  /**
   * Log access attempts for security monitoring and audit trails
   * 
   * @param {string|number} userId - User ID attempting access
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @param {string|number} threadId - Thread ID (if applicable)
   * @param {string|number} messageId - Message ID (if applicable)
   * @param {string} accessResult - Result of access attempt ('granted', 'denied', 'error')
   * @param {string} reason - Reason for the access result
   * @param {object} metadata - Additional metadata about the access attempt
   * @returns {Promise<void>}
   */
  async logAccessAttempt(userId, userType, threadId, messageId, accessResult, reason, metadata = {}) {
    try {
      if (!this.accessLogEnabled) {
        return;
      }

      // Ensure access_logs table exists
      await this.ensureAccessLogsTable();

      // Insert access log
      const logQuery = `
        INSERT INTO message_access_logs (
          user_id, user_type, thread_id, message_id, 
          access_result, reason, metadata, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const metadataJson = JSON.stringify(metadata);
      
      await query(logQuery, [
        userId,
        userType,
        threadId || null,
        messageId || null,
        accessResult,
        reason,
        metadataJson,
        metadata.ipAddress || null,
        metadata.userAgent || null
      ]);

      console.log(`🔍 Access log: ${accessResult} - User ${userId} (${userType}) - ${reason}`);

      // Cleanup old logs if needed (prevent table bloat)
      await this.cleanupOldLogs(userId);

    } catch (error) {
      // Don't throw errors from logging - it shouldn't break the main flow
      console.error('⚠️ Failed to log access attempt:', error);
    }
  }

  /**
   * Ensure the access logs table exists
   * Creates the table if it doesn't exist
   * 
   * @returns {Promise<void>}
   */
  async ensureAccessLogsTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS message_access_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          user_type VARCHAR(10) NOT NULL,
          thread_id TEXT,
          message_id TEXT,
          access_result VARCHAR(20) NOT NULL,
          reason TEXT,
          metadata TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await query(createTableQuery);

      // Create indexes for efficient querying
      await query(`CREATE INDEX IF NOT EXISTS idx_access_logs_user ON message_access_logs(user_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_access_logs_result ON message_access_logs(access_result)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_access_logs_created ON message_access_logs(created_at)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_access_logs_thread ON message_access_logs(thread_id)`);

    } catch (error) {
      // Table might already exist, which is fine
      if (!error.message.includes('already exists')) {
        console.error('⚠️ Failed to ensure access logs table:', error);
      }
    }
  }

  /**
   * Clean up old access logs to prevent table bloat
   * Keeps only the most recent logs per user
   * 
   * @param {string|number} userId - User ID to clean up logs for
   * @returns {Promise<void>}
   */
  async cleanupOldLogs(userId) {
    try {
      // Count logs for this user
      const countQuery = `
        SELECT COUNT(*) as count
        FROM message_access_logs
        WHERE user_id = ?
      `;
      
      const countResult = await query(countQuery, [userId]);
      const logCount = countResult.rows[0].count;

      // If over limit, delete oldest logs
      if (logCount > this.maxAccessLogsPerUser) {
        const deleteQuery = `
          DELETE FROM message_access_logs
          WHERE id IN (
            SELECT id FROM message_access_logs
            WHERE user_id = ?
            ORDER BY created_at ASC
            LIMIT ?
          )
        `;
        
        const logsToDelete = logCount - this.maxAccessLogsPerUser;
        await query(deleteQuery, [userId, logsToDelete]);
        
        console.log(`🧹 Cleaned up ${logsToDelete} old access logs for user ${userId}`);
      }

    } catch (error) {
      console.error('⚠️ Failed to cleanup old logs:', error);
    }
  }

  /**
   * Get access logs for a specific user (for security auditing)
   * 
   * @param {string|number} userId - User ID to get logs for
   * @param {number} limit - Maximum number of logs to return
   * @param {string} accessResult - Filter by access result ('granted', 'denied', 'error')
   * @returns {Promise<Array>}
   */
  async getAccessLogs(userId, limit = 100, accessResult = null) {
    try {
      let logsQuery = `
        SELECT id, user_id, user_type, thread_id, message_id,
               access_result, reason, metadata, ip_address, user_agent, created_at
        FROM message_access_logs
        WHERE user_id = ?
      `;
      
      const params = [userId];

      if (accessResult) {
        logsQuery += ` AND access_result = ?`;
        params.push(accessResult);
      }

      logsQuery += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      const result = await query(logsQuery, params);
      
      // Parse metadata JSON
      const logs = result.rows.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : {}
      }));

      return logs;

    } catch (error) {
      console.error('❌ Failed to get access logs:', error);
      throw new Error(`Failed to retrieve access logs: ${error.message}`);
    }
  }

  /**
   * Get security statistics for monitoring
   * 
   * @param {string|number} userId - User ID to get stats for (optional)
   * @param {number} days - Number of days to look back
   * @returns {Promise<object>}
   */
  async getSecurityStats(userId = null, days = 7) {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      let statsQuery = `
        SELECT 
          access_result,
          COUNT(*) as count
        FROM message_access_logs
        WHERE created_at >= ?
      `;
      
      const params = [dateThreshold.toISOString()];

      if (userId) {
        statsQuery += ` AND user_id = ?`;
        params.push(userId);
      }

      statsQuery += ` GROUP BY access_result`;

      const result = await query(statsQuery, params);

      const stats = {
        period: `${days} days`,
        totalAttempts: 0,
        granted: 0,
        denied: 0,
        errors: 0
      };

      result.rows.forEach(row => {
        stats.totalAttempts += row.count;
        stats[row.access_result] = row.count;
      });

      return stats;

    } catch (error) {
      console.error('❌ Failed to get security stats:', error);
      throw new Error(`Failed to retrieve security statistics: ${error.message}`);
    }
  }

  /**
   * Check if a user has suspicious access patterns
   * Returns true if user has excessive denied attempts
   * 
   * @param {string|number} userId - User ID to check
   * @param {number} threshold - Number of denied attempts to trigger alert
   * @param {number} minutes - Time window in minutes
   * @returns {Promise<{suspicious: boolean, deniedCount: number}>}
   */
  async checkSuspiciousActivity(userId, threshold = 10, minutes = 60) {
    try {
      const timeThreshold = new Date();
      timeThreshold.setMinutes(timeThreshold.getMinutes() - minutes);

      const suspiciousQuery = `
        SELECT COUNT(*) as denied_count
        FROM message_access_logs
        WHERE user_id = ?
          AND access_result = 'denied'
          AND created_at >= ?
      `;

      const result = await query(suspiciousQuery, [userId, timeThreshold.toISOString()]);
      const deniedCount = result.rows[0].denied_count;

      const suspicious = deniedCount >= threshold;

      if (suspicious) {
        console.warn(`⚠️ Suspicious activity detected for user ${userId}: ${deniedCount} denied attempts in ${minutes} minutes`);
      }

      return {
        suspicious,
        deniedCount,
        threshold,
        timeWindow: `${minutes} minutes`
      };

    } catch (error) {
      console.error('❌ Failed to check suspicious activity:', error);
      throw new Error(`Failed to check suspicious activity: ${error.message}`);
    }
  }

  /**
   * Enable or disable access logging
   * 
   * @param {boolean} enabled - Whether to enable access logging
   */
  setAccessLogging(enabled) {
    this.accessLogEnabled = enabled;
    console.log(`🔍 Access logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current configuration
   * 
   * @returns {object}
   */
  getConfig() {
    return {
      accessLogEnabled: this.accessLogEnabled,
      maxAccessLogsPerUser: this.maxAccessLogsPerUser
    };
  }
}

// Create singleton instance
const securityControls = new SecurityControls();

module.exports = securityControls;
