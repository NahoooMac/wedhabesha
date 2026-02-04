/**
 * Real-time Handler Implementation
 * Provides comprehensive WebSocket functionality for messaging with automatic reconnection
 * and message synchronization across both couple and vendor interfaces.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.2
 */

import { io, Socket } from 'socket.io-client';
import type { Message, RealtimeHandler as IRealtimeHandler, UserType } from '../types/messaging';

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastConnectTime: Date | null;
  userId: string | null;
  userType: UserType | null;
}

interface ReconnectConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class RealtimeHandler implements IRealtimeHandler {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastConnectTime: null,
    userId: null,
    userType: null
  };

  private reconnectConfig: ReconnectConfig = {
    maxAttempts: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 1.5
  };

  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private joinedThreads: Set<string> = new Set();

  // Event callbacks
  private messageCallbacks: ((message: Message) => void)[] = [];
  private typingCallbacks: ((threadId: string, userId: string, isTyping: boolean) => void)[] = [];
  private statusCallbacks: ((userId: string, isOnline: boolean) => void)[] = [];
  private readStatusCallbacks: ((messageId: string, userId: string) => void)[] = [];
  private deliveryStatusCallbacks: ((messageId: string, status: string, timestamp?: string) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];

  /**
   * Connect to WebSocket server with authentication
   */
  connect(token: string): void {
    if (this.connectionState.isConnecting || this.connectionState.isConnected) {
      return;
    }

    this.connectionState.isConnecting = true;

    try {
      // Parse token to get user info
      const tokenPayload = this.parseJWT(token);
      this.connectionState.userId = tokenPayload?.userId || null;
      this.connectionState.userType = tokenPayload?.userType || UserType.COUPLE;

      // Create socket connection
      const serverUrl = process.env.REACT_APP_WEBSOCKET_URL || 
                       (process.env.NODE_ENV === 'production' 
                         ? window.location.origin 
                         : 'http://localhost:8000'); // Backend server port

      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: false // We handle reconnection manually
      });

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.connectionState.isConnecting = false;
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = {
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
      lastConnectTime: null,
      userId: null,
      userType: null
    };

    this.joinedThreads.clear();
    this.messageQueue = [];
  }

  /**
   * Join a thread room for real-time updates
   */
  joinThread(threadId: string): void {
    if (!this.socket || !this.connectionState.isConnected) {
      // Queue the join request for when connected
      this.messageQueue.push({ event: 'join:thread', data: threadId });
      return;
    }

    this.socket.emit('join:thread', threadId);
    this.joinedThreads.add(threadId);
  }

  /**
   * Leave a thread room
   */
  leaveThread(threadId: string): void {
    if (!this.socket || !this.connectionState.isConnected) {
      return;
    }

    this.socket.emit('leave:thread', threadId);
    this.joinedThreads.delete(threadId);
  }

  /**
   * Register callback for received messages
   */
  onMessageReceived(callback: (message: Message) => void): () => void {
    this.messageCallbacks.push(callback);
    
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for typing indicators
   */
  onTypingIndicator(callback: (threadId: string, userId: string, isTyping: boolean) => void): () => void {
    this.typingCallbacks.push(callback);
    
    return () => {
      const index = this.typingCallbacks.indexOf(callback);
      if (index > -1) {
        this.typingCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for user status changes
   */
  onUserStatusChange(callback: (userId: string, isOnline: boolean) => void): () => void {
    this.statusCallbacks.push(callback);
    
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for read status updates
   */
  onMessageReadUpdate(callback: (messageId: string, userId: string) => void): () => void {
    this.readStatusCallbacks.push(callback);
    
    return () => {
      const index = this.readStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.readStatusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for delivery status updates
   */
  onMessageStatusUpdate(callback: (messageId: string, status: string, timestamp?: string) => void): () => void {
    this.deliveryStatusCallbacks.push(callback);
    
    return () => {
      const index = this.deliveryStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.deliveryStatusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for connection status changes
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.push(callback);
    
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit a message via WebSocket (for real-time delivery)
   */
  async emitMessage(message: Message): Promise<void> {
    if (!this.socket || !this.connectionState.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message emit timeout'));
      }, 10000);

      this.socket!.emit('message:send', message, (response: any) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to emit message'));
        }
      });
    });
  }

  /**
   * Emit typing indicator
   */
  async emitTyping(threadId: string, isTyping: boolean): Promise<void> {
    if (!this.socket || !this.connectionState.isConnected) {
      return;
    }

    const event = isTyping ? 'typing:start' : 'typing:stop';
    this.socket.emit(event, { threadId });
  }

  /**
   * Emit message read status update
   */
  async emitMessageRead(messageId: string, userId: string): Promise<void> {
    if (!this.socket || !this.connectionState.isConnected) {
      return;
    }

    this.socket.emit('message:read', { messageId, userId });
  }

  /**
   * Sync missed messages after reconnection
   */
  async syncMissedMessages(threadId: string, lastMessageTime?: Date): Promise<Message[]> {
    if (!this.socket || !this.connectionState.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message sync timeout'));
      }, 15000);

      this.socket!.emit('sync:messages', {
        threadId,
        since: lastMessageTime?.toISOString()
      }, (response: any) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve(response.messages || []);
        } else {
          reject(new Error(response?.error || 'Failed to sync messages'));
        }
      });
    });
  }

  /**
   * Request full message history for a thread
   */
  async requestMessageHistory(threadId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    if (!this.socket || !this.connectionState.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message history request timeout'));
      }, 15000);

      this.socket!.emit('request:history', {
        threadId,
        limit,
        offset
      }, (response: any) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve(response.messages || []);
        } else {
          reject(new Error(response?.error || 'Failed to get message history'));
        }
      });
    });
  }

  /**
   * Register error callback
   */
  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.push(callback);
    
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.connectionState.reconnectAttempts;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.connectionState.isConnected = true;
      this.connectionState.isConnecting = false;
      this.connectionState.reconnectAttempts = 0;
      this.connectionState.lastConnectTime = new Date();

      // Process queued messages
      this.processMessageQueue();

      // Re-join previously joined threads and sync messages
      this.rejoinThreadsAndSync();

      // Notify connection callbacks
      this.connectionCallbacks.forEach(callback => callback(true));
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionState.isConnected = false;
      this.connectionState.isConnecting = false;

      // Notify connection callbacks
      this.connectionCallbacks.forEach(callback => callback(false));

      // Attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectionState.isConnecting = false;
      this.handleConnectionError(error);
      this.scheduleReconnect();
    });

    // Message events
    this.socket.on('message:received', (data) => {
      this.handleMessageReceived(data);
    });

    this.socket.on('message:new', (data) => {
      this.handleMessageReceived(data.message);
    });

    // Read status events
    this.socket.on('message:read:update', (data) => {
      this.handleMessageReadUpdate(data);
    });

    // Delivery status events
    this.socket.on('message:status:update', (data) => {
      this.handleMessageStatusUpdate(data);
    });

    // Typing indicator events
    this.socket.on('typing:indicator', (data) => {
      this.typingCallbacks.forEach(callback => 
        callback(data.threadId, data.userId, data.isTyping)
      );
    });

    // User status events
    this.socket.on('user:status:change', (data) => {
      this.statusCallbacks.forEach(callback => 
        callback(data.userId, data.isOnline)
      );
    });

    // Thread events
    this.socket.on('thread:joined', (data) => {
      if (data.success) {
        this.joinedThreads.add(data.threadId);
      }
    });

    this.socket.on('thread:join:error', (data) => {
      console.error('Failed to join thread:', data.error);
      this.joinedThreads.delete(data.threadId);
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleConnectionError(error);
    });
  }

  /**
   * Handle received message and notify callbacks
   */
  private handleMessageReceived(messageData: any): void {
    try {
      // Ensure message has required fields
      const message: Message = {
        id: messageData.id,
        threadId: messageData.threadId,
        senderId: messageData.senderId,
        senderType: messageData.senderType as UserType,
        content: messageData.content,
        messageType: messageData.messageType,
        status: messageData.status,
        createdAt: new Date(messageData.createdAt || messageData.timestamp),
        attachments: messageData.attachments || [],
        readStatus: messageData.readStatus || {}
      };

      // Notify all message callbacks
      this.messageCallbacks.forEach(callback => callback(message));
    } catch (error) {
      console.error('Error processing received message:', error);
    }
  }

  /**
   * Handle message read status update and notify callbacks
   */
  private handleMessageReadUpdate(data: any): void {
    try {
      this.readStatusCallbacks.forEach(callback => 
        callback(data.messageId, data.userId)
      );
    } catch (error) {
      console.error('Error processing read status update:', error);
    }
  }

  /**
   * Handle message delivery status update and notify callbacks
   */
  private handleMessageStatusUpdate(data: any): void {
    try {
      this.deliveryStatusCallbacks.forEach(callback => 
        callback(data.messageId, data.status, data.deliveredAt || data.readAt)
      );
    } catch (error) {
      console.error('Error processing delivery status update:', error);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
      console.error('Max reconnection attempts reached');
      this.handleConnectionError(new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = Math.min(
      this.reconnectConfig.baseDelay * Math.pow(
        this.reconnectConfig.backoffFactor, 
        this.connectionState.reconnectAttempts
      ),
      this.reconnectConfig.maxDelay
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connectionState.reconnectAttempts++;
      this.attemptReconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  private attemptReconnect(): void {
    if (this.connectionState.isConnected || this.connectionState.isConnecting) {
      return;
    }

    // Get stored token
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
    if (!token) {
      console.error('No authentication token available for reconnection');
      return;
    }

    this.connect(token);
  }

  /**
   * Process queued messages after reconnection
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift()!;
      
      if (this.socket && this.connectionState.isConnected) {
        this.socket.emit(event, data);
      }
    }
  }

  /**
   * Re-join previously joined threads after reconnection and sync messages
   */
  private async rejoinThreadsAndSync(): void {
    for (const threadId of this.joinedThreads) {
      this.joinThread(threadId);
      
      // Attempt to sync missed messages if we have a last connection time
      if (this.connectionState.lastConnectTime) {
        try {
          const missedMessages = await this.syncMissedMessages(
            threadId, 
            this.connectionState.lastConnectTime
          );
          
          // Notify callbacks about missed messages
          missedMessages.forEach(message => {
            this.messageCallbacks.forEach(callback => callback(message));
          });
        } catch (error) {
          console.warn(`Failed to sync messages for thread ${threadId}:`, error);
        }
      }
    }
  }

  /**
   * Re-join previously joined threads after reconnection (fallback)
   */
  private rejoinThreads(): void {
    for (const threadId of this.joinedThreads) {
      this.joinThread(threadId);
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }

  /**
   * Parse JWT token to extract user information
   */
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse JWT token:', error);
      return null;
    }
  }

  // Helper methods for testing/simulation (maintain backward compatibility)
  public triggerMessageReceived(message: Message): void {
    this.messageCallbacks.forEach(callback => callback(message));
  }

  public triggerTypingIndicator(threadId: string, userId: string, isTyping: boolean): void {
    this.typingCallbacks.forEach(callback => callback(threadId, userId, isTyping));
  }

  public triggerUserStatusChange(userId: string, isOnline: boolean): void {
    this.statusCallbacks.forEach(callback => callback(userId, isOnline));
  }
}

export const realtimeHandler = new RealtimeHandler();