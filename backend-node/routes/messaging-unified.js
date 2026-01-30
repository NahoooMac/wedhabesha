const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const dashboardIntegration = require('../services/dashboardIntegration');
const messageService = require('../services/messageService');
const multer = require('multer');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  }
});

/**
 * @fileoverview Unified Messaging Routes
 * 
 * Provides standardized API endpoints for messaging functionality between couples and vendors.
 * Implements consistent URL patterns, request/response formats, authentication, and error handling.
 * 
 * @author Wedding Platform Team
 * @version 2.0.0
 * @since 2024-01-28
 * 
 * Unified Endpoint Structure:
 * /api/v1/messaging/
 * ├── threads/                    # Thread management
 * │   ├── GET /                  # Get user's threads
 * │   ├── POST /                 # Create new thread
 * │   ├── GET /:id               # Get specific thread
 * │   └── PUT /:id/read          # Mark thread as read
 * ├── messages/                   # Message operations
 * │   ├── GET /:threadId         # Get thread messages
 * │   ├── POST /                 # Send message
 * │   ├── PUT /:id/read          # Mark message as read
 * │   └── DELETE /:id            # Delete message
 * └── search/                     # Search functionality
 *     └── GET /:threadId         # Search messages in thread
 * 
 * Requirements satisfied:
 * - 8.1: Consistent URL patterns
 * - 8.2: Identical request/response formats
 * - 8.3: Consistent authentication patterns
 * - 8.4: Standardized response structures
 * - 8.5: Consistent error response formats
 */

/**
 * Standardized API Response Format
 * 
 * @typedef {Object} APIResponse
 * @property {boolean} success - Operation success status
 * @property {*} [data] - Response data (when successful)
 * @property {Object} [error] - Error information (when failed)
 * @property {string} error.code - Error code
 * @property {string} error.message - Error message
 * @property {*} [error.details] - Additional error details
 * @property {Object} [pagination] - Pagination information
 * @property {number} pagination.total - Total items
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.offset - Current offset
 * @property {boolean} pagination.hasMore - More items available
 */

/**
 * Helper function to get user context (couple or vendor)
 */
async function getUserContext(userId, userType) {
  if (userType === 'COUPLE') {
    const result = await query(
      'SELECT id FROM couples WHERE user_id = ?',
      [userId]
    );
    return result.rows.length > 0 ? { id: result.rows[0].id, type: 'couple' } : null;
  } else if (userType === 'VENDOR') {
    const result = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [userId]
    );
    return result.rows.length > 0 ? { id: result.rows[0].id, type: 'vendor' } : null;
  }
  return null;
}

/**
 * Helper function to create standardized API response
 */
function createAPIResponse(success, data = null, error = null, pagination = null) {
  const response = { success };
  
  if (success && data !== null) {
    response.data = data;
  }
  
  if (!success && error) {
    response.error = {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An error occurred',
      ...(error.details && { details: error.details })
    };
  }
  
  if (pagination) {
    response.pagination = pagination;
  }
  
  return response;
}

// ============================================================================
// THREAD MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all messaging threads for the authenticated user
 * 
 * @route GET /api/v1/messaging/threads
 * @access Private (Couples and Vendors)
 * @description Retrieves all active messaging threads for the authenticated user,
 *              with consistent response format regardless of user type.
 * 
 * @returns {APIResponse} Standardized response with threads array
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.get('/threads', authenticateToken, async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id, req.user.user_type);
    
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    let result;
    if (userContext.type === 'couple') {
      result = await dashboardIntegration.getCoupleThreadsWithVendors(userContext.id, req.user.id);
    } else {
      result = await dashboardIntegration.getVendorThreadsWithLeads(userContext.id, req.user.id);
    }

    if (result.success) {
      res.json(createAPIResponse(true, { threads: result.threads }));
    } else {
      res.status(500).json(createAPIResponse(false, null, {
        code: 'FETCH_THREADS_FAILED',
        message: result.error
      }));
    }
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to get threads'
    }));
  }
});

