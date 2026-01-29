const websocketServer = require('./websocketServer');

/**
 * ConnectionManager - Manages WebSocket connections and real-time communication
 */
class ConnectionManager {
  constructor() {
    this.typingTimeouts = new Map(); // threadId:userId -> timeout
  }

  /**
   * Connect a user to the WebSocket server
   * @param {string} userId - User ID
   * @param {string} userType - User type ('couple' or 'vendor')
   * @returns {Promise<Object>} Connection status
   */
  async connect(userId, userType) {
    try {
      const io = websocketServer.getIO();
      const socketId = websocketServer.getSocketIdForUser(userId);

      if (socketId) {
        return {
          success: true,
          socketId,
          message: 'User already connected'
        };
      }

      // Connection will be established when client connects with valid token
      return {
        success: true,
        message: 'Ready to accept connection'
      };
    } catch (error) {
      console.error('Error in connect:', error);
      throw error;
    }
  }

  /**
   * Disconnect a user from the WebSocket server
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async disconnect(userId) {
    try {
      const io = websocketServer.getIO();
      const socketId = websocketServer.getSocketIdForUser(userId);

      if (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }

      // Clean up typing indicators for this user
      for (const [key, timeout] of this.typingTimeouts.entries()) {
        if (key.endsWith(`:${userId}`)) {
          clearTimeout(timeout);
          this.typingTimeouts.delete(key);
        }
      }
    } catch (error) {
      console.error('Error in disconnect:', error);
      throw error;
    }
  }

  /**
   * Broadcast a message to all participants in a thread
   * @param {string} threadId - Thread ID
   * @param {Object} message - Message object
   * @returns {Promise<void>}
   */
  async broadcastToThread(threadId, message) {
    try {
      const io = websocketServer.getIO();
      
      // Emit message to all users in the thread room
      io.to(`thread:${threadId}`).emit('message:new', {
        threadId,
        message,
        timestamp: new Date().toISOString()
      });

      console.log(`📨 Broadcasted message to thread: ${threadId}`);
    } catch (error) {
      console.error('Error broadcasting to thread:', error);
      throw error;
    }
  }

  /**
   * Send typing indicator to thread participants
   * @param {string} threadId - Thread ID
   * @param {string} userId - User ID who is typing
   * @param {boolean} isTyping - Typing status
   * @returns {Promise<void>}
   */
  async sendTypingIndicator(threadId, userId, isTyping) {
    try {
      const io = websocketServer.getIO();
      const timeoutKey = `${threadId}:${userId}`;

      // Clear existing timeout
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey));
        this.typingTimeouts.delete(timeoutKey);
      }

      if (isTyping) {
        // Broadcast typing indicator
        io.to(`thread:${threadId}`).emit('typing:indicator', {
          threadId,
          userId,
          isTyping: true,
          timestamp: new Date().toISOString()
        });

        // Auto-stop typing after 3 seconds of inactivity
        const timeout = setTimeout(() => {
          io.to(`thread:${threadId}`).emit('typing:indicator', {
            threadId,
            userId,
            isTyping: false,
            timestamp: new Date().toISOString()
          });
          this.typingTimeouts.delete(timeoutKey);
        }, 3000);

        this.typingTimeouts.set(timeoutKey, timeout);
      } else {
        // Broadcast stop typing
        io.to(`thread:${threadId}`).emit('typing:indicator', {
          threadId,
          userId,
          isTyping: false,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
      throw error;
    }
  }

  /**
   * Get list of online users in a thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<string[]>} Array of online user IDs
   */
  async getOnlineUsers(threadId) {
    try {
      const io = websocketServer.getIO();
      const room = io.sockets.adapter.rooms.get(`thread:${threadId}`);

      if (!room) {
        return [];
      }

      const onlineUsers = [];
      for (const socketId of room) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId) {
          onlineUsers.push(socket.userId);
        }
      }

      return onlineUsers;
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  /**
   * Update user online status
   * @param {string} userId - User ID
   * @param {boolean} isOnline - Online status
   * @returns {Promise<void>}
   */
  async updateUserOnlineStatus(userId, isOnline) {
    try {
      const io = websocketServer.getIO();
      
      // Broadcast status change to all connected clients
      io.emit('user:status:change', {
        userId,
        isOnline,
        timestamp: new Date().toISOString()
      });

      console.log(`👤 User ${userId} status: ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating user online status:', error);
      throw error;
    }
  }

  /**
   * Send message delivery confirmation
   * @param {string} userId - Recipient user ID
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  async sendDeliveryConfirmation(userId, messageId) {
    try {
      const io = websocketServer.getIO();
      
      // Send to specific user
      io.to(`user:${userId}`).emit('message:delivered', {
        messageId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending delivery confirmation:', error);
      throw error;
    }
  }

  /**
   * Send message read confirmation
   * @param {string} userId - User who read the message
   * @param {string} messageId - Message ID
   * @param {string} threadId - Thread ID
   * @returns {Promise<void>}
   */
  async sendReadConfirmation(userId, messageId, threadId) {
    try {
      const io = websocketServer.getIO();
      
      // Broadcast read status to thread participants
      io.to(`thread:${threadId}`).emit('message:read', {
        messageId,
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending read confirmation:', error);
      throw error;
    }
  }

  /**
   * Notify user of new thread creation
   * @param {string} userId - User ID to notify
   * @param {Object} thread - Thread object
   * @returns {Promise<void>}
   */
  async notifyNewThread(userId, thread) {
    try {
      const io = websocketServer.getIO();
      
      io.to(`user:${userId}`).emit('thread:new', {
        thread,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error notifying new thread:', error);
      throw error;
    }
  }

  /**
   * Check if user is currently online
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Online status
   */
  async isUserOnline(userId) {
    try {
      return await websocketServer.isUserOnline(userId);
    } catch (error) {
      console.error('Error checking user online status:', error);
      return false;
    }
  }

  /**
   * Get connection statistics
   * @returns {Promise<Object>} Connection statistics
   */
  async getConnectionStats() {
    try {
      const io = websocketServer.getIO();
      const sockets = await io.fetchSockets();

      return {
        totalConnections: sockets.length,
        activeTyping: this.typingTimeouts.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return {
        totalConnections: 0,
        activeTyping: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
const connectionManager = new ConnectionManager();
module.exports = connectionManager;
