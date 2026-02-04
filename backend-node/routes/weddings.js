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
      SELECT id, wedding_code, wedding_date, venue_name, venue_address, expected_guests, 
             template_id, template_customization, invitation_image_url, image_settings, created_at
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

    // Parse template_customization JSON if it exists
    if (wedding.template_customization) {
      try {
        wedding.template_customization = JSON.parse(wedding.template_customization);
      } catch (error) {
        console.error('Failed to parse template_customization:', error);
        wedding.template_customization = null;
      }
    }
    
    // Parse image_settings JSON if it exists
    if (wedding.image_settings) {
      try {
        wedding.image_settings = JSON.parse(wedding.image_settings);
      } catch (error) {
        console.error('Failed to parse image_settings:', error);
        wedding.image_settings = null;
      }
    }

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
             w.expected_guests, w.template_id, w.template_customization, w.invitation_image_url, 
             w.image_settings, w.created_at, c.user_id
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

    // Parse template_customization JSON if it exists
    if (wedding.template_customization) {
      try {
        wedding.template_customization = JSON.parse(wedding.template_customization);
      } catch (error) {
        console.error('Failed to parse template_customization:', error);
        wedding.template_customization = null;
      }
    }
    
    // Parse image_settings JSON if it exists
    if (wedding.image_settings) {
      try {
        wedding.image_settings = JSON.parse(wedding.image_settings);
      } catch (error) {
        console.error('Failed to parse image_settings:', error);
        wedding.image_settings = null;
      }
    }

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

// Template metadata whitelist - matches InvitationEngine TEMPLATE_METADATA
const VALID_TEMPLATE_IDS = [
  'traditional2',
  'traditional',
  'coppergeo',
  'goldenrings',
  'classicframe',
  'elegantgold',
  'royal',
  'violetpeony',
  'purplegold',
  'greengeo',
  'bluefloral',
  'classic',
  'modern',
  'rustic',
  'botanical',
  // Legacy IDs for backward compatibility
  'elegant-gold',
  'violet-peony',
  'purple-gold',
  'green-geometric',
  'blue-floral',
  'royal-floral'
];

// Validate customization data structure
const validateCustomization = (customization) => {
  const errors = [];

  // Check if customization is an object
  if (!customization || typeof customization !== 'object') {
    return ['Customization must be an object'];
  }

  // Required fields
  const requiredFields = ['wedding_title', 'ceremony_date', 'ceremony_time', 'venue_name', 'venue_address', 'custom_message'];
  
  for (const field of requiredFields) {
    if (!customization[field] || typeof customization[field] !== 'string' || customization[field].trim() === '') {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  }

  // Validate date format (YYYY-MM-DD or ISO 8601)
  if (customization.ceremony_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (!dateRegex.test(customization.ceremony_date)) {
      errors.push('ceremony_date must be in YYYY-MM-DD or ISO 8601 format');
    }
  }

  // Validate time format (HH:MM or HH:MM AM/PM)
  if (customization.ceremony_time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM|am|pm))?$/;
    if (!timeRegex.test(customization.ceremony_time)) {
      errors.push('ceremony_time must be in HH:MM or HH:MM AM/PM format');
    }
  }

  // Optional fields with type validation
  if (customization.text_y_position !== undefined) {
    if (typeof customization.text_y_position !== 'number') {
      errors.push('text_y_position must be a number');
    }
  }

  if (customization.qr_position !== undefined) {
    const validQrPositions = ['bottom-left', 'bottom-center', 'bottom-right'];
    if (!validQrPositions.includes(customization.qr_position)) {
      errors.push('qr_position must be one of: ' + validQrPositions.join(', '));
    }
  }

  if (customization.background_overlay !== undefined) {
    if (typeof customization.background_overlay !== 'number' || customization.background_overlay < 0 || customization.background_overlay > 1) {
      errors.push('background_overlay must be a number between 0 and 1');
    }
  }

  return errors;
};

// Update wedding template customization
// NOTE: This route MUST be defined before /:id/template to avoid route matching conflicts
router.put('/:id/template/customization', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.id);
    const { customization } = req.body;

    // Validate wedding ID
    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Validate customization is provided
    if (!customization) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'customization is required'
      });
    }

    // Validate customization data structure
    const validationErrors = validateCustomization(customization);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid customization data',
        details: validationErrors
      });
    }

    // Get couple ID and verify wedding ownership
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Verify wedding ownership
    const ownershipCheck = await query(`
      SELECT id FROM weddings WHERE id = $1 AND couple_id = $2
    `, [weddingId, coupleId]);

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    // Update wedding customization
    const updateResult = await query(`
      UPDATE weddings 
      SET template_customization = $1
      WHERE id = $2 AND couple_id = $3
    `, [JSON.stringify(customization), weddingId, coupleId]);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    // Fetch the updated wedding data
    const weddingResult = await query(`
      SELECT id, wedding_code, wedding_date, venue_name, venue_address, expected_guests, 
             template_id, template_customization, created_at
      FROM weddings
      WHERE id = $1
    `, [weddingId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found after update'
      });
    }

    const wedding = weddingResult.rows[0];

    res.json({
      success: true,
      wedding
    });

  } catch (error) {
    console.error('Update wedding customization error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update wedding customization'
    });
  }
});

