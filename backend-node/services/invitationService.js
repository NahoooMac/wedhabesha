const smsService = require('./smsService');
const { query } = require('../config/database');

/**
 * Invitation Service
 * Handles invitation generation, delivery, and guest code management
 */

class InvitationService {
  /**
   * Generate a random unique guest code
   * @returns {string} 10-character alphanumeric code
   */
  generateGuestCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 10;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Ensure guest code is unique across all guests
   * @returns {Promise<string>} Unique guest code
   */
  async ensureUniqueGuestCode() {
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      code = this.generateGuestCode();
      const result = await query('SELECT id FROM guests WHERE unique_code = ?', [code]);
      isUnique = result.rows.length === 0;
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique guest code after multiple attempts');
    }
    
    return code;
  }

  /**
   * Generate invitation URL for a guest
   * @param {string} weddingCode - Wedding code
   * @param {string} guestCode - Guest unique code
   * @returns {string} Full invitation URL
   */
  generateInvitationUrl(weddingCode, guestCode) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/${weddingCode}/${guestCode}`;
  }

  /**
   * Send invitation via SMS
   * @param {Object} guest - Guest object with phone number
   * @param {Object} wedding - Wedding object with wedding_code
   * @param {string} invitationUrl - Full invitation URL
   * @returns {Promise<Object>} SMS send result
   */
  async sendInvitationSMS(guest, wedding, invitationUrl) {
    if (!guest.phone) {
      return {
        success: false,
        error: 'Guest has no phone number'
      };
    }
    
    // Use test phone in development mode
    let phoneToUse = guest.phone;
    if (process.env.NODE_ENV === 'development' && process.env.AFROMESSAGE_TEST_PHONE) {
      console.log(`🧪 Development mode: Using test phone ${process.env.AFROMESSAGE_TEST_PHONE} instead of ${guest.phone}`);
      phoneToUse = process.env.AFROMESSAGE_TEST_PHONE;
    }
    
    // Parse customization to get wedding details
    let customization = {};
    if (wedding.invitation_customization) {
      try {
        customization = typeof wedding.invitation_customization === 'string' 
          ? JSON.parse(wedding.invitation_customization) 
          : wedding.invitation_customization;
      } catch (e) {
        console.error('Failed to parse invitation_customization:', e);
      }
    }
    
    // Build simple SMS with ASCII characters only
    let message = "You're invited";
    
    // Add wedding title if available (ASCII only)
    if (customization.wedding_title) {
      message += ` to ${customization.wedding_title}`;
    }
    message += "!\n\n";
    
    // Add date and time
    if (customization.ceremony_date) {
      message += `Date: ${customization.ceremony_date}`;
      if (customization.ceremony_time) {
        message += ` at ${customization.ceremony_time}`;
      }
      message += "\n";
    }
    
    // Add venue
    if (customization.venue_name) {
      message += `Venue: ${customization.venue_name}\n`;
    }
    
    // Add address
    if (customization.venue_address) {
      message += `Address: ${customization.venue_address}\n`;
    }
    
    // Add invitation URL
    message += `\nView invitation: ${invitationUrl}`;
    
    try {
      const result = await smsService.sendSMS(phoneToUse, message);
      
      // Update invitation_sent_at timestamp if successful
      if (result.success) {
        await query(
          'UPDATE guests SET invitation_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
          [guest.id]
        );
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send invitation SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send invitations to multiple guests
   * @param {Array} guests - Array of guest objects
   * @param {Object} wedding - Wedding object
   * @returns {Promise<Array>} Array of send results
   */
  async sendBulkInvitations(guests, wedding) {
    const results = [];
    
    for (const guest of guests) {
      if (!guest.phone) {
        results.push({
          guest_id: guest.id,
          guest_name: guest.name,
          success: false,
          error: 'No phone number'
        });
        continue;
      }
      
      const url = this.generateInvitationUrl(wedding.wedding_code, guest.unique_code);
      const result = await this.sendInvitationSMS(guest, wedding, url);
      
      results.push({
        guest_id: guest.id,
        guest_name: guest.name,
        success: result.success,
        error: result.error || null
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Get invitation data for public page
   * @param {string} weddingCode - Wedding code
   * @param {string} guestCode - Guest unique code
   * @returns {Promise<Object|null>} Invitation data or null if not found
   */
  async getInvitationData(weddingCode, guestCode) {
    try {
      const result = await query(`
        SELECT 
          g.id as guest_id,
          g.name as guest_name,
          g.qr_code,
          g.rsvp_status,
          g.rsvp_message,
          g.rsvp_responded_at,
          w.id as wedding_id,
          w.wedding_code,
          w.wedding_date,
          w.venue_name,
          w.venue_address,
          w.invitation_template_id,
          w.invitation_customization
        FROM guests g
        JOIN weddings w ON g.wedding_id = w.id
        WHERE w.wedding_code = ? AND g.unique_code = ?
      `, [weddingCode, guestCode]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      // Parse customization JSON
      let customization = {};
      if (row.invitation_customization) {
        try {
          customization = JSON.parse(row.invitation_customization);
        } catch (e) {
          console.error('Failed to parse invitation_customization:', e);
        }
      }
      
      return {
        guest: {
          id: row.guest_id,
          name: row.guest_name,
          qr_code: row.qr_code,
          rsvp_status: row.rsvp_status,
          rsvp_message: row.rsvp_message,
          rsvp_responded_at: row.rsvp_responded_at
        },
        wedding: {
          id: row.wedding_id,
          wedding_code: row.wedding_code,
          wedding_date: row.wedding_date,
          venue_name: row.venue_name,
          venue_address: row.venue_address,
          template_id: row.invitation_template_id,
          customization
        }
      };
    } catch (error) {
      console.error('Failed to get invitation data:', error);
      throw error;
    }
  }

  /**
   * Backfill unique codes for existing guests
   * @param {number} weddingId - Wedding ID (optional, if null backfills all)
   * @returns {Promise<number>} Number of guests updated
   */
  async backfillGuestCodes(weddingId = null) {
    try {
      // Get guests without unique codes
      const whereClause = weddingId ? 'WHERE wedding_id = ? AND unique_code IS NULL' : 'WHERE unique_code IS NULL';
      const params = weddingId ? [weddingId] : [];
      
      const result = await query(`SELECT id FROM guests ${whereClause}`, params);
      const guests = result.rows;
      
      let updated = 0;
      for (const guest of guests) {
        const uniqueCode = await this.ensureUniqueGuestCode();
        await query('UPDATE guests SET unique_code = ? WHERE id = ?', [uniqueCode, guest.id]);
        updated++;
      }
      
      console.log(`✓ Backfilled unique codes for ${updated} guests`);
      return updated;
    } catch (error) {
      console.error('Failed to backfill guest codes:', error);
      throw error;
    }
  }
}

module.exports = new InvitationService();
