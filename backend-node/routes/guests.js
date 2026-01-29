const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Generate unique QR code
const generateQRCode = () => {
  return uuidv4();
};

// Validation rules
const guestValidation = [
  body('name').notEmpty().withMessage('Guest name is required'),
  body('email').optional({ nullable: true }).custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Valid email is required');
    }
    return true;
  }),
  body('phone').optional({ nullable: true }).custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    // Allow various phone formats: +1234567890, 0123456789, (123) 456-7890, etc.
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Valid phone number is required');
    }
    return true;
  }),
  body('table_number').optional({ nullable: true }).custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      throw new Error('Table number must be positive');
    }
    return true;
  })
];

// Get wedding guests
router.get('/wedding/:weddingId', authenticateToken, async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user has access to this wedding
    if (req.user.user_type === 'COUPLE') {
      const coupleResult = await query('SELECT id FROM couples WHERE user_id = ?', [req.user.id]);
      if (coupleResult.rows.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const coupleId = coupleResult.rows[0].id;
      const weddingCheck = await query('SELECT id FROM weddings WHERE id = ? AND couple_id = ?', [weddingId, coupleId]);
      if (weddingCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this wedding'
        });
      }
    }

    // Get guests
    const guestsResult = await query(`
      SELECT id, name, email, phone, qr_code, table_number, dietary_restrictions,
             is_checked_in, checked_in_at, created_at
      FROM guests 
      WHERE wedding_id = ?
      ORDER BY name ASC
    `, [weddingId]);

    res.json(guestsResult.rows);

  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get guests'
    });
  }
});

// Add guest
router.post('/wedding/:weddingId', authenticateToken, requireRole('COUPLE'), guestValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const weddingId = parseInt(req.params.weddingId);
    const { name, email, phone, table_number, dietary_restrictions } = req.body;

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = ?', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = ? AND couple_id = ?', [weddingId, coupleId]);
    if (weddingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Generate unique QR code
    let qrCode, isUnique = false;
    while (!isUnique) {
      qrCode = generateQRCode();
      const existing = await query('SELECT id FROM guests WHERE qr_code = ?', [qrCode]);
      isUnique = existing.rows.length === 0;
    }

    // Add guest
    const guestResult = await query(`
      INSERT INTO guests (wedding_id, name, email, phone, qr_code, table_number, dietary_restrictions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id, name, email, phone, qr_code, table_number, dietary_restrictions, 
                is_checked_in, checked_in_at, created_at
    `, [weddingId, name, email, phone, qrCode, table_number, dietary_restrictions]);

    const guest = guestResult.rows[0];

    res.status(201).json(guest);

  } catch (error) {
    console.error('Add guest error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add guest'
    });
  }
});

// Update guest
router.put('/:id', authenticateToken, requireRole('COUPLE'), guestValidation, async (req, res) => {
  console.log('=== UPDATE GUEST ENDPOINT CALLED ===');
  console.log('Guest ID:', req.params.id);
  console.log('User:', req.user);
  console.log('Request body:', req.body);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const guestId = parseInt(req.params.id);
    const { name, email, phone, table_number, dietary_restrictions } = req.body;

    if (isNaN(guestId)) {
      console.log('Invalid guest ID:', req.params.id);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid guest ID'
      });
    }

    // Verify user owns this guest's wedding
    console.log('Looking up couple for user ID:', req.user.id);
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = ?', [req.user.id]);
    console.log('Couple lookup result:', coupleResult.rows);
    
    if (coupleResult.rows.length === 0) {
      console.log('No couple found for user ID:', req.user.id);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied - no couple record found'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    console.log('Found couple ID:', coupleId);

    // Update guest (with ownership check)
    console.log('Updating guest with params:', [name, email, phone, table_number, dietary_restrictions, guestId, coupleId]);
    
    // First check if the guest exists and user has access
    const accessCheck = await query(`
      SELECT g.id 
      FROM guests g
      JOIN weddings w ON g.wedding_id = w.id
      WHERE g.id = ? AND w.couple_id = ?
    `, [guestId, coupleId]);

    if (accessCheck.rows.length === 0) {
      console.log('No guest found or access denied for guest ID:', guestId, 'couple ID:', coupleId);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Guest not found or access denied'
      });
    }

    // Now update the guest
    const guestResult = await query(`
      UPDATE guests 
      SET name = ?, email = ?, phone = ?, table_number = ?, dietary_restrictions = ?
      WHERE id = ?
    `, [name, email, phone, table_number, dietary_restrictions, guestId]);

    // Get the updated guest data
    const updatedGuest = await query(`
      SELECT id, name, email, phone, qr_code, table_number, dietary_restrictions, 
             is_checked_in, checked_in_at, created_at
      FROM guests 
      WHERE id = ?
    `, [guestId]);

    console.log('Update result:', updatedGuest.rows);

    if (updatedGuest.rows.length === 0) {
      console.log('Failed to retrieve updated guest');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve updated guest'
      });
    }

    const guest = updatedGuest.rows[0];
    console.log('Successfully updated guest:', guest);

    res.json(guest);

  } catch (error) {
    console.error('Update guest error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update guest',
      details: error.message
    });
  }
});

