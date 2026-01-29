const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Generate unique wedding code
const generateWeddingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate staff PIN
const generateStaffPin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validation rules
const weddingValidation = [
  body('wedding_date').isISO8601().withMessage('Valid wedding date is required'),
  body('venue_name').notEmpty().withMessage('Venue name is required'),
  body('venue_address').notEmpty().withMessage('Venue address is required'),
  body('expected_guests').isInt({ min: 1 }).withMessage('Expected guests must be a positive number')
];

// Create wedding
router.post('/', authenticateToken, requireRole('COUPLE'), weddingValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { wedding_date, venue_name, venue_address, expected_guests } = req.body;

    // Get couple ID
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Check if couple already has a wedding
    const existingWedding = await query('SELECT id FROM weddings WHERE couple_id = $1', [coupleId]);
    if (existingWedding.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Wedding already exists for this couple'
      });
    }

    // Generate unique wedding code
    let weddingCode, isUnique = false;
    while (!isUnique) {
      weddingCode = generateWeddingCode();
      const existing = await query('SELECT id FROM weddings WHERE wedding_code = $1', [weddingCode]);
      isUnique = existing.rows.length === 0;
    }

    // Generate and hash staff PIN
    const staffPin = generateStaffPin();
    const hashedStaffPin = await bcrypt.hash(staffPin, 10);

    // Create wedding
    const weddingResult = await query(`
      INSERT INTO weddings (couple_id, wedding_code, staff_pin, wedding_date, venue_name, venue_address, expected_guests)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, wedding_code, wedding_date, venue_name, venue_address, expected_guests, created_at
    `, [coupleId, weddingCode, hashedStaffPin, wedding_date, venue_name, venue_address, expected_guests]);

    const wedding = weddingResult.rows[0];

    res.status(201).json({
      ...wedding,
      staff_pin: staffPin // Only returned on creation
    });

  } catch (error) {
    console.error('Create wedding error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create wedding'
    });
  }
});

// Get current user's wedding
router.get('/me', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    // Get couple ID
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Get wedding
    const weddingResult = await query(`
      SELECT id, wedding_code, wedding_date, venue_name, venue_address, expected_guests, created_at
      FROM weddings 
      WHERE couple_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [coupleId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found'
      });
    }

    const wedding = weddingResult.rows[0];

    res.json(wedding);

  } catch (error) {
    console.error('Get wedding error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get wedding'
    });
  }
});

// Get wedding by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const weddingId = parseInt(req.params.id);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Get wedding with couple info
    const weddingResult = await query(`
      SELECT w.id, w.wedding_code, w.wedding_date, w.venue_name, w.venue_address, 
             w.expected_guests, w.created_at, c.user_id
      FROM weddings w
      JOIN couples c ON w.couple_id = c.id
      WHERE w.id = $1
    `, [weddingId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found'
      });
    }

    const wedding = weddingResult.rows[0];

    // Check if user has access to this wedding
    if (req.user.user_type === 'COUPLE' && wedding.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Remove sensitive data
    delete wedding.user_id;

    res.json(wedding);

  } catch (error) {
    console.error('Get wedding by ID error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get wedding'
    });
  }
});

// Update wedding
router.put('/:id', authenticateToken, requireRole('COUPLE'), weddingValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const weddingId = parseInt(req.params.id);
    const { wedding_date, venue_name, venue_address, expected_guests } = req.body;

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Get couple ID
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Update wedding
    const weddingResult = await query(`
      UPDATE weddings 
      SET wedding_date = $1, venue_name = $2, venue_address = $3, expected_guests = $4
      WHERE id = $5 AND couple_id = $6
      RETURNING id, wedding_code, wedding_date, venue_name, venue_address, expected_guests, created_at
    `, [wedding_date, venue_name, venue_address, expected_guests, weddingId, coupleId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    const wedding = weddingResult.rows[0];

    res.json(wedding);

  } catch (error) {
    console.error('Update wedding error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update wedding'
    });
  }
});

// Delete wedding
router.delete('/:id', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.id);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Get couple ID
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Delete wedding (cascade will handle related records)
    const deleteResult = await query(`
      DELETE FROM weddings 
      WHERE id = $1 AND couple_id = $2
      RETURNING id
    `, [weddingId, coupleId]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    res.json({
      message: 'Wedding deleted successfully'
    });

  } catch (error) {
    console.error('Delete wedding error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete wedding'
    });
  }
});

// Refresh wedding code
router.post('/:id/refresh-code', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.id);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Get couple ID
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Generate new unique wedding code
    let newWeddingCode, isUnique = false;
    while (!isUnique) {
      newWeddingCode = generateWeddingCode();
      const existing = await query('SELECT id FROM weddings WHERE wedding_code = $1', [newWeddingCode]);
      isUnique = existing.rows.length === 0;
    }

    // Update wedding code
    const weddingResult = await query(`
      UPDATE weddings 
      SET wedding_code = $1
      WHERE id = $2 AND couple_id = $3
      RETURNING id, wedding_code, wedding_date, venue_name, venue_address, expected_guests, created_at
    `, [newWeddingCode, weddingId, coupleId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    const wedding = weddingResult.rows[0];

    res.json({
      message: 'Wedding code refreshed successfully',
      wedding
    });

  } catch (error) {
    console.error('Refresh wedding code error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh wedding code'
    });
  }
});

// Update staff PIN
router.post('/:id/update-pin', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.id);
    const { new_pin } = req.body;

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Validate PIN format (6 digits)
    if (!new_pin || !/^\d{6}$/.test(new_pin)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'PIN must be exactly 6 digits'
      });
    }

    // Get couple ID
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Hash new PIN
    const hashedPin = await bcrypt.hash(new_pin, 10);

    // Update staff PIN
    const weddingResult = await query(`
      UPDATE weddings 
      SET staff_pin = $1
      WHERE id = $2 AND couple_id = $3
      RETURNING id, wedding_code
    `, [hashedPin, weddingId, coupleId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    res.json({
      message: 'Staff PIN updated successfully',
      wedding_code: weddingResult.rows[0].wedding_code
    });

  } catch (error) {
    console.error('Update staff PIN error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update staff PIN'
    });
  }
});

module.exports = router;