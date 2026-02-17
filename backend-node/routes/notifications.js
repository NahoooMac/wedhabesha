const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Get all notifications for a user
 * GET /api/v1/notifications/:userId
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    // Verify user has access to these notifications
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own notifications'
      });
    }

    // Build query
    let sql = `
      SELECT 
        id,
        user_id,
        type,
        title,
        message,
        is_read,
        link,
        data,
        created_at,
        updated_at
      FROM notifications
      WHERE user_id = ?
    `;

    const params = [userId];

    if (unreadOnly === 'true') {
      sql += ' AND is_read = 0';
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Get unread count
    const unreadResult = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      notifications: result.rows.map(row => ({
        id: row.id.toString(),
        type: row.type,
        title: row.title,
        message: row.message,
        read: Boolean(row.is_read),
        link: row.link,
        data: row.data ? JSON.parse(row.data) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      unreadCount: unreadResult.rows[0].count,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notifications'
    });
  }
});

/**
 * Get unread notification count
 * GET /api/v1/notifications/:userId/unread-count
 */
router.get('/:userId/unread-count', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user has access
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own notifications'
      });
    }

    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      unreadCount: result.rows[0].count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch unread count'
    });
  }
});

/**
 * Mark a notification as read
 * PUT /api/v1/notifications/:notificationId/read
 */
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Get notification to verify ownership
    const notificationResult = await query(
      'SELECT user_id FROM notifications WHERE id = ?',
      [notificationId]
    );

    if (notificationResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found'
      });
    }

    // Verify user owns this notification
    if (req.user.id !== notificationResult.rows[0].user_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only modify your own notifications'
      });
    }

    // Mark as read
    await query(
      'UPDATE notifications SET is_read = 1, updated_at = datetime("now") WHERE id = ?',
      [notificationId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark notification as read'
    });
  }
});

/**
 * Mark all notifications as read for a user
 * PUT /api/v1/notifications/:userId/read-all
 */
router.put('/:userId/read-all', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user has access
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only modify your own notifications'
      });
    }

    // Mark all as read
    const result = await query(
      'UPDATE notifications SET is_read = 1, updated_at = datetime("now") WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: result.rowCount || 0
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark all notifications as read'
    });
  }
});

/**
 * Delete a notification
 * DELETE /api/v1/notifications/:notificationId
 */
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Get notification to verify ownership
    const notificationResult = await query(
      'SELECT user_id FROM notifications WHERE id = ?',
      [notificationId]
    );

    if (notificationResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found'
      });
    }

    // Verify user owns this notification
    if (req.user.id !== notificationResult.rows[0].user_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own notifications'
      });
    }

    // Delete notification
    await query('DELETE FROM notifications WHERE id = ?', [notificationId]);

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete notification'
    });
  }
});

/**
 * Create a notification (Admin/System use)
 * POST /api/v1/notifications
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, type, title, message, link, data } = req.body;

    // Validate required fields
    if (!user_id || !type || !title || !message) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'user_id, type, title, and message are required'
      });
    }

    // Validate notification type
    const validTypes = ['announcement', 'message', 'alert', 'info'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Insert notification
    const result = await query(`
      INSERT INTO notifications (user_id, type, title, message, link, data, is_read)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [
      user_id,
      type,
      title,
      message,
      link || null,
      data ? JSON.stringify(data) : null
    ]);

    res.status(201).json({
      success: true,
      message: 'Notification created',
      notificationId: result.lastID || result.rows[0].id
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create notification'
    });
  }
});

module.exports = router;