// Delete guest
router.delete('/:id', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  console.log('=== DELETE GUEST ENDPOINT CALLED ===');
  console.log('Guest ID:', req.params.id);
  console.log('User:', req.user);
  
  try {
    const guestId = parseInt(req.params.id);

    if (isNaN(guestId)) {
      console.log('Invalid guest ID:', req.params.id);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid guest ID'
      });
    }

    // Verify user owns this guest's wedding
    console.log('Looking up couple for user ID:', req.user.id);
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = ?', [req.user.id]);
    console.log('Couple lookup result:', coupleResult.rows);
    
    if (coupleResult.rows.length === 0) {
      console.log('No couple found for user ID:', req.user.id);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied - no couple record found'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    console.log('Found couple ID:', coupleId);

    // Delete guest (with ownership check)
    console.log('Deleting guest with params:', [guestId, coupleId]);
    
    // First check if the guest exists and user has access
    const accessCheck = await query(`
      SELECT g.id 
      FROM guests g
      JOIN weddings w ON g.wedding_id = w.id
      WHERE g.id = ? AND w.couple_id = ?
    `, [guestId, coupleId]);

    if (accessCheck.rows.length === 0) {
      console.log('No guest found or access denied for guest ID:', guestId, 'couple ID:', coupleId);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Guest not found or access denied'
      });
    }

    // Now delete the guest
    const deleteResult = await query(`
      DELETE FROM guests WHERE id = ?
    `, [guestId]);

    console.log('Delete result:', deleteResult);

    console.log('Successfully deleted guest ID:', guestId);
    res.json({
      message: 'Guest deleted successfully'
    });

  } catch (error) {
    console.error('Delete guest error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete guest',
      details: error.message
    });
  }
});

// Generate QR code image
router.get('/:id/qr-code', authenticateToken, async (req, res) => {
  try {
    const guestId = parseInt(req.params.id);

    if (isNaN(guestId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid guest ID'
      });
    }

    // Get guest with access check
    let guestQuery;
    let queryParams;

    if (req.user.user_type === 'COUPLE') {
      const coupleResult = await query('SELECT id FROM couples WHERE user_id = ?', [req.user.id]);
      if (coupleResult.rows.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const coupleId = coupleResult.rows[0].id;
      guestQuery = `
        SELECT g.qr_code, g.name
        FROM guests g
        JOIN weddings w ON g.wedding_id = w.id
        WHERE g.id = ? AND w.couple_id = ?
      `;
      queryParams = [guestId, coupleId];
    } else {
      // For staff or admin access
      guestQuery = 'SELECT qr_code, name FROM guests WHERE id = ?';
      queryParams = [guestId];
    }

    const guestResult = await query(guestQuery, queryParams);

    if (guestResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Guest not found or access denied'
      });
    }

    const guest = guestResult.rows[0];

    // Generate QR code image
    const qrCodeDataURL = await QRCode.toDataURL(guest.qr_code, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      qr_code: guest.qr_code,
      guest_name: guest.name,
      qr_code_image: qrCodeDataURL
    });

  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate QR code'
    });
  }
});

