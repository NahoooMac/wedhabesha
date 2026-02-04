const { query } = require('../config/database');
const Redis = require('ioredis');

/**
 * Performance Optimizer Service
 * 
 * Implements caching, database optimizations, and performance monitoring
 * for the couple-vendor messaging system.
 * 
 * Requirements: TR-5
 */
class PerformanceOptimizer {
  constructor() {
    this.redis = null;
    this.cacheEnabled = process.env.REDIS_HOST ? true : false;
    this.threadCacheTTL = 30; // 30 seconds for thread list cache
    this.messageCacheTTL = 300; // 5 minutes for message cache
    this.performanceMetrics = new Map();
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection for caching
   */
  async initializeRedis() {
    if (!this.cacheEnabled) {
      console.log('ℹ️ Redis not configured, caching disabled');
      return;
    }

    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('❌ Performance Optimizer Redis connection failed, disabling cache');
            this.cacheEnabled = false;
            return null; // Stop retrying
          }
          return Math.min(times * 50, 1000);
        }
      });

      this.redis.on('error', (err) => {
        console.error('❌ Performance Optimizer Redis Error:', err);
        this.cacheEnabled = false;
        this.redis = null;
      });

      this.redis.on('connect', () => {
        console.log('✅ Performance Optimizer Redis connected');
      });
    } catch (error) {
      console.error('❌ Failed to initialize Performance Optimizer Redis:', error);
      this.cacheEnabled = false;
      this.redis = null;
    }
  }

  /**
   * Generate cache key for thread list
   * @param {number} coupleId - Couple ID
   * @returns {string} Cache key
   */
  getThreadListCacheKey(coupleId) {
    return `threads:couple:${coupleId}`;
  }

  /**
   * Generate cache key for messages
   * @param {string} threadId - Thread ID
   * @param {number} limit - Message limit
   * @param {number} offset - Message offset
   * @returns {string} Cache key
   */
  getMessagesCacheKey(threadId, limit, offset) {
    return `messages:thread:${threadId}:${limit}:${offset}`;
  }

  /**
   * Cache couple threads with TTL
   * @param {number} coupleId - Couple ID
   * @param {Array} threads - Thread data
   * @returns {Promise<boolean>} Success status
   */
  async cacheThreadList(coupleId, threads) {
    if (!this.cacheEnabled || !this.redis) {
      return false;
    }

    try {
      const cacheKey = this.getThreadListCacheKey(coupleId);
      const cacheData = {
        threads,
        cachedAt: new Date().toISOString(),
        ttl: this.threadCacheTTL
      };

      await this.redis.setex(
        cacheKey,
        this.threadCacheTTL,
        JSON.stringify(cacheData)
      );

      console.log(`💾 Cached thread list for couple ${coupleId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to cache thread list:', error);
      return false;
    }
  }

  /**
   * Get cached thread list
   * @param {number} coupleId - Couple ID
   * @returns {Promise<Array|null>} Cached threads or null
   */
  async getCachedThreadList(coupleId) {
    if (!this.cacheEnabled || !this.redis) {
      return null;
    }

    try {
      const cacheKey = this.getThreadListCacheKey(coupleId);
      const cachedData = await this.redis.get(cacheKey);

      if (!cachedData) {
        return null;
      }

      const parsed = JSON.parse(cachedData);
      console.log(`💾 Retrieved cached thread list for couple ${coupleId}`);
      return parsed.threads;
    } catch (error) {
      console.error('❌ Failed to get cached thread list:', error);
      return null;
    }
  }

  /**
   * Cache messages with TTL
   * @param {string} threadId - Thread ID
   * @param {number} limit - Message limit
   * @param {number} offset - Message offset
   * @param {Array} messages - Message data
   * @param {boolean} hasMore - Whether there are more messages
   * @returns {Promise<boolean>} Success status
   */
  async cacheMessages(threadId, limit, offset, messages, hasMore) {
    if (!this.cacheEnabled || !this.redis) {
      return false;
    }

    try {
      const cacheKey = this.getMessagesCacheKey(threadId, limit, offset);
      const cacheData = {
        messages,
        hasMore,
        cachedAt: new Date().toISOString(),
        ttl: this.messageCacheTTL
      };

      await this.redis.setex(
        cacheKey,
        this.messageCacheTTL,
        JSON.stringify(cacheData)
      );

      console.log(`💾 Cached messages for thread ${threadId} (${messages.length} messages)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to cache messages:', error);
      return false;
    }
  }

  /**
   * Get cached messages
   * @param {string} threadId - Thread ID
   * @param {number} limit - Message limit
   * @param {number} offset - Message offset
   * @returns {Promise<Object|null>} Cached messages or null
   */
  async getCachedMessages(threadId, limit, offset) {
    if (!this.cacheEnabled || !this.redis) {
      return null;
    }

    try {
      const cacheKey = this.getMessagesCacheKey(threadId, limit, offset);
      const cachedData = await this.redis.get(cacheKey);

      if (!cachedData) {
        return null;
      }

      const parsed = JSON.parse(cachedData);
      console.log(`💾 Retrieved cached messages for thread ${threadId}`);
      return {
        messages: parsed.messages,
        hasMore: parsed.hasMore
      };
    } catch (error) {
      console.error('❌ Failed to get cached messages:', error);
      return null;
    }
  }

  /**
   * Invalidate thread list cache when threads are modified
   * @param {number} coupleId - Couple ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidateThreadListCache(coupleId) {
    if (!this.cacheEnabled || !this.redis) {
      return false;
    }

    try {
      const cacheKey = this.getThreadListCacheKey(coupleId);
      await this.redis.del(cacheKey);
      console.log(`🗑️ Invalidated thread list cache for couple ${coupleId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to invalidate thread list cache:', error);
      return false;
    }
  }

  /**
   * Invalidate message cache when new messages are sent
   * @param {string} threadId - Thread ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidateMessageCache(threadId) {
    if (!this.cacheEnabled || !this.redis) {
      return false;
    }

    try {
      // Find all cache keys for this thread
      const pattern = `messages:thread:${threadId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️ Invalidated ${keys.length} message cache entries for thread ${threadId}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to invalidate message cache:', error);
      return false;
    }
  }

  /**
   * Start performance monitoring for an operation
   * @param {string} operationName - Name of the operation
   * @returns {string} Unique operation ID
   */
  startPerformanceMonitoring(operationName) {
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.performanceMetrics.set(operationId, {
      name: operationName,
      startTime: Date.now(),
      startMemory: process.memoryUsage()
    });

    return operationId;
  }

  /**
   * End performance monitoring and log results
   * @param {string} operationId - Operation ID from startPerformanceMonitoring
   * @param {Object} additionalData - Additional data to log
   * @returns {Object} Performance metrics
   */
  endPerformanceMonitoring(operationId, additionalData = {}) {
    const metric = this.performanceMetrics.get(operationId);
    
    if (!metric) {
      console.warn(`⚠️ Performance metric not found for operation: ${operationId}`);
      return null;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - metric.startTime;
    
    const result = {
      operationName: metric.name,
      duration: duration,
      memoryUsed: endMemory.heapUsed - metric.startMemory.heapUsed,
      ...additionalData
    };

    // Log performance if operation took longer than 1 second
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${metric.name} took ${duration}ms`, result);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Performance: ${metric.name} completed in ${duration}ms`);
    }

    this.performanceMetrics.delete(operationId);
    return result;
  }

  /**
   * Optimize WebSocket message size by compressing data
   * @param {Object} messageData - Message data to optimize
   * @returns {Object} Optimized message data
   */
  optimizeWebSocketMessage(messageData) {
    // Remove unnecessary fields for WebSocket transmission
    const optimized = {
      id: messageData.id,
      threadId: messageData.threadId,
      senderId: messageData.senderId,
      senderType: messageData.senderType,
      content: messageData.content,
      messageType: messageData.messageType,
      status: messageData.status,
      createdAt: messageData.createdAt
    };

    // Only include attachments if they exist
    if (messageData.attachments && messageData.attachments.length > 0) {
      optimized.attachments = messageData.attachments.map(att => ({
        id: att.id,
        fileName: att.fileName,
        fileType: att.fileType,
        fileSize: att.fileSize,
        url: att.url
      }));
    }

    return optimized;
  }

  /**
   * Create additional database indexes for performance
   * @returns {Promise<boolean>} Success status
   */
  async createPerformanceIndexes() {
    try {
      console.log('🔄 Creating performance optimization indexes...');

      // Composite indexes for common query patterns
      const indexes = [
        // Thread queries with sorting
        `CREATE INDEX IF NOT EXISTS idx_threads_couple_last_message 
         ON message_threads(couple_id, last_message_at DESC)`,
        
        `CREATE INDEX IF NOT EXISTS idx_threads_vendor_last_message 
         ON message_threads(vendor_id, last_message_at DESC)`,
        
        // Message queries with pagination
        `CREATE INDEX IF NOT EXISTS idx_messages_thread_created_desc 
         ON messages(thread_id, created_at DESC, is_deleted)`,
        
        // Unread message counts
        `CREATE INDEX IF NOT EXISTS idx_messages_unread_count 
         ON messages(thread_id, sender_type, is_deleted)`,
        
        // Read status queries
        `CREATE INDEX IF NOT EXISTS idx_read_status_composite 
         ON message_read_status(message_id, user_id)`,
        
        // Connection status queries
        `CREATE INDEX IF NOT EXISTS idx_connection_user_online 
         ON user_connection_status(user_id, is_online)`,
        
        // Search optimization
        `CREATE INDEX IF NOT EXISTS idx_messages_search 
         ON messages(thread_id, is_deleted, created_at DESC)`
      ];

      for (const indexQuery of indexes) {
        try {
          await query(indexQuery);
          console.log(`✅ Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
        } catch (error) {
          // Index might already exist, log but continue
          console.log(`ℹ️ Index creation skipped (likely exists): ${error.message}`);
        }
      }

      console.log('✅ Performance indexes creation completed');
      return true;
    } catch (error) {
      console.error('❌ Failed to create performance indexes:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    if (!this.cacheEnabled || !this.redis) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      return {
        enabled: true,
        keyCount,
        memoryInfo: info,
        connected: this.redis.status === 'ready'
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Clear all caches
   * @returns {Promise<boolean>} Success status
   */
  async clearAllCaches() {
    if (!this.cacheEnabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.flushdb();
      console.log('🗑️ All caches cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      console.log('🔌 Performance optimizer Redis connection closed');
    }
  }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer();

module.exports = performanceOptimizer;