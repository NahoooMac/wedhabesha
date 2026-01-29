const encryptionService = require('../services/encryptionService');
const { query } = require('../config/database');

// Mock the database
jest.mock('../config/database', () => ({
  query: jest.fn(),
  isPostgreSQL: false
}));

/**
 * Message Encryption Tests
 * Task 14: Security and authorization testing - Message encryption
 * **Validates: Requirements 11.3**
 * 
 * Tests verify that message content is properly encrypted using AES-256-GCM
 * and that encryption/decryption works correctly across different scenarios.
 */
describe('Message Encryption Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear encryption service cache for clean tests
    encryptionService.clearKeyCache();
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt messages correctly', async () => {
      const originalMessage = 'Hello, this is a confidential message!';
      const threadId = 'thread-123';

      // Encrypt the message
      const encryptedContent = await encryptionService.encryptMessage(originalMessage, threadId);
      
      // Verify encrypted content format
      expect(encryptedContent).toBeDefined();
      expect(typeof encryptedContent).toBe('string');
      expect(encryptedContent).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/); // iv:authTag:encryptedData format
      expect(encryptedContent).not.toBe(originalMessage); // Should be different from original

      // Decrypt the message
      const decryptedContent = await encryptionService.decryptMessage(encryptedContent, threadId);
      
      // Verify decryption
      expect(decryptedContent).toBe(originalMessage);
    });

    it('should generate different encrypted content for same message', async () => {
      const message = 'Same message content';
      const threadId = 'thread-456';

      // Encrypt the same message twice
      const encrypted1 = await encryptionService.encryptMessage(message, threadId);
      const encrypted2 = await encryptionService.encryptMessage(message, threadId);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same original message
      const decrypted1 = await encryptionService.decryptMessage(encrypted1, threadId);
      const decrypted2 = await encryptionService.decryptMessage(encrypted2, threadId);

      expect(decrypted1).toBe(message);
      expect(decrypted2).toBe(message);
    });

    it('should use different keys for different threads', async () => {
      const message = 'Cross-thread message';
      const threadId1 = 'thread-111';
      const threadId2 = 'thread-222';

      // Encrypt with first thread
      const encrypted1 = await encryptionService.encryptMessage(message, threadId1);
      
      // Encrypt with second thread
      const encrypted2 = await encryptionService.encryptMessage(message, threadId2);

      // Should be different due to different thread keys
      expect(encrypted1).not.toBe(encrypted2);

      // Should decrypt correctly with their respective thread IDs
      const decrypted1 = await encryptionService.decryptMessage(encrypted1, threadId1);
      const decrypted2 = await encryptionService.decryptMessage(encrypted2, threadId2);

      expect(decrypted1).toBe(message);
      expect(decrypted2).toBe(message);

      // Should fail to decrypt with wrong thread ID
      await expect(
        encryptionService.decryptMessage(encrypted1, threadId2)
      ).rejects.toThrow('Decryption failed');

      await expect(
        encryptionService.decryptMessage(encrypted2, threadId1)
      ).rejects.toThrow('Decryption failed');
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid content for encryption', async () => {
      const threadId = 'thread-123';

      // Test null content
      await expect(
        encryptionService.encryptMessage(null, threadId)
      ).rejects.toThrow('Invalid content: must be a non-empty string');

      // Test undefined content
      await expect(
        encryptionService.encryptMessage(undefined, threadId)
      ).rejects.toThrow('Invalid content: must be a non-empty string');

      // Test empty string
      await expect(
        encryptionService.encryptMessage('', threadId)
      ).rejects.toThrow('Invalid content: must be a non-empty string');

      // Test non-string content
      await expect(
        encryptionService.encryptMessage(123, threadId)
      ).rejects.toThrow('Invalid content: must be a non-empty string');
    });

    it('should reject invalid thread ID for encryption', async () => {
      const message = 'Valid message';

      // Test null thread ID
      await expect(
        encryptionService.encryptMessage(message, null)
      ).rejects.toThrow('Invalid threadId: must be a non-empty string');

      // Test undefined thread ID
      await expect(
        encryptionService.encryptMessage(message, undefined)
      ).rejects.toThrow('Invalid threadId: must be a non-empty string');

      // Test empty thread ID
      await expect(
        encryptionService.encryptMessage(message, '')
      ).rejects.toThrow('Invalid threadId: must be a non-empty string');

      // Test non-string thread ID
      await expect(
        encryptionService.encryptMessage(message, 123)
      ).rejects.toThrow('Invalid threadId: must be a non-empty string');
    });

    it('should reject invalid encrypted content for decryption', async () => {
      const threadId = 'thread-123';

      // Test null encrypted content
      await expect(
        encryptionService.decryptMessage(null, threadId)
      ).rejects.toThrow('Invalid encrypted content: must be a non-empty string');

      // Test malformed encrypted content
      await expect(
        encryptionService.decryptMessage('invalid:format', threadId)
      ).rejects.toThrow('Invalid encrypted content format');

      // Test encrypted content with wrong number of parts
      await expect(
        encryptionService.decryptMessage('part1:part2', threadId)
      ).rejects.toThrow('Invalid encrypted content format');

      // Test encrypted content with invalid hex
      await expect(
        encryptionService.decryptMessage('invalid:hex:data', threadId)
      ).rejects.toThrow('Decryption failed');
    });
  });

  describe('Security Properties', () => {
    it('should use AES-256-GCM encryption', () => {
      const config = encryptionService.getCacheStats();
      
      expect(config.algorithm).toBe('aes-256-gcm');
      expect(config.keyLength).toBe(256); // 256 bits
      expect(config.ivLength).toBe(128); // 128 bits
      expect(config.authTagLength).toBe(128); // 128 bits
    });

    it('should generate deterministic keys for same thread ID', async () => {
      const threadId = 'thread-deterministic';
      
      // Generate key twice for same thread
      const key1 = await encryptionService.generateThreadKey(threadId);
      const key2 = await encryptionService.generateThreadKey(threadId);

      // Should be the same (deterministic)
      expect(key1.equals(key2)).toBe(true);
    });

    it('should generate different keys for different thread IDs', async () => {
      const threadId1 = 'thread-different-1';
      const threadId2 = 'thread-different-2';
      
      const key1 = await encryptionService.generateThreadKey(threadId1);
      const key2 = await encryptionService.generateThreadKey(threadId2);

      // Should be different
      expect(key1.equals(key2)).toBe(false);
    });

    it('should detect tampering with encrypted content', async () => {
      const message = 'Important message';
      const threadId = 'thread-tamper-test';

      const encrypted = await encryptionService.encryptMessage(message, threadId);
      const parts = encrypted.split(':');
      
      // Tamper with the encrypted data
      const tamperedData = parts[2].slice(0, -2) + 'ff'; // Change last byte
      const tamperedEncrypted = `${parts[0]}:${parts[1]}:${tamperedData}`;

      // Should fail to decrypt tampered content
      await expect(
        encryptionService.decryptMessage(tamperedEncrypted, threadId)
      ).rejects.toThrow('Decryption failed');
    });

    it('should detect tampering with authentication tag', async () => {
      const message = 'Authenticated message';
      const threadId = 'thread-auth-test';

      const encrypted = await encryptionService.encryptMessage(message, threadId);
      const parts = encrypted.split(':');
      
      // Tamper with the authentication tag
      const tamperedAuthTag = parts[1].slice(0, -2) + 'aa'; // Change last byte
      const tamperedEncrypted = `${parts[0]}:${tamperedAuthTag}:${parts[2]}`;

      // Should fail to decrypt with tampered auth tag
      await expect(
        encryptionService.decryptMessage(tamperedEncrypted, threadId)
      ).rejects.toThrow('Decryption failed');
    });
  });

  describe('Key Management', () => {
    it('should cache thread keys for performance', async () => {
      const threadId = 'thread-cache-test';
      
      // Clear cache first
      encryptionService.clearKeyCache();
      let stats = encryptionService.getCacheStats();
      expect(stats.cachedKeys).toBe(0);

      // Generate key (should cache it)
      await encryptionService.generateThreadKey(threadId);
      stats = encryptionService.getCacheStats();
      expect(stats.cachedKeys).toBe(1);

      // Generate same key again (should use cache)
      await encryptionService.generateThreadKey(threadId);
      stats = encryptionService.getCacheStats();
      expect(stats.cachedKeys).toBe(1); // Still 1, not 2
    });

    it('should support key rotation', async () => {
      const threadId = 'thread-rotation-test';
      
      // Generate initial key
      const key1 = await encryptionService.generateThreadKey(threadId);
      
      // Rotate key
      const rotationResult = await encryptionService.rotateThreadKey(threadId);
      expect(rotationResult.success).toBe(true);
      expect(rotationResult.threadId).toBe(threadId);
      expect(rotationResult.rotatedAt).toBeDefined();
      
      // Generate key after rotation
      const key2 = await encryptionService.generateThreadKey(threadId);
      
      // Should be different after rotation
      expect(key1.equals(key2)).toBe(false);
    });

    it('should clear key cache when requested', () => {
      // Add some keys to cache
      encryptionService.generateThreadKey('thread-1');
      encryptionService.generateThreadKey('thread-2');
      
      let stats = encryptionService.getCacheStats();
      expect(stats.cachedKeys).toBeGreaterThan(0);
      
      // Clear cache
      encryptionService.clearKeyCache();
      
      stats = encryptionService.getCacheStats();
      expect(stats.cachedKeys).toBe(0);
    });
  });

  describe('Large Content Handling', () => {
    it('should handle large message content', async () => {
      // Create a large message (10KB)
      const largeMessage = 'A'.repeat(10 * 1024);
      const threadId = 'thread-large-content';

      const encrypted = await encryptionService.encryptMessage(largeMessage, threadId);
      const decrypted = await encryptionService.decryptMessage(encrypted, threadId);

      expect(decrypted).toBe(largeMessage);
      expect(decrypted.length).toBe(10 * 1024);
    });

    it('should handle unicode content', async () => {
      const unicodeMessage = '🔒 Encrypted message with émojis and spëcial characters! 中文 العربية';
      const threadId = 'thread-unicode';

      const encrypted = await encryptionService.encryptMessage(unicodeMessage, threadId);
      const decrypted = await encryptionService.decryptMessage(encrypted, threadId);

      expect(decrypted).toBe(unicodeMessage);
    });

    it('should handle newlines and special characters', async () => {
      const specialMessage = 'Line 1\nLine 2\r\nLine 3\tTabbed\0Null byte';
      const threadId = 'thread-special-chars';

      const encrypted = await encryptionService.encryptMessage(specialMessage, threadId);
      const decrypted = await encryptionService.decryptMessage(encrypted, threadId);

      expect(decrypted).toBe(specialMessage);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption service errors gracefully', async () => {
      // Test with extremely long thread ID that might cause issues
      const veryLongThreadId = 'thread-' + 'x'.repeat(10000);
      const message = 'Test message';

      // Should either work or fail gracefully
      try {
        const encrypted = await encryptionService.encryptMessage(message, veryLongThreadId);
        const decrypted = await encryptionService.decryptMessage(encrypted, veryLongThreadId);
        expect(decrypted).toBe(message);
      } catch (error) {
        expect(error.message).toContain('failed');
      }
    });

    it('should provide meaningful error messages', async () => {
      const threadId = 'thread-error-test';

      try {
        await encryptionService.encryptMessage(null, threadId);
      } catch (error) {
        expect(error.message).toContain('Invalid content');
        expect(error.message).not.toContain('undefined');
        expect(error.message).not.toContain('null');
      }

      try {
        await encryptionService.decryptMessage('invalid:format', threadId);
      } catch (error) {
        expect(error.message).toContain('Invalid encrypted content format');
      }
    });
  });

  describe('Performance Considerations', () => {
    it('should encrypt and decrypt within reasonable time limits', async () => {
      const message = 'Performance test message';
      const threadId = 'thread-performance';

      // Test encryption performance
      const encryptStart = Date.now();
      const encrypted = await encryptionService.encryptMessage(message, threadId);
      const encryptTime = Date.now() - encryptStart;

      // Test decryption performance
      const decryptStart = Date.now();
      const decrypted = await encryptionService.decryptMessage(encrypted, threadId);
      const decryptTime = Date.now() - decryptStart;

      // Should complete within reasonable time (adjust thresholds as needed)
      expect(encryptTime).toBeLessThan(100); // 100ms
      expect(decryptTime).toBeLessThan(100); // 100ms
      expect(decrypted).toBe(message);
    });

    it('should handle concurrent encryption operations', async () => {
      const message = 'Concurrent test message';
      const threadId = 'thread-concurrent';

      // Perform multiple concurrent encryptions
      const promises = Array(10).fill().map((_, i) => 
        encryptionService.encryptMessage(`${message} ${i}`, `${threadId}-${i}`)
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(10);
      results.forEach((encrypted, i) => {
        expect(encrypted).toBeDefined();
        expect(typeof encrypted).toBe('string');
      });

      // Verify decryption
      const decryptPromises = results.map((encrypted, i) =>
        encryptionService.decryptMessage(encrypted, `${threadId}-${i}`)
      );

      const decrypted = await Promise.all(decryptPromises);
      decrypted.forEach((content, i) => {
        expect(content).toBe(`${message} ${i}`);
      });
    });
  });
});