// Bulk import guests from CSV
router.post('/wedding/:weddingId/bulk-import-csv', authenticateToken, requireRole('COUPLE'), upload.single('file'), async (req, res) => {
  console.log('=== CSV IMPORT ENDPOINT CALLED ===');
  console.log('Wedding ID:', req.params.weddingId);
  console.log('User:', req.user);
  console.log('File:', req.file ? 'Present' : 'Missing');
  
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'CSV file is required'
      });
    }

    // Verify user owns this wedding
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = ?', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = ? AND couple_id = ?', [weddingId, coupleId]);
    if (weddingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Parse CSV data
    const csvData = [];
    const errors = [];
    let totalGuests = 0;
    let successfulImports = 0;
    let failedImports = 0;
    const importedGuests = [];

    console.log('Starting CSV parsing...');
    console.log('File buffer length:', req.file.buffer.length);

    // Create a readable stream from the buffer
    const stream = Readable.from(req.file.buffer.toString());

    // Parse CSV
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          totalGuests++;
          console.log(`Processing row ${totalGuests}:`, row);
          
          // Validate required fields - only name is truly required
          if (!row.name || row.name.trim() === '') {
            console.log(`Row ${totalGuests}: Name is missing or empty`);
            errors.push(`Row ${totalGuests}: Name is required`);
            failedImports++;
            return;
          }

          // Validate email format if provided (more lenient)
          if (row.email && row.email.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row.email.trim())) {
              console.log(`Row ${totalGuests}: Invalid email format:`, row.email);
              // Make this a warning instead of an error - still import the guest
              console.log(`Row ${totalGuests}: Email format warning (still importing): ${row.email}`);
              // Don't return here - continue with import but set email to null
              row.email = null;
            }
          }

          // Validate phone format if provided (very lenient - accept any format with at least 7 digits)
          if (row.phone && row.phone.trim() !== '') {
            const cleanPhone = row.phone.trim().replace(/[\s\-\(\)\+\.]/g, '');
            console.log(`Validating phone: "${row.phone}" -> cleaned: "${cleanPhone}"`);
            // Just check if it has at least 7 digits and only contains digits, spaces, dashes, parentheses, plus signs
            if (cleanPhone.length < 7 || !/^\d+$/.test(cleanPhone)) {
              console.log(`Row ${totalGuests}: Invalid phone format:`, row.phone);
              // Make this a warning instead of an error - still import the guest
              console.log(`Row ${totalGuests}: Phone format warning (still importing): ${row.phone}`);
              // Don't return here - continue with import
            }
          }

          // Validate table number if provided
          if (row.table_number && row.table_number.trim() !== '') {
            const tableNum = parseInt(row.table_number);
            if (isNaN(tableNum) || tableNum < 1) {
              console.log(`Row ${totalGuests}: Invalid table number:`, row.table_number);
              // Make this a warning instead of an error - still import the guest but set table to null
              console.log(`Row ${totalGuests}: Table number warning (still importing): ${row.table_number}`);
              row.table_number = null;
            }
          }

          console.log(`Row ${totalGuests}: Valid data, adding to csvData`);
          // Add valid row to csvData
          csvData.push({
            name: row.name.trim(),
            email: row.email && row.email.trim() !== '' && row.email !== null ? row.email.trim() : null,
            phone: row.phone && row.phone.trim() !== '' ? row.phone.trim() : null,
            table_number: row.table_number && row.table_number.trim() !== '' && row.table_number !== null ? parseInt(row.table_number) : null,
            dietary_restrictions: row.dietary_restrictions && row.dietary_restrictions.trim() !== '' ? row.dietary_restrictions.trim() : null
          });
        })
        .on('end', () => {
          console.log('CSV parsing completed');
          console.log('Total rows processed:', totalGuests);
          console.log('Valid rows for import:', csvData.length);
          console.log('Failed validations:', failedImports);
          resolve();
        })
        .on('error', (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        });
    });

    // Import valid guests
    console.log('Starting guest import process...');
    console.log('Number of guests to import:', csvData.length);
    
    for (const guestData of csvData) {
      try {
        console.log('Importing guest:', guestData.name);
        
        // Generate unique QR code
        let qrCode, isUnique = false;
        while (!isUnique) {
          qrCode = generateQRCode();
          const existing = await query('SELECT id FROM guests WHERE qr_code = ?', [qrCode]);
          isUnique = existing.rows.length === 0;
        }

        console.log('Generated QR code for', guestData.name, ':', qrCode);

        // Insert guest
        const guestResult = await query(`
          INSERT INTO guests (wedding_id, name, email, phone, qr_code, table_number, dietary_restrictions)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING id, name, email, phone, qr_code, table_number, dietary_restrictions, 
                    is_checked_in, checked_in_at, created_at
        `, [weddingId, guestData.name, guestData.email, guestData.phone, qrCode, guestData.table_number, guestData.dietary_restrictions]);

        console.log('Successfully imported guest:', guestData.name, 'with ID:', guestResult.rows[0].id);
        importedGuests.push(guestResult.rows[0]);
        successfulImports++;

      } catch (error) {
        console.error('Error importing guest:', guestData.name, error);
        errors.push(`Failed to import guest: ${guestData.name} - ${error.message}`);
        failedImports++;
      }
    }

    console.log('Import process completed');
    console.log('Successful imports:', successfulImports);
    console.log('Failed imports:', failedImports);
    console.log('Errors:', errors);

    res.json({
      total_guests: totalGuests,
      successful_imports: successfulImports,
      failed_imports: failedImports,
      errors: errors,
      imported_guests: importedGuests
    });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to import guests from CSV'
    });
  }
});

module.exports = router;