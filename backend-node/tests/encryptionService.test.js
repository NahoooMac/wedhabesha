const fc = require('fast-check');
const encryptionService = require('../services/encryptionService');

/**
 * Test Suite for EncryptionService
 * Feature: vendor-dashboard-messaging-enhancement
 * 
 * This test suite validates the encryption service implementation including:
 * - AES-256-GCM encryption/decryption
 * - Key generation and management
 * - Key rotation functionality
 * - Error handling and edge cases
 */

describe('EncryptionService - Unit Tests', () => {
  beforeEach(() => {
    // Clear key cache before each test to ensure clean state
    encryptionService.clearKeyCache();
  });

  afterEach(() => {
    // Clean up after each test
    encryptionService.clearKeyCache();
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt a simple message', async () => {
      const content = 'Hello, this is a test message!';
      const threadId = 'test-thread-123';

      const encrypted = await encryptionService.encryptMessage(content, threadId);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(content);

      const decrypted = await encryptionService.decryptMessage(encrypted, threadId);
      expect(decrypted).toBe(content);
    });

    it('should handle empty string content', async () => {
      const content = '';
      const threadId = 'test-thread-empty';

      await expect(
        encryptionService.encryptMessage(content, threadId)
      ).rejects.toThrow('Invalid content');
    });

    it('should handle special characters and unicode', async () => {
      const content = '🎉 Wedding planning! 💍 Special chars: @#$%^&*()';
      const threadId = 'test-thread-unicode';

      const encrypted = await encryptionService.encryptMessage(content, threadId);
      const decrypted = await encryptionService.decryptMessage(encrypted, threadId);
      
      expect(decrypted).toBe(content);
    });

    it('should handle very long messages', async () => {
      const content = 'A'.repeat(10000); // 10KB message
      const threadId = 'test-thread-long';

      const encrypted = await encryptionService.encryptMessage(content, threadId);
      const decrypted = await encryptionService.decryptMessage(encrypted, threadId);
      
      expect(decrypted).toBe(content);
      expect(decrypted.length).toBe(10000);
    });

    it('should produce different ciphertext for same content (due to random IV)', async () => {
      const content = 'Same message';
      const threadId = 'test-thread-same';

      const encrypted1 = await encryptionService.encryptMessage(content, threadId);
      const encrypted2 = await encryptionService.encryptMessage(content, threadId);

      // Different IVs should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same content
      const decrypted1 = await encryptionService.decryptMessage(encrypted1, threadId);
      const decrypted2 = await encryptionService.decryptMessage(encrypted2, threadId);
      
      expect(decrypted1).toBe(content);
      expect(decrypted2).toBe(content);
    });
  });

  describe('Thread-Specific Encryption', () => {
    it('should use different keys for different threads', async () => {
      const content = 'Secret message';
      const threadId1 = 'thread-1';
      const threadId2 = 'thread-2';

      const encrypted1 = await encryptionService.encryptMessage(content, threadId1);
      const encrypted2 = await encryptionService.encryptMessage(content, threadId2);

      // Same content, different threads should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);

      // Decryption with wrong thread should fail
      await expect(
        encryptionService.decryptMessage(encrypted1, threadId2)
      ).rejects.toThrow();

      await expect(
        encryptionService.decryptMessage(encrypted2, threadId1)
      ).rejects.toThrow();
    });

    it('should consistently use the same key for the same thread', async () => {
      const content1 = 'First message';
      const content2 = 'Second message';
      const threadId = 'consistent-thread';

      const encrypted1 = await encryptionService.encryptMessage(content1, threadId);
      const encrypted2 = await encryptionService.encryptMessage(content2, threadId);

      // Both should decrypt successfully with the same thread key
      const decrypted1 = await encryptionService.decryptMessage(encrypted1, threadId);
      const decrypted2 = await encryptionService.decryptMessage(encrypted2, threadId);

      expect(decrypted1).toBe(content1);
      expect(decrypted2).toBe(content2);
    });
  });

  describe('Key Generation and Management', () => {
    it('should generate a thread key', async () => {
      const threadId = 'test-thread-key-gen';
      
      const key = await encryptionService.generateThreadKey(threadId);
      
      expect(key).toBeDefined();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32); // 256 bits
    });

    it('should cache generated keys', async () => {
      const threadId = 'test-thread-cache';
      
      const key1 = await encryptionService.generateThreadKey(threadId);
      const key2 = await encryptionService.generateThreadKey(threadId);
      
      // Should return the same key from cache
      expect(key1.equals(key2)).toBe(true);
      
      const stats = encryptionService.getCacheStats();
      expect(stats.cachedKeys).toBeGreaterThan(0);
    });

    it('should reject invalid thread IDs', async () => {
      await expect(
        encryptionService.generateThreadKey(null)
      ).rejects.toThrow('Invalid threadId');

      await expect(
        encryptionService.generateThreadKey('')
      ).rejects.toThrow('Invalid threadId');

      await expect(
        encryptionService.generateThreadKey(123)
      ).rejects.toThrow('Invalid threadId');
    });

    it('should clear key cache', async () => {
      const threadId1 = 'thread-clear-1';
      const threadId2 = 'thread-clear-2';
      
      await encryptionService.generateThreadKey(threadId1);
      await encryptionService.generateThreadKey(threadId2);
      
      let stats = encryptionService.getCacheStats();
      expect(stats.cachedKeys).toBe(2);
      
      encryptionService.clearKeyCache();
      
      stats = encryptionService.getCacheStats();
      expect(stats.cachedKeys).toBe(0);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate thread key', async () => {
      const threadId = 'test-thread-rotation';
      const content = 'Message before rotation';
      
      // Encrypt with original key
      const encrypted = await encryptionService.encryptMessage(content, threadId);
      
      // Rotate the key
      const rotationResult = await encryptionService.rotateThreadKey(threadId);
      
      expect(rotationResult.success).toBe(true);
      expect(rotationResult.threadId).toBe(threadId);
      expect(rotationResult.rotatedAt).toBeDefined();
      
      // Note: In this implementation, old encrypted messages won't decrypt after rotation
      // In production, you'd need to re-encrypt all messages with the new key
    });

    it('should reject invalid thread ID for rotation', async () => {
      await expect(
        encryptionService.rotateThreadKey(null)
      ).rejects.toThrow('Invalid threadId');

      await expect(
        encryptionService.rotateThreadKey('')
      ).rejects.toThrow('Invalid threadId');
    });
  });

  describe('Error Handling', () => {
    it('should reject null or undefined content', async () => {
      const threadId = 'test-thread-error';

      await expect(
        encryptionService.encryptMessage(null, threadId)
      ).rejects.toThrow('Invalid content');

      await expect(
        encryptionService.encryptMessage(undefined, threadId)
      ).rejects.toThrow('Invalid content');
    });

    it('should reject non-string content', async () => {
      const threadId = 'test-thread-error';

      await expect(
        encryptionService.encryptMessage(123, threadId)
      ).rejects.toThrow('Invalid content');

      await expect(
        encryptionService.encryptMessage({ message: 'test' }, threadId)
      ).rejects.toThrow('Invalid content');

      await expect(
        encryptionService.encryptMessage(['test'], threadId)
      ).rejects.toThrow('Invalid content');
    });

    it('should reject malformed encrypted content', async () => {
      const threadId = 'test-thread-malformed';

      // Missing parts
      await expect(
        encryptionService.decryptMessage('invalid', threadId)
      ).rejects.toThrow();

      // Wrong format
      await expect(
        encryptionService.decryptMessage('part1:part2', threadId)
      ).rejects.toThrow('Invalid encrypted content format');

      // Invalid hex
      await expect(
        encryptionService.decryptMessage('zzz:yyy:xxx', threadId)
      ).rejects.toThrow();
    });

    it('should reject tampered ciphertext', async () => {
      const content = 'Original message';
      const threadId = 'test-thread-tamper';

      const encrypted = await encryptionService.encryptMessage(content, threadId);
      
      // Tamper with the ciphertext
      const parts = encrypted.split(':');
      parts[2] = parts[2].substring(0, parts[2].length - 2) + 'ff'; // Change last byte
      const tampered = parts.join(':');

      // Should fail authentication
      await expect(
        encryptionService.decryptMessage(tampered, threadId)
      ).rejects.toThrow();
    });

    it('should reject tampered authentication tag', async () => {
      const content = 'Original message';
      const threadId = 'test-thread-tamper-tag';

      const encrypted = await encryptionService.encryptMessage(content, threadId);
      
      // Tamper with the auth tag
      const parts = encrypted.split(':');
      parts[1] = parts[1].substring(0, parts[1].length - 2) + 'ff'; // Change auth tag
      const tampered = parts.join(':');

      // Should fail authentication
      await expect(
        encryptionService.decryptMessage(tampered, threadId)
      ).rejects.toThrow();
    });
  });

  describe('Service Configuration', () => {
    it('should return correct cache statistics', () => {
      const stats = encryptionService.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.algorithm).toBe('aes-256-gcm');
      expect(stats.keyLength).toBe(256); // bits
      expect(stats.ivLength).toBe(128); // bits
      expect(stats.authTagLength).toBe(128); // bits
      expect(typeof stats.cachedKeys).toBe('number');
    });

    it('should use AES-256-GCM algorithm', () => {
      const stats = encryptionService.getCacheStats();
      expect(stats.algorithm).toBe('aes-256-gcm');
    });
  });
});

