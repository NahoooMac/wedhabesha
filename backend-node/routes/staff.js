const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateStaff } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token for staff
const generateStaffToken = (staffId, weddingId) => {
  return jwt.sign(
    { staffId, weddingId, type: 'staff' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.STAFF_SESSION_TIMEOUT || '8h' }
  );
};

// Validation rules
const staffRegisterValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('staff_name').notEmpty().withMessage('Staff name is required'),
  body('staff_role').notEmpty().withMessage('Staff role is required'),
  body('wedding_code').notEmpty().withMessage('Wedding code is required')
];

// Validation rules
const staffLoginValidation = [
  body('wedding_code').notEmpty().withMessage('Wedding code is required'),
  body('staff_pin').notEmpty().withMessage('Staff PIN is required')
];

// Staff login with Wedding Code + PIN
router.post('/login', staffLoginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { wedding_code, staff_pin } = req.body;

    console.log('Staff login attempt:', { wedding_code: wedding_code?.toUpperCase(), hasPin: !!staff_pin });

    // Get wedding by code and verify PIN
    const weddingResult = await query(`
      SELECT id, wedding_code, staff_pin, wedding_date, venue_name, expected_guests
      FROM weddings
      WHERE wedding_code = ?
    `, [wedding_code.toUpperCase()]);

    if (weddingResult.rows.length === 0) {
      console.log('Wedding not found for code:', wedding_code?.toUpperCase());
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Wedding ID or PIN'
      });
    }

    const wedding = weddingResult.rows[0];
    console.log('Wedding found:', { id: wedding.id, code: wedding.wedding_code });

    // Verify staff PIN
    const isValidPin = await bcrypt.compare(staff_pin, wedding.staff_pin);
    if (!isValidPin) {
      console.log('Invalid PIN for wedding:', wedding.wedding_code);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Wedding ID or PIN'
      });
    }

    console.log('PIN verified successfully for wedding:', wedding.wedding_code);

    // Generate session token
    const sessionToken = jwt.sign(
      { 
        weddingId: wedding.id,
        weddingCode: wedding.wedding_code,
        type: 'staff_session'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.STAFF_SESSION_TIMEOUT || '8h' }
    );

    // Try to create session record (optional - don't fail if table doesn't exist)
    try {
      const clientIp = req.ip || req.connection.remoteAddress;
      const deviceInfo = req.get('user-agent') || 'Unknown';

      await query(`
        INSERT INTO staff_sessions (wedding_id, session_token, ip_address, device_info, is_active)
        VALUES (?, ?, ?, ?, true)
      `, [wedding.id, sessionToken, clientIp, deviceInfo]);
      
      console.log('Session record created successfully');
    } catch (sessionError) {
      console.log('Session record creation failed (non-critical):', sessionError.message);
      // Continue without failing - session tracking is optional
    }

    console.log('Staff login successful for wedding:', wedding.wedding_code);

    res.json({
      access_token: sessionToken,
      token_type: 'bearer',
      expires_in: parseInt(process.env.STAFF_SESSION_TIMEOUT || '28800'),
      session: {
        wedding_id: wedding.id,
        wedding_code: wedding.wedding_code,
        wedding_date: wedding.wedding_date,
        venue_name: wedding.venue_name,
        expected_guests: wedding.expected_guests
      }
    });

  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
});

// Get current staff session info
router.get('/me', authenticateStaff, async (req, res) => {
  try {
    const { weddingId, weddingCode, wedding } = req.staffSession;

    res.json({
      wedding_id: weddingId,
      wedding_code: weddingCode,
      wedding_date: wedding.wedding_date,
      venue_name: wedding.venue_name,
      expected_guests: wedding.expected_guests
    });

  } catch (error) {
    console.error('Get staff session error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get staff session data'
    });
  }
});

// Get wedding statistics
router.get('/wedding/stats', authenticateStaff, async (req, res) => {
  try {
    const { weddingId } = req.staffSession;

    // Get guest statistics
    const guestStats = await query(`
      SELECT 
        COUNT(*) as total_guests,
        SUM(CASE WHEN is_checked_in = true THEN 1 ELSE 0 END) as checked_in_guests
      FROM guests
      WHERE wedding_id = ?
    `, [weddingId]);

    const stats = guestStats.rows[0];

    res.json({
      total_guests: parseInt(stats.total_guests) || 0,
      checked_in_guests: parseInt(stats.checked_in_guests) || 0,
      pending_guests: (parseInt(stats.total_guests) || 0) - (parseInt(stats.checked_in_guests) || 0),
      check_in_percentage: stats.total_guests > 0 ? Math.round((stats.checked_in_guests / stats.total_guests) * 100) : 0
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get statistics'
    });
  }
});

module.exports = router;
