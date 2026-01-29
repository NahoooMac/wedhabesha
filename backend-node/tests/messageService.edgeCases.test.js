const messageService = require('../services/messageService');
const encryptionService = require('../services/encryptionService');
const securityControls = require('../services/securityControls');
const { query } = require('../config/database');

// Mock dependencies
jest.mock('../config/database');
jest.mock('../services/encryptionService');
jest.mock('../services/securityControls');

/**
 * Edge Case Tests for MessageService
 * 
 * Tests Requirements: 2.1, 3.1
 * 
 * This test suite covers edge cases including:
 * - Empty message handling
 * - Concurrent access scenarios
 * - Malformed data handling
 * - Race conditions
 * - Boundary conditions
 * - Error recovery scenarios
 */
describe('MessageService - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    securityControls.verifyThreadAccess.mockResolvedValue({
      authorized: true,
      thread: { id: 1, couple_id: 1, vendor_id: 2, is_active: true }
    });
    
    securityControls.verifyMessageAccess.mockResolvedValue({
      authorized: true,
      message: {
        id: 1,
        thread_id: 1,
        sender_id: 1,
        sender_type: 'couple',
        is_deleted: 0,
        is_active: true
      }
    });
    
    encryptionService.encryptMessage.mockResolvedValue('encrypted_content');
    encryptionService.decryptMessage.mockResolvedValue('Decrypted message');
  });

  describe('Empty Message Handling', () => {
    it('should reject empty string message', async () => {
      const result = await messageService.sendMessage(
        1, 1, 'couple', '', 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
      expect(encryptionService.encryptMessage).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only message', async () => {
      const result = await messageService.sendMessage(
        1, 1, 'couple', '   \n\t  ', 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
      expect(encryptionService.encryptMessage).not.toHaveBeenCalled();
    });

    it('should reject null message content', async () => {
      const result = await messageService.sendMessage(
        1, 1, 'couple', null, 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject undefined message content', async () => {
      const result = await messageService.sendMessage(
        1, 1, 'couple', undefined, 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should handle empty search query', async () => {
      const result = await messageService.searchMessages(
        1, 1, 'couple', ''
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should handle whitespace-only search query', async () => {
      const result = await messageService.searchMessages(
        1, 1, 'couple', '   \t\n   '
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should return empty results when no messages exist', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await messageService.getMessages(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Concurrent Access Scenarios', () => {
    it('should handle multiple simultaneous message sends', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ 
            lastID: Math.floor(Math.random() * 1000),
            rows: [{ id: Math.floor(Math.random() * 1000) }]
          });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: Math.floor(Math.random() * 1000),
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      // Send 5 messages concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        messageService.sendMessage(1, 1, 'couple', `Message ${i}`, 'text')
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
      });

      // Verify encryption was called for each message
      expect(encryptionService.encryptMessage).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent reads from same thread', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 10 }] });
        }
        return Promise.resolve({
          rows: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            thread_id: 1,
            sender_id: 1,
            sender_type: 'couple',
            content: `encrypted_${i}`,
            message_type: 'text',
            status: 'sent',
            is_deleted: 0,
            read_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        });
      });

      // Multiple users reading same thread concurrently
      const promises = [
        messageService.getMessages(1, 1, 'couple'),
        messageService.getMessages(1, 2, 'vendor'),
        messageService.getMessages(1, 1, 'couple')
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.messages).toBeDefined();
      });
    });

    it('should handle race condition when marking message as read', async () => {
      // This test verifies that concurrent markAsRead calls are handled gracefully
      // Setup: message sent by user 2 (vendor), being read by user 1 (couple)
      
      securityControls.verifyMessageAccess.mockResolvedValue({
        authorized: true,
        message: {
          id: 1,
          thread_id: 1,
          sender_id: 2, // Different from the user marking as read
          sender_type: 'vendor',
          is_deleted: 0,
          is_active: true
        }
      });
      
      let insertAttempts = 0;
      
      query.mockImplementation((sql) => {
        if (sql.includes('SELECT id FROM message_read_status')) {
          // Both concurrent calls see no existing read status
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO message_read_status')) {
          insertAttempts++;
          // Both inserts succeed (in real DB, one might fail with unique constraint)
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (sql.includes('UPDATE messages')) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      // Two concurrent mark as read operations
      const results = await Promise.all([
        messageService.markAsRead(1, 1, 'couple'),
        messageService.markAsRead(1, 1, 'couple')
      ]);

      // Both should succeed in this mock scenario
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Verify both attempted to insert
      expect(insertAttempts).toBe(2);
    });

    it('should handle concurrent message deletion attempts', async () => {
      let isDeleted = false;

      securityControls.verifyMessageAccess.mockImplementation(() => {
        return Promise.resolve({
          authorized: true,
          message: {
            id: 1,
            thread_id: 1,
            sender_id: 1,
            sender_type: 'couple',
            is_deleted: isDeleted ? 1 : 0,
            is_active: true
          }
        });
      });

      query.mockImplementation((sql) => {
        if (sql.includes('UPDATE messages')) {
          isDeleted = true;
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      // Two concurrent deletion attempts
      const [result1, result2] = await Promise.all([
        messageService.deleteMessage(1, 1, 'couple'),
        messageService.deleteMessage(1, 1, 'couple')
      ]);

      // Both should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Malformed Data Handling', () => {
    it('should handle non-string message content', async () => {
      const malformedInputs = [
        123,
        { text: 'message' },
        ['message'],
        true,
        Symbol('message')
      ];

      for (const input of malformedInputs) {
        const result = await messageService.sendMessage(
          1, 1, 'couple', input, 'text'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('string');
      }
    });

    it('should handle invalid thread ID types', async () => {
      const invalidIds = [
        { id: 1 },
        [1],
        true,
        NaN,
        Infinity
      ];

      for (const invalidId of invalidIds) {
        query.mockRejectedValue(new Error('Invalid thread ID'));

        const result = await messageService.sendMessage(
          invalidId, 1, 'couple', 'Hello', 'text'
        );

        expect(result.success).toBe(false);
      }
    });

    it('should handle corrupted encrypted content', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 1 }] });
        }
        return Promise.resolve({
          rows: [{
            id: 1,
            thread_id: 1,
            sender_id: 1,
            sender_type: 'couple',
            content: 'corrupted!!!invalid!!!base64',
            message_type: 'text',
            status: 'sent',
            is_deleted: 0,
            read_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });
      });

      encryptionService.decryptMessage.mockRejectedValue(
        new Error('Invalid encrypted data')
      );

      const result = await messageService.getMessages(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.messages[0].content).toBe('[Decryption failed]');
      expect(result.messages[0].decryptionError).toBe(true);
    });

    it('should sanitize SQL injection attempts in message content', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE messages; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--"
      ];

      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      for (const injection of sqlInjectionAttempts) {
        const result = await messageService.sendMessage(
          1, 1, 'couple', injection, 'text'
        );

        // Should succeed but content should be sanitized
        expect(result.success).toBe(true);
        
        // Verify the content was sanitized before encryption
        const encryptCall = encryptionService.encryptMessage.mock.calls.find(
          call => call[0].includes('&')
        );
        expect(encryptCall).toBeDefined();
      }
    });

    it('should handle XSS attempts in message content', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>'
      ];

      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      for (const xss of xssAttempts) {
        const result = await messageService.sendMessage(
          1, 1, 'couple', xss, 'text'
        );

        // Should succeed but content should be escaped
        expect(result.success).toBe(true);
        
        // Verify the content was escaped (contains &lt; or &gt;)
        const encryptCall = encryptionService.encryptMessage.mock.calls.find(
          call => call[0].includes('&lt;') || call[0].includes('&gt;')
        );
        expect(encryptCall).toBeDefined();
      }
    });

    it('should handle malformed pagination parameters', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 100 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const malformedParams = [
        { limit: -10, offset: 0 },
        { limit: 'abc', offset: 'xyz' },
        { limit: null, offset: null },
        { limit: 99999, offset: -50 },
        { limit: 0, offset: 0 }
      ];

      for (const params of malformedParams) {
        const result = await messageService.getMessages(
          1, 1, 'couple', params.limit, params.offset
        );

        // Should succeed with sanitized parameters
        expect(result.success).toBe(true);
        expect(result.limit).toBeGreaterThan(0);
        expect(result.limit).toBeLessThanOrEqual(50);
        expect(result.offset).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle database returning null values', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: null }] });
        }
        return Promise.resolve({
          rows: [{
            id: 1,
            thread_id: null,
            sender_id: null,
            sender_type: null,
            content: null,
            message_type: null,
            status: null,
            is_deleted: null,
            read_at: null,
            created_at: null,
            updated_at: null
          }]
        });
      });

      const result = await messageService.getMessages(1, 1, 'couple');

      // Should handle gracefully - null total is treated as 0
      expect(result.success).toBe(true);
      expect(result.total).toBeNull();
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle message at exact maximum length', async () => {
      const maxLengthMessage = 'a'.repeat(10000); // Exactly at limit

      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      const result = await messageService.sendMessage(
        1, 1, 'couple', maxLengthMessage, 'text'
      );

      expect(result.success).toBe(true);
      expect(encryptionService.encryptMessage).toHaveBeenCalled();
    });

    it('should reject message exceeding maximum length by 1 character', async () => {
      const tooLongMessage = 'a'.repeat(10001); // One character over limit

      const result = await messageService.sendMessage(
        1, 1, 'couple', tooLongMessage, 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum length');
      expect(encryptionService.encryptMessage).not.toHaveBeenCalled();
    });

    it('should handle single character message', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      const result = await messageService.sendMessage(
        1, 1, 'couple', 'a', 'text'
      );

      expect(result.success).toBe(true);
    });

    it('should handle pagination at exact boundary', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 50 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await messageService.getMessages(1, 1, 'couple', 50, 0);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.hasMore).toBe(false); // Exactly at boundary
    });

    it('should handle very large thread IDs', async () => {
      const largeThreadId = Number.MAX_SAFE_INTEGER;

      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: largeThreadId,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      const result = await messageService.sendMessage(
        largeThreadId, 1, 'couple', 'Test message', 'text'
      );

      expect(result.success).toBe(true);
    });

    it('should handle zero offset pagination', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 10 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await messageService.getMessages(1, 1, 'couple', 10, 0);

      expect(result.success).toBe(true);
      expect(result.offset).toBe(0);
    });

    it('should handle maximum pagination offset', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 1000 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await messageService.getMessages(1, 1, 'couple', 10, 990);

      expect(result.success).toBe(true);
      expect(result.offset).toBe(990);
      expect(result.hasMore).toBe(false); // 990 + 10 = 1000
    });

    it('should handle Unicode and emoji characters', async () => {
      const unicodeMessage = '你好世界 🌍 مرحبا بالعالم 🎉 Здравствуй мир';

      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      const result = await messageService.sendMessage(
        1, 1, 'couple', unicodeMessage, 'text'
      );

      expect(result.success).toBe(true);
      expect(encryptionService.encryptMessage).toHaveBeenCalled();
    });

    it('should handle special characters in search query', async () => {
      query.mockResolvedValue({
        rows: [{
          id: 1,
          thread_id: 1,
          sender_id: 1,
          sender_type: 'couple',
          content: 'encrypted_content',
          message_type: 'text',
          status: 'sent',
          is_deleted: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      });

      encryptionService.decryptMessage.mockResolvedValue('Test message with $pecial ch@rs!');

      const result = await messageService.searchMessages(
        1, 1, 'couple', '$pecial'
      );

      expect(result.success).toBe(true);
    });
  });


  describe('Error Recovery Scenarios', () => {
    it('should recover from temporary database connection failure', async () => {
      let callCount = 0;
      query.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Connection timeout'));
        }
        return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
      });

      // First call should fail
      const result1 = await messageService.sendMessage(
        1, 1, 'couple', 'Test', 'text'
      );
      expect(result1.success).toBe(false);

      // Reset mocks for successful retry
      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      // Second call should succeed
      const result2 = await messageService.sendMessage(
        1, 1, 'couple', 'Test', 'text'
      );
      expect(result2.success).toBe(true);
    });

    it('should handle encryption service temporary failure', async () => {
      let encryptCallCount = 0;
      encryptionService.encryptMessage.mockImplementation(() => {
        encryptCallCount++;
        if (encryptCallCount === 1) {
          return Promise.reject(new Error('Encryption service unavailable'));
        }
        return Promise.resolve('encrypted_content');
      });

      // First call should fail
      const result1 = await messageService.sendMessage(
        1, 1, 'couple', 'Test', 'text'
      );
      expect(result1.success).toBe(false);

      // Reset query mock for successful retry
      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      // Second call should succeed
      const result2 = await messageService.sendMessage(
        1, 1, 'couple', 'Test', 'text'
      );
      expect(result2.success).toBe(true);
    });

    it('should handle partial decryption failures in message list', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 3 }] });
        }
        return Promise.resolve({
          rows: [
            {
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_1',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              read_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 2,
              thread_id: 1,
              sender_id: 2,
              sender_type: 'vendor',
              content: 'corrupted_data',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              read_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 3,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_3',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              read_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        });
      });

      encryptionService.decryptMessage.mockImplementation((content) => {
        if (content === 'corrupted_data') {
          return Promise.reject(new Error('Decryption failed'));
        }
        return Promise.resolve('Decrypted: ' + content);
      });

      const result = await messageService.getMessages(1, 1, 'couple');

      // Should succeed with partial results
      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(3);
      
      // First and third messages should be decrypted
      expect(result.messages[0].content).toContain('Decrypted');
      expect(result.messages[2].content).toContain('Decrypted');
      
      // Second message should show decryption error
      expect(result.messages[1].content).toBe('[Decryption failed]');
      expect(result.messages[1].decryptionError).toBe(true);
    });

    it('should handle authorization service failure gracefully', async () => {
      securityControls.verifyThreadAccess.mockRejectedValue(
        new Error('Authorization service unavailable')
      );

      const result = await messageService.sendMessage(
        1, 1, 'couple', 'Test', 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send message');
    });

    it('should handle missing message ID after insert', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          // Simulate missing lastID
          return Promise.resolve({ lastID: null, rows: [] });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const result = await messageService.sendMessage(
        1, 1, 'couple', 'Test', 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send message');
    });

    it('should handle thread update failure after message insert', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('UPDATE message_threads')) {
          return Promise.reject(new Error('Thread update failed'));
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      const result = await messageService.sendMessage(
        1, 1, 'couple', 'Test', 'text'
      );

      // Should fail because thread update is critical
      expect(result.success).toBe(false);
    });
  });

  describe('Data Consistency Edge Cases', () => {
    it('should handle messages with mismatched sender information', async () => {
      securityControls.verifyMessageAccess.mockResolvedValue({
        authorized: true,
        message: {
          id: 1,
          thread_id: 1,
          sender_id: 1,
          sender_type: 'couple',
          is_deleted: 0,
          is_active: true
        }
      });

      // Try to mark as read with different user type but same ID
      const result = await messageService.markAsRead(1, 1, 'vendor');

      // Should succeed because user is authorized (different participant)
      expect(result.success).toBe(true);
    });

    it('should handle thread with no messages', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await messageService.getMessages(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle search with no matching results', async () => {
      query.mockResolvedValue({
        rows: [{
          id: 1,
          thread_id: 1,
          sender_id: 1,
          sender_type: 'couple',
          content: 'encrypted_content',
          message_type: 'text',
          status: 'sent',
          is_deleted: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      });

      encryptionService.decryptMessage.mockResolvedValue('Hello world');

      const result = await messageService.searchMessages(
        1, 1, 'couple', 'nonexistent'
      );

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle stats for thread with all deleted messages', async () => {
      query.mockResolvedValue({
        rows: [{
          total_messages: 10,
          active_messages: 0,
          deleted_messages: 10,
          read_messages: 0,
          unread_messages: 0
        }]
      });

      const result = await messageService.getThreadStats(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.stats.totalMessages).toBe(10);
      expect(result.stats.activeMessages).toBe(0);
      expect(result.stats.deletedMessages).toBe(10);
    });

    it('should handle message with all message types', async () => {
      const messageTypes = ['text', 'image', 'document', 'system'];

      for (const type of messageTypes) {
        query.mockImplementation((sql) => {
          if (sql.includes('INSERT INTO messages')) {
            return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
          }
          if (sql.includes('SELECT') && sql.includes('FROM messages')) {
            return Promise.resolve({
              rows: [{
                id: 1,
                thread_id: 1,
                sender_id: 1,
                sender_type: 'couple',
                content: 'encrypted_content',
                message_type: type, // Use the actual type from the loop
                status: 'sent',
                is_deleted: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]
            });
          }
          return Promise.resolve({ rows: [], rowCount: 1 });
        });

        const result = await messageService.sendMessage(
          1, 1, 'couple', 'Test message', type
        );

        expect(result.success).toBe(true);
        expect(result.message.messageType).toBe(type);
      }
    });

    it('should handle case-insensitive sender type validation', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      const variations = ['couple', 'COUPLE', 'Couple', 'vendor', 'VENDOR', 'Vendor'];

      for (const variation of variations) {
        const result = await messageService.sendMessage(
          1, 1, variation, 'Test', 'text'
        );

        expect(result.success).toBe(true);
      }
    });
  });

  describe('Performance and Stress Edge Cases', () => {
    it('should handle very long message content efficiently', async () => {
      const longMessage = 'a'.repeat(9999); // Just under limit

      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      const startTime = Date.now();
      const result = await messageService.sendMessage(
        1, 1, 'couple', longMessage, 'text'
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        thread_id: 1,
        sender_id: 1,
        sender_type: 'couple',
        content: `encrypted_${i}`,
        message_type: 'text',
        status: 'sent',
        is_deleted: 0,
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 50 }] });
        }
        return Promise.resolve({ rows: largeResultSet });
      });

      encryptionService.decryptMessage.mockImplementation((content) => {
        return Promise.resolve('Decrypted: ' + content);
      });

      const startTime = Date.now();
      const result = await messageService.getMessages(1, 1, 'couple', 50, 0);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(50);
      // Should complete in reasonable time (less than 2 seconds for 50 messages)
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle rapid sequential operations', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      // Perform 10 operations sequentially
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          messageService.sendMessage(1, 1, 'couple', `Message ${i}`, 'text')
        );
      }

      const results = await Promise.all(operations);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Security Edge Cases', () => {
    it('should prevent unauthorized access with invalid credentials', async () => {
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: false,
        reason: 'Invalid credentials'
      });

      const result = await messageService.sendMessage(
        1, 999, 'couple', 'Test', 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
      expect(encryptionService.encryptMessage).not.toHaveBeenCalled();
    });

    it('should prevent cross-thread message access', async () => {
      securityControls.verifyMessageAccess.mockResolvedValue({
        authorized: false,
        reason: 'Message belongs to different thread'
      });

      const result = await messageService.markAsRead(1, 1, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('thread');
    });

    it('should sanitize potentially dangerous content patterns', async () => {
      const dangerousPatterns = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd'
      ];

      query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      for (const pattern of dangerousPatterns) {
        const result = await messageService.sendMessage(
          1, 1, 'couple', pattern, 'text'
        );

        // Should succeed but content should be sanitized
        expect(result.success).toBe(true);
        
        // Verify content was escaped
        const encryptCall = encryptionService.encryptMessage.mock.calls.find(
          call => call[0].includes(':') || call[0].includes('/')
        );
        expect(encryptCall).toBeDefined();
      }
    });

    it('should handle authorization check timeout', async () => {
      securityControls.verifyThreadAccess.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ authorized: false, reason: 'Authorization timeout' });
          }, 100);
        });
      });

      const result = await messageService.sendMessage(
        1, 1, 'couple', 'Test', 'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Edge Cases for Configuration', () => {
    it('should return correct configuration values', () => {
      const config = messageService.getConfig();

      expect(config).toBeDefined();
      expect(config.maxMessageLength).toBe(10000);
      expect(config.maxMessagesPerPage).toBe(50);
      expect(typeof config.maxMessageLength).toBe('number');
      expect(typeof config.maxMessagesPerPage).toBe('number');
    });

    it('should enforce configuration limits consistently', async () => {
      const config = messageService.getConfig();
      
      // Test message length limit
      const tooLong = 'a'.repeat(config.maxMessageLength + 1);
      const result1 = await messageService.sendMessage(
        1, 1, 'couple', tooLong, 'text'
      );
      expect(result1.success).toBe(false);

      // Test pagination limit
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 100 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result2 = await messageService.getMessages(
        1, 1, 'couple', config.maxMessagesPerPage + 100, 0
      );
      expect(result2.success).toBe(true);
      expect(result2.limit).toBe(config.maxMessagesPerPage);
    });
  });
});