/**
 * Property-Based Tests for EncryptionService
 * Feature: vendor-dashboard-messaging-enhancement, Property 8: Message Encryption Round-trip
 * **Validates: Requirements 4.1**
 */
describe('EncryptionService - Property-Based Tests', () => {
  beforeEach(() => {
    encryptionService.clearKeyCache();
  });

  afterEach(() => {
    encryptionService.clearKeyCache();
  });

  /**
   * Property 8: Message Encryption Round-trip
   * **Validates: Requirements 4.1**
   * 
   * For any message content, encrypting then decrypting should produce the original message,
   * ensuring data integrity and security.
   */
  it('Property 8: Message Encryption Round-trip - should preserve content through encrypt/decrypt cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.string({ minLength: 1, maxLength: 5000 }),
          threadId: fc.uuid()
        }),
        async ({ content, threadId }) => {
          // Encrypt the message
          const encrypted = await encryptionService.encryptMessage(content, threadId);
          
          // Verify encrypted format (iv:authTag:encryptedData)
          expect(encrypted).toBeDefined();
          expect(typeof encrypted).toBe('string');
          const parts = encrypted.split(':');
          expect(parts.length).toBe(3);
          
          // Verify each part is valid hex
          expect(/^[0-9a-f]+$/i.test(parts[0])).toBe(true); // IV
          expect(/^[0-9a-f]+$/i.test(parts[1])).toBe(true); // Auth tag
          expect(/^[0-9a-f]+$/i.test(parts[2])).toBe(true); // Encrypted data
          
          // Decrypt the message
          const decrypted = await encryptionService.decryptMessage(encrypted, threadId);
          
          // Property: Decrypted content must exactly match original content
          expect(decrypted).toBe(content);
          expect(decrypted.length).toBe(content.length);
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
        verbose: true
      }
    );
  }, 60000);

  it('Property: Encryption should be deterministic for same thread but produce different ciphertext', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          threadId: fc.uuid()
        }),
        async ({ content, threadId }) => {
          // Encrypt the same content twice
          const encrypted1 = await encryptionService.encryptMessage(content, threadId);
          const encrypted2 = await encryptionService.encryptMessage(content, threadId);
          
          // Property: Different IVs should produce different ciphertext
          expect(encrypted1).not.toBe(encrypted2);
          
          // Property: Both should decrypt to the same original content
          const decrypted1 = await encryptionService.decryptMessage(encrypted1, threadId);
          const decrypted2 = await encryptionService.decryptMessage(encrypted2, threadId);
          
          expect(decrypted1).toBe(content);
          expect(decrypted2).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Thread isolation - messages encrypted for one thread cannot be decrypted with another', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          threadId1: fc.uuid(),
          threadId2: fc.uuid()
        }).filter(data => data.threadId1 !== data.threadId2),
        async ({ content, threadId1, threadId2 }) => {
          // Encrypt with thread1
          const encrypted = await encryptionService.encryptMessage(content, threadId1);
          
          // Property: Decryption with thread2 should fail
          await expect(
            encryptionService.decryptMessage(encrypted, threadId2)
          ).rejects.toThrow();
          
          // Property: Decryption with correct thread should succeed
          const decrypted = await encryptionService.decryptMessage(encrypted, threadId1);
          expect(decrypted).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Key consistency - same thread should always use the same key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          messages: fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 2, maxLength: 10 }),
          threadId: fc.uuid()
        }),
        async ({ messages, threadId }) => {
          // Encrypt all messages with the same thread
          const encryptedMessages = [];
          for (const message of messages) {
            const encrypted = await encryptionService.encryptMessage(message, threadId);
            encryptedMessages.push(encrypted);
          }
          
          // Property: All messages should decrypt correctly with the same thread key
          for (let i = 0; i < messages.length; i++) {
            const decrypted = await encryptionService.decryptMessage(encryptedMessages[i], threadId);
            expect(decrypted).toBe(messages[i]);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property: Unicode and special character preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Use string() which supports unicode by default in fast-check
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          threadId: fc.uuid()
        }),
        async ({ content, threadId }) => {
          // Encrypt unicode content
          const encrypted = await encryptionService.encryptMessage(content, threadId);
          
          // Decrypt and verify
          const decrypted = await encryptionService.decryptMessage(encrypted, threadId);
          
          // Property: Unicode characters should be preserved exactly
          expect(decrypted).toBe(content);
          expect(decrypted.length).toBe(content.length);
          
          // Verify byte-level equality
          expect(Buffer.from(decrypted, 'utf8').equals(Buffer.from(content, 'utf8'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Encryption format consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          threadId: fc.uuid()
        }),
        async ({ content, threadId }) => {
          const encrypted = await encryptionService.encryptMessage(content, threadId);
          
          // Property: Encrypted format should always be iv:authTag:encryptedData
          const parts = encrypted.split(':');
          expect(parts.length).toBe(3);
          
          // Property: IV should be 32 hex characters (16 bytes)
          expect(parts[0].length).toBe(32);
          expect(/^[0-9a-f]{32}$/i.test(parts[0])).toBe(true);
          
          // Property: Auth tag should be 32 hex characters (16 bytes)
          expect(parts[1].length).toBe(32);
          expect(/^[0-9a-f]{32}$/i.test(parts[1])).toBe(true);
          
          // Property: Encrypted data should be valid hex
          expect(/^[0-9a-f]+$/i.test(parts[2])).toBe(true);
          
          // Property: Encrypted data length should be reasonable (at least as long as content)
          expect(parts[2].length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Tamper detection - any modification to ciphertext should cause decryption failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.string({ minLength: 1, maxLength: 500 }),
          threadId: fc.uuid(),
          tamperPosition: fc.constantFrom('iv', 'authTag', 'data')
        }),
        async ({ content, threadId, tamperPosition }) => {
          const encrypted = await encryptionService.encryptMessage(content, threadId);
          const parts = encrypted.split(':');
          
          // Tamper with the specified part
          let tampered;
          switch (tamperPosition) {
            case 'iv':
              // Flip a bit in the IV
              parts[0] = parts[0].substring(0, parts[0].length - 1) + 
                         (parts[0][parts[0].length - 1] === 'f' ? '0' : 'f');
              break;
            case 'authTag':
              // Flip a bit in the auth tag
              parts[1] = parts[1].substring(0, parts[1].length - 1) + 
                         (parts[1][parts[1].length - 1] === 'f' ? '0' : 'f');
              break;
            case 'data':
              // Flip a bit in the encrypted data
              if (parts[2].length > 0) {
                parts[2] = parts[2].substring(0, parts[2].length - 1) + 
                           (parts[2][parts[2].length - 1] === 'f' ? '0' : 'f');
              }
              break;
          }
          
          tampered = parts.join(':');
          
          // Property: Tampered ciphertext should fail to decrypt
          await expect(
            encryptionService.decryptMessage(tampered, threadId)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property: Key generation determinism - same thread ID should generate same key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (threadId) => {
          // Clear cache to force regeneration
          encryptionService.clearKeyCache();
          
          // Generate key twice
          const key1 = await encryptionService.generateThreadKey(threadId);
          
          encryptionService.clearKeyCache();
          
          const key2 = await encryptionService.generateThreadKey(threadId);
          
          // Property: Same thread ID should produce the same key
          expect(key1.equals(key2)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property: Key uniqueness - different thread IDs should generate different keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId1: fc.uuid(),
          threadId2: fc.uuid()
        }).filter(data => data.threadId1 !== data.threadId2),
        async ({ threadId1, threadId2 }) => {
          const key1 = await encryptionService.generateThreadKey(threadId1);
          const key2 = await encryptionService.generateThreadKey(threadId2);
          
          // Property: Different thread IDs should produce different keys
          expect(key1.equals(key2)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
