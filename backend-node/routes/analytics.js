const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const rsvpService = require('../services/rsvpService');

const router = express.Router();

// Helper function to verify wedding ownership
async function verifyWeddingOwnership(userId, weddingId) {
  const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [userId]);
  if (coupleResult.rows.length === 0) {
    throw new Error('Access denied');
  }

  const coupleId = coupleResult.rows[0].id;
  const weddingCheck = await query('SELECT id FROM weddings WHERE id = $1 AND couple_id = $2', [weddingId, coupleId]);
  if (weddingCheck.rows.length === 0) {
    throw new Error('Access denied to this wedding');
  }
  
  return true;
}

// Get comprehensive wedding analytics
router.get('/wedding/:weddingId', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);
    const timeRange = req.query.timeRange || '7d';

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    await verifyWeddingOwnership(req.user.id, weddingId);

    // Get guest statistics
    const guestStatsResult = await query(`
      SELECT 
        COUNT(*) as total_guests,
        COUNT(CASE WHEN is_checked_in = true THEN 1 END) as checked_in_count,
        COUNT(CASE WHEN is_checked_in = false THEN 1 END) as pending_count
      FROM guests 
      WHERE wedding_id = $1
    `, [weddingId]);

    const guestStats = guestStatsResult.rows[0];
    const checkinRate = guestStats.total_guests > 0 ? 
      (guestStats.checked_in_count / guestStats.total_guests * 100) : 0;

    // Get RSVP statistics
    const rsvpStatsResult = await query(`
      SELECT 
        COUNT(CASE WHEN rsvp_status = 'accepted' THEN 1 END) as rsvp_accepted,
        COUNT(CASE WHEN rsvp_status = 'declined' THEN 1 END) as rsvp_declined,
        COUNT(CASE WHEN rsvp_status IS NOT NULL THEN 1 END) as rsvp_responded
      FROM guests 
      WHERE wedding_id = $1
    `, [weddingId]);

    const rsvpStats = rsvpStatsResult.rows[0];
    const rsvpResponseRate = guestStats.total_guests > 0 ? 
      (rsvpStats.rsvp_responded / guestStats.total_guests * 100) : 0;

    // Get check-in timeline based on time range
    let timelineInterval = 'hour';
    let timelineFilter = "AND checked_in_at >= NOW() - INTERVAL '24 hours'";
    
    switch (timeRange) {
      case '24h':
        timelineInterval = 'hour';
        timelineFilter = "AND checked_in_at >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timelineInterval = 'day';
        timelineFilter = "AND checked_in_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        timelineInterval = 'day';
        timelineFilter = "AND checked_in_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'all':
        timelineInterval = 'day';
        timelineFilter = '';
        break;
    }

    const timelineResult = await query(`
      SELECT 
        DATE_TRUNC('${timelineInterval}', checked_in_at) as period,
        COUNT(*) as checkins
      FROM guests 
      WHERE wedding_id = $1 
        AND is_checked_in = true 
        ${timelineFilter}
      GROUP BY DATE_TRUNC('${timelineInterval}', checked_in_at)
      ORDER BY period ASC
    `, [weddingId]);

    // Get recent check-ins
    const recentCheckinsResult = await query(`
      SELECT name, checked_in_at, table_number
      FROM guests 
      WHERE wedding_id = $1 AND is_checked_in = true
      ORDER BY checked_in_at DESC
      LIMIT 10
    `, [weddingId]);

    // Get recent RSVPs
    const recentRsvpsResult = await query(`
      SELECT name, rsvp_status, rsvp_responded_at
      FROM guests 
      WHERE wedding_id = $1 AND rsvp_status IS NOT NULL
      ORDER BY rsvp_responded_at DESC
      LIMIT 10
    `, [weddingId]);

    // Get message statistics (mock data for now)
    const messageStats = {
      total_sent: 245,
      delivery_rate: 0.91,
      recent_activity: [
        { type: 'RSVP Reminder', count: 15, time: '3:00 PM' },
        { type: 'Event Update', count: 8, time: '1:30 PM' },
        { type: 'QR Invitation', count: 25, time: '11:00 AM' },
        { type: 'Custom Message', count: 5, time: '9:30 AM' },
      ]
    };

    res.json({
      overview: {
        total_guests: parseInt(guestStats.total_guests),
        checked_in_count: parseInt(guestStats.checked_in_count),
        pending_count: parseInt(guestStats.pending_count),
        checkin_rate: parseFloat(checkinRate.toFixed(1)),
        rsvp_accepted: parseInt(rsvpStats.rsvp_accepted),
        rsvp_declined: parseInt(rsvpStats.rsvp_declined),
        rsvp_response_rate: parseFloat(rsvpResponseRate.toFixed(1)),
        messages_sent: messageStats.total_sent,
        message_delivery_rate: messageStats.delivery_rate
      },
      trends: {
        guest_checkins: timelineResult.rows.map(row => ({
          date: row.period,
          count: parseInt(row.checkins),
          cumulative: 0 // Calculate cumulative in frontend or add another query
        })),
        rsvp_responses: [], // Add RSVP timeline query if needed
        message_activity: [] // Add message timeline query if needed
      },
      realTime: {
        recent_checkins: recentCheckinsResult.rows.map(row => ({
          name: row.name,
          time: row.checked_in_at ? new Date(row.checked_in_at).toLocaleTimeString() : '',
          table: row.table_number || 'Not assigned'
        })),
        recent_rsvps: recentRsvpsResult.rows.map(row => ({
          name: row.name,
          status: row.rsvp_status,
          time: row.rsvp_responded_at ? new Date(row.rsvp_responded_at).toLocaleTimeString() : ''
        })),
        recent_messages: messageStats.recent_activity
      },
      performance: {
        checkin_rate: parseFloat(checkinRate.toFixed(1)),
        rsvp_response_rate: parseFloat(rsvpResponseRate.toFixed(1)),
        message_delivery_rate: messageStats.delivery_rate * 100,
        budget_utilization: 75 // Mock data - integrate with budget system
      },
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get wedding analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get wedding analytics'
    });
  }
});

