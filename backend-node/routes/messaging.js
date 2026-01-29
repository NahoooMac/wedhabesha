const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const dashboardIntegration = require('../services/dashboardIntegration');
const messageService = require('../services/messageService');
const threadManager = require('../services/threadManager');
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
 * @fileoverview Messaging Routes
 * 
 * Provides comprehensive API endpoints for messaging functionality between couples and vendors.
 * Includes real-time messaging, thread management, analytics, and lead integration.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-27
 * 
 * @requires express
 * @requires ../middleware/auth
 * @requires ../services/dashboardIntegration
 * @requires ../services/messageService
 * @requires ../services/threadManager
 * 
 * Requirements satisfied:
 * - 1.1: Couple thread access and display
 * - 1.2: Thread list with vendor information
 * - 2.1: Initiate conversation with vendor
 * - 3.1: Send and receive messages
 * - 8.1: Messaging analytics for vendors
 * - 8.2: Thread management
 * - 8.5: Lead integration
 */

// ============================================================================
// COUPLE MESSAGING ENDPOINTS
// ============================================================================

/**
 * Get all messaging threads for the authenticated couple
 * 
 * @route GET /api/v1/messaging/couple/threads
 * @access Private (Couples only)
 * @description Retrieves all active messaging threads between the couple and vendors,
 *              including thread metadata, last message preview, and unread counts.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from JWT middleware
 * @param {string} req.user.id - User ID
 * @param {string} req.user.user_type - Must be 'COUPLE'
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} 200 - Success response with threads array
 * @returns {Array} threads - Array of thread objects with vendor information
 * @returns {string} threads[].id - Thread ID
 * @returns {string} threads[].vendorId - Vendor ID
 * @returns {string} threads[].vendorName - Vendor business name
 * @returns {string} threads[].vendorCategory - Vendor service category
 * @returns {string} threads[].lastMessage - Preview of last message
 * @returns {string} threads[].lastMessageTime - ISO timestamp of last message
 * @returns {number} threads[].unreadCount - Number of unread messages
 * @returns {string} threads[].leadId - Associated lead ID (if any)
 * @returns {string} threads[].status - Thread status ('active', 'archived')
 * 
 * @returns {Object} 403 - Forbidden (not a couple)
 * @returns {Object} 404 - Couple profile not found
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // GET /api/v1/messaging/couple/threads
 * // Response:
 * {
 *   "threads": [
 *     {
 *       "id": "thread-123",
 *       "vendorId": "vendor-456",
 *       "vendorName": "Elegant Photography",
 *       "vendorCategory": "Photography",
 *       "lastMessage": "Thank you for your inquiry...",
 *       "lastMessageTime": "2024-01-27T10:30:00Z",
 *       "unreadCount": 2,
 *       "leadId": "lead-789",
 *       "status": "active"
 *     }
 *   ]
 * }
 * 
 * @satisfies Requirements 1.1, 1.2, 1.3, 1.4
 */
router.get('/couple/threads', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'COUPLE') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only couples can access this endpoint'
      });
    }

    // Get couple ID from user
    const coupleResult = await query(
      'SELECT id FROM couples WHERE user_id = ?',
      [req.user.id]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    const result = await dashboardIntegration.getCoupleThreadsWithVendors(coupleId, req.user.id);

    if (result.success) {
      res.json({ threads: result.threads });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Get couple threads error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get couple threads'
    });
  }
});

/**
 * Create a new messaging thread between couple and vendor
 * 
 * @route POST /api/v1/messaging/couple/threads
 * @access Private (Couples only)
 * @description Creates a new messaging thread from a couple to a vendor,
 *              optionally sending an initial message to start the conversation.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from JWT middleware
 * @param {Object} req.body - Request body
 * @param {string} req.body.vendorId - ID of the vendor to message
 * @param {string} [req.body.initialMessage] - Optional initial message content
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} 201 - Thread created successfully
 * @returns {Object} thread - Created thread object
 * @returns {string} thread.id - Thread ID
 * @returns {string} thread.coupleId - Couple ID
 * @returns {string} thread.vendorId - Vendor ID
 * @returns {string} thread.createdAt - ISO timestamp of creation
 * 
 * @returns {Object} 400 - Bad request (missing vendor ID)
 * @returns {Object} 403 - Forbidden (not a couple)
 * @returns {Object} 404 - Couple or vendor not found
 * @returns {Object} 409 - Thread already exists
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // POST /api/v1/messaging/couple/threads
 * // Body: { "vendorId": "vendor-456", "initialMessage": "Hi, interested in your services" }
 * // Response:
 * {
 *   "thread": {
 *     "id": "thread-123",
 *     "coupleId": "couple-789",
 *     "vendorId": "vendor-456",
 *     "createdAt": "2024-01-27T10:30:00Z"
 *   }
 * }
 * 
 * @satisfies Requirements 2.1, 2.2, 2.3, 2.4
 */
