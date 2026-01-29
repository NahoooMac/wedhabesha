const { query } = require('../config/database');
const securityControls = require('./securityControls');

/**
 * ThreadManager - Manages conversation threads between couples and vendors
 * 
 * Handles thread creation, retrieval, activity tracking, and archiving
 * Integrates with SecurityControls for authorization
 * Provides comprehensive thread management for the messaging system
 */
class ThreadManager {
  constructor() {
    this.defaultThreadsPerPage = 50;
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
   * Create a new conversation thread between a couple and vendor
   * 
   * @param {string|number} coupleId - Couple user ID
   * @param {string|number} vendorId - Vendor user ID
   * @param {object} metadata - Optional metadata (leadId, serviceType, etc.)
   * @returns {Promise<{success: boolean, thread?: object, error?: string}>}
   */
  async createThread(coupleId, vendorId, metadata = {}) {
    try {
      // Validate inputs
      if (!coupleId || !vendorId) {
        return {
          success: false,
          error: 'Couple ID and vendor ID are required'
        };
      }

      // Check if thread already exists between this couple and vendor
      const existingThreadQuery = `
        SELECT id, couple_id, vendor_id, created_at, updated_at, 
               last_message_at, is_active, lead_id, service_type
        FROM message_threads
        WHERE couple_id = ? AND vendor_id = ?
      `;

      const existingResult = await query(existingThreadQuery, [coupleId, vendorId]);

      // If thread exists, return it
      if (existingResult.rows.length > 0) {
        const existingThread = existingResult.rows[0];
        
        // Thread already exists between couple and vendor
        
        return {
          success: true,
          thread: {
            id: existingThread.id,
            participants: {
              coupleId: existingThread.couple_id,
              vendorId: existingThread.vendor_id
            },
            createdAt: existingThread.created_at,
            updatedAt: existingThread.updated_at,
            lastMessageAt: existingThread.last_message_at,
            isActive: Boolean(existingThread.is_active),
            metadata: {
              leadId: existingThread.lead_id,
              serviceType: existingThread.service_type
            }
          },
          alreadyExists: true
        };
      }

      // Create new thread
      const insertQuery = `
        INSERT INTO message_threads (
          couple_id, vendor_id, lead_id, service_type,
          created_at, updated_at, last_message_at, is_active
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      `;

      let result;
      try {
        result = await query(insertQuery, [
          coupleId,
          vendorId,
          metadata.leadId || null,
          metadata.serviceType || null
        ]);
      } catch (error) {
        // Handle race condition - thread might have been created by concurrent request
        if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
          // Check if thread now exists
          const recheckResult = await query(existingThreadQuery, [coupleId, vendorId]);
          if (recheckResult.rows.length > 0) {
            const existingThread = recheckResult.rows[0];
            // Thread created by concurrent request
            return {
              success: true,
              thread: {
                id: existingThread.id,
                participants: {
                  coupleId: existingThread.couple_id,
                  vendorId: existingThread.vendor_id
                },
                createdAt: existingThread.created_at,
                updatedAt: existingThread.updated_at,
                lastMessageAt: existingThread.last_message_at,
                isActive: Boolean(existingThread.is_active),
                metadata: {
                  leadId: existingThread.lead_id,
                  serviceType: existingThread.service_type
                }
              },
              alreadyExists: true
            };
          }
        }
        throw error;
      }

      // Get the inserted thread ID
      const threadId = result.lastID || result.rows[0]?.id;

      if (!threadId) {
        throw new Error('Failed to retrieve thread ID after insert');
      }

      // Retrieve the complete thread
      const threadQuery = `
        SELECT id, couple_id, vendor_id, created_at, updated_at,
               last_message_at, is_active, lead_id, service_type
        FROM message_threads
        WHERE id = ?
      `;

      const threadResult = await query(threadQuery, [threadId]);
      const thread = threadResult.rows[0];

      // Created new thread successfully

      return {
        success: true,
        thread: {
          id: thread.id,
          participants: {
            coupleId: thread.couple_id,
            vendorId: thread.vendor_id
          },
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
          lastMessageAt: thread.last_message_at,
          isActive: Boolean(thread.is_active),
          metadata: {
            leadId: thread.lead_id,
            serviceType: thread.service_type
          }
        },
        alreadyExists: false
      };

    } catch (error) {
      console.error('❌ Failed to create thread:', error);
      return {
        success: false,
        error: `Failed to create thread: ${error.message}`
      };
    }
  }

