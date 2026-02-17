const { query } = require('../config/database');
const encryptionService = require('./encryptionService');
const securityControls = require('./securityControls');
const performanceOptimizer = require('./performanceOptimizer');
const fileUploadService = require('./fileUploadService');
const smsReminderService = require('./smsReminderService');
const validator = require('validator');

/**
 * MessageService - Core messaging functionality for vendor-couple communication
 * 
 * Handles message sending, retrieval, status updates, and deletion
 * Integrates with EncryptionService for secure message storage
 * Uses SecurityControls for authorization and access logging
 */
class MessageService {
  constructor() {
    this.maxMessageLength = 10000; // Maximum characters per message
    this.maxMessagesPerPage = 50; // Default pagination limit
  }

  /**
   * Verify user has access to a specific message
   * 
   * @param {string|number} userId - User ID requesting access (user_id for couples, vendor_id for vendors)
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @param {string|number} messageId - Message identifier
   * @returns {Promise<{authorized: boolean, reason?: string, message?: object}>}
   */
  async verifyMessageAccess(userId, userType, messageId) {
    try {
      // Get message and thread information
      const messageQuery = `
        SELECT m.*, mt.couple_id, mt.vendor_id, mt.is_active as thread_is_active
        FROM messages m
        JOIN message_threads mt ON m.thread_id = mt.id
        WHERE m.id = ?
      `;

      const messageResult = await query(messageQuery, [messageId]);

      if (messageResult.rows.length === 0) {
        return {
          authorized: false,
          reason: 'Message not found'
        };
      }

      const message = messageResult.rows[0];

      // Check if thread is active
      if (!message.thread_is_active) {
        return {
          authorized: false,
          reason: 'Thread is not active'
        };
      }

      // Verify user is part of this thread
      if (userType.toLowerCase() === 'couple') {
        // For couples, userId could be either user_id or couple_id
        // First try direct couple_id match
        if (String(message.couple_id) === String(userId)) {
          return { authorized: true, message: message };
        }
        
        // If no direct match, try to find couple by user_id
        try {
          const coupleQuery = `SELECT id FROM couples WHERE user_id = ?`;
          const coupleResult = await query(coupleQuery, [userId]);
          
          if (coupleResult.rows.length > 0) {
            const coupleId = coupleResult.rows[0].id;
            if (String(message.couple_id) === String(coupleId)) {
              return { authorized: true, message: message };
            }
          }
        } catch (coupleError) {
          // If couples table doesn't exist or query fails, fall back to direct comparison
          console.warn('⚠️ Could not query couples table, using direct ID comparison');
        }
        
        return {
          authorized: false,
          reason: 'Couple not authorized for this message'
        };
      } else if (userType.toLowerCase() === 'vendor') {
        // For vendors, userId is the vendor_id directly
        if (String(message.vendor_id) !== String(userId)) {
          return {
            authorized: false,
            reason: 'Vendor not authorized for this message'
          };
        }
      } else {
        return {
          authorized: false,
          reason: 'Invalid user type'
        };
      }

      return {
        authorized: true,
        message: message
      };

    } catch (error) {
      console.error('❌ Failed to verify message access:', error);
      return {
        authorized: false,
        reason: 'Message access verification failed'
      };
    }
  }

  /**
   * Verify sender has access to send messages in a thread
   * 
   * @param {string|number} senderId - User ID of the sender (for couples) or vendor ID (for vendors)
   * @param {string} senderType - Type of sender ('couple' or 'vendor')
   * @param {string|number} threadId - Thread identifier
   * @returns {Promise<{authorized: boolean, reason?: string}>}
   */
  async verifySenderAccess(senderId, senderType, threadId) {
    try {
      // Get thread information
      const threadQuery = `
        SELECT couple_id, vendor_id, is_active
        FROM message_threads
        WHERE id = ?
      `;

      const threadResult = await query(threadQuery, [threadId]);

      if (threadResult.rows.length === 0) {
        return {
          authorized: false,
          reason: 'Thread not found'
        };
      }

      const thread = threadResult.rows[0];

      // Check if thread is active
      if (!thread.is_active) {
        return {
          authorized: false,
          reason: 'Thread is not active'
        };
      }

      // Verify sender is part of this thread
      if (senderType.toLowerCase() === 'couple') {
        // For couples, senderId could be either user_id or couple_id
        // First try direct couple_id match
        if (String(thread.couple_id) === String(senderId)) {
          return { authorized: true };
        }
        
        // If no direct match, try to find couple by user_id
        try {
          const coupleQuery = `SELECT id FROM couples WHERE user_id = ?`;
          const coupleResult = await query(coupleQuery, [senderId]);
          
          if (coupleResult.rows.length > 0) {
            const coupleId = coupleResult.rows[0].id;
            if (String(thread.couple_id) === String(coupleId)) {
              return { authorized: true };
            }
          }
        } catch (coupleError) {
          // If couples table doesn't exist or query fails, fall back to direct comparison
          console.warn('⚠️ Could not query couples table, using direct ID comparison');
        }
        
        return {
          authorized: false,
          reason: 'Couple not authorized for this thread'
        };
      } else if (senderType.toLowerCase() === 'vendor') {
        // For vendors, senderId is the vendor_id directly
        if (String(thread.vendor_id) !== String(senderId)) {
          return {
            authorized: false,
            reason: 'Vendor not authorized for this thread'
          };
        }
      } else {
        return {
          authorized: false,
          reason: 'Invalid sender type'
        };
      }

      return {
        authorized: true
      };

    } catch (error) {
      console.error('❌ Failed to verify sender access:', error);
      return {
        authorized: false,
        reason: 'Access verification failed'
      };
    }
  }

