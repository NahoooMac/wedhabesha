const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const templateService = require('../services/templateService');
const invitationService = require('../services/invitationService');
const { query } = require('../config/database');

/**
 * GET /api/invitations/templates
 * Get all available invitation templates
 * Public endpoint
 */
router.get('/templates', (req, res) => {
  try {
    const templates = templateService.getTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/invitations/wedding/:weddingId
 * Get wedding invitation settings
 * Requires authentication
 */
router.get('/wedding/:weddingId', authenticateToken, async (req, res) => {
  try {
    const { weddingId } = req.params;
    
    const result = await query(
      'SELECT invitation_template_id, invitation_customization FROM weddings WHERE id = ?',
      [weddingId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    
    const wedding = result.rows[0];
    let customization = {};
    
    if (wedding.invitation_customization) {
      try {
        customization = JSON.parse(wedding.invitation_customization);
      } catch (e) {
        console.error('Failed to parse customization:', e);
      }
    }
    
    res.json({
      template_id: wedding.invitation_template_id,
      customization
    });
  } catch (error) {
    console.error('Error fetching wedding invitation settings:', error);
    res.status(500).json({ error: 'Failed to fetch invitation settings' });
  }
});

/**
 * PUT /api/invitations/wedding/:weddingId
 * Update wedding invitation settings
 * Requires authentication
 */
router.put('/wedding/:weddingId', authenticateToken, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { template_id, customization } = req.body;
    
    console.log('=== INVITATION UPDATE REQUEST ===');
    console.log('Wedding ID:', weddingId);
    console.log('Template ID:', template_id);
    console.log('Customization keys:', customization ? Object.keys(customization) : 'none');
    console.log('Has textElements:', customization?.textElements ? 'yes' : 'no');
    
    // TEMPORARILY SKIP ALL VALIDATION TO DEBUG
    console.log('Skipping validation for debugging...');
    
    // Update wedding record
    const customizationJson = customization ? JSON.stringify(customization) : null;
    
    console.log('Updating database...');
    await query(
      `UPDATE weddings 
       SET invitation_template_id = ?, 
           invitation_customization = ? 
       WHERE id = ?`,
      [template_id, customizationJson, weddingId]
    );
    
    console.log('=== UPDATE SUCCESSFUL ===');
    
    res.json({ 
      success: true,
      message: 'Invitation settings updated successfully'
    });
  } catch (error) {
    console.error('=== UPDATE FAILED ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to update invitation settings', details: error.message });
  }
});

/**
 * GET /api/invitations/:weddingCode/:guestCode
 * Get invitation data for public page
 * Public endpoint - no authentication required
 */
router.get('/:weddingCode/:guestCode', async (req, res) => {
  try {
    const { weddingCode, guestCode } = req.params;
    
    const invitationData = await invitationService.getInvitationData(weddingCode, guestCode);
    
    if (!invitationData) {
      return res.status(404).json({ 
        error: 'Invitation not found',
        message: 'This invitation link is invalid. Please check the URL.'
      });
    }
    
    res.json(invitationData);
  } catch (error) {
    console.error('Error fetching invitation data:', error);
    res.status(500).json({ error: 'Failed to fetch invitation data' });
  }
});

/**
 * POST /api/invitations/send-sms
 * Send invitation via SMS to a single guest
 * Requires authentication
 */
router.post('/send-sms', authenticateToken, async (req, res) => {
  try {
    const { wedding_id, guest_id } = req.body;
    
    if (!wedding_id || !guest_id) {
      return res.status(400).json({ error: 'wedding_id and guest_id are required' });
    }
    
    // Get wedding and guest data with customization
    const weddingResult = await query('SELECT * FROM weddings WHERE id = ?', [wedding_id]);
    const guestResult = await query('SELECT * FROM guests WHERE id = ? AND wedding_id = ?', [guest_id, wedding_id]);
    
    if (weddingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    if (guestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    const wedding = weddingResult.rows[0];
    let guest = guestResult.rows[0];
    
    // Generate unique code if guest doesn't have one
    if (!guest.unique_code) {
      const uniqueCode = await invitationService.ensureUniqueGuestCode();
      await query('UPDATE guests SET unique_code = ? WHERE id = ?', [uniqueCode, guest.id]);
      guest.unique_code = uniqueCode;
    }
    
    // Generate invitation URL
    const invitationUrl = invitationService.generateInvitationUrl(wedding.wedding_code, guest.unique_code);
    
    // Send SMS with full wedding object including customization
    const result = await invitationService.sendInvitationSMS(guest, wedding, invitationUrl);
    
    if (result.success) {
      res.json({ 
        success: true,
        message: 'Invitation sent successfully',
        url: invitationUrl
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: result.error || 'Failed to send invitation'
      });
    }
  } catch (error) {
    console.error('Error sending invitation SMS:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

/**
 * POST /api/invitations/send-bulk-sms
 * Send invitations via SMS to multiple guests
 * Requires authentication
 */
router.post('/send-bulk-sms', authenticateToken, async (req, res) => {
  try {
    const { wedding_id, guest_ids } = req.body;
    
    if (!wedding_id || !guest_ids || !Array.isArray(guest_ids)) {
      return res.status(400).json({ error: 'wedding_id and guest_ids array are required' });
    }
    
    // Get wedding data with customization
    const weddingResult = await query('SELECT * FROM weddings WHERE id = ?', [wedding_id]);
    if (weddingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    const wedding = weddingResult.rows[0];
    
    // Get guests data
    const guestsResult = await query(
      'SELECT * FROM guests WHERE id IN (' + guest_ids.map(() => '?').join(',') + ') AND wedding_id = ?',
      [...guest_ids, wedding_id]
    );
    let guests = guestsResult.rows;
    
    // Generate unique codes for guests that don't have one
    for (let i = 0; i < guests.length; i++) {
      if (!guests[i].unique_code) {
        const uniqueCode = await invitationService.ensureUniqueGuestCode();
        await query('UPDATE guests SET unique_code = ? WHERE id = ?', [uniqueCode, guests[i].id]);
        guests[i].unique_code = uniqueCode;
      }
    }
    
    // Send bulk invitations with full wedding object including customization
    const results = await invitationService.sendBulkInvitations(guests, wedding);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      total_sent: successCount,
      total_failed: failedCount,
      results
    });
  } catch (error) {
    console.error('Error sending bulk invitations:', error);
    res.status(500).json({ error: 'Failed to send bulk invitations' });
  }
});

/**
 * GET /api/invitations/link/:weddingId/:guestId
 * Generate invitation link for a guest
 * Requires authentication
 */
router.get('/link/:weddingId/:guestId', authenticateToken, async (req, res) => {
  try {
    const { weddingId, guestId } = req.params;
    
    // Get wedding and guest data
    const weddingResult = await query('SELECT wedding_code FROM weddings WHERE id = ?', [weddingId]);
    const guestResult = await query('SELECT unique_code FROM guests WHERE id = ? AND wedding_id = ?', [guestId, weddingId]);
    
    if (weddingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    if (guestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    const wedding = weddingResult.rows[0];
    let guest = guestResult.rows[0];
    
    // Generate unique code if guest doesn't have one
    if (!guest.unique_code) {
      const uniqueCode = await invitationService.ensureUniqueGuestCode();
      await query('UPDATE guests SET unique_code = ? WHERE id = ?', [uniqueCode, guestId]);
      guest.unique_code = uniqueCode;
    }
    
    const url = invitationService.generateInvitationUrl(wedding.wedding_code, guest.unique_code);
    
    res.json({ url });
  } catch (error) {
    console.error('Error generating invitation link:', error);
    res.status(500).json({ error: 'Failed to generate invitation link' });
  }
});

module.exports = router;
