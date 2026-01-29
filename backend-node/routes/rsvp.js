const express = require('express');
const router = express.Router();
const rsvpService = require('../services/rsvpService');

/**
 * POST /api/rsvp/invalidate-cache/:weddingId
 * Trigger cache invalidation for guest list
 * Public endpoint - used by frontend to refresh data
 * NOTE: This route must come BEFORE the /:weddingCode/:guestCode routes
 */
router.post('/invalidate-cache/:weddingId', async (req, res) => {
  try {
    const { weddingId } = req.params;
    
    // This is a simple endpoint that just confirms the cache should be invalidated
    // The actual cache invalidation happens on the frontend
    res.json({
      success: true,
      message: 'Cache invalidation triggered',
      wedding_id: parseInt(weddingId),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering cache invalidation:', error);
    res.status(500).json({ error: 'Failed to trigger cache invalidation' });
  }
});

/**
 * POST /api/rsvp/:weddingCode/:guestCode
 * Submit RSVP response
 * Public endpoint - no authentication required
 */
router.post('/:weddingCode/:guestCode', async (req, res) => {
  try {
    const { weddingCode, guestCode } = req.params;
    const { status, message } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'RSVP status is required' });
    }
    
    const guest = await rsvpService.submitRSVP(weddingCode, guestCode, status, message);
    
    res.json({
      success: true,
      message: 'RSVP submitted successfully',
      guest: {
        name: guest.name,
        rsvp_status: guest.rsvp_status,
        rsvp_message: guest.rsvp_message,
        responded_at: guest.rsvp_responded_at
      },
      // Add wedding_id for frontend cache invalidation
      wedding_id: guest.wedding_id
    });
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    
    if (error.message === 'Guest not found') {
      return res.status(404).json({ error: 'Guest not found' });
    }
    if (error.message.includes('Invalid RSVP status')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to submit RSVP' });
  }
});

/**
 * PUT /api/rsvp/:weddingCode/:guestCode
 * Update RSVP response
 * Public endpoint - no authentication required
 */
router.put('/:weddingCode/:guestCode', async (req, res) => {
  try {
    const { weddingCode, guestCode } = req.params;
    const { status, message } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'RSVP status is required' });
    }
    
    const guest = await rsvpService.submitRSVP(weddingCode, guestCode, status, message);
    
    res.json({
      success: true,
      message: 'RSVP updated successfully',
      guest: {
        name: guest.name,
        rsvp_status: guest.rsvp_status,
        rsvp_message: guest.rsvp_message,
        responded_at: guest.rsvp_responded_at
      },
      // Add wedding_id for frontend cache invalidation
      wedding_id: guest.wedding_id
    });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    
    if (error.message === 'Guest not found') {
      return res.status(404).json({ error: 'Guest not found' });
    }
    if (error.message.includes('Invalid RSVP status')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
});

/**
 * GET /api/rsvp/:weddingCode/:guestCode
 * Get RSVP status for a guest
 * Public endpoint - no authentication required
 */
router.get('/:weddingCode/:guestCode', async (req, res) => {
  try {
    const { weddingCode, guestCode } = req.params;
    
    const rsvpStatus = await rsvpService.getRSVPStatus(weddingCode, guestCode);
    
    res.json(rsvpStatus);
  } catch (error) {
    console.error('Error fetching RSVP status:', error);
    
    if (error.message === 'Guest not found') {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    res.status(500).json({ error: 'Failed to fetch RSVP status' });
  }
});

module.exports = router;
