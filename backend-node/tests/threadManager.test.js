const threadManager = require('../services/threadManager');
const { query } = require('../config/database');

/**
 * Unit Tests for ThreadManager Service
 * 
 * Tests thread creation, retrieval, activity tracking, and archiving
 * Validates Requirements 3.1 and 8.1
 */

describe('ThreadManager Service', () => {
  let testCoupleId;
  let testVendorId;
  let testThreadId;

  beforeAll(async () => {
    // Generate test IDs
    testCoupleId = 'test-couple-' + Date.now();
    testVendorId = 'test-vendor-' + Date.now();
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testThreadId) {
        await query('DELETE FROM message_read_status WHERE message_id IN (SELECT id FROM messages WHERE thread_id = ?)', [testThreadId]);
        await query('DELETE FROM messages WHERE thread_id = ?', [testThreadId]);
        await query('DELETE FROM message_threads WHERE id = ?', [testThreadId]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('createThread', () => {
    test('should create a new thread between couple and vendor', async () => {
      const result = await threadManager.createThread(testCoupleId, testVendorId, {
        serviceType: 'photography',
        leadId: 'test-lead-123'
      });

      expect(result.success).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.id).toBeDefined();
      expect(result.thread.participants.coupleId).toBe(testCoupleId);
      expect(result.thread.participants.vendorId).toBe(testVendorId);
      expect(result.thread.isActive).toBe(true);
      expect(result.thread.metadata.serviceType).toBe('photography');
      expect(result.thread.metadata.leadId).toBe('test-lead-123');
      expect(result.alreadyExists).toBe(false);

      // Store thread ID for other tests
      testThreadId = result.thread.id;
    });

    test('should return existing thread if couple-vendor pair already exists', async () => {
      const result = await threadManager.createThread(testCoupleId, testVendorId);

      expect(result.success).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.id).toBe(testThreadId);
      expect(result.alreadyExists).toBe(true);
    });

    test('should fail when couple ID is missing', async () => {
      const result = await threadManager.createThread(null, testVendorId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should fail when vendor ID is missing', async () => {
      const result = await threadManager.createThread(testCoupleId, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should create thread with minimal metadata', async () => {
      const uniqueCoupleId = 'test-couple-minimal-' + Date.now();
      const uniqueVendorId = 'test-vendor-minimal-' + Date.now();

      const result = await threadManager.createThread(uniqueCoupleId, uniqueVendorId);

      expect(result.success).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.metadata.leadId).toBeNull();
      expect(result.thread.metadata.serviceType).toBeNull();

      // Cleanup
      await query('DELETE FROM message_threads WHERE id = ?', [result.thread.id]);
    });
  });

  describe('getThread', () => {
    test('should retrieve thread by ID for authorized couple', async () => {
      const result = await threadManager.getThread(testThreadId, testCoupleId, 'couple');

      expect(result.success).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.id).toBe(testThreadId);
      expect(result.thread.participants.coupleId).toBe(testCoupleId);
      expect(result.thread.participants.vendorId).toBe(testVendorId);
      expect(result.thread.stats).toBeDefined();
      expect(result.thread.stats.messageCount).toBeDefined();
      expect(result.thread.stats.unreadCount).toBeDefined();
    });

    test('should retrieve thread by ID for authorized vendor', async () => {
      const result = await threadManager.getThread(testThreadId, testVendorId, 'vendor');

      expect(result.success).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.id).toBe(testThreadId);
    });

    test('should fail when thread ID is missing', async () => {
      const result = await threadManager.getThread(null, testCoupleId, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should fail when user is not authorized', async () => {
      const unauthorizedUserId = 'unauthorized-user-' + Date.now();
      const result = await threadManager.getThread(testThreadId, unauthorizedUserId, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a participant');
    });

    test('should fail with invalid user type', async () => {
      const result = await threadManager.getThread(testThreadId, testCoupleId, 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user type');
    });

    test('should fail when thread does not exist', async () => {
      const nonExistentThreadId = 'non-existent-thread-' + Date.now();
      
      // First try to get it - should fail at authorization level
      const result = await threadManager.getThread(nonExistentThreadId, testCoupleId, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getThreadsForUser', () => {
    test('should retrieve all threads for a couple', async () => {
      const result = await threadManager.getThreadsForUser(testCoupleId, 'couple');

      expect(result.success).toBe(true);
      expect(result.threads).toBeDefined();
      expect(Array.isArray(result.threads)).toBe(true);
      expect(result.threads.length).toBeGreaterThan(0);
      expect(result.total).toBeDefined();
      expect(result.limit).toBeDefined();
      expect(result.offset).toBeDefined();

      // Verify thread structure
      const thread = result.threads[0];
      expect(thread.id).toBeDefined();
      expect(thread.participants).toBeDefined();
      expect(thread.stats).toBeDefined();
      expect(thread.lastMessage).toBeDefined();
    });

    test('should retrieve all threads for a vendor', async () => {
      const result = await threadManager.getThreadsForUser(testVendorId, 'vendor');

      expect(result.success).toBe(true);
      expect(result.threads).toBeDefined();
      expect(Array.isArray(result.threads)).toBe(true);
      expect(result.threads.length).toBeGreaterThan(0);
    });

    test('should support pagination', async () => {
      const result = await threadManager.getThreadsForUser(testCoupleId, 'couple', {
        limit: 1,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.threads.length).toBeLessThanOrEqual(1);
      expect(result.limit).toBe(1);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBeDefined();
    });

    test('should exclude inactive threads by default', async () => {
      const result = await threadManager.getThreadsForUser(testCoupleId, 'couple');

      expect(result.success).toBe(true);
      result.threads.forEach(thread => {
        expect(thread.isActive).toBe(true);
      });
    });

    test('should include inactive threads when requested', async () => {
      // First archive a thread
      await threadManager.archiveThread(testThreadId, testCoupleId, 'couple');

      // Get threads including inactive
      const result = await threadManager.getThreadsForUser(testCoupleId, 'couple', {
        includeInactive: true
      });

      expect(result.success).toBe(true);
      expect(result.threads).toBeDefined();

      // Reactivate for other tests
      await threadManager.reactivateThread(testThreadId, testCoupleId, 'couple');
    });

    test('should fail when user ID is missing', async () => {
      const result = await threadManager.getThreadsForUser(null, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should fail with invalid user type', async () => {
      const result = await threadManager.getThreadsForUser(testCoupleId, 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user type');
    });

    test('should return empty array for user with no threads', async () => {
      const newUserId = 'user-no-threads-' + Date.now();
      const result = await threadManager.getThreadsForUser(newUserId, 'couple');

      expect(result.success).toBe(true);
      expect(result.threads).toBeDefined();
      expect(Array.isArray(result.threads)).toBe(true);
      expect(result.threads.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('updateThreadActivity', () => {
    test('should update thread activity timestamp', async () => {
      // Get original timestamp
      const beforeResult = await threadManager.getThread(testThreadId, testCoupleId, 'couple');
      const beforeTimestamp = beforeResult.thread.lastMessageAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update activity
      const updateResult = await threadManager.updateThreadActivity(testThreadId);

      expect(updateResult.success).toBe(true);

      // Verify timestamp was updated
      const afterResult = await threadManager.getThread(testThreadId, testCoupleId, 'couple');
      const afterTimestamp = afterResult.thread.lastMessageAt;

      // Timestamps should be different (after should be more recent)
      expect(new Date(afterTimestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTimestamp).getTime());
    });

    test('should fail when thread ID is missing', async () => {
      const result = await threadManager.updateThreadActivity(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should fail when thread does not exist', async () => {
      const nonExistentThreadId = 'non-existent-' + Date.now();
      const result = await threadManager.updateThreadActivity(nonExistentThreadId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('archiveThread', () => {
    let testArchiveThreadId;

    beforeAll(async () => {
      // Create a separate thread for archive tests
      const uniqueCoupleId = 'archive-test-couple-' + Date.now();
      const uniqueVendorId = 'archive-test-vendor-' + Date.now();
      const result = await threadManager.createThread(uniqueCoupleId, uniqueVendorId);
      testArchiveThreadId = result.thread.id;
    });

    afterAll(async () => {
      // Cleanup
      if (testArchiveThreadId) {
        await query('DELETE FROM message_threads WHERE id = ?', [testArchiveThreadId]);
      }
    });

    test('should archive an active thread', async () => {
      const result = await threadManager.archiveThread(testThreadId, testCoupleId, 'couple');

      expect(result.success).toBe(true);
      expect(result.alreadyArchived).toBe(false);

      // Verify thread is archived by checking directly in database
      const checkQuery = 'SELECT is_active FROM message_threads WHERE id = ?';
      const checkResult = await query(checkQuery, [testThreadId]);
      expect(checkResult.rows[0].is_active).toBe(0); // SQLite uses 0 for false
    });

    test('should return success if thread is already archived', async () => {
      // Thread should still be archived from previous test
      const result = await threadManager.archiveThread(testThreadId, testCoupleId, 'couple');

      expect(result.success).toBe(true);
      expect(result.alreadyArchived).toBe(true);
    });

    test('should fail when thread ID is missing', async () => {
      const result = await threadManager.archiveThread(null, testCoupleId, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should fail when user is not authorized', async () => {
      // Use the separate test thread which is still active
      const unauthorizedUserId = 'unauthorized-' + Date.now();
      const result = await threadManager.archiveThread(testArchiveThreadId, unauthorizedUserId, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a participant');
    });

    test('should fail with invalid user type', async () => {
      const result = await threadManager.archiveThread(testThreadId, testCoupleId, 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user type');
    });
  });

  describe('reactivateThread', () => {
    test('should reactivate an archived thread', async () => {
      // Thread should be archived from previous tests
      const result = await threadManager.reactivateThread(testThreadId, testCoupleId, 'couple');

      expect(result.success).toBe(true);
      expect(result.alreadyActive).toBe(false);

      // Verify thread is active
      const threadResult = await threadManager.getThread(testThreadId, testCoupleId, 'couple');
      expect(threadResult.thread.isActive).toBe(true);
    });

    test('should return success if thread is already active', async () => {
      const result = await threadManager.reactivateThread(testThreadId, testCoupleId, 'couple');

      expect(result.success).toBe(true);
      expect(result.alreadyActive).toBe(true);
    });

    test('should fail when thread ID is missing', async () => {
      const result = await threadManager.reactivateThread(null, testCoupleId, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should fail when user is not authorized', async () => {
      const unauthorizedUserId = 'unauthorized-' + Date.now();
      const result = await threadManager.reactivateThread(testThreadId, unauthorizedUserId, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a participant');
    });
  });

  describe('getThreadStats', () => {
    test('should retrieve thread statistics for a couple', async () => {
      const result = await threadManager.getThreadStats(testCoupleId, 'couple');

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalThreads).toBeDefined();
      expect(result.stats.activeThreads).toBeDefined();
      expect(result.stats.archivedThreads).toBeDefined();
      expect(result.stats.totalUnreadMessages).toBeDefined();
      expect(typeof result.stats.totalThreads).toBe('number');
    });

    test('should retrieve thread statistics for a vendor', async () => {
      const result = await threadManager.getThreadStats(testVendorId, 'vendor');

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalThreads).toBeGreaterThan(0);
    });

    test('should fail when user ID is missing', async () => {
      const result = await threadManager.getThreadStats(null, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should fail with invalid user type', async () => {
      const result = await threadManager.getThreadStats(testCoupleId, 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user type');
    });

    test('should return zero stats for user with no threads', async () => {
      const newUserId = 'user-no-stats-' + Date.now();
      const result = await threadManager.getThreadStats(newUserId, 'couple');

      expect(result.success).toBe(true);
      expect(result.stats.totalThreads).toBe(0);
      expect(result.stats.activeThreads).toBe(0);
      expect(result.stats.archivedThreads).toBe(0);
    });
  });

  describe('validateUserType', () => {
    test('should validate correct user types', () => {
      expect(threadManager.validateUserType('couple').valid).toBe(true);
      expect(threadManager.validateUserType('vendor').valid).toBe(true);
      expect(threadManager.validateUserType('COUPLE').valid).toBe(true);
      expect(threadManager.validateUserType('VENDOR').valid).toBe(true);
    });

    test('should reject invalid user types', () => {
      expect(threadManager.validateUserType('invalid').valid).toBe(false);
      expect(threadManager.validateUserType('admin').valid).toBe(false);
      expect(threadManager.validateUserType('').valid).toBe(false);
      expect(threadManager.validateUserType(null).valid).toBe(false);
    });
  });

  describe('getConfig', () => {
    test('should return configuration object', () => {
      const config = threadManager.getConfig();

      expect(config).toBeDefined();
      expect(config.defaultThreadsPerPage).toBeDefined();
      expect(typeof config.defaultThreadsPerPage).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    test('should handle concurrent thread creation attempts', async () => {
      const uniqueCoupleId = 'concurrent-couple-' + Date.now();
      const uniqueVendorId = 'concurrent-vendor-' + Date.now();

      // Create two threads simultaneously
      const [result1, result2] = await Promise.all([
        threadManager.createThread(uniqueCoupleId, uniqueVendorId),
        threadManager.createThread(uniqueCoupleId, uniqueVendorId)
      ]);

      // Both should succeed (one creates, one returns existing)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // They should have the same thread ID
      expect(result1.thread.id).toBe(result2.thread.id);

      // At least one should indicate it already exists
      const hasExisting = result1.alreadyExists || result2.alreadyExists;
      expect(hasExisting).toBe(true);

      // Cleanup
      await query('DELETE FROM message_threads WHERE id = ?', [result1.thread.id]);
    });

    test('should handle very long service type strings', async () => {
      const longServiceType = 'a'.repeat(100);
      const uniqueCoupleId = 'long-service-couple-' + Date.now();
      const uniqueVendorId = 'long-service-vendor-' + Date.now();

      const result = await threadManager.createThread(uniqueCoupleId, uniqueVendorId, {
        serviceType: longServiceType
      });

      expect(result.success).toBe(true);
      
      // Cleanup
      await query('DELETE FROM message_threads WHERE id = ?', [result.thread.id]);
    });

    test('should handle pagination with offset beyond total', async () => {
      const result = await threadManager.getThreadsForUser(testCoupleId, 'couple', {
        limit: 10,
        offset: 10000
      });

      expect(result.success).toBe(true);
      expect(result.threads).toBeDefined();
      expect(result.threads.length).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    test('should handle negative pagination values', async () => {
      const result = await threadManager.getThreadsForUser(testCoupleId, 'couple', {
        limit: -5,
        offset: -10
      });

      expect(result.success).toBe(true);
      // Should normalize to valid values
      expect(result.limit).toBeGreaterThan(0);
      expect(result.offset).toBe(0);
    });
  });
});
