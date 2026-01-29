const { query } = require('../config/database');
const performanceOptimizer = require('./performanceOptimizer');

/**
 * DashboardIntegration Service
 * 
 * Connects the messaging system with existing vendor dashboard features.
 * Provides integration with lead tracking, vendor profiles, and analytics.
 * 
 * Requirements: 8.1, 8.2, 8.5
 */
class DashboardIntegration {
  /**
   * Link a message to an existing lead
   * @param {string} messageId - The message ID to link
   * @param {number} leadId - The lead ID to link to
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async linkMessageToLead(messageId, leadId) {
    try {
      // Verify the lead exists
      const leadResult = await query(
        'SELECT id, vendor_id, couple_id FROM vendor_leads WHERE id = ?',
        [leadId]
      );

      if (leadResult.rows.length === 0) {
        return { success: false, error: 'Lead not found' };
      }

      // Verify the message exists and get its thread
      const messageResult = await query(
        'SELECT id, thread_id FROM messages WHERE id = ?',
        [messageId]
      );

      if (messageResult.rows.length === 0) {
        return { success: false, error: 'Message not found' };
      }

      // Update the message thread to link to the lead
      await query(
        'UPDATE message_threads SET lead_id = ? WHERE id = ?',
        [leadId, messageResult.rows[0].thread_id]
      );

      return { success: true };
    } catch (error) {
      console.error('Error linking message to lead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a message thread from an existing lead
   * @param {number} leadId - The lead ID to create a thread from
   * @returns {Promise<{success: boolean, thread?: object, error?: string}>}
   */
  async createThreadFromLead(leadId) {
    try {
      // Get the lead details
      const leadResult = await query(
        'SELECT id, vendor_id, couple_id, message, budget_range, event_date, status FROM vendor_leads WHERE id = ?',
        [leadId]
      );

      if (leadResult.rows.length === 0) {
        return { success: false, error: 'Lead not found' };
      }

      const lead = leadResult.rows[0];

      // Check if a thread already exists for this couple-vendor pair
      const existingThreadResult = await query(
        'SELECT id FROM message_threads WHERE couple_id = ? AND vendor_id = ?',
        [lead.couple_id, lead.vendor_id]
      );

      if (existingThreadResult.rows.length > 0) {
        // Thread already exists, just link it to the lead
        const threadId = existingThreadResult.rows[0].id;
        await query(
          'UPDATE message_threads SET lead_id = ? WHERE id = ?',
          [leadId, threadId]
        );

        return {
          success: true,
          thread: {
            id: threadId,
            couple_id: lead.couple_id,
            vendor_id: lead.vendor_id,
            lead_id: leadId,
            created_at: new Date(),
            updated_at: new Date(),
            last_message_at: new Date(),
            is_active: true
          }
        };
      }

      // Create a new thread
      const threadResult = await query(
        `INSERT INTO message_threads (couple_id, vendor_id, lead_id, service_type, created_at, updated_at, last_message_at, is_active)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), 1)`,
        [lead.couple_id, lead.vendor_id, leadId, 'lead_inquiry']
      );

      const threadId = threadResult.lastID || threadResult.rows[0].id;

      return {
        success: true,
        thread: {
          id: threadId,
          couple_id: lead.couple_id,
          vendor_id: lead.vendor_id,
          lead_id: leadId,
          service_type: 'lead_inquiry',
          created_at: new Date(),
          updated_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }
      };
    } catch (error) {
      console.error('Error creating thread from lead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get vendor profile information
   * @param {number} vendorId - The vendor ID
   * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
   */
  async getVendorProfile(vendorId) {
    try {
      const vendorResult = await query(
        `SELECT v.id, v.business_name, v.category, v.location, v.description, 
                v.is_verified, v.rating, v.created_at, u.email,
                v.phone, v.website, v.street_address, v.city, v.state, 
                v.postal_code, v.country, v.years_in_business, v.team_size, 
                v.service_area, v.business_photos, v.portfolio_photos,
                v.service_packages, v.business_hours
         FROM vendors v
         JOIN users u ON v.user_id = u.id
         WHERE v.id = ?`,
        [vendorId]
      );

      if (vendorResult.rows.length === 0) {
        return { success: false, error: 'Vendor not found' };
      }

      const vendor = vendorResult.rows[0];

      // Parse JSON fields
      const jsonFields = ['business_photos', 'portfolio_photos', 'service_packages', 'business_hours'];
      jsonFields.forEach(field => {
        if (vendor[field]) {
          try {
            vendor[field] = JSON.parse(vendor[field]);
          } catch (e) {
            vendor[field] = [];
          }
        } else {
          vendor[field] = [];
        }
      });

      return { success: true, profile: vendor };
    } catch (error) {
      console.error('Error getting vendor profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update vendor online status
   * @param {number} vendorId - The vendor ID
   * @param {boolean} isOnline - Whether the vendor is online
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateVendorOnlineStatus(vendorId, isOnline) {
    try {
      // Get the user_id for this vendor
      const vendorResult = await query(
        'SELECT user_id FROM vendors WHERE id = ?',
        [vendorId]
      );

      if (vendorResult.rows.length === 0) {
        return { success: false, error: 'Vendor not found' };
      }

      const userId = vendorResult.rows[0].user_id;

      // Update or insert connection status
      const existingStatus = await query(
        'SELECT user_id FROM user_connection_status WHERE user_id = ?',
        [userId]
      );

      if (existingStatus.rows.length > 0) {
        await query(
          `UPDATE user_connection_status 
           SET is_online = ?, last_seen = datetime('now')
           WHERE user_id = ?`,
          [isOnline ? 1 : 0, userId]
        );
      } else {
        await query(
          `INSERT INTO user_connection_status (user_id, user_type, is_online, last_seen)
           VALUES (?, 'vendor', ?, datetime('now'))`,
          [userId, isOnline ? 1 : 0]
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating vendor online status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get messaging analytics for a vendor
   * @param {number} vendorId - The vendor ID
   * @param {object} dateRange - Date range for analytics {start: Date, end: Date}
   * @returns {Promise<{success: boolean, analytics?: object, error?: string}>}
   */
  async getMessagingAnalytics(vendorId, dateRange = {}) {
    try {
      const { start, end } = dateRange;
      let dateFilter = '';
      const params = [vendorId];

      if (start && end) {
        dateFilter = 'AND m.created_at BETWEEN ? AND ?';
        params.push(start, end);
      } else if (start) {
        dateFilter = 'AND m.created_at >= ?';
        params.push(start);
      } else if (end) {
        dateFilter = 'AND m.created_at <= ?';
        params.push(end);
      }

      // Get total messages sent and received
      const messageCountResult = await query(
        `SELECT 
           COUNT(*) as total_messages,
           SUM(CASE WHEN m.sender_type = 'vendor' THEN 1 ELSE 0 END) as messages_sent,
           SUM(CASE WHEN m.sender_type = 'couple' THEN 1 ELSE 0 END) as messages_received
         FROM messages m
         JOIN message_threads mt ON m.thread_id = mt.id
         WHERE mt.vendor_id = ? ${dateFilter}`,
        params
      );

      const messageCounts = messageCountResult.rows[0] || {
        total_messages: 0,
        messages_sent: 0,
        messages_received: 0
      };

      // Get active conversations count
      const activeConversationsResult = await query(
        `SELECT COUNT(DISTINCT mt.id) as active_conversations
         FROM message_threads mt
         WHERE mt.vendor_id = ? AND mt.is_active = 1`,
        [vendorId]
      );

      const activeConversations = activeConversationsResult.rows[0]?.active_conversations || 0;

      // Calculate average response time (in minutes)
      const responseTimeResult = await query(
        `SELECT AVG(
           (julianday(response.created_at) - julianday(inquiry.created_at)) * 24 * 60
         ) as avg_response_time_minutes
         FROM messages inquiry
         JOIN messages response ON inquiry.thread_id = response.thread_id
         JOIN message_threads mt ON inquiry.thread_id = mt.id
         WHERE mt.vendor_id = ?
           AND inquiry.sender_type = 'couple'
           AND response.sender_type = 'vendor'
           AND response.created_at > inquiry.created_at
           ${dateFilter}`,
        params
      );

      const avgResponseTime = responseTimeResult.rows[0]?.avg_response_time_minutes || 0;

      // Get messages by day
      const messagesByDayResult = await query(
        `SELECT 
           DATE(m.created_at) as date,
           COUNT(*) as count
         FROM messages m
         JOIN message_threads mt ON m.thread_id = mt.id
         WHERE mt.vendor_id = ? ${dateFilter}
         GROUP BY DATE(m.created_at)
         ORDER BY date DESC
         LIMIT 30`,
        params
      );

      const messagesByDay = messagesByDayResult.rows.map(row => ({
        date: row.date,
        count: row.count
      }));

      return {
        success: true,
        analytics: {
          totalMessages: messageCounts.total_messages,
          messagesSent: messageCounts.messages_sent,
          messagesReceived: messageCounts.messages_received,
          responseTime: Math.round(avgResponseTime), // in minutes
          activeConversations: activeConversations,
          messagesByDay: messagesByDay
        }
      };
    } catch (error) {
      console.error('Error getting messaging analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get couple profile information
   * @param {number} coupleId - The couple ID
   * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
   */
  async getCoupleProfile(coupleId) {
    try {
      const coupleResult = await query(
        `SELECT c.id, c.user_id, u.email, c.created_at
         FROM couples c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [coupleId]
      );

      if (coupleResult.rows.length === 0) {
        return { success: false, error: 'Couple not found' };
      }

      return { success: true, profile: coupleResult.rows[0] };
    } catch (error) {
      console.error('Error getting couple profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update lead status based on messaging activity
   * @param {number} leadId - The lead ID
   * @param {string} status - New status ('new', 'contacted', 'converted', 'closed')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateLeadStatus(leadId, status) {
    try {
      const validStatuses = ['new', 'contacted', 'converted', 'closed'];
      if (!validStatuses.includes(status)) {
        return { success: false, error: 'Invalid status' };
      }

      await query(
        'UPDATE vendor_leads SET status = ? WHERE id = ?',
        [status, leadId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating lead status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all threads for a vendor with lead information
   * @param {number} vendorId - The vendor ID
   * @param {number} userId - The user ID for unread count calculation
   * @returns {Promise<{success: boolean, threads?: array, error?: string}>}
   */
  async getVendorThreadsWithLeads(vendorId, userId = null) {
    try {
      const threadsResult = await query(
        `SELECT 
           mt.id, mt.couple_id, mt.vendor_id, mt.lead_id, mt.service_type,
           mt.created_at, mt.updated_at, mt.last_message_at, mt.is_active,
           vl.message as lead_message, vl.budget_range, vl.event_date, vl.status as lead_status,
           u.email as couple_email,
           (SELECT content FROM messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
           (SELECT COUNT(*) FROM messages m 
            LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
            WHERE m.thread_id = mt.id 
              AND m.sender_type = 'couple' 
              AND m.is_deleted = 0
              AND mrs.id IS NULL) as unread_count
         FROM message_threads mt
         LEFT JOIN vendor_leads vl ON mt.lead_id = vl.id
         JOIN couples c ON mt.couple_id = c.id
         JOIN users u ON c.user_id = u.id
         WHERE mt.vendor_id = ?
         ORDER BY mt.last_message_at DESC`,
        [userId || vendorId, vendorId]
      );

      // Transform and decrypt the data for vendor threads
      const threads = await Promise.all(threadsResult.rows.map(async (thread) => {
        let decryptedLastMessage = 'No messages yet';
        
        // Decrypt the last message if it exists
        if (thread.last_message) {
          try {
            const encryptionService = require('./encryptionService');
            decryptedLastMessage = await encryptionService.decryptMessage(
              thread.last_message,
              String(thread.id)
            );
          } catch (decryptError) {
            console.error(`❌ Failed to decrypt last message for vendor thread ${thread.id}:`, decryptError);
            decryptedLastMessage = 'Message unavailable';
          }
        }

        return {
          id: thread.id,
          coupleId: thread.couple_id,
          vendorId: thread.vendor_id,
          leadId: thread.lead_id,
          serviceType: thread.service_type,
          coupleName: thread.couple_email ? thread.couple_email.split('@')[0] : 'Unknown Couple',
          coupleEmail: thread.couple_email,
          lastMessage: decryptedLastMessage,
          lastMessageTime: thread.last_message_time,
          unreadCount: thread.unread_count || 0,
          leadMessage: thread.lead_message,
          budgetRange: thread.budget_range,
          eventDate: thread.event_date,
          leadStatus: thread.lead_status,
          status: thread.is_active ? 'active' : 'archived',
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
          lastMessageAt: thread.last_message_at
        };
      }));

      return { success: true, threads };
    } catch (error) {
      console.error('Error getting vendor threads with leads:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all threads for a couple with vendor information
   * @param {number} coupleId - The couple ID
   * @param {number} userId - The user ID for unread count calculation
   * @returns {Promise<{success: boolean, threads?: array, error?: string}>}
   */
  async getCoupleThreadsWithVendors(coupleId, userId = null) {
    const operationId = performanceOptimizer.startPerformanceMonitoring('getCoupleThreadsWithVendors');
    
    try {
      // Try to get from cache first
      const cachedThreads = await performanceOptimizer.getCachedThreadList(coupleId);
      if (cachedThreads) {
        performanceOptimizer.endPerformanceMonitoring(operationId, { 
          source: 'cache', 
          threadCount: cachedThreads.length 
        });
        return { success: true, threads: cachedThreads };
      }

      const threadsResult = await query(
        `SELECT 
           mt.id, mt.couple_id, mt.vendor_id, mt.lead_id, mt.service_type,
           mt.created_at, mt.updated_at, mt.last_message_at, mt.is_active,
           v.business_name as vendor_name, v.category as vendor_category,
           v.is_verified,
           (SELECT content FROM messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
           (SELECT COUNT(*) FROM messages m 
            LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
            WHERE m.thread_id = mt.id 
              AND m.sender_type = 'vendor' 
              AND m.is_deleted = 0
              AND mrs.id IS NULL) as unread_count
         FROM message_threads mt
         JOIN vendors v ON mt.vendor_id = v.id
         WHERE mt.couple_id = ?
         ORDER BY mt.last_message_at DESC`,
        [userId || coupleId, coupleId]
      );

      // Transform the data to match frontend expectations (camelCase)
      const threads = await Promise.all(threadsResult.rows.map(async (thread) => {
        let decryptedLastMessage = 'No messages yet';
        
        // Decrypt the last message if it exists
        if (thread.last_message) {
          try {
            const encryptionService = require('./encryptionService');
            decryptedLastMessage = await encryptionService.decryptMessage(
              thread.last_message,
              String(thread.id)
            );
          } catch (decryptError) {
            console.error(`❌ Failed to decrypt last message for thread ${thread.id}:`, decryptError);
            decryptedLastMessage = 'Message unavailable';
          }
        }

        return {
          id: thread.id,
          vendorId: thread.vendor_id,
          vendorName: thread.vendor_name || 'Unknown Vendor',
          vendorCategory: thread.vendor_category || 'Service Provider',
          vendorAvatar: null, // TODO: Add avatar support
          isVerified: Boolean(thread.is_verified),
          lastMessage: decryptedLastMessage,
          lastMessageTime: thread.last_message_time,
          unreadCount: thread.unread_count || 0,
          status: thread.is_active ? 'active' : 'archived',
          leadId: thread.lead_id,
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
          lastMessageAt: thread.last_message_at
        };
      }));
      
      // Cache the results
      await performanceOptimizer.cacheThreadList(coupleId, threads);

      performanceOptimizer.endPerformanceMonitoring(operationId, { 
        source: 'database', 
        threadCount: threads.length 
      });

      return { success: true, threads };
    } catch (error) {
      performanceOptimizer.endPerformanceMonitoring(operationId, { 
        error: error.message 
      });
      console.error('Error getting couple threads with vendors:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a message thread from couple to vendor
   * @param {number} coupleId - The couple ID
   * @param {number} vendorId - The vendor ID
   * @param {string} initialMessage - Optional initial message content
   * @returns {Promise<{success: boolean, thread?: object, error?: string}>}
   */
  async createThreadFromCouple(coupleId, vendorId, initialMessage) {
    try {
      // Check if a thread already exists for this couple-vendor pair
      const existingThreadResult = await query(
        'SELECT id, lead_id FROM message_threads WHERE couple_id = ? AND vendor_id = ?',
        [coupleId, vendorId]
      );

      if (existingThreadResult.rows.length > 0) {
        // Thread already exists, return it
        const threadId = existingThreadResult.rows[0].id;
        
        // If there's an initial message, send it
        if (initialMessage) {
          const messageService = require('./messageService');
          await messageService.sendMessage(
            threadId,
            coupleId,
            'couple',
            initialMessage,
            'text'
          );
          
          // Invalidate caches after sending message
          await performanceOptimizer.invalidateThreadListCache(coupleId);
          await performanceOptimizer.invalidateMessageCache(threadId);
        }

        return {
          success: true,
          thread: {
            id: threadId,
            couple_id: coupleId,
            vendor_id: vendorId,
            lead_id: existingThreadResult.rows[0].lead_id,
            created_at: new Date(),
            updated_at: new Date(),
            last_message_at: new Date(),
            is_active: true
          }
        };
      }

      // Check for existing lead to link to (Requirement 10.1)
      const existingLeadResult = await query(
        'SELECT id FROM vendor_leads WHERE couple_id = ? AND vendor_id = ? ORDER BY created_at DESC LIMIT 1',
        [coupleId, vendorId]
      );

      const leadId = existingLeadResult.rows.length > 0 ? existingLeadResult.rows[0].id : null;

      // Create a new thread
      const threadResult = await query(
        `INSERT INTO message_threads (couple_id, vendor_id, lead_id, service_type, created_at, updated_at, last_message_at, is_active)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), 1)`,
        [coupleId, vendorId, leadId, 'inquiry']
      );

      const threadId = threadResult.lastID || threadResult.rows[0]?.id;

      // Update lead status to 'contacted' if we linked to an existing lead (Requirement 10.1)
      if (leadId) {
        await query(
          'UPDATE vendor_leads SET status = ? WHERE id = ?',
          ['contacted', leadId]
        );
      }

      // Send initial message if provided
      if (initialMessage && threadId) {
        const messageService = require('./messageService');
        await messageService.sendMessage(
          threadId,
          coupleId,
          'couple',
          initialMessage,
          'text'
        );
      }

      // Invalidate thread list cache after creating new thread
      await performanceOptimizer.invalidateThreadListCache(coupleId);

      return {
        success: true,
        thread: {
          id: threadId,
          couple_id: coupleId,
          vendor_id: vendorId,
          lead_id: leadId,
          service_type: 'inquiry',
          created_at: new Date(),
          updated_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }
      };
    } catch (error) {
      console.error('Error creating thread from couple:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update couple online status
   * @param {number} coupleId - The couple ID
   * @param {boolean} isOnline - Whether the couple is online
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateCoupleOnlineStatus(coupleId, isOnline) {
    try {
      // Get the user_id for this couple
      const coupleResult = await query(
        'SELECT user_id FROM couples WHERE id = ?',
        [coupleId]
      );

      if (coupleResult.rows.length === 0) {
        return { success: false, error: 'Couple not found' };
      }

      const userId = coupleResult.rows[0].user_id;

      // Update or insert connection status
      const existingStatus = await query(
        'SELECT user_id FROM user_connection_status WHERE user_id = ?',
        [userId]
      );

      if (existingStatus.rows.length > 0) {
        await query(
          `UPDATE user_connection_status 
           SET is_online = ?, last_seen = datetime('now')
           WHERE user_id = ?`,
          [isOnline ? 1 : 0, userId]
        );
      } else {
        await query(
          `INSERT INTO user_connection_status (user_id, user_type, is_online, last_seen)
           VALUES (?, 'couple', ?, datetime('now'))`,
          [userId, isOnline ? 1 : 0]
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating couple online status:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DashboardIntegration();
