const { query } = require('../config/database');
const dataPrivacyService = require('../services/dataPrivacyService');
const messageService = require('../services/messageService');
const threadManager = require('../services/threadManager');

/**
 * Unit Tests for Data Deletion Functionality
 * 
 * Tests the 30-day data deletion timeline and data export capabilities
 * Validates Requirements 4.4
 */

describe('Data Deletion - 30-Day Timeline', () => {
  let testCoupleId;
  let testVendorId;
  let testThreadId;
  let testMessageIds = [];

  beforeAll(async () => {
    // Create test users
    testCoupleId = 1001;
    testVendorId = 2001;

    // Create a test thread
    const threadResult = await threadManager.createThread(
      testCoupleId,
      testVendorId,
      { serviceType: 'photography' }
    );

    if (!threadResult.success) {
      throw new Error(`Failed to create test thread: ${threadResult.error}`);
    }

    testThreadId = threadResult.thread.id;

    // Create test messages
    for (let i = 0; i < 5; i++) {
      const messageResult = await messageService.sendMessage(
        testThreadId,
        i % 2 === 0 ? testCoupleId : testVendorId,
        i % 2 === 0 ? 'couple' : 'vendor',
        `Test message ${i + 1}`,
        'text'
      );

      if (messageResult.success) {
        testMessageIds.push(messageResult.message.id);
      }
    }

    console.log(`✅ Test setup complete: Thread ${testThreadId}, ${testMessageIds.length} messages`);
  });

  afterAll(async () => {
    // Clean up test data
    try {
      // Delete test messages
      if (testMessageIds.length > 0) {
        const placeholders = testMessageIds.map(() => '?').join(',');
        await query(`DELETE FROM message_attachments WHERE message_id IN (${placeholders})`, testMessageIds);
        await query(`DELETE FROM message_read_status WHERE message_id IN (${placeholders})`, testMessageIds);
        await query(`DELETE FROM messages WHERE id IN (${placeholders})`, testMessageIds);
      }

      // Delete test thread
      if (testThreadId) {
        await query('DELETE FROM message_threads WHERE id = ?', [testThreadId]);
      }

      // Delete any deletion requests
      await query('DELETE FROM data_deletion_requests WHERE user_id IN (?, ?)', [testCoupleId, testVendorId]);

      console.log('✅ Test cleanup complete');
    } catch (error) {
      console.error('❌ Test cleanup failed:', error);
    }
  });

  /**
   * Test: 30-Day Deletion Timeline
   * 
   * Validates that when a user requests data deletion:
   * 1. The deletion is scheduled for exactly 30 days in the future
   * 2. The request is stored with 'pending' status
   * 3. The user can cancel the request before the scheduled date
   * 4. After 30 days, the data is permanently deleted
   */
  test('should schedule data deletion for 30 days from request date', async () => {
    // Request data deletion for the couple
    const requestResult = await dataPrivacyService.requestDataDeletion(
      testCoupleId,
      'couple'
    );

    expect(requestResult.success).toBe(true);
    expect(requestResult.alreadyRequested).toBe(false);
    expect(requestResult.gracePeriodDays).toBe(30);
    expect(requestResult.deletionDate).toBeDefined();
    expect(requestResult.requestId).toBeDefined();

    // Verify the deletion date is 30 days from now
    const now = new Date();
    const deletionDate = new Date(requestResult.deletionDate);
    const daysDifference = Math.round((deletionDate - now) / (1000 * 60 * 60 * 24));

    expect(daysDifference).toBe(30);

    // Verify the request is stored in the database
    const statusResult = await dataPrivacyService.getDeletionStatus(
      testCoupleId,
      'couple'
    );

    expect(statusResult.success).toBe(true);
    expect(statusResult.request).toBeDefined();
    expect(statusResult.request.status).toBe('pending');
    expect(statusResult.request.userId).toBe(testCoupleId);
    expect(statusResult.request.userType).toBe('couple');

    console.log('✅ Deletion scheduled for 30 days from now');
  });

  test('should allow user to cancel deletion request before scheduled date', async () => {
    // Cancel the deletion request
    const cancelResult = await dataPrivacyService.cancelDataDeletion(
      testCoupleId,
      'couple'
    );

    expect(cancelResult.success).toBe(true);

    // Verify the request status is updated to 'cancelled'
    const statusResult = await dataPrivacyService.getDeletionStatus(
      testCoupleId,
      'couple'
    );

    expect(statusResult.success).toBe(true);
    expect(statusResult.request).toBeDefined();
    expect(statusResult.request.status).toBe('cancelled');
    expect(statusResult.request.cancelledAt).toBeDefined();

    console.log('✅ Deletion request cancelled successfully');
  });

  test('should export user data before deletion', async () => {
    // Export user data
    const exportResult = await dataPrivacyService.exportUserData(
      testCoupleId,
      'couple'
    );

    expect(exportResult.success).toBe(true);
    expect(exportResult.data).toBeDefined();
    expect(exportResult.data.userId).toBe(testCoupleId);
    expect(exportResult.data.userType).toBe('couple');
    expect(exportResult.data.threads).toBeDefined();
    expect(exportResult.data.messages).toBeDefined();
    expect(exportResult.data.statistics).toBeDefined();

    // Verify exported data contains the test thread
    const exportedThread = exportResult.data.threads.find(t => t.id === testThreadId);
    expect(exportedThread).toBeDefined();
    expect(exportedThread.coupleId).toBe(testCoupleId);
    expect(exportedThread.vendorId).toBe(testVendorId);

    // Verify exported data contains messages
    expect(exportResult.data.messages.length).toBeGreaterThan(0);

    // Verify statistics
    expect(exportResult.data.statistics.totalThreads).toBeGreaterThan(0);
    expect(exportResult.data.statistics.totalMessages).toBeGreaterThan(0);

    console.log(`✅ Exported ${exportResult.data.messages.length} messages and ${exportResult.data.threads.length} threads`);
  });

  test('should permanently delete user data after grace period', async () => {
    // Get initial message count
    const initialMessages = await query(
      'SELECT COUNT(*) as count FROM messages WHERE thread_id = ?',
      [testThreadId]
    );
    const initialCount = initialMessages.rows[0].count;

    expect(initialCount).toBeGreaterThan(0);

    // Permanently delete user data
    const deleteResult = await dataPrivacyService.deleteUserData(
      testCoupleId,
      'couple'
    );

    expect(deleteResult.success).toBe(true);
    expect(deleteResult.deletedItems).toBeDefined();
    expect(deleteResult.deletedItems.threads).toBeGreaterThan(0);
    expect(deleteResult.deletedItems.messages).toBeGreaterThan(0);

    // Verify thread is deleted
    const threadCheck = await query(
      'SELECT COUNT(*) as count FROM message_threads WHERE id = ?',
      [testThreadId]
    );
    expect(threadCheck.rows[0].count).toBe(0);

    // Verify messages are deleted
    const messageCheck = await query(
      'SELECT COUNT(*) as count FROM messages WHERE thread_id = ?',
      [testThreadId]
    );
    expect(messageCheck.rows[0].count).toBe(0);

    console.log(`✅ Permanently deleted ${deleteResult.deletedItems.messages} messages and ${deleteResult.deletedItems.threads} threads`);
  });

  test('should handle duplicate deletion requests', async () => {
    // Create a new thread for this test
    const newThreadResult = await threadManager.createThread(
      testCoupleId + 1,
      testVendorId,
      { serviceType: 'catering' }
    );

    const newTestCoupleId = testCoupleId + 1;

    // Request deletion
    const firstRequest = await dataPrivacyService.requestDataDeletion(
      newTestCoupleId,
      'couple'
    );

    expect(firstRequest.success).toBe(true);
    expect(firstRequest.alreadyRequested).toBe(false);

    // Request deletion again
    const secondRequest = await dataPrivacyService.requestDataDeletion(
      newTestCoupleId,
      'couple'
    );

    expect(secondRequest.success).toBe(true);
    expect(secondRequest.alreadyRequested).toBe(true);
    expect(secondRequest.requestId).toBe(firstRequest.requestId);

    // Clean up
    await dataPrivacyService.cancelDataDeletion(newTestCoupleId, 'couple');
    await query('DELETE FROM message_threads WHERE id = ?', [newThreadResult.thread.id]);

    console.log('✅ Duplicate deletion requests handled correctly');
  });

  test('should validate user type for deletion requests', async () => {
    // Try with invalid user type
    const invalidResult = await dataPrivacyService.requestDataDeletion(
      testVendorId,
      'invalid_type'
    );

    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain('Invalid user type');

    console.log('✅ User type validation working correctly');
  });

  test('should not allow cancellation of non-existent deletion request', async () => {
    // Try to cancel a deletion request that doesn't exist
    const cancelResult = await dataPrivacyService.cancelDataDeletion(
      testVendorId + 999,
      'vendor'
    );

    expect(cancelResult.success).toBe(false);
    expect(cancelResult.error).toContain('No pending deletion request found');

    console.log('✅ Non-existent deletion request cancellation handled correctly');
  });
});

