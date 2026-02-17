const express = require('express');
const { query } = require('../config/database');
const { authenticateStaff } = require('../middleware/auth');

const router = express.Router();

// Scan QR code for check-in
router.post('/scan-qr', authenticateStaff, async (req, res) => {
  try {
    const { qr_code, checked_in_at } = req.body;
    const weddingId = req.staffSession.weddingId;

    if (!qr_code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'QR code is required'
      });
    }

    // Find guest by QR code
    const guestResult = await query(`
      SELECT id, name, wedding_id, is_checked_in, checked_in_at
      FROM guests 
      WHERE qr_code = ? AND wedding_id = ?
    `, [qr_code, weddingId]);

    if (guestResult.rows.length === 0) {
      // Check if QR code exists for a different wedding
      const otherWeddingResult = await query(`
        SELECT id, wedding_id FROM guests WHERE qr_code = ?
      `, [qr_code]);

      if (otherWeddingResult.rows.length > 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Not invited to this wedding',
          detail: 'This guest is registered for a different wedding'
        });
      }

      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid QR code or guest not found'
      });
    }

    const guest = guestResult.rows[0];

    // Check if already checked in
    if (guest.is_checked_in) {
      return res.json({
        success: true,
        message: 'Guest already checked in',
        guest_name: guest.name,
        checked_in_at: guest.checked_in_at,
        is_duplicate: true
      });
    }

    // Use provided timestamp or current time
    const timestamp = checked_in_at || new Date().toISOString();

    // Check in the guest
    const checkInResult = await query(`
      UPDATE guests 
      SET is_checked_in = true, checked_in_at = ?
      WHERE id = ?
      RETURNING name, checked_in_at
    `, [timestamp, guest.id]);

    const checkedInGuest = checkInResult.rows[0];

    res.json({
      success: true,
      message: 'Guest checked in successfully',
      guest_name: checkedInGuest.name,
      checked_in_at: checkedInGuest.checked_in_at,
      is_duplicate: false
    });

  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process check-in'
    });
  }
});

// Manual check-in
router.post('/manual', authenticateStaff, async (req, res) => {
  try {
    const { guest_id } = req.body;
    const weddingId = req.staffSession.weddingId;

    if (!guest_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Guest ID is required'
      });
    }

    // Find guest
    const guestResult = await query(`
      SELECT id, name, is_checked_in, checked_in_at
      FROM guests 
      WHERE id = ? AND wedding_id = ?
    `, [guest_id, weddingId]);

    if (guestResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Guest not found'
      });
    }

    const guest = guestResult.rows[0];

    // Check if already checked in
    if (guest.is_checked_in) {
      return res.json({
        success: true,
        message: 'Guest already checked in',
        guest_name: guest.name,
        checked_in_at: guest.checked_in_at,
        is_duplicate: true
      });
    }

    // Check in the guest
    const checkInResult = await query(`
      UPDATE guests 
      SET is_checked_in = true, checked_in_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING name, checked_in_at
    `, [guest.id]);

    const checkedInGuest = checkInResult.rows[0];

    res.json({
      success: true,
      message: 'Guest checked in successfully',
      guest_name: checkedInGuest.name,
      checked_in_at: checkedInGuest.checked_in_at,
      is_duplicate: false
    });

  } catch (error) {
    console.error('Manual check-in error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process check-in'
    });
  }
});

// Get check-in statistics
router.get('/stats', authenticateStaff, async (req, res) => {
  try {
    const weddingId = req.staffSession.weddingId;

    // Get total and checked-in counts
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_guests,
        COUNT(CASE WHEN is_checked_in = true THEN 1 END) as checked_in_count
      FROM guests 
      WHERE wedding_id = ?
    `, [weddingId]);

    const stats = statsResult.rows[0];
    const pendingCount = stats.total_guests - stats.checked_in_count;
    const checkinRate = stats.total_guests > 0 ? 
      (stats.checked_in_count / stats.total_guests * 100).toFixed(1) : 0;

    // Get recent check-ins
    const recentResult = await query(`
      SELECT name, checked_in_at
      FROM guests 
      WHERE wedding_id = ? AND is_checked_in = true
      ORDER BY checked_in_at DESC
      LIMIT 10
    `, [weddingId]);

    res.json({
      total_guests: parseInt(stats.total_guests),
      checked_in_count: parseInt(stats.checked_in_count),
      pending_count: pendingCount,
      checkin_rate: parseFloat(checkinRate),
      recent_checkins: recentResult.rows.map(row => ({
        guest_name: row.name,
        checked_in_at: row.checked_in_at,
        method: 'manual' // Default for now
      }))
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get check-in statistics'
    });
  }
});

// Get guest list for staff
router.get('/guests', authenticateStaff, async (req, res) => {
  try {
    const weddingId = req.staffSession.weddingId;
    const { search } = req.query;

    let guestQuery = `
      SELECT id, name, table_number, is_checked_in, checked_in_at, qr_code
      FROM guests 
      WHERE wedding_id = ?
    `;
    const queryParams = [weddingId];

    if (search) {
      guestQuery += ` AND name LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    guestQuery += ` ORDER BY name ASC`;

    const guestsResult = await query(guestQuery, queryParams);

    res.json(guestsResult.rows);

  } catch (error) {
    console.error('Get guests for staff error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get guest list'
    });
  }
});

// Get check-in history
router.get('/history', authenticateStaff, async (req, res) => {
  try {
    const weddingId = req.staffSession.weddingId;
    const { limit = '100', method_filter, time_filter } = req.query;

    let historyQuery = `
      SELECT 
        g.id,
        g.name as guest_name,
        g.checked_in_at,
        g.table_number,
        'MANUAL' as method,
        'Staff' as checked_in_by
      FROM guests g
      WHERE g.wedding_id = ? AND g.is_checked_in = true
    `;
    const queryParams = [weddingId];

    // Apply method filter
    if (method_filter && method_filter !== 'all') {
      // For now, all check-ins are marked as MANUAL
      // In the future, you can add a method column to track QR_SCAN vs MANUAL
      if (method_filter === 'QR_SCAN') {
        // Return empty array if filtering for QR scans (not implemented yet)
        return res.json([]);
      }
    }

    // Apply time filter
    if (time_filter && time_filter !== 'all') {
      if (time_filter === 'last_hour') {
        historyQuery += ` AND g.checked_in_at >= datetime('now', '-1 hour')`;
      } else if (time_filter === 'last_30min') {
        historyQuery += ` AND g.checked_in_at >= datetime('now', '-30 minutes')`;
      }
    }

    historyQuery += ` ORDER BY g.checked_in_at DESC LIMIT ?`;
    queryParams.push(parseInt(limit));

    const historyResult = await query(historyQuery, queryParams);

    res.json(historyResult.rows);

  } catch (error) {
    console.error('Get check-in history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get check-in history'
    });
  }
});

module.exports = router;