/**
 * Create a new messaging thread
 * 
 * @route POST /api/v1/messaging/threads
 * @access Private (Couples only)
 * @description Creates a new messaging thread from a couple to a vendor
 * 
 * @param {Object} req.body - Request body
 * @param {string} req.body.vendorId - ID of the vendor to message
 * @param {string} [req.body.initialMessage] - Optional initial message content
 * 
 * @returns {APIResponse} Standardized response with created thread
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.post('/threads', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'COUPLE') {
      return res.status(403).json(createAPIResponse(false, null, {
        code: 'FORBIDDEN',
        message: 'Only couples can create threads'
      }));
    }

    const { vendorId, initialMessage } = req.body;

    if (!vendorId) {
      return res.status(400).json(createAPIResponse(false, null, {
        code: 'MISSING_VENDOR_ID',
        message: 'Vendor ID is required'
      }));
    }

    const userContext = await getUserContext(req.user.id, req.user.user_type);
    
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'COUPLE_NOT_FOUND',
        message: 'Couple profile not found'
      }));
    }

    // Verify vendor exists
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE id = ?',
      [vendorId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'VENDOR_NOT_FOUND',
        message: 'Vendor not found'
      }));
    }

    const result = await dashboardIntegration.createThreadFromCouple(userContext.id, vendorId, initialMessage);

    if (result.success) {
      res.status(201).json(createAPIResponse(true, result));
    } else {
      res.status(500).json(createAPIResponse(false, null, {
        code: 'CREATE_THREAD_FAILED',
        message: result.error
      }));
    }
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to create thread'
    }));
  }
});

/**
 * Get specific thread details
 * 
 * @route GET /api/v1/messaging/threads/:id
 * @access Private (Thread participants only)
 * @description Retrieves details for a specific thread
 * 
 * @returns {APIResponse} Standardized response with thread details
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.get('/threads/:id', authenticateToken, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userContext = await getUserContext(req.user.id, req.user.user_type);
    
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    // Verify user has access to this thread
    const accessQuery = userContext.type === 'couple' 
      ? 'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?'
      : 'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?';
    
    const threadResult = await query(accessQuery, [threadId, userContext.id]);

    if (threadResult.rows.length === 0) {
      return res.status(403).json(createAPIResponse(false, null, {
        code: 'THREAD_ACCESS_DENIED',
        message: 'You do not have access to this thread'
      }));
    }

    // Get thread details (implementation would depend on specific requirements)
    res.json(createAPIResponse(true, { thread: { id: threadId } }));
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to get thread'
    }));
  }
});

/**
 * Mark thread as read
 * 
 * @route PUT /api/v1/messaging/threads/:id/read
 * @access Private (Thread participants only)
 * @description Marks all unread messages in a thread as read
 * 
 * @returns {APIResponse} Standardized response
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.put('/threads/:id/read', authenticateToken, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userContext = await getUserContext(req.user.id, req.user.user_type);
    
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    // Verify user has access to this thread
    const accessQuery = userContext.type === 'couple' 
      ? 'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?'
      : 'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?';
    
    const threadResult = await query(accessQuery, [threadId, userContext.id]);

    if (threadResult.rows.length === 0) {
      return res.status(403).json(createAPIResponse(false, null, {
        code: 'THREAD_ACCESS_DENIED',
        message: 'You do not have access to this thread'
      }));
    }

    const result = await messageService.markThreadAsRead(threadId, req.user.id);

    if (result.success) {
      // Cancel SMS reminder when thread is marked as read
      try {
        await messageService.cancelUnreadSMSReminder(threadId, req.user.id.toString());
      } catch (reminderError) {
        console.error('⚠️ Failed to cancel SMS reminder:', reminderError);
        // Don't fail the mark-as-read operation if reminder cancellation fails
      }
      
      res.json(createAPIResponse(true, { success: true }));
    } else {
      res.status(500).json(createAPIResponse(false, null, {
        code: 'MARK_READ_FAILED',
        message: result.error || 'Failed to mark thread as read'
      }));
    }
  } catch (error) {
    console.error('Mark thread as read error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to mark thread as read'
    }));
  }
});

// ============================================================================
// MESSAGE OPERATIONS ENDPOINTS
// ============================================================================

/**
 * Get messages in a thread
 * 
 * @route GET /api/v1/messaging/messages/:threadId
 * @access Private (Thread participants only)
 * @description Retrieves messages for a specific thread with pagination
 * 
 * @param {string} req.params.threadId - Thread ID
 * @param {number} [req.query.limit=50] - Number of messages to retrieve
 * @param {number} [req.query.offset=0] - Offset for pagination
 * 
 * @returns {APIResponse} Standardized response with messages array and pagination
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.get('/messages/:threadId', authenticateToken, async (req, res) => {
  try {
    const threadId = req.params.threadId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const userContext = await getUserContext(req.user.id, req.user.user_type);
    
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    // Verify user has access to this thread
    const accessQuery = userContext.type === 'couple' 
      ? 'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?'
      : 'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?';
    
    const threadResult = await query(accessQuery, [threadId, userContext.id]);

    if (threadResult.rows.length === 0) {
      return res.status(403).json(createAPIResponse(false, null, {
        code: 'THREAD_ACCESS_DENIED',
        message: 'You do not have access to this thread'
      }));
    }

    const result = await messageService.getMessages(threadId, userContext.id, userContext.type, limit, offset);

    if (result.success) {
      res.json(createAPIResponse(true, 
        { messages: result.messages },
        null,
        {
          total: result.total || result.messages.length,
          limit,
          offset,
          hasMore: result.hasMore || false
        }
      ));
    } else {
      res.status(500).json(createAPIResponse(false, null, {
        code: 'FETCH_MESSAGES_FAILED',
        message: result.error
      }));
    }
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to get messages'
    }));
  }
});

/**
 * Send a message
 * 
 * @route POST /api/v1/messaging/messages
 * @access Private (Thread participants only)
 * @description Sends a message in a thread with optional file attachments
 * 
 * @param {Object} req.body - Request body (or FormData for file uploads)
 * @param {string} req.body.threadId - Thread ID
 * @param {string} req.body.content - Message content
 * @param {string} [req.body.messageType='text'] - Message type
 * @param {File[]} [req.files] - Optional file attachments
 * 
 * @returns {APIResponse} Standardized response with created message
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.post('/messages', upload.array('files', 5), authenticateToken, async (req, res) => {
  try {
    const { threadId, content, messageType } = req.body;
    let attachments = [];

    // Handle file uploads from multer
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }));
    }

    // Validate required fields - threadId is always required, content is required only if no attachments
    if (!threadId) {
      return res.status(400).json(createAPIResponse(false, null, {
        code: 'MISSING_THREAD_ID',
        message: 'Thread ID is required'
      }));
    }

    // Content is required only if there are no attachments
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json(createAPIResponse(false, null, {
        code: 'MISSING_CONTENT_OR_ATTACHMENTS',
        message: 'Either message content or attachments are required'
      }));
    }

    const userContext = await getUserContext(req.user.id, req.user.user_type);
    
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    // Verify user has access to this thread
    const accessQuery = userContext.type === 'couple' 
      ? 'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?'
      : 'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?';
    
    const threadResult = await query(accessQuery, [threadId, userContext.id]);

    if (threadResult.rows.length === 0) {
      return res.status(403).json(createAPIResponse(false, null, {
        code: 'THREAD_ACCESS_DENIED',
        message: 'You do not have access to this thread'
      }));
    }

    const result = await messageService.sendMessage(
      threadId,
      userContext.id,
      userContext.type,
      content,
      messageType || 'text',
      attachments
    );

    if (result.success) {
      res.status(201).json(createAPIResponse(true, { message: result.message }));
    } else {
      res.status(500).json(createAPIResponse(false, null, {
        code: 'SEND_MESSAGE_FAILED',
        message: result.error
      }));
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to send message'
    }));
  }
});

/**
 * Mark message as read
 * 
 * @route PUT /api/v1/messaging/messages/:id/read
 * @access Private (Message recipient only)
 * @description Marks a specific message as read
 * 
 * @returns {APIResponse} Standardized response
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.put('/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;

    const result = await messageService.markAsRead(messageId, req.user.id);

    if (result.success) {
      res.json(createAPIResponse(true, { success: true }));
    } else {
      res.status(500).json(createAPIResponse(false, null, {
        code: 'MARK_READ_FAILED',
        message: result.error
      }));
    }
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to mark message as read'
    }));
  }
});

/**
 * Delete a message
 * 
 * @route DELETE /api/v1/messaging/messages/:id
 * @access Private (Message sender only)
 * @description Deletes a specific message
 * 
 * @returns {APIResponse} Standardized response
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.delete('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userContext = await getUserContext(req.user.id, req.user.user_type);
    
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    // Verify user owns the message
    const messageResult = await query(
      `SELECT m.id FROM messages m
       JOIN message_threads mt ON m.thread_id = mt.id
       WHERE m.id = ? AND m.sender_type = ? AND 
       ${userContext.type === 'couple' ? 'mt.couple_id' : 'mt.vendor_id'} = ?`,
      [messageId, userContext.type, userContext.id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(403).json(createAPIResponse(false, null, {
        code: 'MESSAGE_ACCESS_DENIED',
        message: 'You can only delete your own messages'
      }));
    }

    const result = await messageService.deleteMessage(messageId);

    if (result.success) {
      res.json(createAPIResponse(true, { success: true }));
    } else {
      res.status(500).json(createAPIResponse(false, null, {
        code: 'DELETE_MESSAGE_FAILED',
        message: result.error
      }));
    }
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete message'
    }));
  }
});

// ============================================================================
// SEARCH FUNCTIONALITY ENDPOINTS
// ============================================================================

/**
 * Search messages in a thread
 * 
 * @route GET /api/v1/messaging/search/:threadId
 * @access Private (Thread participants only)
 * @description Searches for messages within a specific thread
 * 
 * @param {string} req.params.threadId - Thread ID
 * @param {string} req.query.q - Search query
 * @param {string} [req.query.startDate] - Start date filter (ISO string)
 * @param {string} [req.query.endDate] - End date filter (ISO string)
 * @param {number} [req.query.limit=50] - Number of results to retrieve
 * @param {number} [req.query.offset=0] - Offset for pagination
 * 
 * @returns {APIResponse} Standardized response with search results
 * 
 * @satisfies Requirements 8.1, 8.2, 8.4
 */