// Get communication analytics
router.get('/communication/:weddingId', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    await verifyWeddingOwnership(req.user.id, weddingId);

    // Mock communication analytics - integrate with actual message tracking
    const communicationAnalytics = {
      overview: {
        total_messages: 245,
        delivery_rate: 0.91,
        failure_rate: 0.09,
        whatsapp_messages: 180,
        sms_messages: 65,
        email_messages: 0
      },
      message_types: {
        qr_invitation: 120,
        event_update: 45,
        reminder: 50,
        custom: 30
      },
      recent_activity: [
        { date: '2024-01-20', messages: 25, delivery_rate: 0.92 },
        { date: '2024-01-19', messages: 18, delivery_rate: 0.89 },
        { date: '2024-01-18', messages: 32, delivery_rate: 0.85 },
        { date: '2024-01-17', messages: 12, delivery_rate: 0.91 },
        { date: '2024-01-16', messages: 8, delivery_rate: 0.88 },
        { date: '2024-01-15', messages: 15, delivery_rate: 0.87 },
        { date: '2024-01-14', messages: 22, delivery_rate: 0.83 }
      ],
      failure_reasons: [
        { reason: 'Invalid phone number', count: 8, percentage: 40 },
        { reason: 'Network timeout', count: 5, percentage: 25 },
        { reason: 'Service unavailable', count: 4, percentage: 20 },
        { reason: 'Rate limit exceeded', count: 3, percentage: 15 }
      ]
    };

    res.json(communicationAnalytics);

  } catch (error) {
    console.error('Get communication analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get communication analytics'
    });
  }
});

// Get budget analytics
router.get('/budget/:weddingId', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    await verifyWeddingOwnership(req.user.id, weddingId);

    // Mock budget analytics - integrate with actual budget system
    const budgetAnalytics = {
      overview: {
        total_budget: 60000,
        spent_amount: 45000,
        remaining_amount: 15000,
        utilization_rate: 75
      },
      categories: [
        { category: 'Venue', spent: 15000, allocated: 18000 },
        { category: 'Catering', spent: 12000, allocated: 15000 },
        { category: 'Photography', spent: 8000, allocated: 10000 },
        { category: 'Flowers', spent: 3500, allocated: 5000 },
        { category: 'Music', spent: 4000, allocated: 6000 },
        { category: 'Decoration', spent: 2500, allocated: 4000 },
        { category: 'Other', spent: 0, allocated: 2000 }
      ],
      spending_timeline: [
        { date: '2024-01-20', amount: 2500 },
        { date: '2024-01-19', amount: 1800 },
        { date: '2024-01-18', amount: 3200 },
        { date: '2024-01-17', amount: 1200 },
        { date: '2024-01-16', amount: 800 },
        { date: '2024-01-15', amount: 1500 },
        { date: '2024-01-14', amount: 2200 }
      ]
    };

    res.json(budgetAnalytics);

  } catch (error) {
    console.error('Get budget analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get budget analytics'
    });
  }
});

// Get vendor analytics
router.get('/vendors/:weddingId', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    await verifyWeddingOwnership(req.user.id, weddingId);

    // Mock vendor analytics - integrate with actual vendor system
    const vendorAnalytics = {
      overview: {
        total_vendors: 8,
        confirmed_vendors: 6,
        pending_vendors: 2,
        total_vendor_cost: 35000
      },
      vendor_status: [
        { name: 'Photography', status: 'confirmed', cost: 8000 },
        { name: 'Catering', status: 'confirmed', cost: 12000 },
        { name: 'Venue', status: 'confirmed', cost: 15000 },
        { name: 'Flowers', status: 'pending', cost: 3500 },
        { name: 'Music', status: 'confirmed', cost: 4000 },
        { name: 'Decoration', status: 'pending', cost: 2500 },
        { name: 'Transportation', status: 'confirmed', cost: 1500 },
        { name: 'Cake', status: 'confirmed', cost: 800 }
      ]
    };

    res.json(vendorAnalytics);

  } catch (error) {
    console.error('Get vendor analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor analytics'
    });
  }
});

// Get RSVP analytics for wedding
router.get('/rsvp/:weddingId', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = $1 AND couple_id = $2', [weddingId, coupleId]);
    if (weddingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Get complete RSVP analytics
    const analytics = await rsvpService.getCompleteAnalytics(weddingId);

    res.json(analytics);

  } catch (error) {
    console.error('Get RSVP analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get RSVP analytics'
    });
  }
});

module.exports = router;