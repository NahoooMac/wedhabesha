const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const googleContactsService = require('../services/googleContactsService');

const router = express.Router();

// Store for temporary OAuth states (in production, use Redis or database)
const oauthStates = new Map();

// Clean up expired states every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutes
      oauthStates.delete(state);
    }
  }
}, 10 * 60 * 1000);

/**
 * Initiate Google OAuth flow
 * GET /api/google/auth
 */
router.get('/auth', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const { weddingId } = req.query;

    if (!weddingId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Wedding ID is required'
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

    // Generate state for CSRF protection
    const state = uuidv4();
    oauthStates.set(state, {
      userId: req.user.id,
      weddingId: parseInt(weddingId),
      timestamp: Date.now()
    });

    // Get authorization URL
    const authUrl = googleContactsService.getAuthorizationUrl(state);

    res.json({
      authUrl,
      state
    });

  } catch (error) {
    console.error('Google auth initiation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initiate Google authentication'
    });
  }
});

/**
 * Google OAuth callback
 * GET /api/google/callback
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?google_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?google_error=missing_parameters`);
    }

    // Verify state
    const stateData = oauthStates.get(state);
    if (!stateData) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?google_error=invalid_state`);
    }

    // Clean up state
    oauthStates.delete(state);

    // Exchange code for token
    const tokenData = await googleContactsService.exchangeCodeForToken(code);

    // Store token temporarily (in production, encrypt and store in database)
    const sessionId = uuidv4();
    oauthStates.set(sessionId, {
      userId: stateData.userId,
      weddingId: stateData.weddingId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      timestamp: Date.now()
    });

    // Redirect to frontend with session ID
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?google_session=${sessionId}&wedding_id=${stateData.weddingId}`);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?google_error=callback_failed`);
  }
});

/**
 * Fetch contacts from Google
 * GET /api/google/contacts
 */
router.get('/contacts', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Session ID is required'
      });
    }

    // Get session data
    const sessionData = oauthStates.get(sessionId);
    if (!sessionData) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session'
      });
    }

    // Verify user
    if (sessionData.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    // Check if token is expired
    let accessToken = sessionData.accessToken;
    if (Date.now() >= sessionData.expiresAt) {
      // Refresh token
      if (!sessionData.refreshToken) {
        oauthStates.delete(sessionId);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired, please re-authenticate'
        });
      }

      const tokenData = await googleContactsService.refreshAccessToken(sessionData.refreshToken);
      accessToken = tokenData.access_token;
      
      // Update session
      sessionData.accessToken = accessToken;
      sessionData.expiresAt = Date.now() + (tokenData.expires_in * 1000);
      oauthStates.set(sessionId, sessionData);
    }

    // Fetch contacts
    const contacts = await googleContactsService.fetchAllContacts(accessToken);
    
    // Transform contacts to guest format
    const guests = googleContactsService.transformContactsToGuests(contacts);

    res.json({
      contacts: guests,
      total: guests.length
    });

  } catch (error) {
    console.error('Fetch contacts error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch contacts from Google'
    });
  }
});

/**
 * Import selected contacts as guests
 * POST /api/google/import
 */
router.post('/import', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const { weddingId, contacts } = req.body;

    if (!weddingId || !contacts || !Array.isArray(contacts)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Wedding ID and contacts array are required'
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

    // Get existing guests to check for duplicates
    const existingGuests = await query(
      'SELECT name, email, phone FROM guests WHERE wedding_id = ?',
      [weddingId]
    );

    const existingGuestsMap = new Map();
    existingGuests.rows.forEach(guest => {
      if (guest.email) existingGuestsMap.set(guest.email.toLowerCase(), true);
      if (guest.phone) existingGuestsMap.set(guest.phone.replace(/\D/g, ''), true);
    });

    // Import contacts
    const results = {
      total: contacts.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      imported: []
    };

    for (const contact of contacts) {
      try {
        // Validate contact
        if (!contact.name || contact.name.trim() === '') {
          results.failed++;
          results.errors.push(`Contact missing name`);
          continue;
        }

        // Check for duplicates
        const isDuplicate = 
          (contact.email && existingGuestsMap.has(contact.email.toLowerCase())) ||
          (contact.phone && existingGuestsMap.has(contact.phone.replace(/\D/g, '')));

        if (isDuplicate) {
          results.skipped++;
          results.errors.push(`Duplicate contact: ${contact.name}`);
          continue;
        }

        // Generate unique QR code
        let qrCode, isUnique = false;
        while (!isUnique) {
          qrCode = uuidv4();
          const existing = await query('SELECT id FROM guests WHERE qr_code = ?', [qrCode]);
          isUnique = existing.rows.length === 0;
        }

        // Insert guest
        const guestResult = await query(`
          INSERT INTO guests (wedding_id, name, email, phone, qr_code)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id, name, email, phone, qr_code, table_number, dietary_restrictions, 
                    is_checked_in, checked_in_at, created_at,
                    rsvp_status, rsvp_message, rsvp_responded_at, unique_code
        `, [weddingId, contact.name.trim(), contact.email || null, contact.phone || null, qrCode]);

        results.successful++;
        results.imported.push(guestResult.rows[0]);

        // Add to existing guests map to prevent duplicates within this import
        if (contact.email) existingGuestsMap.set(contact.email.toLowerCase(), true);
        if (contact.phone) existingGuestsMap.set(contact.phone.replace(/\D/g, ''), true);

      } catch (error) {
        console.error('Error importing contact:', contact.name, error);
        results.failed++;
        results.errors.push(`Failed to import ${contact.name}: ${error.message}`);
      }
    }

    res.json(results);

  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to import contacts'
    });
  }
});

module.exports = router;