router.get('/search/:threadId', authenticateToken, async (req, res) => {
  try {
    const threadId = req.params.threadId;
    const { q: searchQuery, startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (!searchQuery) {
      return res.status(400).json(createAPIResponse(false, null, {
        code: 'MISSING_SEARCH_QUERY',
        message: 'Search query is required'
      }));
    }

    const userContext = await getUserContext(req.user.id, req.user.user_type);
    
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    // Verify user has access to this thread
    const accessQuery = userContext.type === 'couple' 
      ? 'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?'
      : 'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?';
    
    const threadResult = await query(accessQuery, [threadId, userContext.id]);

    if (threadResult.rows.length === 0) {
      return res.status(403).json(createAPIResponse(false, null, {
        code: 'THREAD_ACCESS_DENIED',
        message: 'You do not have access to this thread'
      }));
    }

    // Build search query - ordered chronologically
    let searchSql = `
      SELECT * FROM messages 
      WHERE thread_id = ? AND content LIKE ?
    `;
    let searchParams = [threadId, `%${searchQuery}%`];

    if (startDate) {
      searchSql += ' AND created_at >= ?';
      searchParams.push(new Date(startDate));
    }

    if (endDate) {
      searchSql += ' AND created_at <= ?';
      searchParams.push(new Date(endDate));
    }

    searchSql += ' ORDER BY created_at ASC LIMIT ? OFFSET ?';
    searchParams.push(limit, offset);

    const searchResult = await query(searchSql, searchParams);

    res.json(createAPIResponse(true, 
      { messages: searchResult.rows },
      null,
      {
        total: searchResult.rows.length,
        limit,
        offset,
        hasMore: searchResult.rows.length === limit
      }
    ));
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to search messages'
    }));
  }
});

