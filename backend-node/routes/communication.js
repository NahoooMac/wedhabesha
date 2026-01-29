const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const smsService = require('../services/smsService');

const router = express.Router();

// Validation rules
const qrInvitationValidation = [
  body('guest_ids').isArray({ min: 1 }).withMessage('At least one guest ID is required'),
  body('custom_message').optional().isString().withMessage('Custom message must be a string')
];

const eventUpdateValidation = [
  body('guest_ids').isArray({ min: 1 }).withMessage('At least one guest ID is required'),
  body('update_message').notEmpty().withMessage('Update message is required')
];

const bulkMessageValidation = [
  body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
  body('recipients.*.phone').notEmpty().withMessage('Phone number is required for each recipient'),
  body('recipients.*.message').notEmpty().withMessage('Message is required for each recipient')
];

// Send QR code invitations
router.post('/send-qr-invitations', authenticateToken, requireRole('COUPLE'), qrInvitationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    if (!smsService.isConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'SMS service is not configured'
      });
    }

    const { guest_ids, custom_message } = req.body;

    // Get couple and wedding info
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Get wedding details
    const weddingResult = await query(`
      SELECT w.id, w.wedding_date, w.venue_name, w.venue_address,
             c.partner1_name, c.partner2_name
      FROM weddings w
      JOIN couples c ON w.couple_id = c.id
      WHERE w.couple_id = $1
    `, [coupleId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found'
      });
    }

    const wedding = weddingResult.rows[0];

    // Get guests with phone numbers
    const guestsResult = await query(`
      SELECT id, name, phone, qr_code
      FROM guests 
      WHERE id = ANY($1) AND wedding_id = $2 AND phone IS NOT NULL AND phone != ''
    `, [guest_ids, wedding.id]);

    if (guestsResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No guests found with valid phone numbers'
      });
    }

    const guests = guestsResult.rows;
    const results = [];

    // Send personalized invitations
    const personalizedMessages = guests.map(guest => {
      const message = custom_message || smsService.generateWeddingInvitation(
        guest.name,
        wedding,
        guest.qr_code
      );

      return {
        to: guest.phone,
        message: message
      };
    });

    try {
      const smsResult = await smsService.sendPersonalizedBulkSMS(personalizedMessages, {
        campaign: `Wedding Invitation - ${wedding.partner1_name} & ${wedding.partner2_name}`
      });

      // Log message sending
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        const messageResult = {
          guest_id: guest.id,
          phone: guest.phone,
          status: smsResult.success ? 'sent' : 'failed',
          method: 'sms',
          message_id: smsResult.messageId,
          error: smsResult.success ? null : smsResult.error,
          timestamp: new Date().toISOString()
        };

        results.push(messageResult);

        // Store in database for tracking
        await query(`
          INSERT INTO message_logs (guest_id, phone, message, status, method, message_id, error_message, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          guest.id,
          guest.phone,
          personalizedMessages[i].message,
          messageResult.status,
          messageResult.method,
          messageResult.message_id,
          messageResult.error
        ]).catch(err => {
          console.warn('Failed to log message:', err);
        });
      }

      const successful = results.filter(r => r.status === 'sent').length;
      const failed = results.filter(r => r.status === 'failed').length;

      res.json({
        total_sent: results.length,
        successful: successful,
        failed: failed,
        results: results
      });

    } catch (error) {
      console.error('SMS sending error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send invitations'
      });
    }

  } catch (error) {
    console.error('Send QR invitations error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send QR invitations'
    });
  }
});

// Send event update
router.post('/send-event-update', authenticateToken, requireRole('COUPLE'), eventUpdateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    if (!smsService.isConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'SMS service is not configured'
      });
    }

    const { guest_ids, update_message } = req.body;

    // Get couple and wedding info
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;

    // Get wedding details
    const weddingResult = await query(`
      SELECT w.id, w.wedding_date, w.venue_name, w.venue_address,
             c.partner1_name, c.partner2_name
      FROM weddings w
      JOIN couples c ON w.couple_id = c.id
      WHERE w.couple_id = $1
    `, [coupleId]);

    if (weddingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wedding not found'
      });
    }

    const wedding = weddingResult.rows[0];

    // Get guests with phone numbers
    const guestsResult = await query(`
      SELECT id, name, phone
      FROM guests 
      WHERE id = ANY($1) AND wedding_id = $2 AND phone IS NOT NULL AND phone != ''
    `, [guest_ids, wedding.id]);

    if (guestsResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No guests found with valid phone numbers'
      });
    }

    const guests = guestsResult.rows;
    const results = [];

    // Send personalized updates
    const personalizedMessages = guests.map(guest => {
      const message = smsService.generateEventUpdate(guest.name, update_message, wedding);
      return {
        to: guest.phone,
        message: message
      };
    });

    try {
      const smsResult = await smsService.sendPersonalizedBulkSMS(personalizedMessages, {
        campaign: `Wedding Update - ${wedding.partner1_name} & ${wedding.partner2_name}`
      });

      // Log message sending
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        const messageResult = {
          guest_id: guest.id,
          phone: guest.phone,
          status: smsResult.success ? 'sent' : 'failed',
          method: 'sms',
          message_id: smsResult.messageId,
          error: smsResult.success ? null : smsResult.error,
          timestamp: new Date().toISOString()
        };

        results.push(messageResult);
      }

      const successful = results.filter(r => r.status === 'sent').length;
      const failed = results.filter(r => r.status === 'failed').length;

      res.json({
        total_sent: results.length,
        successful: successful,
        failed: failed,
        results: results
      });

    } catch (error) {
      console.error('SMS sending error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send event updates'
      });
    }

  } catch (error) {
    console.error('Send event update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send event update'
    });
  }
});

// Send bulk messages
router.post('/send-bulk-messages', authenticateToken, requireRole('COUPLE'), bulkMessageValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    if (!smsService.isConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'SMS service is not configured'
      });
    }

    const { recipients } = req.body;

    try {
      const smsResult = await smsService.sendPersonalizedBulkSMS(recipients, {
        campaign: 'Custom Bulk Messages'
      });

      const results = recipients.map((recipient, index) => ({
        phone: recipient.phone,
        status: smsResult.success ? 'sent' : 'failed',
        method: 'sms',
        message_id: smsResult.messageId,
        error: smsResult.success ? null : smsResult.error,
        timestamp: new Date().toISOString()
      }));

      const successful = results.filter(r => r.status === 'sent').length;
      const failed = results.filter(r => r.status === 'failed').length;

      res.json({
        total_sent: results.length,
        successful: successful,
        failed: failed,
        results: results
      });

    } catch (error) {
      console.error('Bulk SMS sending error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send bulk messages'
      });
    }

  } catch (error) {
    console.error('Send bulk messages error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send bulk messages'
    });
  }
});

// Get message templates
router.get('/message-templates', authenticateToken, (req, res) => {
  const templates = {
    wedding_invitation: {
      type: 'wedding_invitation',
      description: 'Wedding invitation with QR code',
      variables: ['guest_name', 'partner1_name', 'partner2_name', 'wedding_date', 'venue_name', 'venue_address', 'qr_code']
    },
    event_update: {
      type: 'event_update',
      description: 'Wedding event update notification',
      variables: ['guest_name', 'partner1_name', 'partner2_name', 'update_message']
    },
    reminder: {
      type: 'reminder',
      description: 'Wedding reminder message',
      variables: ['guest_name', 'partner1_name', 'partner2_name', 'wedding_date', 'venue_name']
    }
  };

  res.json({
    templates: templates
  });
});

// Send security code (OTP)
router.post('/send-security-code', authenticateToken, async (req, res) => {
  try {
    const { phone, length = 6, type = 0, ttl = 300 } = req.body;

    if (!phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Phone number is required'
      });
    }

    if (!smsService.isConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'SMS service is not configured'
      });
    }

    const result = await smsService.sendSecurityCode(phone, {
      length: length,
      type: type,
      ttl: ttl
    });

    if (result.success) {
      res.json({
        success: true,
        phone: result.phone,
        verification_id: result.verificationId,
        message: 'Security code sent successfully'
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error || 'Failed to send security code'
      });
    }

  } catch (error) {
    console.error('Send security code error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send security code'
    });
  }
});

// Verify security code
router.post('/verify-security-code', authenticateToken, async (req, res) => {
  try {
    const { phone, code, verification_id, use_afromessage_api = false } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Security code is required'
      });
    }

    if (!phone && !verification_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either phone number or verification ID is required'
      });
    }

    if (!smsService.isConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'SMS service is not configured'
      });
    }

    const result = await smsService.verifySecurityCode(phone, code, verification_id, use_afromessage_api);

    if (result.success) {
      res.json({
        success: true,
        verified: result.verified,
        message: 'Security code verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        message: result.error || 'Invalid security code'
      });
    }

  } catch (error) {
    console.error('Verify security code error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify security code'
    });
  }
});

module.exports = router;