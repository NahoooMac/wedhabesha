const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const performanceOptimizer = require('./performanceOptimizer');

class WebSocketServer {
  constructor() {
    this.io = null;
    this.redis = null;
    this.connections = new Map(); // userId -> socket.id mapping
  }

  /**
   * Initialize Socket.io server with HTTP server
   * @param {Object} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    // Initialize Redis for pub/sub and session management (optional)
    try {
      if (process.env.REDIS_HOST || process.env.REDIS_URL) {
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          retryStrategy: (times) => {
            if (times > 3) {
              console.log('❌ Redis connection failed, continuing without Redis');
              return null; // Stop retrying
            }
            const delay = Math.min(times * 50, 1000);
            return delay;
          }
        });

        this.redis.on('error', (err) => {
          console.error('❌ WebSocket Redis Error:', err);
          this.redis = null; // Disable Redis on error
        });

        this.redis.on('connect', () => {
          console.log('✅ WebSocket Redis connected');
        });
      } else {
        console.log('ℹ️ Redis not configured for WebSocket - continuing without Redis');
      }
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket Redis:', error);
      this.redis = null;
    }

    // Initialize Socket.io with CORS configuration
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userType = decoded.userType || 'couple'; // 'couple' or 'vendor'
        
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.io socket instance
   */
  async handleConnection(socket) {
    const userId = socket.userId;
    const userType = socket.userType;

    // Store connection mapping
    this.connections.set(userId, socket.id);

    // Update user online status in Redis
    await this.updateUserStatus(userId, userType, true, socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle disconnection
    socket.on('disconnect', async () => {
      this.connections.delete(userId);
      
      // Update user status based on user type
      if (userType === 'couple') {
        // Get couple ID and update status
        try {
          const { query } = require('../config/database');
          const coupleResult = await query(
            'SELECT id FROM couples WHERE user_id = ?',
            [userId]
          );
          
          if (coupleResult.rows.length > 0) {
            const coupleId = coupleResult.rows[0].id;
            const dashboardIntegration = require('./dashboardIntegration');
            await dashboardIntegration.updateCoupleOnlineStatus(coupleId, false);
          }
        } catch (error) {
          console.error('Error updating couple offline status:', error);
        }
      } else if (userType === 'vendor') {
        // Get vendor ID and update status
        try {
          const { query } = require('../config/database');
          const vendorResult = await query(
            'SELECT id FROM vendors WHERE user_id = ?',
            [userId]
          );
          
          if (vendorResult.rows.length > 0) {
            const vendorId = vendorResult.rows[0].id;
            const dashboardIntegration = require('./dashboardIntegration');
            await dashboardIntegration.updateVendorOnlineStatus(vendorId, false);
          }
        } catch (error) {
          console.error('Error updating vendor offline status:', error);
        }
      }
      
      await this.updateUserStatus(userId, userType, false, null);
    });

    // Handle joining thread rooms
    socket.on('join:thread', async (threadId) => {
      try {
        // Verify user has access to this thread
        const { query } = require('../config/database');
        let hasAccess = false;

        if (userType === 'couple') {
          const coupleResult = await query(
            'SELECT id FROM couples WHERE user_id = ?',
            [userId]
          );
          
          if (coupleResult.rows.length > 0) {
            const coupleId = coupleResult.rows[0].id;
            const threadResult = await query(
              'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?',
              [threadId, coupleId]
            );
            hasAccess = threadResult.rows.length > 0;
          }
        } else if (userType === 'vendor') {
          const vendorResult = await query(
            'SELECT id FROM vendors WHERE user_id = ?',
            [userId]
          );
          
          if (vendorResult.rows.length > 0) {
            const vendorId = vendorResult.rows[0].id;
            const threadResult = await query(
              'SELECT id FROM message_threads WHERE id = ? AND vendor_id = ?',
              [threadId, vendorId]
            );
            hasAccess = threadResult.rows.length > 0;
          }
        }

        if (hasAccess) {
          socket.join(`thread:${threadId}`);
          socket.emit('thread:joined', { threadId, success: true });
        } else {
          socket.emit('thread:join:error', { 
            threadId, 
            error: 'Access denied to this thread' 
          });
        }
      } catch (error) {
        console.error('Error joining thread:', error);
        socket.emit('thread:join:error', { 
          threadId, 
          error: 'Failed to join thread' 
        });
      }
    });

    // Handle leaving thread rooms
    socket.on('leave:thread', async (threadId) => {
      socket.leave(`thread:${threadId}`);
      socket.emit('thread:left', { threadId, success: true });
    });

    // Handle couple joining all their thread rooms
    socket.on('couple:join', async (data) => {
      try {
        const { coupleId } = data;
        
        // Verify the user is authorized to join as this couple
        if (userType !== 'couple') {
          socket.emit('error', { message: 'Unauthorized: Not a couple user' });
          return;
        }

        // Get couple ID from user
        const dashboardIntegration = require('./dashboardIntegration');
        const coupleResult = await dashboardIntegration.getCoupleProfile(coupleId);
        
        if (!coupleResult.success) {
          socket.emit('error', { message: 'Couple not found' });
          return;
        }

        // Get all threads for this couple
        const threadsResult = await dashboardIntegration.getCoupleThreadsWithVendors(coupleId);
        
        if (threadsResult.success) {
          // Join all thread rooms
          threadsResult.threads.forEach(thread => {
            socket.join(`thread:${thread.id}`);
          });

          // Update couple online status
          await dashboardIntegration.updateCoupleOnlineStatus(coupleId, true);

          // Emit success confirmation with thread list
          socket.emit('couple:joined', {
            success: true,
            threads: threadsResult.threads,
            coupleId: coupleId
          });
        } else {
          socket.emit('error', { message: 'Failed to load threads' });
        }
      } catch (error) {
        console.error('Error in couple:join:', error);
        socket.emit('error', { message: 'Failed to join couple rooms' });
      }
    });

    // Handle couple message sending
    socket.on('couple:message:send', async (data) => {
      try {
        const { threadId, content, messageType = 'text', attachments = [] } = data;
        
        // Verify the user is authorized to send as couple
        if (userType !== 'couple') {
          socket.emit('couple:message:error', {
            threadId,
            error: 'Unauthorized: Not a couple user'
          });
          return;
        }

        // Validate message content
        if (!content || content.trim().length === 0) {
          socket.emit('couple:message:error', {
            threadId,
            error: 'Message content cannot be empty'
          });
          return;
        }

        // Get couple ID from user
        const { query } = require('../config/database');
        const coupleResult = await query(
          'SELECT id FROM couples WHERE user_id = ?',
          [userId]
        );

        if (coupleResult.rows.length === 0) {
          socket.emit('couple:message:error', {
            threadId,
            error: 'Couple not found'
          });
          return;
        }

        const coupleId = coupleResult.rows[0].id;

        // Verify couple has access to this thread
        const threadResult = await query(
          'SELECT id, vendor_id FROM message_threads WHERE id = ? AND couple_id = ?',
          [threadId, coupleId]
        );

        if (threadResult.rows.length === 0) {
          socket.emit('couple:message:error', {
            threadId,
            error: 'Thread not found or access denied'
          });
          return;
        }

        // Send the message using MessageService
        const messageService = require('./messageService');
        const messageResult = await messageService.sendMessage(
          threadId,
          coupleId,
          'couple',
          content,
          messageType,
          attachments
        );

        if (messageResult.success) {
          const message = messageResult.message;
          
          // Optimize message data for WebSocket transmission
          const optimizedMessage = performanceOptimizer.optimizeWebSocketMessage({
            id: message.id,
            threadId: threadId,
            senderId: coupleId,
            senderType: 'couple',
            content: content,
            messageType: messageType,
            attachments: attachments,
            status: 'sent',
            createdAt: message.created_at,
            timestamp: new Date().toISOString()
          });
          
          // Broadcast to all participants in the thread room
          this.io.to(`thread:${threadId}`).emit('message:received', optimizedMessage);

          // Send confirmation to sender
          socket.emit('couple:message:sent', {
            threadId,
            messageId: message.id,
            success: true,
            timestamp: message.created_at
          });

          // Update thread's last message time
          await query(
            'UPDATE message_threads SET last_message_at = datetime(\'now\') WHERE id = ?',
            [threadId]
          );

        } else {
          socket.emit('couple:message:error', {
            threadId,
            error: messageResult.error || 'Failed to send message'
          });
        }
      } catch (error) {
        console.error('Error sending couple message:', error);
        socket.emit('couple:message:error', {
          threadId: data.threadId,
          error: 'Internal server error'
        });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', async (data) => {
      const { threadId } = data;
      socket.to(`thread:${threadId}`).emit('typing:indicator', {
        threadId,
        userId,
        userType,
        isTyping: true
      });
    });

    socket.on('typing:stop', async (data) => {
      const { threadId } = data;
      socket.to(`thread:${threadId}`).emit('typing:indicator', {
        threadId,
        userId,
        userType,
        isTyping: false
      });
    });

    // Handle couple typing indicators
    socket.on('couple:typing:start', async (data) => {
      try {
        const { threadId } = data;
        
        // Verify the user is authorized
        if (userType !== 'couple') {
          return;
        }

        // Get couple ID from user
        const { query } = require('../config/database');
        const coupleResult = await query(
          'SELECT id FROM couples WHERE user_id = ?',
          [userId]
        );

        if (coupleResult.rows.length === 0) {
          return;
        }

        const coupleId = coupleResult.rows[0].id;

        // Verify couple has access to this thread
        const threadResult = await query(
          'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?',
          [threadId, coupleId]
        );

        if (threadResult.rows.length === 0) {
          return;
        }

        // Broadcast typing indicator to other participants in the thread
        socket.to(`thread:${threadId}`).emit('typing:indicator', {
          threadId,
          userId: coupleId,
          userType: 'couple',
          isTyping: true
        });
      } catch (error) {
        console.error('Error in couple:typing:start:', error);
      }
    });

    socket.on('couple:typing:stop', async (data) => {
      try {
        const { threadId } = data;
        
        // Verify the user is authorized
        if (userType !== 'couple') {
          return;
        }

        // Get couple ID from user
        const { query } = require('../config/database');
        const coupleResult = await query(
          'SELECT id FROM couples WHERE user_id = ?',
          [userId]
        );

        if (coupleResult.rows.length === 0) {
          return;
        }

        const coupleId = coupleResult.rows[0].id;

        // Verify couple has access to this thread
        const threadResult = await query(
          'SELECT id FROM message_threads WHERE id = ? AND couple_id = ?',
          [threadId, coupleId]
        );

        if (threadResult.rows.length === 0) {
          return;
        }

        // Broadcast typing stop indicator to other participants in the thread
        socket.to(`thread:${threadId}`).emit('typing:indicator', {
          threadId,
          userId: coupleId,
          userType: 'couple',
          isTyping: false
        });
      } catch (error) {
        console.error('Error in couple:typing:stop:', error);
      }
    });

    // Handle generic message sending (for both couples and vendors)
    socket.on('message:send', async (message, callback) => {
      try {
        const { threadId, content, messageType = 'text', attachments = [] } = message;
        
        // Validate message content
        if (!content || content.trim().length === 0) {
          if (callback) callback({ success: false, error: 'Message content cannot be empty' });
          return;
        }

        // Get user's entity ID (couple or vendor)
        const { query } = require('../config/database');
        let entityId, entityType;

        if (userType === 'couple') {
          const coupleResult = await query(
            'SELECT id FROM couples WHERE user_id = ?',
            [userId]
          );
          if (coupleResult.rows.length === 0) {
            if (callback) callback({ success: false, error: 'Couple not found' });
            return;
          }
          entityId = coupleResult.rows[0].id;
          entityType = 'couple';
        } else if (userType === 'vendor') {
          const vendorResult = await query(
            'SELECT id FROM vendors WHERE user_id = ?',
            [userId]
          );
          if (vendorResult.rows.length === 0) {
            if (callback) callback({ success: false, error: 'Vendor not found' });
            return;
          }
          entityId = vendorResult.rows[0].id;
          entityType = 'vendor';
        } else {
          if (callback) callback({ success: false, error: 'Invalid user type' });
          return;
        }

        // Verify access to thread
        const threadResult = await query(
          `SELECT id FROM message_threads WHERE id = ? AND (
            ${entityType === 'couple' ? 'couple_id' : 'vendor_id'} = ?
          )`,
          [threadId, entityId]
        );

        if (threadResult.rows.length === 0) {
          if (callback) callback({ success: false, error: 'Thread not found or access denied' });
          return;
        }

        // Send the message using MessageService
        const messageService = require('./messageService');
        const messageResult = await messageService.sendMessage(
          threadId,
          entityId,
          entityType,
          content,
          messageType,
          attachments
        );

        if (messageResult.success) {
          const savedMessage = messageResult.message;
          
          // Optimize message data for WebSocket transmission
          const optimizedMessage = performanceOptimizer.optimizeWebSocketMessage({
            id: savedMessage.id,
            threadId: threadId,
            senderId: entityId,
            senderType: entityType,
            content: content,
            messageType: messageType,
            attachments: attachments,
            status: 'sent',
            createdAt: savedMessage.created_at,
            timestamp: new Date().toISOString()
          });
          
          // Broadcast to all participants in the thread room
          this.io.to(`thread:${threadId}`).emit('message:received', optimizedMessage);
          this.io.to(`thread:${threadId}`).emit('message:new', { message: optimizedMessage });

          // Send success callback
          if (callback) callback({ 
            success: true, 
            messageId: savedMessage.id,
            timestamp: savedMessage.created_at
          });

          // Update thread's last message time
          await query(
            'UPDATE message_threads SET last_message_at = datetime(\'now\') WHERE id = ?',
            [threadId]
          );

        } else {
          if (callback) callback({ 
            success: false, 
            error: messageResult.error || 'Failed to send message' 
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        if (callback) callback({ 
          success: false, 
          error: 'Internal server error' 
        });
      }
    });

    // Handle message acknowledgment and read receipts
    socket.on('message:ack', async (data) => {
      const { messageId } = data;
      // Message acknowledged by user
    });

    // Handle message delivered status
    socket.on('message:delivered', async (data) => {
      try {
        const { messageId, threadId } = data;
        
        // Update delivery status in database
        const { query } = require('../config/database');
        
        await query(
          `UPDATE messages 
           SET delivery_status = 'delivered', 
               delivered_at = datetime('now'),
               updated_at = datetime('now')
           WHERE id = ? AND delivery_status = 'sent'`,
          [messageId]
        );

        // Notify sender that message was delivered
        socket.to(`thread:${threadId}`).emit('message:status:update', {
          messageId,
          threadId,
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        });

        console.log(`📬 Message ${messageId} marked as delivered`);
      } catch (error) {
        console.error('Error updating message delivery status:', error);
      }
    });

    // Handle message read status updates
    socket.on('message:read', async (data) => {
      try {
        const { messageId, threadId } = data;
        
        // Update read status in database
        const { query } = require('../config/database');
        
        // Check if read status already exists
        const existingRead = await query(
          'SELECT id FROM message_read_status WHERE message_id = ? AND user_id = ?',
          [messageId, userId]
        );

        if (existingRead.rows.length === 0) {
          // Insert new read status
          await query(
            'INSERT INTO message_read_status (message_id, user_id, read_at) VALUES (?, ?, datetime(\'now\'))',
            [messageId, userId]
          );

          // Update message delivery status to 'read'
          await query(
            `UPDATE messages 
             SET delivery_status = 'read', 
                 read_at = datetime('now'),
                 updated_at = datetime('now')
             WHERE id = ?`,
            [messageId]
          );

          // Notify other participants that message was read
          socket.to(`thread:${threadId}`).emit('message:status:update', {
            messageId,
            threadId,
            status: 'read',
            readBy: userId,
            userType: userType,
            readAt: new Date().toISOString()
          });

          console.log(`✅ Message ${messageId} marked as read by user ${userId}`);
        }
      } catch (error) {
        console.error('Error updating message read status:', error);
      }
    });

    // Handle error events
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  }

  /**
   * Update user online status in Redis
   * @param {string} userId - User ID
   * @param {string} userType - User type ('couple' or 'vendor')
   * @param {boolean} isOnline - Online status
   * @param {string|null} socketId - Socket ID
   */
  async updateUserStatus(userId, userType, isOnline, socketId) {
    try {
      const statusKey = `user:status:${userId}`;
      const statusData = {
        userId,
        userType,
        isOnline,
        socketId,
        lastSeen: new Date().toISOString()
      };

      await this.redis.setex(statusKey, 3600, JSON.stringify(statusData)); // 1 hour TTL

      // Publish status change event
      await this.redis.publish('user:status:change', JSON.stringify(statusData));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  /**
   * Get Socket.io instance
   * @returns {Object} Socket.io server instance
   */
  getIO() {
    if (!this.io) {
      throw new Error('WebSocket server not initialized');
    }
    return this.io;
  }

  /**
   * Get Redis instance
   * @returns {Object} Redis client instance
   */
  getRedis() {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }
    return this.redis;
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Online status
   */
  async isUserOnline(userId) {
    try {
      const statusKey = `user:status:${userId}`;
      const statusData = await this.redis.get(statusKey);
      
      if (!statusData) {
        return false;
      }

      const status = JSON.parse(statusData);
      return status.isOnline;
    } catch (error) {
      console.error('Error checking user online status:', error);
      return false;
    }
  }

  /**
   * Get socket ID for user
   * @param {string} userId - User ID
   * @returns {string|null} Socket ID or null if not connected
   */
  getSocketIdForUser(userId) {
    return this.connections.get(userId) || null;
  }

  /**
   * Close WebSocket server and Redis connection
   */
  async close() {
    if (this.io) {
      this.io.close();
    }
    if (this.redis) {
      await this.redis.quit();
    }
    this.connections.clear();
  }
}

// Export singleton instance
const websocketServer = new WebSocketServer();
module.exports = websocketServer;