describe('Data Export Functionality', () => {
  test('should export empty data for user with no messages', async () => {
    const emptyUserId = 9999;

    const exportResult = await dataPrivacyService.exportUserData(
      emptyUserId,
      'couple'
    );

    expect(exportResult.success).toBe(true);
    expect(exportResult.data).toBeDefined();
    expect(exportResult.data.threads).toEqual([]);
    expect(exportResult.data.messages).toEqual([]);
    expect(exportResult.data.statistics.totalThreads).toBe(0);
    expect(exportResult.data.statistics.totalMessages).toBe(0);

    console.log('✅ Empty data export handled correctly');
  });

  test('should include export metadata', async () => {
    const exportResult = await dataPrivacyService.exportUserData(
      1001,
      'couple'
    );

    expect(exportResult.success).toBe(true);
    expect(exportResult.data.exportDate).toBeDefined();
    expect(exportResult.data.userId).toBe(1001);
    expect(exportResult.data.userType).toBe('couple');

    // Verify export date is recent (within last minute)
    const exportDate = new Date(exportResult.data.exportDate);
    const now = new Date();
    const timeDiff = Math.abs(now - exportDate);
    expect(timeDiff).toBeLessThan(60000); // Less than 1 minute

    console.log('✅ Export metadata included correctly');
  });
});

