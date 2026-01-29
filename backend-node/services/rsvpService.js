const { query } = require('../config/database');

/**
 * RSVP Service
 * Handles RSVP submissions, updates, and analytics
 */

class RSVPService {
  /**
   * Submit or update RSVP
   * @param {string} weddingCode - Wedding code
   * @param {string} guestCode - Guest unique code
   * @param {string} status - RSVP status (accepted/declined)
   * @param {string} message - Optional message from guest
   * @returns {Promise<Object>} Updated guest data
   */
  async submitRSVP(weddingCode, guestCode, status, message = null) {
    // Validate status
    if (!['accepted', 'declined'].includes(status)) {
      throw new Error('Invalid RSVP status. Must be "accepted" or "declined"');
    }
    
    try {
      // First find the guest and wedding
      const findResult = await query(`
        SELECT g.id, g.name, g.wedding_id
        FROM guests g
        JOIN weddings w ON g.wedding_id = w.id
        WHERE w.wedding_code = ? AND g.unique_code = ?
      `, [weddingCode, guestCode]);
      
      if (findResult.rows.length === 0) {
        throw new Error('Guest not found');
      }
      
      const guest = findResult.rows[0];
      
      // Update the guest's RSVP status
      const updateResult = await query(`
        UPDATE guests 
        SET rsvp_status = ?, 
            rsvp_message = ?, 
            rsvp_responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, message, guest.id]);
      
      // Return the updated guest data
      const finalResult = await query(`
        SELECT id, name, wedding_id, rsvp_status, rsvp_message, rsvp_responded_at
        FROM guests
        WHERE id = ?
      `, [guest.id]);
      
      return finalResult.rows[0];
    } catch (error) {
      console.error('Failed to submit RSVP:', error);
      throw error;
    }
  }

  /**
   * Get RSVP status for a guest
   * @param {string} weddingCode - Wedding code
   * @param {string} guestCode - Guest unique code
   * @returns {Promise<Object>} RSVP status data
   */
  async getRSVPStatus(weddingCode, guestCode) {
    try {
      const result = await query(`
        SELECT 
          g.rsvp_status,
          g.rsvp_message,
          g.rsvp_responded_at
        FROM guests g
        JOIN weddings w ON g.wedding_id = w.id
        WHERE w.wedding_code = ? AND g.unique_code = ?
      `, [weddingCode, guestCode]);
      
      if (result.rows.length === 0) {
        throw new Error('Guest not found');
      }
      
      const row = result.rows[0];
      return {
        has_responded: row.rsvp_status !== 'pending',
        rsvp_status: row.rsvp_status,
        rsvp_message: row.rsvp_message,
        responded_at: row.rsvp_responded_at
      };
    } catch (error) {
      console.error('Failed to get RSVP status:', error);
      throw error;
    }
  }

  /**
   * Get RSVP statistics for a wedding
   * @param {number} weddingId - Wedding ID
   * @returns {Promise<Object>} RSVP statistics
   */
  async getRSVPStats(weddingId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_invited,
          SUM(CASE WHEN rsvp_status = 'accepted' THEN 1 ELSE 0 END) as total_accepted,
          SUM(CASE WHEN rsvp_status = 'declined' THEN 1 ELSE 0 END) as total_declined,
          SUM(CASE WHEN rsvp_status = 'pending' THEN 1 ELSE 0 END) as total_pending,
          SUM(CASE WHEN invitation_sent_at IS NOT NULL THEN 1 ELSE 0 END) as total_sent
        FROM guests
        WHERE wedding_id = ?
      `, [weddingId]);
      
      const stats = result.rows[0];
      const totalInvited = parseInt(stats.total_invited) || 0;
      const totalAccepted = parseInt(stats.total_accepted) || 0;
      const totalDeclined = parseInt(stats.total_declined) || 0;
      
      const responseRate = totalInvited > 0 
        ? ((totalAccepted + totalDeclined) / totalInvited) * 100 
        : 0;
      
      return {
        total_invited: totalInvited,
        total_accepted: totalAccepted,
        total_declined: totalDeclined,
        total_pending: parseInt(stats.total_pending) || 0,
        total_sent: parseInt(stats.total_sent) || 0,
        response_rate: Math.round(responseRate * 10) / 10
      };
    } catch (error) {
      console.error('Failed to get RSVP stats:', error);
      throw error;
    }
  }