/**
 * Get unread message counts
 * 
 * @route GET /api/v1/messaging/unread-counts
 * @access Private (Couples and Vendors)
 * @description Gets total unread count and per-thread unread counts for the authenticated user
 */
router.get('/unread-counts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    // Get user context
    const userContext = await getUserContext(userId, userType);
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    // Get threads for this user
    let threadsQuery;
    let threadsParams;

    if (userContext.type === 'couple') {
      threadsQuery = `
        SELECT 
          t.id,
          COUNT(CASE WHEN m.is_read = 0 AND m.sender_type != 'couple' THEN 1 END) as unread_count
        FROM message_threads t
        LEFT JOIN messages m ON t.id = m.thread_id
        WHERE t.couple_id = ?
        GROUP BY t.id
      `;
      threadsParams = [userContext.id];
    } else {
      threadsQuery = `
        SELECT 
          t.id,
          COUNT(CASE WHEN m.is_read = 0 AND m.sender_type != 'vendor' THEN 1 END) as unread_count
        FROM message_threads t
        LEFT JOIN messages m ON t.id = m.thread_id
        WHERE t.vendor_id = ?
        GROUP BY t.id
      `;
      threadsParams = [userContext.id];
    }

    const threadsResult = await query(threadsQuery, threadsParams);

    // Calculate totals
    let totalUnread = 0;
    const threadCounts = {};

    threadsResult.rows.forEach(thread => {
      const unreadCount = parseInt(thread.unread_count) || 0;
      if (unreadCount > 0) {
        threadCounts[thread.id] = unreadCount;
        totalUnread += unreadCount;
      }
    });

    res.json(createAPIResponse(true, {
      totalUnread,
      threadCounts
    }));

  } catch (error) {
    console.error('Get unread counts error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to get unread counts'
    }));
  }
});

/**
 * Get total unread message count
 * 
 * @route GET /api/v1/messaging/unread-count
 * @access Private (Couples and Vendors)
 * @description Gets total unread message count for the authenticated user
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    // Get user context
    const userContext = await getUserContext(userId, userType);
    if (!userContext) {
      return res.status(404).json(createAPIResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found'
      }));
    }

    // Get total unread count
    let countQuery;
    let countParams;

    if (userContext.type === 'couple') {
      countQuery = `
        SELECT COUNT(*) as count
        FROM messages m
        JOIN message_threads t ON m.thread_id = t.id
        WHERE t.couple_id = ? AND m.is_read = 0 AND m.sender_type != 'couple'
      `;
      countParams = [userContext.id];
    } else {
      countQuery = `
        SELECT COUNT(*) as count
        FROM messages m
        JOIN message_threads t ON m.thread_id = t.id
        WHERE t.vendor_id = ? AND m.is_read = 0 AND m.sender_type != 'vendor'
      `;
      countParams = [userContext.id];
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0]?.count) || 0;

    res.json(createAPIResponse(true, {
      count: totalCount
    }));

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json(createAPIResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to get unread count'
    }));
  }
});

module.exports = router;