  /**
   * Validate and sanitize message content
   * 
   * @param {string} content - Message content to validate
   * @param {boolean} hasAttachments - Whether the message has attachments
   * @returns {{valid: boolean, sanitized?: string, error?: string}}
   */
  validateMessageContent(content, hasAttachments = false) {
    try {
      // If there are attachments, content can be empty
      if (hasAttachments && (!content || content.trim().length === 0)) {
        return {
          valid: true,
          sanitized: '' // Empty content is allowed with attachments
        };
      }

      // Check if content exists
      if (!content || typeof content !== 'string') {
        return {
          valid: false,
          error: 'Message content is required and must be a string'
        };
      }

      // Trim whitespace
      const trimmed = content.trim();

      // Check if empty after trimming
      if (trimmed.length === 0) {
        return {
          valid: false,
          error: 'Message content cannot be empty'
        };
      }

      // Check length
      if (trimmed.length > this.maxMessageLength) {
        return {
          valid: false,
          error: `Message content exceeds maximum length of ${this.maxMessageLength} characters`
        };
      }

      // Sanitize content - escape HTML to prevent XSS
      const sanitized = validator.escape(trimmed);

      return {
        valid: true,
        sanitized: sanitized
      };

    } catch (error) {
      console.error('❌ Message validation failed:', error);
      return {
        valid: false,
        error: 'Message validation failed'
      };
    }
  }