// Update wedding template selection
router.put('/:id/template', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.id);
    const { template_id, customization } = req.body;

    // Validate wedding ID
    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Validate template_id is provided
    if (!template_id) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'template_id is required'
      });
    }

    // Validate template_id against whitelist
    if (!VALID_TEMPLATE_IDS.includes(template_id)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid template_id. Must be one of: ' + VALID_TEMPLATE_IDS.join(', ')
      });
    }

    // Validate customization if provided
    if (customization) {
      const validationErrors = validateCustomization(customization);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid customization data',
          details: validationErrors
        });
      }
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

    // Update wedding template and optionally customization
    let updateQuery, updateParams;
    if (customization) {
      updateQuery = `
        UPDATE weddings 
        SET template_id = $1, template_customization = $2
        WHERE id = $3 AND couple_id = $4
      `;
      updateParams = [template_id, JSON.stringify(customization), weddingId, coupleId];
    } else {
      updateQuery = `
        UPDATE weddings 
        SET template_id = $1
        WHERE id = $2 AND couple_id = $3
      `;
      updateParams = [template_id, weddingId, coupleId];
    }

    const updateResult = await query(updateQuery, updateParams);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    // Fetch the updated wedding data
    const weddingResult = await query(`
      SELECT id, wedding_code, wedding_date, venue_name, venue_address, expected_guests, 
             template_id, template_customization, created_at
      FROM weddings
      WHERE id = $1
    `, [weddingId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found after update'
      });
    }

    const wedding = weddingResult.rows[0];

    res.json({
      success: true,
      wedding
    });

  } catch (error) {
    console.error('Update wedding template error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update wedding template'
    });
  }
});

// Upload invitation image
router.post('/:id/upload-image', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs').promises;
    const crypto = require('crypto');

    const weddingId = parseInt(req.params.id);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Get couple ID and verify wedding ownership
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Verify wedding ownership
    const ownershipCheck = await query(`
      SELECT id, invitation_image_url FROM weddings WHERE id = $1 AND couple_id = $2
    `, [weddingId, coupleId]);

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    const oldImageUrl = ownershipCheck.rows[0].invitation_image_url;

    // Configure multer for file upload
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/invitations');
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error, null);
        }
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomHash = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}_${randomHash}${ext}`);
      }
    });

    const upload = multer({
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
        }
      }
    }).single('image');

    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          error: 'Upload Error',
          message: err.message || 'Failed to upload image'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No image file provided'
        });
      }

      try {
        // Generate URL for the uploaded image
        const imageUrl = `/uploads/invitations/${req.file.filename}`;

        // Update wedding record with new image URL
        await query(`
          UPDATE weddings 
          SET invitation_image_url = $1
          WHERE id = $2 AND couple_id = $3
        `, [imageUrl, weddingId, coupleId]);

        // Delete old image file if it exists
        if (oldImageUrl) {
          const oldImagePath = path.join(__dirname, '..', oldImageUrl);
          try {
            await fs.unlink(oldImagePath);
            console.log('Deleted old image:', oldImagePath);
          } catch (deleteError) {
            console.warn('Could not delete old image:', deleteError.message);
          }
        }

        res.json({
          success: true,
          image_url: imageUrl,
          message: 'Image uploaded successfully'
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
        
        // Clean up uploaded file if database update fails
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }

        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to save image URL to database'
        });
      }
    });

  } catch (error) {
    console.error('Upload invitation image error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload invitation image'
    });
  }
});

// Update image settings (zoom/pan)
router.put('/:id/image-settings', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.id);
    const { image_settings } = req.body;

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    if (!image_settings) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'image_settings is required'
      });
    }

    // Get couple ID and verify wedding ownership
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Couple profile not found'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Update image settings
    const updateResult = await query(`
      UPDATE weddings 
      SET image_settings = $1
      WHERE id = $2 AND couple_id = $3
    `, [JSON.stringify(image_settings), weddingId, coupleId]);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Image settings updated successfully'
    });

  } catch (error) {
    console.error('Update image settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update image settings'
    });
  }
});

module.exports = router;