router.post('/couple/threads', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'COUPLE') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only couples can create threads'
      });
    }

    const { vendorId, initialMessage } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Vendor ID is required'
      });
    }

    // Get couple ID from user
    const coupleResult = await query(
      'SELECT id FROM couples WHERE user_id = ?',
      [req.user.id]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Verify vendor exists
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE id = ?',
      [vendorId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor not found'
      });
    }

    const result = await dashboardIntegration.createThreadFromCouple(coupleId, vendorId, initialMessage);

    console.log('DEBUG: Service returned:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('DEBUG: About to return result:', JSON.stringify(result, null, 2));
      res.status(201).json(result);
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Create thread from couple error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create thread'
    });
  }
});

// Get messages in a thread (couple view)
router.get('/couple/threads/:threadId/messages', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'COUPLE') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only couples can access this endpoint'
      });
    }

    const threadId = req.params.threadId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Get couple ID from user
    const coupleResult = await query(
      'SELECT id FROM couples WHERE user_id = ?',
      [req.user.id]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Verify couple owns this thread
    const threadResult = await query(
      'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?',
      [threadId, coupleId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this thread'
      });
    }

    const result = await messageService.getMessages(threadId, coupleId, 'couple', limit, offset);

    if (result.success) {
      res.json({
        messages: result.messages,
        hasMore: result.hasMore
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Get thread messages error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get messages'
    });
  }
});

// Send message as couple
router.post('/couple/messages', upload.array('files', 5), authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'COUPLE') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only couples can send messages'
      });
    }

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

    if (!threadId || !content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Thread ID and content are required'
      });
    }

    // Get couple ID from user
    const coupleResult = await query(
      'SELECT id FROM couples WHERE user_id = ?',
      [req.user.id]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Verify couple owns this thread
    const threadResult = await query(
      'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?',
      [threadId, coupleId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this thread'
      });
    }

    const result = await messageService.sendMessage(
      threadId,
      coupleId,
      'couple',
      content,
      messageType || 'text',
      attachments
    );

    if (result.success) {
      res.status(201).json({ message: result.message });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send message'
    });
  }
});

// Mark message as read (couple)
router.put('/couple/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'COUPLE') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only couples can mark messages as read'
      });
    }

    const messageId = req.params.messageId;

    const result = await messageService.markAsRead(messageId, req.user.id);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark message as read'
    });
  }
});

// Mark thread as read (couple) - marks all unread messages in thread as read
router.put('/couple/threads/:threadId/read', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'COUPLE') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only couples can mark threads as read'
      });
    }

    const threadId = req.params.threadId;

    // Get couple ID
    const coupleResult = await query(
      'SELECT id FROM couples WHERE user_id = ?',
      [req.user.id]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Verify couple owns this thread
    const threadResult = await query(
      'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?',
      [threadId, coupleId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this thread'
      });
    }

    // Mark all unread messages in this thread as read for this user
    const result = await messageService.markThreadAsRead(threadId, req.user.id);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error || 'Failed to mark thread as read'
      });
    }
  } catch (error) {
    console.error('Mark thread as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark thread as read'
    });
  }
});

// ============================================================================
// VENDOR MESSAGING ENDPOINTS
// ============================================================================

// Get messaging analytics for authenticated vendor
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access messaging analytics'
      });
    }

    // Get vendor ID from user
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    // Parse date range from query parameters
    const dateRange = {};
    if (req.query.start) {
      dateRange.start = new Date(req.query.start);
    }
    if (req.query.end) {
      dateRange.end = new Date(req.query.end);
    }

    const result = await dashboardIntegration.getMessagingAnalytics(vendorId, dateRange);

    if (result.success) {
      res.json(result.analytics);
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Get messaging analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get messaging analytics'
    });
  }
});

// Get vendor threads with lead information - UNIFIED ENDPOINT STRUCTURE
router.get('/threads', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    // Get vendor ID from user
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    const result = await dashboardIntegration.getVendorThreadsWithLeads(vendorId);

    if (result.success) {
      res.json({ threads: result.threads });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Get vendor threads error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor threads'
    });
  }
});

// Get messages in a thread (vendor view) - UNIFIED ENDPOINT STRUCTURE
router.get('/threads/:threadId/messages', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const threadId = req.params.threadId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Get vendor ID from user
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    // Verify vendor owns this thread
    const threadResult = await query(
      'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?',
      [threadId, vendorId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this thread'
      });
    }

    const result = await messageService.getMessages(threadId, vendorId, 'vendor', limit, offset);

    if (result.success) {
      res.json({
        messages: result.messages,
        hasMore: result.hasMore
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Get thread messages error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get messages'
    });
  }
});