  /**
   * Get average response time in days
   * @param {number} weddingId - Wedding ID
   * @returns {Promise<number>} Average response time in days
   */
  async getAverageResponseTime(weddingId) {
    try {
      const result = await query(`
        SELECT AVG(
          (julianday(rsvp_responded_at) - julianday(invitation_sent_at)) * 24 * 60 * 60 / 86400
        ) as avg_days
        FROM guests
        WHERE wedding_id = ? 
          AND rsvp_responded_at IS NOT NULL 
          AND invitation_sent_at IS NOT NULL
      `, [weddingId]);
      
      const avgDays = result.rows[0].avg_days;
      return avgDays ? Math.round(parseFloat(avgDays) * 10) / 10 : 0;
    } catch (error) {
      console.error('Failed to get average response time:', error);
      throw error;
    }
  }

  /**
   * Get response timeline (responses grouped by date)
   * @param {number} weddingId - Wedding ID
   * @returns {Promise<Array>} Timeline data
   */
  async getResponseTimeline(weddingId) {
    try {
      const result = await query(`
        SELECT 
          DATE(rsvp_responded_at) as date,
          SUM(CASE WHEN rsvp_status = 'accepted' THEN 1 ELSE 0 END) as accepted,
          SUM(CASE WHEN rsvp_status = 'declined' THEN 1 ELSE 0 END) as declined
        FROM guests
        WHERE wedding_id = ? AND rsvp_responded_at IS NOT NULL
        GROUP BY DATE(rsvp_responded_at)
        ORDER BY date ASC
      `, [weddingId]);
      
      return result.rows.map(row => ({
        date: row.date,
        accepted: parseInt(row.accepted) || 0,
        declined: parseInt(row.declined) || 0
      }));
    } catch (error) {
      console.error('Failed to get response timeline:', error);
      throw error;
    }
  }

  /**
   * Get recent RSVP responses
   * @param {number} weddingId - Wedding ID
   * @param {number} limit - Number of responses to return
   * @returns {Promise<Array>} Recent responses
   */
  async getRecentResponses(weddingId, limit = 10) {
    try {
      const result = await query(`
        SELECT 
          name as guest_name,
          rsvp_status as status,
          rsvp_message as message,
          rsvp_responded_at as responded_at
        FROM guests
        WHERE wedding_id = ? AND rsvp_responded_at IS NOT NULL
        ORDER BY rsvp_responded_at DESC
        LIMIT ?
      `, [weddingId, limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Failed to get recent responses:', error);
      throw error;
    }
  }

  /**
   * Get SMS success rate
   * @param {number} weddingId - Wedding ID
   * @returns {Promise<number>} SMS success rate percentage
   */
  async getSMSSuccessRate(weddingId) {
    try {
      // This assumes you have a message_logs table tracking SMS delivery
      // If not, return 100% for now
      const result = await query(`
        SELECT 
          COUNT(*) as total_sent,
          SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) as successful
        FROM message_logs
        WHERE guest_id IN (SELECT id FROM guests WHERE wedding_id = ?)
          AND method = 'sms'
      `, [weddingId]);
      
      if (result.rows.length === 0 || result.rows[0].total_sent === '0') {
        return 100; // Default to 100% if no data
      }
      
      const stats = result.rows[0];
      const totalSent = parseInt(stats.total_sent) || 0;
      const successful = parseInt(stats.successful) || 0;
      
      const successRate = totalSent > 0 ? (successful / totalSent) * 100 : 100;
      return Math.round(successRate * 10) / 10;
    } catch (error) {
      // If message_logs table doesn't exist, return 100%
      console.warn('SMS success rate unavailable:', error.message);
      return 100;
    }
  }

  /**
   * Get complete RSVP analytics
   * @param {number} weddingId - Wedding ID
   * @returns {Promise<Object>} Complete analytics data
   */
  async getCompleteAnalytics(weddingId) {
    try {
      const [stats, avgResponseTime, timeline, recentResponses, smsSuccessRate] = await Promise.all([
        this.getRSVPStats(weddingId),
        this.getAverageResponseTime(weddingId),
        this.getResponseTimeline(weddingId),
        this.getRecentResponses(weddingId, 10),
        this.getSMSSuccessRate(weddingId)
      ]);
      
      return {
        ...stats,
        average_response_time: avgResponseTime,
        sms_success_rate: smsSuccessRate,
        timeline,
        recent_responses: recentResponses
      };
    } catch (error) {
      console.error('Failed to get complete analytics:', error);
      throw error;
    }
  }
}

module.exports = new RSVPService();
