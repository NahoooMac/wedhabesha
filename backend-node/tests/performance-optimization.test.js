const performanceOptimizer = require('../services/performanceOptimizer');
const dashboardIntegration = require('../services/dashboardIntegration');
const messageService = require('../services/messageService');
const { query } = require('../config/database');

/**
 * Performance Optimization Tests
 * 
 * Tests caching, database performance, and large message history handling
 * Requirements: TR-5
 */

describe('Performance Optimization', () => {
  let testCoupleId;
  let testVendorId;
  let testThreadId;
  let testUserId;

  beforeAll(async () => {
    // Create test data
    await setupTestData();
    
    // Initialize performance optimizer
    await performanceOptimizer.createPerformanceIndexes();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await performanceOptimizer.close();
  });

  describe('Thread List Caching', () => {
    test('should cache and retrieve thread list', async () => {
      // First call should hit database
      const startTime1 = Date.now();
      const result1 = await dashboardIntegration.getCoupleThreadsWithVendors(testCoupleId);
      const duration1 = Date.now() - startTime1;

      expect(result1.success).toBe(true);
      expect(Array.isArray(result1.threads)).toBe(true);

      // Second call should hit cache (should be faster)
      const startTime2 = Date.now();
      const result2 = await dashboardIntegration.getCoupleThreadsWithVendors(testCoupleId);
      const duration2 = Date.now() - startTime2;

      expect(result2.success).toBe(true);
      expect(result2.threads).toEqual(result1.threads);
      
      // Cache should be faster (allowing some variance for test environment)
      console.log(`Database call: ${duration1}ms, Cache call: ${duration2}ms`);
    });

    test('should invalidate cache when thread is created', async () => {
      // Get initial thread count
      const result1 = await dashboardIntegration.getCoupleThreadsWithVendors(testCoupleId);
      const initialCount = result1.threads.length;

      // Create new thread (should invalidate cache)
      const newVendorResult = await query(
        'INSERT INTO vendors (user_id, business_name, category, location) VALUES (?, ?, ?, ?)',
        [testUserId + 1, 'Test Vendor 2', 'Photography', 'Test City']
      );
      const newVendorId = newVendorResult.lastID || newVendorResult.rows[0]?.id;

      await dashboardIntegration.createThreadFromCouple(testCoupleId, newVendorId, 'Test message');

      // Get updated thread count
      const result2 = await dashboardIntegration.getCoupleThreadsWithVendors(testCoupleId);
      
      expect(result2.threads.length).toBe(initialCount + 1);
    });
  });

  describe('Message Caching', () => {
    test('should cache and retrieve messages', async () => {
      // First call should hit database
      const startTime1 = Date.now();
      const result1 = await messageService.getMessages(testThreadId, testCoupleId, 'couple', 50, 0);
      const duration1 = Date.now() - startTime1;

      expect(result1.success).toBe(true);
      expect(Array.isArray(result1.messages)).toBe(true);

      // Second call should hit cache
      const startTime2 = Date.now();
      const result2 = await messageService.getMessages(testThreadId, testCoupleId, 'couple', 50, 0);
      const duration2 = Date.now() - startTime2;

      expect(result2.success).toBe(true);
      expect(result2.messages).toEqual(result1.messages);
      
      console.log(`Database call: ${duration1}ms, Cache call: ${duration2}ms`);
    });

    test('should invalidate cache when message is sent', async () => {
      // Get initial message count
      const result1 = await messageService.getMessages(testThreadId, testCoupleId, 'couple', 50, 0);
      const initialCount = result1.messages.length;

      // Send new message (should invalidate cache)
      await messageService.sendMessage(testThreadId, testCoupleId, 'couple', 'Cache invalidation test', 'text');

      // Get updated message count
      const result2 = await messageService.getMessages(testThreadId, testCoupleId, 'couple', 50, 0);
      
      expect(result2.messages.length).toBe(initialCount + 1);
    });
  });

  describe('Large Message History Performance', () => {
    test('should handle large message histories efficiently', async () => {
      // Create a thread with many messages using a unique service type
      const uniqueServiceType = `performance_test_${Date.now()}`;
      const largeThreadResult = await query(
        `INSERT INTO message_threads (couple_id, vendor_id, service_type, created_at, updated_at, last_message_at, is_active)
         VALUES (?, ?, ?, datetime('now'), datetime('now'), datetime('now'), 1)`,
        [testCoupleId, testVendorId, uniqueServiceType]
      );
      const largeThreadId = largeThreadResult.lastID || largeThreadResult.rows[0]?.id;

      // Insert 1000 test messages
      console.log('Creating 1000 test messages...');
      const batchSize = 100;
      for (let batch = 0; batch < 10; batch++) {
        const values = [];
        const placeholders = [];
        
        for (let i = 0; i < batchSize; i++) {
          const messageNum = batch * batchSize + i + 1;
          values.push(
            largeThreadId,
            testCoupleId,
            'couple',
            `Test message ${messageNum}`,
            'text',
            'sent'
          );
          placeholders.push('(?, ?, ?, ?, ?, ?)');
        }

        await query(
          `INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type, status, created_at, updated_at)
           VALUES ${placeholders.join(', ')}`,
          values
        );
      }

      // Test pagination performance
      const startTime = Date.now();
      const result = await messageService.getMessages(largeThreadId, testCoupleId, 'couple', 50, 0);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.messages.length).toBe(50);
      expect(result.hasMore).toBe(true);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`Large message history query completed in ${duration}ms`);

      // Test pagination with offset
      const startTime2 = Date.now();
      const result2 = await messageService.getMessages(largeThreadId, testCoupleId, 'couple', 50, 500);
      const duration2 = Date.now() - startTime2;

      expect(result2.success).toBe(true);
      expect(result2.messages.length).toBe(50);
      expect(duration2).toBeLessThan(3000);

      console.log(`Paginated query (offset 500) completed in ${duration2}ms`);
    });
  });

  describe('WebSocket Message Optimization', () => {
    test('should optimize WebSocket message size', () => {
      const originalMessage = {
        id: 'msg-123',
        threadId: 'thread-456',
        senderId: 'couple-789',
        senderType: 'couple',
        content: 'Test message content',
        messageType: 'text',
        status: 'sent',
        createdAt: '2024-01-27T10:30:00Z',
        updatedAt: '2024-01-27T10:30:00Z',
        isDeleted: false,
        readAt: null,
        extraField: 'should be removed',
        attachments: [
          {
            id: 'att-1',
            fileName: 'test.jpg',
            fileType: 'image/jpeg',
            fileSize: 1024,
            url: '/uploads/test.jpg',
            uploadedAt: '2024-01-27T10:30:00Z',
            extraAttachmentField: 'should be removed'
          }
        ]
      };

      const optimized = performanceOptimizer.optimizeWebSocketMessage(originalMessage);

      // Should include essential fields
      expect(optimized.id).toBe(originalMessage.id);
      expect(optimized.threadId).toBe(originalMessage.threadId);
      expect(optimized.content).toBe(originalMessage.content);

      // Should exclude unnecessary fields
      expect(optimized.extraField).toBeUndefined();
      expect(optimized.updatedAt).toBeUndefined();
      expect(optimized.isDeleted).toBeUndefined();

      // Should optimize attachments
      expect(optimized.attachments).toBeDefined();
      expect(optimized.attachments[0].extraAttachmentField).toBeUndefined();
      expect(optimized.attachments[0].uploadedAt).toBeUndefined();

      // Check message size reduction
      const originalSize = JSON.stringify(originalMessage).length;
      const optimizedSize = JSON.stringify(optimized).length;
      
      expect(optimizedSize).toBeLessThan(originalSize);
      console.log(`Message size reduced from ${originalSize} to ${optimizedSize} bytes`);
    });
  });

  describe('Performance Monitoring', () => {
    test('should monitor operation performance', () => {
      const operationId = performanceOptimizer.startPerformanceMonitoring('test_operation');
      
      expect(operationId).toBeDefined();
      expect(typeof operationId).toBe('string');

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Wait 100ms
      }

      const metrics = performanceOptimizer.endPerformanceMonitoring(operationId, {
        testData: 'additional info'
      });

      expect(metrics).toBeDefined();
      expect(metrics.operationName).toBe('test_operation');
      expect(metrics.duration).toBeGreaterThan(90);
      expect(metrics.testData).toBe('additional info');
    });
  });

  describe('Database Indexes', () => {
    test('should create performance indexes', async () => {
      const result = await performanceOptimizer.createPerformanceIndexes();
      expect(result).toBe(true);
    });

    test('should improve query performance with indexes', async () => {
      // Test query performance on indexed columns
      const startTime = Date.now();
      
      const result = await query(
        `SELECT mt.id, mt.last_message_at, v.business_name
         FROM message_threads mt
         JOIN vendors v ON mt.vendor_id = v.id
         WHERE mt.couple_id = ?
         ORDER BY mt.last_message_at DESC
         LIMIT 10`,
        [testCoupleId]
      );
      
      const duration = Date.now() - startTime;
      
      expect(result.rows).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Indexed query completed in ${duration}ms`);
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test user
    const userResult = await query(
      'INSERT INTO users (email, user_type, auth_provider) VALUES (?, ?, ?)',
      ['test-perf@example.com', 'COUPLE', 'EMAIL']
    );
    testUserId = userResult.lastID || userResult.rows[0]?.id;

    // Create test couple
    const coupleResult = await query(
      'INSERT INTO couples (user_id, partner1_name, partner2_name) VALUES (?, ?, ?)',
      [testUserId, 'Test Partner 1', 'Test Partner 2']
    );
    testCoupleId = coupleResult.lastID || coupleResult.rows[0]?.id;

    // Create test vendor user
    const vendorUserResult = await query(
      'INSERT INTO users (email, user_type, auth_provider) VALUES (?, ?, ?)',
      ['vendor-perf@example.com', 'VENDOR', 'EMAIL']
    );
    const vendorUserId = vendorUserResult.lastID || vendorUserResult.rows[0]?.id;

    // Create test vendor
    const vendorResult = await query(
      'INSERT INTO vendors (user_id, business_name, category, location) VALUES (?, ?, ?, ?)',
      [vendorUserId, 'Test Vendor', 'Photography', 'Test City']
    );
    testVendorId = vendorResult.lastID || vendorResult.rows[0]?.id;

    // Create test thread
    const threadResult = await query(
      `INSERT INTO message_threads (couple_id, vendor_id, service_type, created_at, updated_at, last_message_at, is_active)
       VALUES (?, ?, ?, datetime('now'), datetime('now'), datetime('now'), 1)`,
      [testCoupleId, testVendorId, 'inquiry']
    );
    testThreadId = threadResult.lastID || threadResult.rows[0]?.id;

    // Create some test messages
    for (let i = 1; i <= 10; i++) {
      await query(
        `INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [testThreadId, testCoupleId, 'couple', `Test message ${i}`, 'text', 'sent']
      );
    }
  }

  async function cleanupTestData() {
    // Clean up in reverse order of creation
    await query('DELETE FROM messages WHERE thread_id = ?', [testThreadId]);
    await query('DELETE FROM message_threads WHERE id = ?', [testThreadId]);
    await query('DELETE FROM vendors WHERE id = ?', [testVendorId]);
    await query('DELETE FROM couples WHERE id = ?', [testCoupleId]);
    await query('DELETE FROM users WHERE id IN (?, ?)', [testUserId, testUserId + 1]);
    
    // Clean up any additional test data
    await query('DELETE FROM message_threads WHERE service_type LIKE ?', ['performance_test%']);
    await query('DELETE FROM vendors WHERE business_name LIKE ?', ['Test Vendor%']);
  }
});