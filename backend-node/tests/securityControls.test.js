const securityControls = require('../services/securityControls');
const { query } = require('../config/database');

// Mock the database query function
jest.mock('../config/database', () => ({
  query: jest.fn(),
  isPostgreSQL: false
}));

describe('SecurityControls Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset security controls state
    securityControls.setAccessLogging(true);
  });

  describe('verifyThreadAccess', () => {
    it('should grant access when user is a couple participant in the thread', async () => {
      // Mock thread query result
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          couple_id: 100,
          vendor_id: 200,
          is_active: true
        }]
      });

      // Mock access log table creation
      query.mockResolvedValueOnce({ rows: [] }); // CREATE TABLE
      query.mockResolvedValueOnce({ rows: [] }); // CREATE INDEX
      query.mockResolvedValueOnce({ rows: [] }); // CREATE INDEX
      query.mockResolvedValueOnce({ rows: [] }); // CREATE INDEX
      query.mockResolvedValueOnce({ rows: [] }); // CREATE INDEX
      
      // Mock access log insertion
      query.mockResolvedValueOnce({ rows: [] });
      
      // Mock cleanup check
      query.mockResolvedValueOnce({ rows: [{ count: 5 }] });

      const result = await securityControls.verifyThreadAccess(100, 'couple', 1);

      expect(result.authorized).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.couple_id).toBe(100);
    });

    it('should grant access when user is a vendor participant in the thread', async () => {
      // Mock thread query result
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          couple_id: 100,
          vendor_id: 200,
          is_active: true
        }]
      });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyThreadAccess(200, 'vendor', 1);

      expect(result.authorized).toBe(true);
      expect(result.thread).toBeDefined();
      expect(result.thread.vendor_id).toBe(200);
    });

    it('should deny access when thread does not exist', async () => {
      // Mock empty thread query result
      query.mockResolvedValueOnce({ rows: [] });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyThreadAccess(100, 'couple', 999);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Thread not found');
    });

    it('should deny access when thread is inactive', async () => {
      // Mock inactive thread
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          couple_id: 100,
          vendor_id: 200,
          is_active: false
        }]
      });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyThreadAccess(100, 'couple', 1);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Thread is inactive');
    });

    it('should deny access when user is not a participant', async () => {
      // Mock thread with different participants
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          couple_id: 100,
          vendor_id: 200,
          is_active: true
        }]
      });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyThreadAccess(300, 'couple', 1);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('User is not a participant in this thread');
    });

    it('should deny access with invalid user type', async () => {
      const result = await securityControls.verifyThreadAccess(100, 'invalid', 1);

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('Invalid user type');
    });

    it('should deny access with missing parameters', async () => {
      const result = await securityControls.verifyThreadAccess(null, 'couple', 1);

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('Invalid parameters');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyThreadAccess(100, 'couple', 1);

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('system error');
    });
  });

  describe('verifyMessageAccess', () => {
    it('should grant access when user is a participant in the message thread', async () => {
      // Mock message query result
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          thread_id: 10,
          sender_id: 100,
          sender_type: 'couple',
          is_deleted: false,
          couple_id: 100,
          vendor_id: 200,
          is_active: true
        }]
      });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyMessageAccess(100, 'couple', 1);

      expect(result.authorized).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message.thread_id).toBe(10);
    });

    it('should deny access when message does not exist', async () => {
      // Mock empty message query result
      query.mockResolvedValueOnce({ rows: [] });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyMessageAccess(100, 'couple', 999);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Message not found');
    });

    it('should deny access when message is deleted', async () => {
      // Mock deleted message
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          thread_id: 10,
          sender_id: 100,
          sender_type: 'couple',
          is_deleted: true,
          couple_id: 100,
          vendor_id: 200,
          is_active: true
        }]
      });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyMessageAccess(100, 'couple', 1);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Message is deleted');
    });

    it('should deny access when thread is inactive', async () => {
      // Mock message in inactive thread
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          thread_id: 10,
          sender_id: 100,
          sender_type: 'couple',
          is_deleted: false,
          couple_id: 100,
          vendor_id: 200,
          is_active: false
        }]
      });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyMessageAccess(100, 'couple', 1);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Thread is inactive');
    });

    it('should deny access when user is not a participant', async () => {
      // Mock message with different participants
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          thread_id: 10,
          sender_id: 100,
          sender_type: 'couple',
          is_deleted: false,
          couple_id: 100,
          vendor_id: 200,
          is_active: true
        }]
      });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      const result = await securityControls.verifyMessageAccess(300, 'vendor', 1);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('User is not a participant in this thread');
    });
  });

  describe('logAccessAttempt', () => {
    it('should log access attempts when logging is enabled', async () => {
      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      await securityControls.logAccessAttempt(
        100,
        'couple',
        1,
        null,
        'granted',
        'Access granted',
        { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      );

      // Verify that query was called for logging
      expect(query).toHaveBeenCalled();
    });

    it('should not log when logging is disabled', async () => {
      securityControls.setAccessLogging(false);

      await securityControls.logAccessAttempt(
        100,
        'couple',
        1,
        null,
        'granted',
        'Access granted'
      );

      // Verify that query was not called
      expect(query).not.toHaveBeenCalled();
    });

    it('should handle logging errors gracefully without throwing', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Logging failed'));

      // Should not throw
      await expect(
        securityControls.logAccessAttempt(100, 'couple', 1, null, 'granted', 'Test')
      ).resolves.not.toThrow();
    });
  });

  describe('getAccessLogs', () => {
    it('should retrieve access logs for a user', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: 100,
          user_type: 'couple',
          thread_id: 1,
          message_id: null,
          access_result: 'granted',
          reason: 'Access granted',
          metadata: '{"ipAddress":"192.168.1.1"}',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      query.mockResolvedValueOnce({ rows: mockLogs });

      const logs = await securityControls.getAccessLogs(100, 100);

      expect(logs).toHaveLength(1);
      expect(logs[0].user_id).toBe(100);
      expect(logs[0].metadata).toEqual({ ipAddress: '192.168.1.1' });
    });

    it('should filter logs by access result', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await securityControls.getAccessLogs(100, 100, 'denied');

      // Verify query was called with access_result filter
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('access_result = ?'),
        expect.arrayContaining([100, 'denied', 100])
      );
    });
  });

  describe('getSecurityStats', () => {
    it('should return security statistics', async () => {
      const mockStats = [
        { access_result: 'granted', count: 50 },
        { access_result: 'denied', count: 10 },
        { access_result: 'error', count: 2 }
      ];

      query.mockResolvedValueOnce({ rows: mockStats });

      const stats = await securityControls.getSecurityStats(100, 7);

      expect(stats.totalAttempts).toBe(62);
      expect(stats.granted).toBe(50);
      expect(stats.denied).toBe(10);
      expect(stats.error).toBe(2);
      expect(stats.period).toBe('7 days');
    });

    it('should get stats for all users when userId is not provided', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await securityControls.getSecurityStats(null, 7);

      // Verify query was called without user_id filter
      expect(query).toHaveBeenCalledWith(
        expect.not.stringContaining('user_id = ?'),
        expect.any(Array)
      );
    });
  });

  describe('checkSuspiciousActivity', () => {
    it('should detect suspicious activity when threshold is exceeded', async () => {
      query.mockResolvedValueOnce({ rows: [{ denied_count: 15 }] });

      const result = await securityControls.checkSuspiciousActivity(100, 10, 60);

      expect(result.suspicious).toBe(true);
      expect(result.deniedCount).toBe(15);
      expect(result.threshold).toBe(10);
    });

    it('should not flag activity as suspicious when below threshold', async () => {
      query.mockResolvedValueOnce({ rows: [{ denied_count: 5 }] });

      const result = await securityControls.checkSuspiciousActivity(100, 10, 60);

      expect(result.suspicious).toBe(false);
      expect(result.deniedCount).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle string and number user IDs consistently', async () => {
      // Mock thread with string IDs
      query.mockResolvedValueOnce({
        rows: [{
          id: '1',
          couple_id: '100',
          vendor_id: '200',
          is_active: true
        }]
      });

      // Mock access log operations
      query.mockResolvedValue({ rows: [] });

      // Test with number userId
      const result = await securityControls.verifyThreadAccess(100, 'couple', '1');

      expect(result.authorized).toBe(true);
    });

    it('should handle case-insensitive user types', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          couple_id: 100,
          vendor_id: 200,
          is_active: true
        }]
      });

      query.mockResolvedValue({ rows: [] });

      const result1 = await securityControls.verifyThreadAccess(100, 'COUPLE', 1);
      expect(result1.authorized).toBe(true);

      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          couple_id: 100,
          vendor_id: 200,
          is_active: true
        }]
      });

      query.mockResolvedValue({ rows: [] });

      const result2 = await securityControls.verifyThreadAccess(100, 'Couple', 1);
      expect(result2.authorized).toBe(true);
    });

    it('should handle empty metadata gracefully', async () => {
      query.mockResolvedValue({ rows: [] });

      await securityControls.logAccessAttempt(
        100,
        'couple',
        1,
        null,
        'granted',
        'Test'
      );

      // Should not throw
      expect(query).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should allow enabling and disabling access logging', () => {
      securityControls.setAccessLogging(false);
      let config = securityControls.getConfig();
      expect(config.accessLogEnabled).toBe(false);

      securityControls.setAccessLogging(true);
      config = securityControls.getConfig();
      expect(config.accessLogEnabled).toBe(true);
    });

    it('should return current configuration', () => {
      const config = securityControls.getConfig();
      
      expect(config).toHaveProperty('accessLogEnabled');
      expect(config).toHaveProperty('maxAccessLogsPerUser');
      expect(typeof config.accessLogEnabled).toBe('boolean');
      expect(typeof config.maxAccessLogsPerUser).toBe('number');
    });
  });
});