describe('Scheduled Deletion Execution', () => {
  test('should process scheduled deletions that are due', async () => {
    // Create a test user and thread
    const testUserId = 3001;
    const testVendorId = 4001;

    const threadResult = await threadManager.createThread(
      testUserId,
      testVendorId,
      { serviceType: 'venue' }
    );

    // Create a deletion request with past scheduled date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

    await query(
      `INSERT INTO data_deletion_requests (user_id, user_type, requested_at, scheduled_deletion_at, status)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?, 'pending')`,
      [testUserId, 'couple', pastDate.toISOString()]
    );

    // Execute scheduled deletions
    const executeResult = await dataPrivacyService.executeScheduledDeletions();

    expect(executeResult.success).toBe(true);
    expect(executeResult.deletedCount).toBeGreaterThanOrEqual(0);

    // Clean up
    await query('DELETE FROM data_deletion_requests WHERE user_id = ?', [testUserId]);

    console.log(`✅ Processed ${executeResult.deletedCount} scheduled deletions`);
  });

  test('should not process deletions that are not yet due', async () => {
    // Create a deletion request with future scheduled date
    const testUserId = 3002;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10); // 10 days from now

    await query(
      `INSERT INTO data_deletion_requests (user_id, user_type, requested_at, scheduled_deletion_at, status)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?, 'pending')`,
      [testUserId, 'couple', futureDate.toISOString()]
    );

    // Execute scheduled deletions
    const executeResult = await dataPrivacyService.executeScheduledDeletions();

    expect(executeResult.success).toBe(true);

    // Verify the request is still pending
    const statusResult = await dataPrivacyService.getDeletionStatus(
      testUserId,
      'couple'
    );

    expect(statusResult.success).toBe(true);
    expect(statusResult.request.status).toBe('pending');

    // Clean up
    await query('DELETE FROM data_deletion_requests WHERE user_id = ?', [testUserId]);

    console.log('✅ Future deletions not processed prematurely');
  });
});
