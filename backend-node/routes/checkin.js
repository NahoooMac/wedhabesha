const express = require('express');
const { query } = require('../config/database');
const { authenticateStaff } = require('../middleware/auth');

const router = express.Router();

// Scan QR code for check-in
router.post('/scan-qr', authenticateStaff, async (req, res) => {
  try {
    const { qr_code } = req.body;
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

module.exports = router;