  /**
   * Get a specific thread by ID
   * 
   * @param {string|number} threadId - Thread identifier
   * @param {string|number} userId - User ID requesting the thread (for authorization)
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, thread?: object, error?: string}>}
   */
  async getThread(threadId, userId, userType) {
    try {
      // Validate inputs
      if (!threadId) {
        return {
          success: false,
          error: 'Thread ID is required'
        };
      }

      if (!userId || !userType) {
        return {
          success: false,
          error: 'User ID and user type are required for authorization'
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

      // Verify user has access to this thread
      const accessCheck = await securityControls.verifyThreadAccess(
        userId,
        userType,
        threadId
      );

      if (!accessCheck.authorized) {
        return {
          success: false,
          error: accessCheck.reason || 'Unauthorized access to thread'
        };
      }

      // Get thread details
      const threadQuery = `
        SELECT id, couple_id, vendor_id, created_at, updated_at,
               last_message_at, is_active, lead_id, service_type
        FROM message_threads
        WHERE id = ?
      `;

      const threadResult = await query(threadQuery, [threadId]);

      if (threadResult.rows.length === 0) {
        return {
          success: false,
          error: 'Thread not found'
        };
      }

      const thread = threadResult.rows[0];

      // Get message count for this thread
      const countQuery = `
        SELECT COUNT(*) as message_count
        FROM messages
        WHERE thread_id = ? AND is_deleted = 0
      `;

      const countResult = await query(countQuery, [threadId]);
      const messageCount = countResult.rows[0].message_count || 0;

      // Get unread message count for this user
      const unreadQuery = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
        WHERE m.thread_id = ? 
          AND m.is_deleted = 0
          AND m.sender_id != ?
          AND mrs.id IS NULL
      `;

      const unreadResult = await query(unreadQuery, [userId, threadId, userId]);
      const unreadCount = unreadResult.rows[0].unread_count || 0;

      // Retrieved thread for user

      return {
        success: true,
        thread: {
          id: thread.id,
          participants: {
            coupleId: thread.couple_id,
            vendorId: thread.vendor_id
          },
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
          lastMessageAt: thread.last_message_at,
          isActive: Boolean(thread.is_active),
          metadata: {
            leadId: thread.lead_id,
            serviceType: thread.service_type
          },
          stats: {
            messageCount: messageCount,
            unreadCount: unreadCount
          }
        }
      };

    } catch (error) {
      console.error('❌ Failed to get thread:', error);
      return {
        success: false,
        error: `Failed to retrieve thread: ${error.message}`
      };
    }
  }

  /**
   * Get all threads for a specific user (couple or vendor)
   * 
   * @param {string|number} userId - User ID
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @param {object} options - Query options (limit, offset, includeInactive)
   * @returns {Promise<{success: boolean, threads?: Array, total?: number, error?: string}>}
   */
  async getThreadsForUser(userId, userType, options = {}) {
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

      // Parse options
      const limit = Math.min(Math.max(1, parseInt(options.limit) || 50), this.defaultThreadsPerPage);
      const offset = Math.max(0, parseInt(options.offset) || 0);
      const includeInactive = options.includeInactive === true;

      const normalizedUserType = userType.toLowerCase();

      // Build query based on user type
      let threadsQuery = `
        SELECT id, couple_id, vendor_id, created_at, updated_at,
               last_message_at, is_active, lead_id, service_type
        FROM message_threads
        WHERE ${normalizedUserType === 'couple' ? 'couple_id' : 'vendor_id'} = ?
      `;

      const params = [userId];

      // Filter by active status if needed
      if (!includeInactive) {
        threadsQuery += ` AND is_active = 1`;
      }

      // Order by most recent activity
      threadsQuery += ` ORDER BY last_message_at DESC`;

      // Get total count
      const countQuery = threadsQuery.replace(
        'SELECT id, couple_id, vendor_id, created_at, updated_at, last_message_at, is_active, lead_id, service_type',
        'SELECT COUNT(*) as total'
      ).replace(/ORDER BY.*$/, '');

      const countResult = await query(countQuery, params);
      const total = (countResult.rows && countResult.rows[0] && countResult.rows[0].total) || 0;

      // Add pagination
      threadsQuery += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      // Execute query
      const threadsResult = await query(threadsQuery, params);

      // Enhance threads with message counts and unread counts
      const enhancedThreads = await Promise.all(
        threadsResult.rows.map(async (thread) => {
          try {
            // Get message count
            const countQuery = `
              SELECT COUNT(*) as message_count
              FROM messages
              WHERE thread_id = ? AND is_deleted = 0
            `;
            const countResult = await query(countQuery, [thread.id]);
            const messageCount = countResult.rows[0].message_count || 0;

            // Get unread count
            const unreadQuery = `
              SELECT COUNT(*) as unread_count
              FROM messages m
              LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
              WHERE m.thread_id = ? 
                AND m.is_deleted = 0
                AND m.sender_id != ?
                AND mrs.id IS NULL
            `;
            const unreadResult = await query(unreadQuery, [userId, thread.id, userId]);
            const unreadCount = unreadResult.rows[0].unread_count || 0;

            // Get last message preview
            const lastMessageQuery = `
              SELECT id, sender_id, sender_type, message_type, created_at
              FROM messages
              WHERE thread_id = ? AND is_deleted = 0
              ORDER BY created_at DESC
              LIMIT 1
            `;
            const lastMessageResult = await query(lastMessageQuery, [thread.id]);
            const lastMessage = lastMessageResult.rows[0] || null;

            return {
              id: thread.id,
              participants: {
                coupleId: thread.couple_id,
                vendorId: thread.vendor_id
              },
              createdAt: thread.created_at,
              updatedAt: thread.updated_at,
              lastMessageAt: thread.last_message_at,
              isActive: Boolean(thread.is_active),
              metadata: {
                leadId: thread.lead_id,
                serviceType: thread.service_type
              },
              stats: {
                messageCount: messageCount,
                unreadCount: unreadCount
              },
              lastMessage: lastMessage ? {
                id: lastMessage.id,
                senderId: lastMessage.sender_id,
                senderType: lastMessage.sender_type,
                messageType: lastMessage.message_type,
                createdAt: lastMessage.created_at
              } : null
            };
          } catch (error) {
            console.error(`❌ Failed to enhance thread ${thread.id}:`, error);
            // Return basic thread info if enhancement fails
            return {
              id: thread.id,
              participants: {
                coupleId: thread.couple_id,
                vendorId: thread.vendor_id
              },
              createdAt: thread.created_at,
              updatedAt: thread.updated_at,
              lastMessageAt: thread.last_message_at,
              isActive: Boolean(thread.is_active),
              metadata: {
                leadId: thread.lead_id,
                serviceType: thread.service_type
              }
            };
          }
        })
      );

      // Retrieved threads for user

      return {
        success: true,
        threads: enhancedThreads,
        total: total,
        limit: limit,
        offset: offset,
        hasMore: (offset + limit) < total
      };

    } catch (error) {
      console.error('❌ Failed to get threads for user:', error);
      return {
        success: false,
        error: `Failed to retrieve threads: ${error.message}`
      };
    }
  }

  /**
   * Update thread activity timestamp
   * Called when a new message is sent or other activity occurs
   * 
   * @param {string|number} threadId - Thread identifier
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateThreadActivity(threadId) {
    try {
      // Validate input
      if (!threadId) {
        return {
          success: false,
          error: 'Thread ID is required'
        };
      }

      // First check if thread exists
      const checkQuery = `
        SELECT id FROM message_threads WHERE id = ?
      `;
      
      const checkResult = await query(checkQuery, [threadId]);
      
      if (checkResult.rows.length === 0) {
        return {
          success: false,
          error: 'Thread not found'
        };
      }

      // Update last_message_at and updated_at timestamps
      const updateQuery = `
        UPDATE message_threads
        SET last_message_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await query(updateQuery, [threadId]);

      // Updated activity for thread

      return {
        success: true
      };

    } catch (error) {
      console.error('❌ Failed to update thread activity:', error);
      return {
        success: false,
        error: `Failed to update thread activity: ${error.message}`
      };
    }
  }

  /**
   * Archive a thread (set is_active to false)
   * Archived threads are hidden from default views but data is preserved
   * 
   * @param {string|number} threadId - Thread identifier
   * @param {string|number} userId - User ID requesting archival (for authorization)
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async archiveThread(threadId, userId, userType) {
    try {
      // Validate inputs
      if (!threadId) {
        return {
          success: false,
          error: 'Thread ID is required'
        };
      }

      if (!userId || !userType) {
        return {
          success: false,
          error: 'User ID and user type are required for authorization'
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

      // First get the thread to check if it's already archived
      const threadQuery = `
        SELECT id, couple_id, vendor_id, is_active
        FROM message_threads
        WHERE id = ?
      `;

      const threadResult = await query(threadQuery, [threadId]);

      if (threadResult.rows.length === 0) {
        return {
          success: false,
          error: 'Thread not found'
        };
      }

      const thread = threadResult.rows[0];

      // Verify user is a participant
      const normalizedUserType = userType.toLowerCase();
      let isParticipant = false;

      if (normalizedUserType === 'couple' && String(thread.couple_id) === String(userId)) {
        isParticipant = true;
      } else if (normalizedUserType === 'vendor' && String(thread.vendor_id) === String(userId)) {
        isParticipant = true;
      }

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this thread'
        };
      }

      // Check if already archived
      if (!thread.is_active) {
        return {
          success: true,
          alreadyArchived: true
        };
      }

      // Archive the thread
      const archiveQuery = `
        UPDATE message_threads
        SET is_active = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await query(archiveQuery, [threadId]);

      // Archived thread by user

      return {
        success: true,
        alreadyArchived: false
      };

    } catch (error) {
      console.error('❌ Failed to archive thread:', error);
      return {
        success: false,
        error: `Failed to archive thread: ${error.message}`
      };
    }
  }

  /**
   * Reactivate an archived thread
   * 
   * @param {string|number} threadId - Thread identifier
   * @param {string|number} userId - User ID requesting reactivation (for authorization)
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async reactivateThread(threadId, userId, userType) {
    try {
      // Validate inputs
      if (!threadId) {
        return {
          success: false,
          error: 'Thread ID is required'
        };
      }

      if (!userId || !userType) {
        return {
          success: false,
          error: 'User ID and user type are required for authorization'
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

      // Get thread (don't use verifyThreadAccess as it checks is_active)
      const threadQuery = `
        SELECT id, couple_id, vendor_id, is_active
        FROM message_threads
        WHERE id = ?
      `;

      const threadResult = await query(threadQuery, [threadId]);

      if (threadResult.rows.length === 0) {
        return {
          success: false,
          error: 'Thread not found'
        };
      }

      const thread = threadResult.rows[0];

      // Verify user is a participant
      const normalizedUserType = userType.toLowerCase();
      let isParticipant = false;

      if (normalizedUserType === 'couple' && String(thread.couple_id) === String(userId)) {
        isParticipant = true;
      } else if (normalizedUserType === 'vendor' && String(thread.vendor_id) === String(userId)) {
        isParticipant = true;
      }

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this thread'
        };
      }

      // Check if already active
      if (thread.is_active) {
        return {
          success: true,
          alreadyActive: true
        };
      }

      // Reactivate the thread
      const reactivateQuery = `
        UPDATE message_threads
        SET is_active = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await query(reactivateQuery, [threadId]);

      // Reactivated thread by user

      return {
        success: true,
        alreadyActive: false
      };

    } catch (error) {
      console.error('❌ Failed to reactivate thread:', error);
      return {
        success: false,
        error: `Failed to reactivate thread: ${error.message}`
      };
    }
  }

  /**
   * Get thread statistics
   * 
   * @param {string|number} userId - User ID
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
   */
  async getThreadStats(userId, userType) {
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

      // Get thread counts
      const statsQuery = `
        SELECT 
          COUNT(*) as total_threads,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_threads,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as archived_threads
        FROM message_threads
        WHERE ${userColumn} = ?
      `;

      const statsResult = await query(statsQuery, [userId]);
      const stats = statsResult.rows[0];

      // Get unread message count across all threads
      const unreadQuery = `
        SELECT COUNT(*) as total_unread
        FROM messages m
        JOIN message_threads t ON m.thread_id = t.id
        LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
        WHERE t.${userColumn} = ?
          AND m.is_deleted = 0
          AND m.sender_id != ?
          AND mrs.id IS NULL
      `;

      const unreadResult = await query(unreadQuery, [userId, userId, userId]);
      const totalUnread = unreadResult.rows[0].total_unread || 0;

      return {
        success: true,
        stats: {
          totalThreads: stats.total_threads || 0,
          activeThreads: stats.active_threads || 0,
          archivedThreads: stats.archived_threads || 0,
          totalUnreadMessages: totalUnread
        }
      };

    } catch (error) {
      console.error('❌ Failed to get thread stats:', error);
      return {
        success: false,
        error: `Failed to retrieve thread statistics: ${error.message}`
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
      defaultThreadsPerPage: this.defaultThreadsPerPage
    };
  }
}

// Create singleton instance
const threadManager = new ThreadManager();

module.exports = threadManager;
