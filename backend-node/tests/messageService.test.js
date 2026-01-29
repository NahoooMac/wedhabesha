const messageService = require('../services/messageService');
const encryptionService = require('../services/encryptionService');
const securityControls = require('../services/securityControls');
const { query } = require('../config/database');

// Mock dependencies
jest.mock('../config/database');
jest.mock('../services/encryptionService');
jest.mock('../services/securityControls');

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateMessageContent', () => {
    it('should validate and sanitize valid message content', () => {
      const content = 'Hello, this is a test message!';
      const result = messageService.validateMessageContent(content);

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject empty message content', () => {
      const result = messageService.validateMessageContent('');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject whitespace-only message content', () => {
      const result = messageService.validateMessageContent('   \n\t  ');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject null or undefined content', () => {
      const resultNull = messageService.validateMessageContent(null);
      const resultUndefined = messageService.validateMessageContent(undefined);

      expect(resultNull.valid).toBe(false);
      expect(resultUndefined.valid).toBe(false);
    });

    it('should reject non-string content', () => {
      const result = messageService.validateMessageContent(12345);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('string');
    });

    it('should reject content exceeding maximum length', () => {
      const longContent = 'a'.repeat(10001); // Exceeds 10000 char limit
      const result = messageService.validateMessageContent(longContent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum length');
    });

    it('should sanitize HTML content to prevent XSS', () => {
      const maliciousContent = '<script>alert("XSS")</script>Hello';
      const result = messageService.validateMessageContent(maliciousContent);

      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toContain('&lt;script&gt;');
    });

    it('should trim whitespace from content', () => {
      const content = '  Hello World  ';
      const result = messageService.validateMessageContent(content);

      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toMatch(/^\s+|\s+$/);
    });
  });

  describe('validateMessageType', () => {
    it('should accept valid message types', () => {
      const validTypes = ['text', 'image', 'document', 'system'];

      validTypes.forEach(type => {
        const result = messageService.validateMessageType(type);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid message types', () => {
      const invalidTypes = ['video', 'audio', 'unknown', ''];

      invalidTypes.forEach(type => {
        const result = messageService.validateMessageType(type);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject null or undefined message type', () => {
      const resultNull = messageService.validateMessageType(null);
      const resultUndefined = messageService.validateMessageType(undefined);

      expect(resultNull.valid).toBe(false);
      expect(resultUndefined.valid).toBe(false);
    });
  });

  describe('validateSenderType', () => {
    it('should accept valid sender types', () => {
      const validTypes = ['couple', 'vendor', 'COUPLE', 'VENDOR'];

      validTypes.forEach(type => {
        const result = messageService.validateSenderType(type);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid sender types', () => {
      const invalidTypes = ['admin', 'guest', 'user', ''];

      invalidTypes.forEach(type => {
        const result = messageService.validateSenderType(type);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should be case-insensitive', () => {
      const result1 = messageService.validateSenderType('COUPLE');
      const result2 = messageService.validateSenderType('couple');
      const result3 = messageService.validateSenderType('Couple');

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(true);
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      // Setup default mocks
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: true,
        thread: { id: 1, couple_id: 1, vendor_id: 2, is_active: true }
      });

      encryptionService.encryptMessage.mockResolvedValue('encrypted_content_123');
      encryptionService.decryptMessage.mockResolvedValue('Hello, test message!');

      query.mockImplementation((sql, params) => {
        if (sql.includes('INSERT INTO messages')) {
          return Promise.resolve({ lastID: 123, rows: [{ id: 123 }] });
        }
        if (sql.includes('UPDATE message_threads')) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes('SELECT') && sql.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{
              id: 123,
              thread_id: 1,
              sender_id: 1,
              sender_type: 'couple',
              content: 'encrypted_content_123',
              message_type: 'text',
              status: 'sent',
              is_deleted: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
    });

    it('should successfully send a valid message', async () => {
      const result = await messageService.sendMessage(
        1, // threadId
        1, // senderId
        'couple', // senderType
        'Hello, test message!', // content
        'text' // messageType
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message.content).toBe('Hello, test message!');
      expect(result.message.senderId).toBe(1);
      expect(result.message.senderType).toBe('couple');
      expect(result.error).toBeUndefined();

      // Verify encryption was called
      expect(encryptionService.encryptMessage).toHaveBeenCalledWith(
        expect.any(String),
        '1'
      );

      // Verify security check was performed
      expect(securityControls.verifyThreadAccess).toHaveBeenCalledWith(
        1,
        'couple',
        1
      );
    });

    it('should reject message with missing required parameters', async () => {
      const result = await messageService.sendMessage(null, null, null, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject message with invalid sender type', async () => {
      const result = await messageService.sendMessage(
        1,
        1,
        'invalid_type',
        'Hello',
        'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid sender type');
    });

    it('should reject message with invalid message type', async () => {
      const result = await messageService.sendMessage(
        1,
        1,
        'couple',
        'Hello',
        'invalid_message_type'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message type');
    });

    it('should reject message with empty content', async () => {
      const result = await messageService.sendMessage(
        1,
        1,
        'couple',
        '   ',
        'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject message when user is not authorized', async () => {
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: false,
        reason: 'User is not a participant in this thread'
      });

      const result = await messageService.sendMessage(
        1,
        999,
        'couple',
        'Hello',
        'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('participant');
    });

    it('should handle encryption errors gracefully', async () => {
      encryptionService.encryptMessage.mockRejectedValue(
        new Error('Encryption failed')
      );

      const result = await messageService.sendMessage(
        1,
        1,
        'couple',
        'Hello',
        'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send message');
    });

    it('should handle database errors gracefully', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));

      const result = await messageService.sendMessage(
        1,
        1,
        'couple',
        'Hello',
        'text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send message');
    });

    it('should update thread last_message_at timestamp', async () => {
      await messageService.sendMessage(1, 1, 'couple', 'Hello', 'text');

      // Verify UPDATE query was called
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE message_threads'),
        expect.arrayContaining([1])
      );
    });
  });

  describe('getMessages', () => {
    beforeEach(() => {
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: true,
        thread: { id: 1, couple_id: 1, vendor_id: 2, is_active: true }
      });

      encryptionService.decryptMessage.mockImplementation((content) => {
        return Promise.resolve('Decrypted: ' + content);
      });
    });

    it('should retrieve messages from a thread', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 5 }] });
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
              status: 'read',
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
              content: 'encrypted_2',
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

      const result = await messageService.getMessages(1, 1, 'couple', 10, 0);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('should reject request with missing parameters', async () => {
      const result = await messageService.getMessages(null, null, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject request when user is not authorized', async () => {
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: false,
        reason: 'Unauthorized'
      });

      const result = await messageService.getMessages(1, 999, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should handle pagination correctly', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 100 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await messageService.getMessages(1, 1, 'couple', 20, 40);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(40);
      expect(result.hasMore).toBe(true); // 40 + 20 < 100
    });

    it('should enforce maximum page size limit', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 10 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await messageService.getMessages(1, 1, 'couple', 1000, 0);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(50); // Should be capped at maxMessagesPerPage
    });

    it('should handle decryption errors gracefully', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: 1 }] });
        }
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
            read_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });
      });

      encryptionService.decryptMessage.mockRejectedValue(
        new Error('Decryption failed')
      );

      const result = await messageService.getMessages(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('[Decryption failed]');
      expect(result.messages[0].decryptionError).toBe(true);
    });
  });

  describe('markAsRead', () => {
    beforeEach(() => {
      securityControls.verifyMessageAccess.mockResolvedValue({
        authorized: true,
        message: {
          id: 1,
          thread_id: 1,
          sender_id: 2,
          sender_type: 'vendor',
          is_deleted: 0,
          is_active: true
        }
      });

      query.mockResolvedValue({ rows: [], rowCount: 1 });
    });

    it('should mark a message as read', async () => {
      const result = await messageService.markAsRead(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.alreadyRead).toBe(false);

      // Verify INSERT and UPDATE queries were called
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO message_read_status'),
        expect.any(Array)
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        expect.arrayContaining([1])
      );
    });

    it('should reject request with missing parameters', async () => {
      const result = await messageService.markAsRead(null, null, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject request when user is not authorized', async () => {
      securityControls.verifyMessageAccess.mockResolvedValue({
        authorized: false,
        reason: 'Unauthorized'
      });

      const result = await messageService.markAsRead(1, 999, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should prevent marking own message as read', async () => {
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

      const result = await messageService.markAsRead(1, 1, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('own message');
    });

    it('should handle already read messages', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT id FROM message_read_status')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const result = await messageService.markAsRead(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.alreadyRead).toBe(true);
    });
  });

  describe('deleteMessage', () => {
    beforeEach(() => {
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

      query.mockResolvedValue({ rows: [], rowCount: 1 });
    });

    it('should delete a message', async () => {
      const result = await messageService.deleteMessage(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.alreadyDeleted).toBe(false);

      // Verify UPDATE query was called
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        expect.arrayContaining([1])
      );
    });

    it('should reject request with missing parameters', async () => {
      const result = await messageService.deleteMessage(null, null, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject request when user is not authorized', async () => {
      securityControls.verifyMessageAccess.mockResolvedValue({
        authorized: false,
        reason: 'Unauthorized'
      });

      const result = await messageService.deleteMessage(1, 999, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should prevent deleting messages from other users', async () => {
      securityControls.verifyMessageAccess.mockResolvedValue({
        authorized: true,
        message: {
          id: 1,
          thread_id: 1,
          sender_id: 2,
          sender_type: 'vendor',
          is_deleted: 0,
          is_active: true
        }
      });

      const result = await messageService.deleteMessage(1, 1, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('sender can delete');
    });

    it('should handle already deleted messages', async () => {
      securityControls.verifyMessageAccess.mockResolvedValue({
        authorized: true,
        message: {
          id: 1,
          thread_id: 1,
          sender_id: 1,
          sender_type: 'couple',
          is_deleted: 1,
          is_active: true
        }
      });

      const result = await messageService.deleteMessage(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.alreadyDeleted).toBe(true);
    });
  });

  describe('searchMessages', () => {
    beforeEach(() => {
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: true,
        thread: { id: 1, couple_id: 1, vendor_id: 2, is_active: true }
      });

      query.mockResolvedValue({
        rows: [
          {
            id: 1,
            thread_id: 1,
            sender_id: 1,
            sender_type: 'couple',
            content: 'encrypted_hello',
            message_type: 'text',
            status: 'sent',
            is_deleted: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            thread_id: 1,
            sender_id: 2,
            sender_type: 'vendor',
            content: 'encrypted_world',
            message_type: 'text',
            status: 'sent',
            is_deleted: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      });

      encryptionService.decryptMessage.mockImplementation((content) => {
        if (content === 'encrypted_hello') return Promise.resolve('Hello there!');
        if (content === 'encrypted_world') return Promise.resolve('World of testing');
        return Promise.resolve('Other message');
      });
    });

    it('should search and find matching messages', async () => {
      const result = await messageService.searchMessages(
        1,
        1,
        'couple',
        'hello'
      );

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('Hello');
      expect(result.query).toBe('hello');
    });

    it('should be case-insensitive', async () => {
      const result = await messageService.searchMessages(
        1,
        1,
        'couple',
        'HELLO'
      );

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
    });

    it('should reject search with missing parameters', async () => {
      const result = await messageService.searchMessages(null, null, null, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject search with empty query', async () => {
      const result = await messageService.searchMessages(1, 1, 'couple', '   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject search when user is not authorized', async () => {
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: false,
        reason: 'Unauthorized'
      });

      const result = await messageService.searchMessages(
        1,
        999,
        'couple',
        'test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should handle decryption errors during search', async () => {
      encryptionService.decryptMessage.mockRejectedValue(
        new Error('Decryption failed')
      );

      const result = await messageService.searchMessages(
        1,
        1,
        'couple',
        'hello'
      );

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(0); // Failed messages are skipped
    });

    it('should respect search result limit', async () => {
      // Create many matching messages
      const manyMessages = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        thread_id: 1,
        sender_id: 1,
        sender_type: 'couple',
        content: `encrypted_${i}`,
        message_type: 'text',
        status: 'sent',
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      query.mockResolvedValue({ rows: manyMessages });
      encryptionService.decryptMessage.mockResolvedValue('test message');

      const result = await messageService.searchMessages(
        1,
        1,
        'couple',
        'test',
        10
      );

      expect(result.success).toBe(true);
      expect(result.messages.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getThreadStats', () => {
    beforeEach(() => {
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: true,
        thread: { id: 1, couple_id: 1, vendor_id: 2, is_active: true }
      });

      query.mockResolvedValue({
        rows: [{
          total_messages: 10,
          active_messages: 8,
          deleted_messages: 2,
          read_messages: 5,
          unread_messages: 3
        }]
      });
    });

    it('should retrieve thread statistics', async () => {
      const result = await messageService.getThreadStats(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalMessages).toBe(10);
      expect(result.stats.activeMessages).toBe(8);
      expect(result.stats.deletedMessages).toBe(2);
      expect(result.stats.readMessages).toBe(5);
      expect(result.stats.unreadMessages).toBe(3);
    });

    it('should reject request when user is not authorized', async () => {
      securityControls.verifyThreadAccess.mockResolvedValue({
        authorized: false,
        reason: 'Unauthorized'
      });

      const result = await messageService.getThreadStats(1, 999, 'couple');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should handle empty threads', async () => {
      query.mockResolvedValue({
        rows: [{
          total_messages: 0,
          active_messages: 0,
          deleted_messages: 0,
          read_messages: 0,
          unread_messages: 0
        }]
      });

      const result = await messageService.getThreadStats(1, 1, 'couple');

      expect(result.success).toBe(true);
      expect(result.stats.totalMessages).toBe(0);
    });
  });

  describe('getConfig', () => {
    it('should return service configuration', () => {
      const config = messageService.getConfig();

      expect(config).toBeDefined();
      expect(config.maxMessageLength).toBe(10000);
      expect(config.maxMessagesPerPage).toBe(50);
    });
  });
});
