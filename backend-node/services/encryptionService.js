const crypto = require('crypto');

/**
 * EncryptionService - Handles message content encryption and decryption
 * 
 * Implements AES-256-GCM encryption for secure message storage
 * Manages encryption keys per conversation thread
 * Supports key rotation for enhanced security
 */
class EncryptionService {
  constructor() {
    // AES-256-GCM configuration
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits for GCM
    this.authTagLength = 16; // 128 bits authentication tag
    this.saltLength = 64; // Salt for key derivation
    
    // In-memory cache for thread keys (in production, use Redis or secure key store)
    this.keyCache = new Map();
    
    // Master key from environment (should be securely stored in production)
    this.masterKey = this.initializeMasterKey();
    
    console.log('🔐 Encryption service initialized with AES-256-GCM');
  }

  /**
   * Initialize or retrieve the master encryption key
   * In production, this should be stored in a secure key management service
   */
  initializeMasterKey() {
    const envKey = process.env.ENCRYPTION_MASTER_KEY;
    
    if (envKey && envKey.length === 64) {
      // Use provided master key (hex string)
      return Buffer.from(envKey, 'hex');
    }
    
    // Generate a new master key for development
    const newKey = crypto.randomBytes(32);
    console.warn('⚠️  Using generated master key. Set ENCRYPTION_MASTER_KEY in production!');
    console.log('Generated key (hex):', newKey.toString('hex'));
    
    return newKey;
  }

  /**
   * Generate a unique encryption key for a conversation thread
   * Uses PBKDF2 to derive a key from the master key and thread ID
   * 
   * @param {string} threadId - Unique identifier for the conversation thread
   * @returns {Promise<Buffer>} - Derived encryption key
   */
  async generateThreadKey(threadId) {
    try {
      if (!threadId || typeof threadId !== 'string') {
        throw new Error('Invalid threadId: must be a non-empty string');
      }

      // Check cache first
      if (this.keyCache.has(threadId)) {
        return this.keyCache.get(threadId);
      }

      // Generate a deterministic salt from threadId
      const salt = crypto.createHash('sha256')
        .update(threadId)
        .digest();

      // Derive key using PBKDF2
      const threadKey = await new Promise((resolve, reject) => {
        crypto.pbkdf2(
          this.masterKey,
          salt,
          100000, // iterations
          this.keyLength,
          'sha256',
          (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
          }
        );
      });

      // Cache the key
      this.keyCache.set(threadId, threadKey);

      console.log('🔑 Generated encryption key for thread:', threadId);
      return threadKey;
      
    } catch (error) {
      console.error('❌ Failed to generate thread key:', error);
      throw new Error(`Key generation failed: ${error.message}`);
    }
  }

  /**
   * Encrypt message content using AES-256-GCM
   * 
   * @param {string} content - Plain text message content to encrypt (can be empty for attachment-only messages)
   * @param {string} threadId - Thread identifier for key derivation
   * @returns {Promise<string>} - Encrypted content in format: iv:authTag:encryptedData (hex encoded)
   */
  async encryptMessage(content, threadId) {
    try {
      // Validate inputs - content can be empty string for attachment-only messages
      if (typeof content !== 'string') {
        throw new Error('Invalid content: must be a string (can be empty for attachment-only messages)');
      }
      
      if (!threadId || typeof threadId !== 'string') {
        throw new Error('Invalid threadId: must be a non-empty string');
      }

      // Get or generate thread key
      const key = await this.generateThreadKey(threadId);

      // Generate random IV (Initialization Vector)
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt the content (even if empty)
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV, auth tag, and encrypted data
      // Format: iv:authTag:encryptedData (all hex encoded)
      const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

      console.log('🔒 Message encrypted for thread:', threadId, content ? '(with content)' : '(attachment-only)');
      return result;
      
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt message content using AES-256-GCM
   * 
   * @param {string} encryptedContent - Encrypted content in format: iv:authTag:encryptedData
   * @param {string} threadId - Thread identifier for key derivation
   * @returns {Promise<string>} - Decrypted plain text content
   */
  async decryptMessage(encryptedContent, threadId) {
    try {
      // Validate inputs
      if (!encryptedContent || typeof encryptedContent !== 'string') {
        throw new Error('Invalid encrypted content: must be a non-empty string');
      }
      
      if (!threadId || typeof threadId !== 'string') {
        throw new Error('Invalid threadId: must be a non-empty string');
      }

      // Parse the encrypted content
      const parts = encryptedContent.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted content format');
      }

      const [ivHex, authTagHex, encryptedData] = parts;

      // Convert from hex to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Get thread key
      const key = await this.generateThreadKey(threadId);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the content
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      console.log('🔓 Message decrypted for thread:', threadId, decrypted ? '(with content)' : '(attachment-only)');
      return decrypted;
      
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Rotate encryption key for a thread
   * This should be called periodically (e.g., every 90 days) for security
   * 
   * Note: In production, this would need to:
   * 1. Re-encrypt all existing messages with the new key
   * 2. Store key rotation history
   * 3. Handle gradual migration
   * 
   * @param {string} threadId - Thread identifier
   * @returns {Promise<void>}
   */
  async rotateThreadKey(threadId) {
    try {
      if (!threadId || typeof threadId !== 'string') {
        throw new Error('Invalid threadId: must be a non-empty string');
      }

      // Remove old key from cache
      this.keyCache.delete(threadId);

      // Generate new key (with timestamp to make it unique)
      const timestampedThreadId = `${threadId}_${Date.now()}`;
      const newKey = await this.generateThreadKey(timestampedThreadId);

      // Store new key with original threadId
      this.keyCache.set(threadId, newKey);

      console.log('🔄 Rotated encryption key for thread:', threadId);
      
      // In production, you would:
      // 1. Fetch all messages for this thread
      // 2. Decrypt with old key
      // 3. Re-encrypt with new key
      // 4. Update database
      // 5. Log rotation event for audit
      
      return {
        success: true,
        threadId: threadId,
        rotatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Key rotation failed:', error);
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  /**
   * Clear key cache (useful for testing or memory management)
   */
  clearKeyCache() {
    const size = this.keyCache.size;
    this.keyCache.clear();
    console.log(`🧹 Cleared ${size} keys from cache`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedKeys: this.keyCache.size,
      algorithm: this.algorithm,
      keyLength: this.keyLength * 8, // in bits
      ivLength: this.ivLength * 8,
      authTagLength: this.authTagLength * 8
    };
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;