  /**
   * Validate message type
   * 
   * @param {string} messageType - Type of message
   * @returns {{valid: boolean, error?: string}}
   */
  validateMessageType(messageType) {
    const validTypes = ['text', 'image', 'document', 'system'];
    
    if (!messageType || !validTypes.includes(messageType)) {
      return {
        valid: false,
        error: `Invalid message type. Must be one of: ${validTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate sender type
   * 
   * @param {string} senderType - Type of sender
   * @returns {{valid: boolean, error?: string}}
   */
  validateSenderType(senderType) {
    const validTypes = ['couple', 'vendor'];
    
    if (!senderType || !validTypes.includes(senderType.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid sender type. Must be one of: ${validTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate couple message content and metadata
   * 
   * @param {string} content - Message content
   * @param {string} messageType - Type of message
   * @param {boolean} hasAttachments - Whether the message has attachments
   * @returns {{valid: boolean, sanitized?: string, error?: string}}
   */
  validateCoupleMessage(content, messageType, hasAttachments = false) {
    // For now, couple messages use the same validation as regular messages
    // This method can be extended in the future for couple-specific validation
    
    // Validate basic content
    const contentValidation = this.validateMessageContent(content, hasAttachments);
    if (!contentValidation.valid) {
      return contentValidation;
    }

    // Validate message type
    const typeValidation = this.validateMessageType(messageType);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    // Additional couple-specific validations can be added here
    // For example: rate limiting, content filtering, etc.

    return {
      valid: true,
      sanitized: contentValidation.sanitized
    };
  }

  /**
   * Send a message in a conversation thread
   * 
   * @param {string|number} threadId - Thread identifier
   * @param {string|number} senderId - User ID of the sender (user_id for couples, vendor_id for vendors)
   * @param {string} senderType - Type of sender ('couple' or 'vendor')
   * @param {string} content - Message content (will be encrypted)
   * @param {string} messageType - Type of message ('text', 'image', 'document', 'system')
   * @param {Array} attachments - Optional array of file attachments
   * @returns {Promise<{success: boolean, message?: object, error?: string}>}
   */
  async sendMessage(threadId, senderId, senderType, content, messageType = 'text', attachments = []) {
    try {
      // Validate inputs
      if (!threadId || !senderId) {
        return {
          success: false,
          error: 'Thread ID and sender ID are required'
        };
      }

      // Validate sender type
      const senderTypeValidation = this.validateSenderType(senderType);
      if (!senderTypeValidation.valid) {
        return {
          success: false,
          error: senderTypeValidation.error
        };
      }

      // Use couple-specific validation for couple messages
      let contentValidation;
      const hasAttachments = attachments && attachments.length > 0;
      
      if (senderType.toLowerCase() === 'couple') {
        contentValidation = this.validateCoupleMessage(content, messageType, hasAttachments);
      } else {
        // Use standard validation for vendor messages
        contentValidation = this.validateMessageContent(content, hasAttachments);
        if (contentValidation.valid) {
          const messageTypeValidation = this.validateMessageType(messageType);
          if (!messageTypeValidation.valid) {
            return {
              success: false,
              error: messageTypeValidation.error
            };
          }
        }
      }

      if (!contentValidation.valid) {
        return {
          success: false,
          error: contentValidation.error
        };
      }

      const sanitizedContent = contentValidation.sanitized;

      // Verify sender has access to this thread
      const accessCheck = await this.verifySenderAccess(
        senderId,
        senderType,
        threadId
      );

      if (!accessCheck.authorized) {
        return {
          success: false,
          error: accessCheck.reason || 'Unauthorized access to thread'
        };
      }

      // For couple senders, we need to determine the actual sender_id for the database
      let actualSenderId = senderId;
      if (senderType.toLowerCase() === 'couple') {
        // Try to get couple_id from user_id if needed
        try {
          const coupleQuery = `SELECT id FROM couples WHERE user_id = ?`;
          const coupleResult = await query(coupleQuery, [senderId]);
          
          if (coupleResult.rows.length > 0) {
            actualSenderId = coupleResult.rows[0].id;
          }
          // If no couple found, use the senderId as-is (might be couple_id already)
        } catch (coupleError) {
          // If couples table doesn't exist, use senderId as-is
          console.warn('⚠️ Could not query couples table, using senderId as-is');
        }
      }

      // Encrypt message content
      const encryptedContent = await encryptionService.encryptMessage(
        sanitizedContent,
        String(threadId)
      );

      // Insert message into database
      const insertQuery = `
        INSERT INTO messages (
          thread_id, sender_id, sender_type, content, 
          message_type, status, delivery_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'sent', 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = await query(insertQuery, [
        threadId,
        actualSenderId,
        senderType.toLowerCase(),
        encryptedContent,
        messageType
      ]);

      // Get the inserted message ID
      const messageId = result.lastID || result.rows[0]?.id;

      if (!messageId) {
        throw new Error('Failed to retrieve message ID after insert');
      }

      // Handle file attachments if provided
      let uploadedAttachments = [];
      if (attachments && attachments.length > 0) {
        console.log(`📎 Processing ${attachments.length} attachments for message ${messageId}`);
        
        for (const attachment of attachments) {
          try {
            const uploadResult = await fileUploadService.uploadFile(attachment, messageId);
            if (uploadResult.success) {
              uploadedAttachments.push(uploadResult.attachment);
              console.log(`✅ Uploaded attachment: ${attachment.originalname}`);
            } else {
              console.error(`❌ Failed to upload attachment ${attachment.originalname}:`, uploadResult.error);
              // Continue with other attachments even if one fails
            }
          } catch (uploadError) {
            console.error(`❌ Error uploading attachment ${attachment.originalname}:`, uploadError);
            // Continue with other attachments
          }
        }
      }

      // Update thread's last_message_at timestamp
      await query(
        `UPDATE message_threads SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [threadId]
      );

      // Invalidate caches after sending message
      if (senderType.toLowerCase() === 'couple') {
        // Get couple ID for cache invalidation
        let coupleIdForCache = actualSenderId;
        if (actualSenderId !== senderId) {
          // actualSenderId is couple_id, use it directly
          coupleIdForCache = actualSenderId;
        } else {
          // senderId might be user_id, try to get couple_id
          try {
            const coupleQuery = `SELECT id FROM couples WHERE user_id = ?`;
            const coupleResult = await query(coupleQuery, [senderId]);
            if (coupleResult.rows.length > 0) {
              coupleIdForCache = coupleResult.rows[0].id;
            }
          } catch (error) {
            // Use senderId as fallback
            coupleIdForCache = senderId;
          }
        }
        await performanceOptimizer.invalidateThreadListCache(coupleIdForCache);
      }
      await performanceOptimizer.invalidateMessageCache(threadId);

      // Retrieve the complete message
      const messageQuery = `
        SELECT id, thread_id, sender_id, sender_type, content,
               message_type, created_at, updated_at, status, is_deleted,
               delivery_status, delivered_at, read_at
        FROM messages
        WHERE id = ?
      `;

      const messageResult = await query(messageQuery, [messageId]);
      const message = messageResult.rows[0];

      // Decrypt content for response
      const decryptedContent = await encryptionService.decryptMessage(
        message.content,
        String(threadId)
      );

      console.log(`💬 Message sent successfully: Thread ${threadId}, Sender ${senderId} (${senderType}), Attachments: ${uploadedAttachments.length}`);

      // Schedule SMS reminder for the recipient if they have unread messages
      try {
        await this.scheduleUnreadSMSReminder(threadId, senderId, senderType, {
          content: decryptedContent,
          senderName: await this.getSenderName(senderId, senderType),
          messageId: message.id
        });
      } catch (reminderError) {
        console.error('⚠️ Failed to schedule SMS reminder:', reminderError);
        // Don't fail the message send if reminder scheduling fails
      }

      // Create notification for unread message
      try {
        await this.createUnreadMessageNotification(threadId, senderId, senderType, {
          content: decryptedContent,
          senderName: await this.getSenderName(senderId, senderType),
          messageId: message.id
        });
      } catch (notificationError) {
        console.error('⚠️ Failed to create unread message notification:', notificationError);
        // Don't fail the message send if notification creation fails
      }

      return {
        success: true,
        message: {
          id: message.id,
          threadId: message.thread_id,
          senderId: message.sender_id,
          senderType: message.sender_type,
          content: decryptedContent, // Return decrypted content
          messageType: message.message_type,
          status: message.status,
          deliveryStatus: message.delivery_status,
          deliveredAt: message.delivered_at,
          readAt: message.read_at,
          isDeleted: message.is_deleted,
          createdAt: message.created_at,
          updatedAt: message.updated_at,
          attachments: uploadedAttachments // Include uploaded attachments
        }
      };

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return {
        success: false,
        error: `Failed to send message: ${error.message}`
      };
    }
  }

  /**
   * Get messages from a conversation thread with pagination
   * 
   * @param {string|number} threadId - Thread identifier
   * @param {string|number} userId - User ID requesting messages
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @param {number} limit - Maximum number of messages to return
   * @param {number} offset - Number of messages to skip (for pagination)
   * @returns {Promise<{success: boolean, messages?: Array, total?: number, error?: string}>}
   */
  async getMessages(threadId, userId, userType, limit = 50, offset = 0) {
    const operationId = performanceOptimizer.startPerformanceMonitoring('getMessages');
    
    try {
      // Validate inputs
      if (!threadId || !userId || !userType) {
        return {
          success: false,
          error: 'Thread ID, user ID, and user type are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateSenderType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      // Verify user has access to this thread
      const accessCheck = await this.verifySenderAccess(
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

      // Validate pagination parameters
      const validLimit = Math.min(Math.max(1, parseInt(limit) || 50), this.maxMessagesPerPage);
      const validOffset = Math.max(0, parseInt(offset) || 0);

      // Try to get from cache first
      const cachedMessages = await performanceOptimizer.getCachedMessages(threadId, validLimit, validOffset);
      if (cachedMessages) {
        performanceOptimizer.endPerformanceMonitoring(operationId, { 
          source: 'cache', 
          messageCount: cachedMessages.messages.length 
        });
        return {
          success: true,
          messages: cachedMessages.messages,
          total: cachedMessages.messages.length,
          limit: validLimit,
          offset: validOffset,
          hasMore: cachedMessages.hasMore
        };
      }

      // Get total count of non-deleted messages
      const countQuery = `
        SELECT COUNT(*) as total
        FROM messages
        WHERE thread_id = ? AND is_deleted = 0
      `;

      const countResult = await query(countQuery, [threadId]);
      const total = countResult.rows[0].total;

      // Get messages with pagination - ordered chronologically (oldest first)
      const messagesQuery = `
        SELECT m.id, m.thread_id, m.sender_id, m.sender_type, m.content,
               m.message_type, m.created_at, m.updated_at, m.status, m.is_deleted,
               m.delivery_status, m.delivered_at, m.read_at,
               mrs.read_at as user_read_at
        FROM messages m
        LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
        WHERE m.thread_id = ? AND m.is_deleted = 0
        ORDER BY m.created_at ASC
        LIMIT ? OFFSET ?
      `;

      const messagesResult = await query(messagesQuery, [
        userId,
        threadId,
        validLimit,
        validOffset
      ]);

      // Decrypt message contents and get attachments
      const decryptedMessages = await Promise.all(
        messagesResult.rows.map(async (msg) => {
          try {
            const decryptedContent = await encryptionService.decryptMessage(
              msg.content,
              String(threadId)
            );

            // Get attachments for this message
            let attachments = [];
            try {
              const attachmentResult = await fileUploadService.getMessageAttachments(msg.id);
              if (attachmentResult.success) {
                attachments = attachmentResult.attachments;
              }
            } catch (attachmentError) {
              console.warn(`⚠️ Failed to get attachments for message ${msg.id}:`, attachmentError);
              // Continue without attachments
            }

            return {
              id: msg.id,
              threadId: msg.thread_id,
              senderId: msg.sender_id,
              senderType: msg.sender_type,
              content: decryptedContent,
              messageType: msg.message_type,
              status: msg.status,
              deliveryStatus: msg.delivery_status,
              deliveredAt: msg.delivered_at,
              readAt: msg.read_at,
              isDeleted: msg.is_deleted,
              userReadAt: msg.user_read_at,
              createdAt: msg.created_at,
              updatedAt: msg.updated_at,
              attachments: attachments // Include attachments
            };
          } catch (decryptError) {
            console.error(`❌ Failed to decrypt message ${msg.id}:`, decryptError);
            // Return message with error indicator instead of failing completely
            return {
              id: msg.id,
              threadId: msg.thread_id,
              senderId: msg.sender_id,
              senderType: msg.sender_type,
              content: '[Decryption failed]',
              messageType: msg.message_type,
              status: msg.status,
              deliveryStatus: msg.delivery_status,
              deliveredAt: msg.delivered_at,
              readAt: msg.read_at,
              isDeleted: msg.is_deleted,
              userReadAt: msg.user_read_at,
              createdAt: msg.created_at,
              updatedAt: msg.updated_at,
              attachments: [], // Empty attachments for failed decryption
              decryptionError: true
            };
          }
        })
      );

      const hasMore = (validOffset + validLimit) < total;

      // Cache the results
      await performanceOptimizer.cacheMessages(threadId, validLimit, validOffset, decryptedMessages, hasMore);

      performanceOptimizer.endPerformanceMonitoring(operationId, { 
        source: 'database', 
        messageCount: decryptedMessages.length,
        total: total
      });

      console.log(`💬 Retrieved ${decryptedMessages.length} messages from thread ${threadId}`);

      return {
        success: true,
        messages: decryptedMessages,
        total: total,
        limit: validLimit,
        offset: validOffset,
        hasMore: hasMore
      };

    } catch (error) {
      performanceOptimizer.endPerformanceMonitoring(operationId, { 
        error: error.message 
      });
      console.error('❌ Failed to get messages:', error);
      return {
        success: false,
        error: `Failed to retrieve messages: ${error.message}`
      };
    }
  }

  /**
   * Mark a message as read by a user
   * 
   * @param {string|number} messageId - Message identifier
   * @param {string|number} userId - User ID marking the message as read
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async markAsRead(messageId, userId, userType) {
    try {
      // Validate inputs
      if (!messageId || !userId || !userType) {
        return {
          success: false,
          error: 'Message ID, user ID, and user type are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateSenderType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      // Verify user has access to this message
      const accessCheck = await this.verifyMessageAccess(
        userId,
        userType,
        messageId
      );

      if (!accessCheck.authorized) {
        return {
          success: false,
          error: accessCheck.reason || 'Unauthorized access to message'
        };
      }

      // Check if user is not the sender (can't mark own messages as read)
      const message = accessCheck.message;
      if (String(message.sender_id) === String(userId) && 
          message.sender_type.toLowerCase() === userType.toLowerCase()) {
        return {
          success: false,
          error: 'Cannot mark your own message as read'
        };
      }

      // Check if already marked as read
      const checkQuery = `
        SELECT id FROM message_read_status
        WHERE message_id = ? AND user_id = ?
      `;

      const checkResult = await query(checkQuery, [messageId, userId]);

      if (checkResult.rows.length > 0) {
        // Already marked as read
        return {
          success: true,
          alreadyRead: true
        };
      }

      // Insert read status
      const insertQuery = `
        INSERT INTO message_read_status (message_id, user_id, read_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `;

      await query(insertQuery, [messageId, userId]);

      // Update message status to 'read'
      await query(
        `UPDATE messages SET status = 'read', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [messageId]
      );

      // Remove unread message notification for this message
      try {
        await this.removeUnreadMessageNotification(messageId, userId);
      } catch (notificationError) {
        console.warn('⚠️ Failed to remove unread message notification:', notificationError);
        // Don't fail the mark as read operation if notification removal fails
      }

      console.log(`✅ Message ${messageId} marked as read by user ${userId}`);

      return {
        success: true,
        alreadyRead: false
      };

    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
      return {
        success: false,
        error: `Failed to mark message as read: ${error.message}`
      };
    }
  }

  /**
   * Mark all unread messages in a thread as read for a specific user
   * 
   * @param {string|number} threadId - Thread identifier
   * @param {string|number} userId - User ID marking messages as read
   * @returns {Promise<{success: boolean, error?: string, markedCount?: number}>}
   */
  async markThreadAsRead(threadId, userId) {
    try {
      // Validate inputs
      if (!threadId || !userId) {
        return {
          success: false,
          error: 'Thread ID and user ID are required'
        };
      }

      // Get all unread messages in this thread that are not from this user
      const unreadMessagesQuery = `
        SELECT m.id, m.sender_id, m.sender_type
        FROM messages m
        LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
        WHERE m.thread_id = ? 
          AND m.is_deleted = 0 
          AND mrs.id IS NULL
          AND NOT (m.sender_id = ? OR (m.sender_type = 'couple' AND EXISTS (
            SELECT 1 FROM couples WHERE user_id = ? AND id = m.sender_id
          )))
      `;

      const unreadResult = await query(unreadMessagesQuery, [userId, threadId, userId, userId]);

      if (unreadResult.rows.length === 0) {
        return {
          success: true,
          markedCount: 0
        };
      }

      // Mark all unread messages as read
      let markedCount = 0;
      for (const message of unreadResult.rows) {
        try {
          // Insert read status
          await query(
            `INSERT INTO message_read_status (message_id, user_id, read_at)
             VALUES (?, ?, CURRENT_TIMESTAMP)`,
            [message.id, userId]
          );

          // Update message status to 'read'
          await query(
            `UPDATE messages SET status = 'read', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [message.id]
          );

          markedCount++;
        } catch (insertError) {
          // Skip if already exists (race condition)
          if (!insertError.message.includes('UNIQUE constraint failed')) {
            console.warn(`⚠️ Failed to mark message ${message.id} as read:`, insertError);
          }
        }
      }

      // Remove all unread message notifications for this thread and user
      try {
        await this.removeThreadUnreadNotifications(threadId, userId);
      } catch (notificationError) {
        console.warn('⚠️ Failed to remove thread unread notifications:', notificationError);
        // Don't fail the operation if notification removal fails
      }

      console.log(`✅ Marked ${markedCount} messages as read in thread ${threadId} for user ${userId}`);

      return {
        success: true,
        markedCount: markedCount
      };

    } catch (error) {
      console.error('❌ Failed to mark thread as read:', error);
      return {
        success: false,
        error: `Failed to mark thread as read: ${error.message}`
      };
    }
  }

  /**
   * Delete a message (soft delete - marks as deleted but preserves data)
   * 
   * @param {string|number} messageId - Message identifier
   * @param {string|number} userId - User ID requesting deletion
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteMessage(messageId, userId, userType) {
    try {
      // Validate inputs
      if (!messageId || !userId || !userType) {
        return {
          success: false,
          error: 'Message ID, user ID, and user type are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateSenderType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      // Verify user has access to this message
      const accessCheck = await this.verifyMessageAccess(
        userId,
        userType,
        messageId
      );

      if (!accessCheck.authorized) {
        return {
          success: false,
          error: accessCheck.reason || 'Unauthorized access to message'
        };
      }

      // Check if user is the sender (only sender can delete their own messages)
      const message = accessCheck.message;
      if (String(message.sender_id) !== String(userId) || 
          message.sender_type.toLowerCase() !== userType.toLowerCase()) {
        return {
          success: false,
          error: 'Only the message sender can delete their message'
        };
      }

      // Check if already deleted
      if (message.is_deleted) {
        return {
          success: true,
          alreadyDeleted: true
        };
      }

      // Soft delete the message
      const deleteQuery = `
        UPDATE messages 
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await query(deleteQuery, [messageId]);

      console.log(`🗑️ Message ${messageId} deleted by user ${userId}`);

      return {
        success: true,
        alreadyDeleted: false
      };

    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      return {
        success: false,
        error: `Failed to delete message: ${error.message}`
      };
    }
  }

  /**
   * Search messages within a thread
   * 
   * @param {string|number} threadId - Thread identifier
   * @param {string|number} userId - User ID performing search
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @param {string} searchQuery - Search query string
   * @param {number} limit - Maximum number of results
   * @returns {Promise<{success: boolean, messages?: Array, error?: string}>}
   */
  async searchMessages(threadId, userId, userType, searchQuery, limit = 20) {
    try {
      // Validate inputs
      if (!threadId || !userId || !userType || !searchQuery) {
        return {
          success: false,
          error: 'Thread ID, user ID, user type, and search query are required'
        };
      }

      // Validate user type
      const userTypeValidation = this.validateSenderType(userType);
      if (!userTypeValidation.valid) {
        return {
          success: false,
          error: userTypeValidation.error
        };
      }

      // Verify user has access to this thread
      const accessCheck = await this.verifySenderAccess(
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

      // Sanitize search query
      const sanitizedQuery = validator.escape(searchQuery.trim());

      if (sanitizedQuery.length === 0) {
        return {
          success: false,
          error: 'Search query cannot be empty'
        };
      }

      // Get all messages from thread (we need to decrypt to search) - ordered chronologically
      const messagesQuery = `
        SELECT id, thread_id, sender_id, sender_type, content,
               message_type, created_at, updated_at, status, is_deleted
        FROM messages
        WHERE thread_id = ? AND is_deleted = 0
        ORDER BY created_at ASC
      `;

      const messagesResult = await query(messagesQuery, [threadId]);

      // Decrypt and filter messages
      const matchingMessages = [];
      const searchLower = sanitizedQuery.toLowerCase();

      for (const msg of messagesResult.rows) {
        try {
          const decryptedContent = await encryptionService.decryptMessage(
            msg.content,
            String(threadId)
          );

          // Check if content matches search query (case-insensitive)
          if (decryptedContent.toLowerCase().includes(searchLower)) {
            matchingMessages.push({
              id: msg.id,
              threadId: msg.thread_id,
              senderId: msg.sender_id,
              senderType: msg.sender_type,
              content: decryptedContent,
              messageType: msg.message_type,
              status: msg.status,
              isDeleted: msg.is_deleted,
              createdAt: msg.created_at,
              updatedAt: msg.updated_at
            });

            // Stop if we've reached the limit
            if (matchingMessages.length >= limit) {
              break;
            }
          }
        } catch (decryptError) {
          console.error(`❌ Failed to decrypt message ${msg.id} during search:`, decryptError);
          // Skip messages that fail to decrypt
          continue;
        }
      }

      console.log(`🔍 Found ${matchingMessages.length} messages matching "${searchQuery}" in thread ${threadId}`);

      return {
        success: true,
        messages: matchingMessages,
        query: sanitizedQuery,
        total: matchingMessages.length
      };

    } catch (error) {
      console.error('❌ Failed to search messages:', error);
      return {
        success: false,
        error: `Failed to search messages: ${error.message}`
      };
    }
  }

  /**
   * Get message statistics for a thread
   * 
   * @param {string|number} threadId - Thread identifier
   * @param {string|number} userId - User ID requesting stats
   * @param {string} userType - Type of user ('couple' or 'vendor')
   * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
   */
  async getThreadStats(threadId, userId, userType) {
    try {
      // Verify user has access to this thread
      const accessCheck = await this.verifySenderAccess(
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

      // Get message counts
      const statsQuery = `
        SELECT 
          COUNT(*) as total_messages,
          SUM(CASE WHEN is_deleted = 0 THEN 1 ELSE 0 END) as active_messages,
          SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) as deleted_messages,
          SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_messages,
          SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) as unread_messages
        FROM messages
        WHERE thread_id = ?
      `;

      const statsResult = await query(statsQuery, [threadId]);
      const stats = statsResult.rows[0];

      return {
        success: true,
        stats: {
          totalMessages: stats.total_messages || 0,
          activeMessages: stats.active_messages || 0,
          deletedMessages: stats.deleted_messages || 0,
          readMessages: stats.read_messages || 0,
          unreadMessages: stats.unread_messages || 0
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
      maxMessageLength: this.maxMessageLength,
      maxMessagesPerPage: this.maxMessagesPerPage
    };
  }

  /**
   * Schedule SMS reminder for unread messages
   * @param {string} threadId - Thread ID
   * @param {string} senderId - ID of the message sender
   * @param {string} senderType - Type of sender (couple/vendor)
   * @param {Object} messageInfo - Message information
   */
  async scheduleUnreadSMSReminder(threadId, senderId, senderType, messageInfo) {
    try {
      // Get thread participants
      const threadQuery = `
        SELECT couple_id, vendor_id, 
               c.user_id as couple_user_id,
               v.user_id as vendor_user_id
        FROM message_threads mt
        LEFT JOIN couples c ON mt.couple_id = c.id
        LEFT JOIN vendors v ON mt.vendor_id = v.id
        WHERE mt.id = ?
      `;
      
      const threadResult = await query(threadQuery, [threadId]);
      if (threadResult.rows.length === 0) return;
      
      const thread = threadResult.rows[0];
      
      // Determine recipient (opposite of sender)
      let recipientUserId = null;
      
      if (senderType.toLowerCase() === 'couple') {
        // Message from couple to vendor
        recipientUserId = thread.vendor_user_id;
      } else if (senderType.toLowerCase() === 'vendor') {
        // Message from vendor to couple
        recipientUserId = thread.couple_user_id;
      }
      
      if (recipientUserId) {
        // Schedule SMS reminder for the recipient
        await smsReminderService.scheduleUnreadReminder(
          recipientUserId.toString(),
          threadId,
          messageInfo
        );
      }
      
    } catch (error) {
      console.error('❌ Failed to schedule unread SMS reminder:', error);
      throw error;
    }
  }

  /**
   * Get sender name for SMS notifications
   * @param {string} senderId - Sender ID
   * @param {string} senderType - Sender type (couple/vendor)
   */
  async getSenderName(senderId, senderType) {
    try {
      if (senderType.toLowerCase() === 'couple') {
        const coupleQuery = `
          SELECT CONCAT(partner1_name, ' & ', partner2_name) as name
          FROM couples 
          WHERE id = ?
        `;
        const result = await query(coupleQuery, [senderId]);
        return result.rows[0]?.name || 'Couple';
      } else if (senderType.toLowerCase() === 'vendor') {
        const vendorQuery = `
          SELECT business_name as name
          FROM vendors 
          WHERE id = ?
        `;
        const result = await query(vendorQuery, [senderId]);
        return result.rows[0]?.name || 'Vendor';
      }
      
      return 'Someone';
    } catch (error) {
      console.error('❌ Failed to get sender name:', error);
      return 'Someone';
    }
  }

  /**
   * Cancel SMS reminder when messages are read
   * @param {string} threadId - Thread ID
   * @param {string} userId - User ID who read the messages
   */
  async cancelUnreadSMSReminder(threadId, userId) {
    try {
      await smsReminderService.cancelUnreadReminder(userId, threadId);
    } catch (error) {
      console.error('❌ Failed to cancel SMS reminder:', error);
    }
  }

  /**
   * Create notification for unread message
   * @param {string} threadId - Thread ID
   * @param {string} senderId - ID of the message sender
   * @param {string} senderType - Type of sender (couple/vendor)
   * @param {Object} messageInfo - Message information
   */
  async createUnreadMessageNotification(threadId, senderId, senderType, messageInfo) {
    try {
      // Get thread participants
      const threadQuery = `
        SELECT couple_id, vendor_id, 
               c.user_id as couple_user_id,
               v.user_id as vendor_user_id
        FROM message_threads mt
        LEFT JOIN couples c ON mt.couple_id = c.id
        LEFT JOIN vendors v ON mt.vendor_id = v.id
        WHERE mt.id = ?
      `;
      
      const threadResult = await query(threadQuery, [threadId]);
      if (threadResult.rows.length === 0) return;
      
      const thread = threadResult.rows[0];
      
      // Determine recipient (opposite of sender)
      let recipientUserId = null;
      
      if (senderType.toLowerCase() === 'couple') {
        // Message from couple to vendor
        recipientUserId = thread.vendor_user_id;
      } else if (senderType.toLowerCase() === 'vendor') {
        // Message from vendor to couple
        recipientUserId = thread.couple_user_id;
      }
      
      if (!recipientUserId) {
        console.warn('⚠️ No recipient found for notification');
        return;
      }

      // Create notification in database
      const notificationQuery = `
        INSERT INTO notifications (user_id, type, title, message, link, data, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
      `;

      const messagePreview = messageInfo.content.length > 100 
        ? messageInfo.content.substring(0, 100) + '...' 
        : messageInfo.content;

      await query(notificationQuery, [
        recipientUserId,
        'message',
        'New Message',
        `You have an unread message from ${messageInfo.senderName}`,
        `/messages/${threadId}`,
        JSON.stringify({
          threadId: threadId,
          messageId: messageInfo.messageId,
          senderName: messageInfo.senderName,
          preview: messagePreview
        })
      ]);

      console.log(`✅ Created unread message notification for user ${recipientUserId} from ${messageInfo.senderName}`);
      
    } catch (error) {
      console.error('❌ Failed to create unread message notification:', error);
      throw error;
    }
  }

  /**
   * Remove unread message notification when message is read
   * @param {string} messageId - Message ID that was read
   * @param {string} userId - User ID who read the message
   */
  async removeUnreadMessageNotification(messageId, userId) {
    try {
      // Find and mark notification as read (will be auto-deleted after 24 hours)
      const updateQuery = `
        UPDATE notifications
        SET is_read = 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
        AND type = 'message'
        AND json_extract(data, '$.messageId') = ?
      `;

      const result = await query(updateQuery, [userId, messageId]);
      
      if (result.changes > 0) {
        console.log(`✅ Marked notification as read for message ${messageId} by user ${userId}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to remove unread message notification:', error);
      throw error;
    }
  }

  /**
   * Remove all unread message notifications for a thread when all messages are read
   * @param {string} threadId - Thread ID
   * @param {string} userId - User ID who read the messages
   */
  async removeThreadUnreadNotifications(threadId, userId) {
    try {
      // Mark all message notifications for this thread as read
      const updateQuery = `
        UPDATE notifications
        SET is_read = 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
        AND type = 'message'
        AND json_extract(data, '$.threadId') = ?
      `;

      const result = await query(updateQuery, [userId, threadId]);
      
      if (result.changes > 0) {
        console.log(`✅ Marked ${result.changes} notifications as read for thread ${threadId} by user ${userId}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to remove thread unread notifications:', error);
      throw error;
    }
  }
}

// Create singleton instance
const messageService = new MessageService();

module.exports = messageService;