// Send message as vendor - UNIFIED ENDPOINT STRUCTURE WITH PERSISTENCE
router.post('/messages', upload.array('files', 5), authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can send messages'
      });
    }

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

    if (!threadId || !content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Thread ID and content are required'
      });
    }

    // Get vendor ID from user
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    // Verify vendor owns this thread
    const threadResult = await query(
      'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?',
      [threadId, vendorId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this thread'
      });
    }

    const result = await messageService.sendMessage(
      threadId,
      vendorId,
      'vendor',
      content,
      messageType || 'text',
      attachments
    );

    if (result.success) {
      res.status(201).json({ message: result.message });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send message'
    });
  }
});

// Mark message as read (vendor) - UNIFIED ENDPOINT STRUCTURE
router.put('/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can mark messages as read'
      });
    }

    const messageId = req.params.messageId;

    const result = await messageService.markAsRead(messageId, req.user.id);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark message as read'
    });
  }
});

// Mark thread as read (vendor) - UNIFIED ENDPOINT STRUCTURE
router.put('/threads/:threadId/read', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can mark threads as read'
      });
    }

    const threadId = req.params.threadId;

    // Get vendor ID
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    // Verify vendor owns this thread
    const threadResult = await query(
      'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?',
      [threadId, vendorId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this thread'
      });
    }

    // Mark all unread messages in this thread as read for this user
    const result = await messageService.markThreadAsRead(threadId, req.user.id);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error || 'Failed to mark thread as read'
      });
    }
  } catch (error) {
    console.error('Mark thread as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark thread as read'
    });
  }
});

// Delete message (vendor) - UNIFIED ENDPOINT STRUCTURE
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can delete messages'
      });
    }

    const messageId = req.params.messageId;

    // Get vendor ID from user
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    // Verify vendor owns the message through thread ownership
    const messageResult = await query(
      `SELECT m.id FROM messages m
       JOIN message_threads mt ON m.thread_id = mt.id
       WHERE m.id = ? AND mt.vendor_id = ? AND m.sender_type = 'vendor'`,
      [messageId, vendorId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own messages'
      });
    }

    const result = await messageService.deleteMessage(messageId);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete message'
    });
  }
});

// Create thread from lead
router.post('/threads/from-lead/:leadId', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can create threads from leads'
      });
    }

    const leadId = parseInt(req.params.leadId);

    // Verify the lead belongs to this vendor
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    const leadResult = await query(
      'SELECT id FROM vendor_leads WHERE id = ? AND vendor_id = ?',
      [leadId, vendorId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Lead not found or does not belong to this vendor'
      });
    }

    const result = await dashboardIntegration.createThreadFromLead(leadId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Create thread from lead error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create thread from lead'
    });
  }
});

// Link message to lead
router.post('/messages/:messageId/link-lead', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can link messages to leads'
      });
    }

    const messageId = req.params.messageId;
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Lead ID is required'
      });
    }

    // Verify the lead belongs to this vendor
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    const leadResult = await query(
      'SELECT id FROM vendor_leads WHERE id = ? AND vendor_id = ?',
      [leadId, vendorId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Lead not found or does not belong to this vendor'
      });
    }

    const result = await dashboardIntegration.linkMessageToLead(messageId, leadId);

    if (result.success) {
      res.json({ success: true, message: 'Message linked to lead successfully' });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Link message to lead error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to link message to lead'
    });
  }
});

// Update lead status
router.put('/leads/:leadId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can update lead status'
      });
    }

    const leadId = parseInt(req.params.leadId);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Status is required'
      });
    }

    // Verify the lead belongs to this vendor
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    const leadResult = await query(
      'SELECT id FROM vendor_leads WHERE id = ? AND vendor_id = ?',
      [leadId, vendorId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Lead not found or does not belong to this vendor'
      });
    }

    const result = await dashboardIntegration.updateLeadStatus(leadId, status);

    if (result.success) {
      res.json({ success: true, message: 'Lead status updated successfully' });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update lead status'
    });
  }
});

// Get vendor profile
router.get('/vendor-profile/:vendorId', authenticateToken, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId);

    const result = await dashboardIntegration.getVendorProfile(vendorId);

    if (result.success) {
      res.json(result.profile);
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor profile'
    });
  }
});

// Get messaging summary for dashboard
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access messaging summary'
      });
    }

    // Get vendor ID from user
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE user_id = ?',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    // Get analytics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analyticsResult = await dashboardIntegration.getMessagingAnalytics(vendorId, {
      start: thirtyDaysAgo,
      end: new Date()
    });

    // Get unread message count
    const unreadResult = await query(
      `SELECT COUNT(*) as unread_count
       FROM messages m
       JOIN message_threads mt ON m.thread_id = mt.id
       LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
       WHERE mt.vendor_id = ?
         AND m.sender_type = 'couple'
         AND mrs.id IS NULL`,
      [req.user.id, vendorId]
    );

    const unreadCount = unreadResult.rows[0]?.unread_count || 0;

    if (analyticsResult.success) {
      res.json({
        ...analyticsResult.analytics,
        unreadMessages: unreadCount
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: analyticsResult.error
      });
    }
  } catch (error) {
    console.error('Get messaging summary error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get messaging summary'
    });
  }
});

module.exports = router;
