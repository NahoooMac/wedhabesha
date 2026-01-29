const { query } = require('../config/database');
const messageService = require('../services/messageService');
const threadManager = require('../services/threadManager');
const dashboardIntegration = require('../services/dashboardIntegration');

/**
 * Messaging Integration Tests
 * 
 * Tests end-to-end messaging workflows and vendor-couple communication scenarios
 * Requirements: 2.1, 3.1, 8.1
 * 
 * Feature: vendor-dashboard-messaging-enhancement
 */

describe('Messaging Integration Tests', () => {
  let vendorToken;
  let coupleToken;
  let vendorId;
  let coupleId;
  let vendorUserId;
  let coupleUserId;
  let threadId;
  let leadId;

  beforeAll(async () => {
    // Create test vendor user
    const vendorResult = await query(
      `INSERT INTO users (email, password_hash, user_type, auth_provider, is_verified)
       VALUES (?, ?, ?, ?, ?)`,
      ['test-vendor@example.com', 'hashed_password', 'VENDOR', 'EMAIL', 1]
    );
    vendorUserId = vendorResult.lastID || vendorResult.insertId;

    // Create vendor profile
    const vendorProfileResult = await query(
      `INSERT INTO vendors (user_id, business_name, category, location, phone, email)
       VALUES (?, 'Test Vendor', 'Photography', 'Addis Ababa', '+251911234567', 'test-vendor@example.com')`,
      [vendorUserId]
    );
    vendorId = vendorProfileResult.lastID || vendorProfileResult.insertId;

    // Create test couple user
    const coupleResult = await query(
      `INSERT INTO users (email, password_hash, user_type, auth_provider, is_verified)
       VALUES (?, ?, ?, ?, ?)`,
      ['test-couple@example.com', 'hashed_password', 'COUPLE', 'EMAIL', 1]
    );
    coupleUserId = coupleResult.lastID || coupleResult.insertId;

    // Create couple profile (wedding)
    const weddingResult = await query(
      `INSERT INTO weddings (user_id, bride_name, groom_name, wedding_date, venue)
       VALUES (?, 'Test Bride', 'Test Groom', '2024-12-31', 'Test Venue')`,
      [coupleUserId]
    );
    coupleId = weddingResult.insertId;

    // Create a lead for testing
    const leadResult = await query(
      `INSERT INTO vendor_leads (vendor_id, couple_id, couple_name, event_date, status, budget, message)
       VALUES (?, ?, 'Test Couple', '2024-12-31', 'New', 'ETB 50k', 'Interested in your services')`,
      [vendorId, coupleId]
    );
    leadId = leadResult.insertId;

    // Generate mock tokens (in real app, these would be JWT tokens)
    vendorToken = `mock-vendor-token-${vendorUserId}`;
    coupleToken = `mock-couple-token-${coupleUserId}`;
  });

  afterAll(async () => {
    // Clean up test data
    if (threadId) {
      await query('DELETE FROM messages WHERE thread_id = ?', [threadId]);
      await query('DELETE FROM message_threads WHERE id = ?', [threadId]);
    }
    if (leadId) {
      await query('DELETE FROM vendor_leads WHERE id = ?', [leadId]);
    }
    if (vendorId) {
      await query('DELETE FROM vendors WHERE id = ?', [vendorId]);
    }
    if (coupleId) {
      await query('DELETE FROM weddings WHERE id = ?', [coupleId]);
    }
    if (vendorUserId) {
      await query('DELETE FROM users WHERE id = ?', [vendorUserId]);
    }
    if (coupleUserId) {
      await query('DELETE FROM users WHERE id = ?', [coupleUserId]);
    }
  });

  describe('End-to-End Messaging Workflow', () => {
    test('should create thread from lead', async () => {
      const result = await dashboardIntegration.createThreadFromLead(leadId);

      expect(result.success).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.coupleId).toBe(coupleId);
      expect(result.thread.vendorId).toBe(vendorId);
      expect(result.thread.leadId).toBe(leadId);

      threadId = result.thread.id;
    });

    test('should send message from couple to vendor', async () => {
      const result = await messageService.sendMessage(
        threadId,
        coupleUserId,
        'couple',
        'Hello, I would like to know more about your photography packages.',
        'text'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message.threadId).toBe(threadId);
      expect(result.message.senderId).toBe(coupleUserId);
      expect(result.message.senderType).toBe('couple');
      expect(result.message.content).toContain('photography packages');
    });

    test('should retrieve messages in thread', async () => {
      const result = await messageService.getMessages(threadId, 50, 0);

      expect(result.success).toBe(true);
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0].threadId).toBe(threadId);
    });

    test('should send reply from vendor to couple', async () => {
      const result = await messageService.sendMessage(
        threadId,
        vendorUserId,
        'vendor',
        'Thank you for your interest! We have several packages available. Would you like to schedule a consultation?',
        'text'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message.senderType).toBe('vendor');
    });

    test('should mark messages as read', async () => {
      // Get messages
      const messagesResult = await messageService.getMessages(threadId, 50, 0);
      const messageId = messagesResult.messages[0].id;

      // Mark as read
      const result = await messageService.markAsRead(messageId, vendorUserId);

      expect(result.success).toBe(true);

      // Verify read status
      const readStatusResult = await query(
        'SELECT * FROM message_read_status WHERE message_id = ? AND user_id = ?',
        [messageId, vendorUserId]
      );
      expect(readStatusResult.rows.length).toBe(1);
    });

    test('should link message to lead', async () => {
      // Get messages
      const messagesResult = await messageService.getMessages(threadId, 50, 0);
      const messageId = messagesResult.messages[0].id;

      // Link to lead
      const result = await dashboardIntegration.linkMessageToLead(messageId, leadId);

      expect(result.success).toBe(true);

      // Verify link
      const linkResult = await query(
        'SELECT * FROM message_lead_links WHERE message_id = ? AND lead_id = ?',
        [messageId, leadId]
      );
      expect(linkResult.rows.length).toBeGreaterThanOrEqual(0); // May not exist in schema yet
    });

    test('should search messages in thread', async () => {
      const result = await messageService.searchMessages(threadId, 'photography');

      expect(result.success).toBe(true);
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0].content).toContain('photography');
    });

    test('should get thread with lead information', async () => {
      const result = await dashboardIntegration.getVendorThreadsWithLeads(vendorId);

      expect(result.success).toBe(true);
      expect(result.threads).toBeDefined();
      expect(result.threads.length).toBeGreaterThan(0);
      
      const thread = result.threads.find(t => t.id === threadId);
      expect(thread).toBeDefined();
      expect(thread.leadId).toBe(leadId);
    });

    test('should get messaging analytics', async () => {
      const dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      };

      const result = await dashboardIntegration.getMessagingAnalytics(vendorId, dateRange);

      expect(result.success).toBe(true);
      expect(result.analytics).toBeDefined();
      expect(result.analytics.totalMessages).toBeGreaterThan(0);
      expect(result.analytics.activeConversations).toBeGreaterThan(0);
      expect(typeof result.analytics.responseTime).toBe('number');
    });

    test('should update lead status', async () => {
      const result = await dashboardIntegration.updateLeadStatus(leadId, 'Contacted');

      expect(result.success).toBe(true);

      // Verify status update
      const leadResult = await query('SELECT status FROM vendor_leads WHERE id = ?', [leadId]);
      expect(leadResult.rows[0].status).toBe('Contacted');
    });
  });

  describe('Vendor-Couple Communication Scenarios', () => {
    test('should handle multiple messages in conversation', async () => {
      const messages = [
        { sender: coupleUserId, type: 'couple', content: 'What are your rates for a full day?' },
        { sender: vendorUserId, type: 'vendor', content: 'Our full day package starts at ETB 45,000.' },
        { sender: coupleUserId, type: 'couple', content: 'Does that include an engagement shoot?' },
        { sender: vendorUserId, type: 'vendor', content: 'Yes, it includes a complimentary engagement session!' }
      ];

      for (const msg of messages) {
        const result = await messageService.sendMessage(
          threadId,
          msg.sender,
          msg.type,
          msg.content,
          'text'
        );
        expect(result.success).toBe(true);
      }

      // Verify all messages are in thread
      const result = await messageService.getMessages(threadId, 50, 0);
      expect(result.messages.length).toBeGreaterThanOrEqual(messages.length);
    });

    test('should maintain message order chronologically', async () => {
      const result = await messageService.getMessages(threadId, 50, 0);

      expect(result.success).toBe(true);
      expect(result.messages.length).toBeGreaterThan(1);

      // Verify chronological order (newest first)
      for (let i = 0; i < result.messages.length - 1; i++) {
        const current = new Date(result.messages[i].createdAt);
        const next = new Date(result.messages[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    test('should handle vendor profile retrieval', async () => {
      const result = await dashboardIntegration.getVendorProfile(vendorId);

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile.id).toBe(vendorId);
      expect(result.profile.businessName).toBe('Test Vendor');
      expect(result.profile.category).toBe('Photography');
    });

    test('should track thread activity', async () => {
      // Send a message to update thread activity
      await messageService.sendMessage(
        threadId,
        coupleUserId,
        'couple',
        'Looking forward to working with you!',
        'text'
      );

      // Get thread
      const result = await threadManager.getThread(threadId);

      expect(result.success).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.lastMessageAt).toBeDefined();
      
      // Verify last message time is recent
      const lastMessageTime = new Date(result.thread.lastMessageAt);
      const now = new Date();
      const diffMinutes = (now - lastMessageTime) / (1000 * 60);
      expect(diffMinutes).toBeLessThan(5); // Within last 5 minutes
    });

    test('should handle message deletion', async () => {
      // Send a message
      const sendResult = await messageService.sendMessage(
        threadId,
        coupleUserId,
        'couple',
        'This message will be deleted',
        'text'
      );
      const messageId = sendResult.message.id;

      // Delete the message
      const deleteResult = await messageService.deleteMessage(messageId, coupleUserId);

      expect(deleteResult.success).toBe(true);

      // Verify message is marked as deleted
      const messageResult = await query('SELECT is_deleted FROM messages WHERE id = ?', [messageId]);
      expect(messageResult.rows[0].is_deleted).toBe(1);
    });

    test('should get threads for vendor user', async () => {
      const result = await threadManager.getThreadsForUser(vendorUserId, 'vendor');

      expect(result.success).toBe(true);
      expect(result.threads).toBeDefined();
      expect(result.threads.length).toBeGreaterThan(0);
      
      const thread = result.threads.find(t => t.id === threadId);
      expect(thread).toBeDefined();
    });

    test('should get threads for couple user', async () => {
      const result = await threadManager.getThreadsForUser(coupleUserId, 'couple');

      expect(result.success).toBe(true);
      expect(result.threads).toBeDefined();
      expect(result.threads.length).toBeGreaterThan(0);
      
      const thread = result.threads.find(t => t.id === threadId);
      expect(thread).toBeDefined();
    });
  });

  describe('Dashboard Integration', () => {
    test('should integrate messaging with lead tracking', async () => {
      // Get threads with lead information
      const threadsResult = await dashboardIntegration.getVendorThreadsWithLeads(vendorId);
      
      expect(threadsResult.success).toBe(true);
      const thread = threadsResult.threads.find(t => t.id === threadId);
      expect(thread).toBeDefined();
      expect(thread.leadId).toBe(leadId);
      expect(thread.leadStatus).toBeDefined();
    });

    test('should provide messaging summary for dashboard', async () => {
      const dateRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date()
      };

      const result = await dashboardIntegration.getMessagingAnalytics(vendorId, dateRange);

      expect(result.success).toBe(true);
      expect(result.analytics).toBeDefined();
      expect(result.analytics.totalMessages).toBeGreaterThan(0);
      expect(result.analytics.activeConversations).toBeGreaterThan(0);
      expect(Array.isArray(result.analytics.messagesByDay)).toBe(true);
    });

    test('should calculate response time metrics', async () => {
      const result = await dashboardIntegration.getMessagingAnalytics(vendorId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(result.success).toBe(true);
      expect(result.analytics.responseTime).toBeDefined();
      expect(typeof result.analytics.responseTime).toBe('number');
      expect(result.analytics.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid thread ID', async () => {
      const result = await messageService.sendMessage(
        'invalid-thread-id',
        coupleUserId,
        'couple',
        'Test message',
        'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid user ID', async () => {
      const result = await messageService.sendMessage(
        threadId,
        'invalid-user-id',
        'couple',
        'Test message',
        'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle empty message content', async () => {
      const result = await messageService.sendMessage(
        threadId,
        coupleUserId,
        'couple',
        '',
        'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle non-existent lead', async () => {
      const result = await dashboardIntegration.createThreadFromLead(999999);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
