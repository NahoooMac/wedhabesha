const { query } = require('../config/database');
const securityControls = require('./securityControls');

/**
 * DataPrivacyService - Handles user data deletion and export for GDPR compliance
 * 
 * Implements 30-day data deletion process and data export capabilities
 * Ensures compliance with data privacy regulations
 */
class DataPrivacyService {
  constructor() {
    this.deletionGracePeriodDays = 30;
    
    console.log('🔒 Data privacy service initialized');
  }

  /**
   * Validate user type
   * 
   * @param {string} userType - Type of user
   * @returns {{valid: boolean, error?: string}}
   */
  validateUserType(userType) {
    const validTypes = ['couple', 'vendor'];
    
    if (!userType || !validTypes.includes(userType.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid user type. Must be one of: ${validTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Request user data deletion
   * Marks user data for deletion after 30-day grace period
   * 
   * @param {string|number} userId - User ID requesting deletion
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, deletionDate?: Date, error?: string}>}
   */
  async requestDataDeletion(userId, userType) {
    try {
      // Validate inputs
      if (!userId || !userType) {
        return {
          success: false,
          error: 'User ID and user type are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateUserType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      // Calculate deletion date (30 days from now)
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + this.deletionGracePeriodDays);

      // Check if deletion request already exists
      const checkQuery = `
        SELECT id, user_id, user_type, requested_at, scheduled_deletion_at, status
        FROM data_deletion_requests
        WHERE user_id = ? AND user_type = ? AND status = 'pending'
      `;

      const checkResult = await query(checkQuery, [userId, userType.toLowerCase()]);

      if (checkResult.rows.length > 0) {
        const existingRequest = checkResult.rows[0];
        return {
          success: true,
          alreadyRequested: true,
          deletionDate: new Date(existingRequest.scheduled_deletion_at),
          requestId: existingRequest.id
        };
      }

      // Create deletion request
      const insertQuery = `
        INSERT INTO data_deletion_requests (
          user_id, user_type, requested_at, scheduled_deletion_at, status
        ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, 'pending')
      `;

      const result = await query(insertQuery, [
        userId,
        userType.toLowerCase(),
        deletionDate.toISOString()
      ]);

      const requestId = result.lastID || result.rows[0]?.id;

      console.log(`🗑️ Data deletion requested for ${userType} ${userId}, scheduled for ${deletionDate.toISOString()}`);

      return {
        success: true,
        alreadyRequested: false,
        deletionDate: deletionDate,
        requestId: requestId,
        gracePeriodDays: this.deletionGracePeriodDays
      };

    } catch (error) {
      console.error('❌ Failed to request data deletion:', error);
      return {
        success: false,
        error: `Failed to request data deletion: ${error.message}`
      };
    }
  }

  /**
   * Cancel a pending data deletion request
   * 
   * @param {string|number} userId - User ID
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async cancelDataDeletion(userId, userType) {
    try {
      // Validate inputs
      if (!userId || !userType) {
        return {
          success: false,
          error: 'User ID and user type are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateUserType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      // Check if deletion request exists
      const checkQuery = `
        SELECT id FROM data_deletion_requests
        WHERE user_id = ? AND user_type = ? AND status = 'pending'
      `;

      const checkResult = await query(checkQuery, [userId, userType.toLowerCase()]);

      if (checkResult.rows.length === 0) {
        return {
          success: false,
          error: 'No pending deletion request found'
        };
      }

      // Cancel the deletion request
      const updateQuery = `
        UPDATE data_deletion_requests
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND user_type = ? AND status = 'pending'
      `;

      await query(updateQuery, [userId, userType.toLowerCase()]);

      console.log(`✅ Data deletion cancelled for ${userType} ${userId}`);

      return {
        success: true
      };

    } catch (error) {
      console.error('❌ Failed to cancel data deletion:', error);
      return {
        success: false,
        error: `Failed to cancel data deletion: ${error.message}`
      };
    }
  }

  /**
   * Export user messaging data
   * Returns all messages, threads, and attachments for a user
   * 
   * @param {string|number} userId - User ID
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async exportUserData(userId, userType) {
    try {
      // Validate inputs
      if (!userId || !userType) {
        return {
          success: false,
          error: 'User ID and user type are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateUserType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      const normalizedUserType = userType.toLowerCase();
      const userColumn = normalizedUserType === 'couple' ? 'couple_id' : 'vendor_id';

      // Get all threads for the user
      const threadsQuery = `
        SELECT id, couple_id, vendor_id, created_at, updated_at,
               last_message_at, is_active, lead_id, service_type
        FROM message_threads
        WHERE ${userColumn} = ?
      `;

      const threadsResult = await query(threadsQuery, [userId]);
      const threads = threadsResult.rows;

      // Get all messages from user's threads
      const threadIds = threads.map(t => t.id);
      let messages = [];

      if (threadIds.length > 0) {
        const placeholders = threadIds.map(() => '?').join(',');
        const messagesQuery = `
          SELECT m.id, m.thread_id, m.sender_id, m.sender_type, m.content,
                 m.message_type, m.created_at, m.updated_at, m.status, m.is_deleted
          FROM messages m
          WHERE m.thread_id IN (${placeholders})
          ORDER BY m.created_at ASC
        `;

        const messagesResult = await query(messagesQuery, threadIds);
        messages = messagesResult.rows;
      }

      // Get all attachments for user's messages
      const messageIds = messages.map(m => m.id);
      let attachments = [];

      if (messageIds.length > 0) {
        const placeholders = messageIds.map(() => '?').join(',');
        const attachmentsQuery = `
          SELECT id, message_id, file_name, file_type, file_size,
                 file_url, thumbnail_url, uploaded_at
          FROM message_attachments
          WHERE message_id IN (${placeholders})
        `;

        const attachmentsResult = await query(attachmentsQuery, messageIds);
        attachments = attachmentsResult.rows;
      }

      // Get read status for messages
      let readStatuses = [];

      if (messageIds.length > 0) {
        const placeholders = messageIds.map(() => '?').join(',');
        const readStatusQuery = `
          SELECT message_id, user_id, read_at
          FROM message_read_status
          WHERE message_id IN (${placeholders})
        `;

        const readStatusResult = await query(readStatusQuery, messageIds);
        readStatuses = readStatusResult.rows;
      }

      // Get connection status
      const connectionQuery = `
        SELECT user_id, user_type, is_online, last_seen, socket_id
        FROM user_connection_status
        WHERE user_id = ? AND user_type = ?
      `;

      const connectionResult = await query(connectionQuery, [userId, normalizedUserType]);
      const connectionStatus = connectionResult.rows[0] || null;

      // Compile export data
      const exportData = {
        exportDate: new Date().toISOString(),
        userId: userId,
        userType: normalizedUserType,
        threads: threads.map(t => ({
          id: t.id,
          coupleId: t.couple_id,
          vendorId: t.vendor_id,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          lastMessageAt: t.last_message_at,
          isActive: Boolean(t.is_active),
          leadId: t.lead_id,
          serviceType: t.service_type
        })),
        messages: messages.map(m => ({
          id: m.id,
          threadId: m.thread_id,
          senderId: m.sender_id,
          senderType: m.sender_type,
          content: m.content, // Note: Content is encrypted
          messageType: m.message_type,
          status: m.status,
          isDeleted: Boolean(m.is_deleted),
          createdAt: m.created_at,
          updatedAt: m.updated_at
        })),
        attachments: attachments.map(a => ({
          id: a.id,
          messageId: a.message_id,
          fileName: a.file_name,
          fileType: a.file_type,
          fileSize: a.file_size,
          fileUrl: a.file_url,
          thumbnailUrl: a.thumbnail_url,
          uploadedAt: a.uploaded_at
        })),
        readStatuses: readStatuses.map(rs => ({
          messageId: rs.message_id,
          userId: rs.user_id,
          readAt: rs.read_at
        })),
        connectionStatus: connectionStatus ? {
          isOnline: Boolean(connectionStatus.is_online),
          lastSeen: connectionStatus.last_seen,
          socketId: connectionStatus.socket_id
        } : null,
        statistics: {
          totalThreads: threads.length,
          totalMessages: messages.length,
          totalAttachments: attachments.length,
          activeThreads: threads.filter(t => t.is_active).length,
          deletedMessages: messages.filter(m => m.is_deleted).length
        }
      };

      console.log(`📦 Exported data for ${userType} ${userId}: ${messages.length} messages, ${threads.length} threads`);

      return {
        success: true,
        data: exportData
      };

    } catch (error) {
      console.error('❌ Failed to export user data:', error);
      return {
        success: false,
        error: `Failed to export user data: ${error.message}`
      };
    }
  }

  /**
   * Execute scheduled data deletions
   * Should be run as a cron job to process pending deletions
   * 
   * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
   */
  async executeScheduledDeletions() {
    try {
      console.log('🔄 Checking for scheduled data deletions...');

      // Get all pending deletion requests that are due
      const dueRequestsQuery = `
        SELECT id, user_id, user_type, requested_at, scheduled_deletion_at
        FROM data_deletion_requests
        WHERE status = 'pending' 
          AND scheduled_deletion_at <= CURRENT_TIMESTAMP
      `;

      const dueRequestsResult = await query(dueRequestsQuery);
      const dueRequests = dueRequestsResult.rows;

      if (dueRequests.length === 0) {
        console.log('ℹ️ No scheduled deletions due at this time');
        return {
          success: true,
          deletedCount: 0
        };
      }

      console.log(`🗑️ Processing ${dueRequests.length} scheduled deletions...`);

      let deletedCount = 0;

      for (const request of dueRequests) {
        try {
          // Delete user data
          const deleteResult = await this.deleteUserData(
            request.user_id,
            request.user_type
          );

          if (deleteResult.success) {
            // Mark deletion request as completed
            await query(
              `UPDATE data_deletion_requests 
               SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
               WHERE id = ?`,
              [request.id]
            );

            deletedCount++;
            console.log(`✅ Completed deletion for ${request.user_type} ${request.user_id}`);
          } else {
            // Mark deletion request as failed
            await query(
              `UPDATE data_deletion_requests 
               SET status = 'failed', error_message = ? 
               WHERE id = ?`,
              [deleteResult.error, request.id]
            );

            console.error(`❌ Failed deletion for ${request.user_type} ${request.user_id}: ${deleteResult.error}`);
          }

        } catch (error) {
          console.error(`❌ Error processing deletion for ${request.user_type} ${request.user_id}:`, error);
          
          // Mark as failed
          await query(
            `UPDATE data_deletion_requests 
             SET status = 'failed', error_message = ? 
             WHERE id = ?`,
            [error.message, request.id]
          );
        }
      }

      console.log(`🎉 Completed ${deletedCount} of ${dueRequests.length} scheduled deletions`);

      return {
        success: true,
        deletedCount: deletedCount,
        totalProcessed: dueRequests.length
      };

    } catch (error) {
      console.error('❌ Failed to execute scheduled deletions:', error);
      return {
        success: false,
        error: `Failed to execute scheduled deletions: ${error.message}`
      };
    }
  }

  /**
   * Permanently delete all user messaging data
   * This is irreversible and should only be called after grace period
   * 
   * @param {string|number} userId - User ID
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, deletedItems?: object, error?: string}>}
   */
  async deleteUserData(userId, userType) {
    try {
      // Validate inputs
      if (!userId || !userType) {
        return {
          success: false,
          error: 'User ID and user type are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateUserType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      const normalizedUserType = userType.toLowerCase();
      const userColumn = normalizedUserType === 'couple' ? 'couple_id' : 'vendor_id';

      console.log(`🗑️ Starting permanent data deletion for ${userType} ${userId}...`);

      // Get all threads for the user
      const threadsQuery = `
        SELECT id FROM message_threads WHERE ${userColumn} = ?
      `;

      const threadsResult = await query(threadsQuery, [userId]);
      const threadIds = threadsResult.rows.map(t => t.id);

      let deletedItems = {
        threads: 0,
        messages: 0,
        attachments: 0,
        readStatuses: 0,
        connectionStatus: 0
      };

      if (threadIds.length > 0) {
        // Get message IDs for attachment deletion
        const placeholders = threadIds.map(() => '?').join(',');
        const messageIdsQuery = `
          SELECT id FROM messages WHERE thread_id IN (${placeholders})
        `;

        const messageIdsResult = await query(messageIdsQuery, threadIds);
        const messageIds = messageIdsResult.rows.map(m => m.id);

        // Delete attachments
        if (messageIds.length > 0) {
          const attachmentPlaceholders = messageIds.map(() => '?').join(',');
          const deleteAttachmentsQuery = `
            DELETE FROM message_attachments WHERE message_id IN (${attachmentPlaceholders})
          `;

          const attachmentsResult = await query(deleteAttachmentsQuery, messageIds);
          deletedItems.attachments = attachmentsResult.rowCount || 0;
          console.log(`🗑️ Deleted ${deletedItems.attachments} attachments`);

          // Delete read statuses
          const deleteReadStatusQuery = `
            DELETE FROM message_read_status WHERE message_id IN (${attachmentPlaceholders})
          `;

          const readStatusResult = await query(deleteReadStatusQuery, messageIds);
          deletedItems.readStatuses = readStatusResult.rowCount || 0;
          console.log(`🗑️ Deleted ${deletedItems.readStatuses} read status records`);
        }

        // Delete messages
        const deleteMessagesQuery = `
          DELETE FROM messages WHERE thread_id IN (${placeholders})
        `;

        const messagesResult = await query(deleteMessagesQuery, threadIds);
        deletedItems.messages = messagesResult.rowCount || 0;
        console.log(`🗑️ Deleted ${deletedItems.messages} messages`);

        // Delete threads
        const deleteThreadsQuery = `
          DELETE FROM message_threads WHERE ${userColumn} = ?
        `;

        const threadsDeleteResult = await query(deleteThreadsQuery, [userId]);
        deletedItems.threads = threadsDeleteResult.rowCount || 0;
        console.log(`🗑️ Deleted ${deletedItems.threads} threads`);
      }

      // Delete connection status
      const deleteConnectionQuery = `
        DELETE FROM user_connection_status 
        WHERE user_id = ? AND user_type = ?
      `;

      const connectionResult = await query(deleteConnectionQuery, [userId, normalizedUserType]);
      deletedItems.connectionStatus = connectionResult.rowCount || 0;
      console.log(`🗑️ Deleted connection status`);

      console.log(`✅ Completed permanent data deletion for ${userType} ${userId}`);

      return {
        success: true,
        deletedItems: deletedItems
      };

    } catch (error) {
      console.error('❌ Failed to delete user data:', error);
      return {
        success: false,
        error: `Failed to delete user data: ${error.message}`
      };
    }
  }

  /**
   * Get deletion request status for a user
   * 
   * @param {string|number} userId - User ID
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, request?: object, error?: string}>}
   */
  async getDeletionStatus(userId, userType) {
    try {
      // Validate inputs
      if (!userId || !userType) {
        return {
          success: false,
          error: 'User ID and user type are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateUserType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      // Get deletion request
      const requestQuery = `
        SELECT id, user_id, user_type, requested_at, scheduled_deletion_at,
               status, cancelled_at, completed_at, error_message
        FROM data_deletion_requests
        WHERE user_id = ? AND user_type = ?
        ORDER BY requested_at DESC
        LIMIT 1
      `;

      const requestResult = await query(requestQuery, [userId, userType.toLowerCase()]);

      if (requestResult.rows.length === 0) {
        return {
          success: true,
          request: null
        };
      }

      const request = requestResult.rows[0];

      return {
        success: true,
        request: {
          id: request.id,
          userId: request.user_id,
          userType: request.user_type,
          requestedAt: request.requested_at,
          scheduledDeletionAt: request.scheduled_deletion_at,
          status: request.status,
          cancelledAt: request.cancelled_at,
          completedAt: request.completed_at,
          errorMessage: request.error_message
        }
      };

    } catch (error) {
      console.error('❌ Failed to get deletion status:', error);
      return {
        success: false,
        error: `Failed to get deletion status: ${error.message}`
      };
    }
  }

  /**
   * Get configuration
   * 
   * @returns {object}
   */
  getConfig() {
    return {
      deletionGracePeriodDays: this.deletionGracePeriodDays
    };
  }
}

// Create singleton instance
const dataPrivacyService = new DataPrivacyService();

module.exports = dataPrivacyService;
