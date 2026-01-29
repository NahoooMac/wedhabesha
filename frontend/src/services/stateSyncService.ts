import { Message, MessageThread } from '../types/messaging';

/**
 * StateSyncService
 * 
 * Manages conversation state synchronization between desktop and mobile platforms,
 * including offline message queuing and sync.
 * 
 * Requirements: 6.4 (cross-platform state synchronization)
 */

interface QueuedMessage {
  id: string;
  threadId: string;
  content: string;
  messageType: string;
  timestamp: number;
  files?: File[];
  retryCount: number;
}

interface ConversationState {
  threadId: string;
  lastReadMessageId: string | null;
  lastSyncTimestamp: number;
  scrollPosition: number;
  unreadCount: number;
}

interface SyncData {
  conversations: Record<string, ConversationState>;
  queuedMessages: QueuedMessage[];
  lastGlobalSync: number;
}

const STORAGE_KEY = 'messaging_sync_state';
const QUEUE_KEY = 'messaging_queue';
const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 5000; // 5 seconds

class StateSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private syncCallbacks: Set<(data: SyncData) => void> = new Set();
  private queuedMessages: QueuedMessage[] = [];
  private conversationStates: Map<string, ConversationState> = new Map();

  constructor() {
    this.initializeFromStorage();
    this.setupOnlineListener();
    this.startSyncInterval();
  }

  /**
   * Get current online status
   */
  private get isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Initialize state from localStorage
   */
  private initializeFromStorage(): void {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const data: SyncData = JSON.parse(storedData);
        
        // Restore conversation states
        Object.entries(data.conversations).forEach(([threadId, state]) => {
          this.conversationStates.set(threadId, state);
        });

        // Restore queued messages
        this.queuedMessages = data.queuedMessages || [];
      }

      // Also check for legacy queue storage
      const queueData = localStorage.getItem(QUEUE_KEY);
      if (queueData) {
        const legacyQueue: QueuedMessage[] = JSON.parse(queueData);
        this.queuedMessages = [...this.queuedMessages, ...legacyQueue];
        localStorage.removeItem(QUEUE_KEY); // Clean up legacy storage
      }
    } catch (error) {
      console.error('Failed to initialize from storage:', error);
    }
  }

  /**
   * Save current state to localStorage
   */
  private saveToStorage(): void {
    try {
      const data: SyncData = {
        conversations: Object.fromEntries(this.conversationStates),
        queuedMessages: this.queuedMessages,
        lastGlobalSync: Date.now()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.processQueuedMessages();
    });

    window.addEventListener('offline', () => {
      // Just for event handling, isOnline getter will handle the state
    });
  }

  /**
   * Start periodic sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.notifySyncCallbacks();
      }
    }, SYNC_INTERVAL);
  }

  /**
   * Stop sync interval
   */
  public stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Queue a message for sending when online
   */
  public queueMessage(
    threadId: string,
    content: string,
    messageType: string,
    files?: File[]
  ): string {
    const messageId = `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      threadId,
      content,
      messageType,
      timestamp: Date.now(),
      files,
      retryCount: 0
    };

    this.queuedMessages.push(queuedMessage);
    this.saveToStorage();

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueuedMessages();
    }

    return messageId;
  }

  /**
   * Process queued messages
   */
  private async processQueuedMessages(): Promise<void> {
    if (this.queuedMessages.length === 0) return;

    const messagesToProcess = [...this.queuedMessages];
    
    for (const message of messagesToProcess) {
      try {
        // Emit event for message processing
        window.dispatchEvent(new CustomEvent('process-queued-message', {
          detail: message
        }));

        // Remove from queue on success
        this.queuedMessages = this.queuedMessages.filter(m => m.id !== message.id);
      } catch (error) {
        console.error('Failed to process queued message:', error);
        
        // Increment retry count
        const messageIndex = this.queuedMessages.findIndex(m => m.id === message.id);
        if (messageIndex !== -1) {
          this.queuedMessages[messageIndex].retryCount++;
          
          // Remove if max retries exceeded
          if (this.queuedMessages[messageIndex].retryCount >= MAX_RETRY_COUNT) {
            console.error('Max retries exceeded for message:', message.id);
            this.queuedMessages.splice(messageIndex, 1);
          }
        }
      }
    }

    this.saveToStorage();
  }

  /**
   * Update conversation state
   */
  public updateConversationState(
    threadId: string,
    updates: Partial<ConversationState>
  ): void {
    const currentState = this.conversationStates.get(threadId) || {
      threadId,
      lastReadMessageId: null,
      lastSyncTimestamp: Date.now(),
      scrollPosition: 0,
      unreadCount: 0
    };

    const newState: ConversationState = {
      ...currentState,
      ...updates,
      lastSyncTimestamp: Date.now()
    };

    this.conversationStates.set(threadId, newState);
    this.saveToStorage();
    this.notifySyncCallbacks();
  }

  /**
   * Get conversation state
   */
  public getConversationState(threadId: string): ConversationState | null {
    return this.conversationStates.get(threadId) || null;
  }

  /**
   * Get all conversation states
   */
  public getAllConversationStates(): Record<string, ConversationState> {
    return Object.fromEntries(this.conversationStates);
  }

  /**
   * Get queued messages for a thread
   */
  public getQueuedMessages(threadId?: string): QueuedMessage[] {
    if (threadId) {
      return this.queuedMessages.filter(m => m.threadId === threadId);
    }
    return [...this.queuedMessages];
  }

  /**
   * Clear conversation state
   */
  public clearConversationState(threadId: string): void {
    this.conversationStates.delete(threadId);
    this.saveToStorage();
  }

  /**
   * Clear all state
   */
  public clearAllState(): void {
    this.conversationStates.clear();
    this.queuedMessages = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(QUEUE_KEY);
  }

  /**
   * Register sync callback
   */
  public onSync(callback: (data: SyncData) => void): () => void {
    this.syncCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.syncCallbacks.delete(callback);
    };
  }

  /**
   * Notify all sync callbacks
   */
  private notifySyncCallbacks(): void {
    const data: SyncData = {
      conversations: Object.fromEntries(this.conversationStates),
      queuedMessages: this.queuedMessages,
      lastGlobalSync: Date.now()
    };

    this.syncCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Sync callback error:', error);
      }
    });
  }

  /**
   * Force sync now
   */
  public async syncNow(): Promise<void> {
    if (this.isOnline) {
      await this.processQueuedMessages();
      this.notifySyncCallbacks();
    }
  }

  /**
   * Check if online
   */
  public isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): {
    isOnline: boolean;
    queuedMessageCount: number;
    lastSync: number;
  } {
    const lastSync = Math.max(
      ...Array.from(this.conversationStates.values()).map(s => s.lastSyncTimestamp),
      0
    );

    return {
      isOnline: this.isOnline,
      queuedMessageCount: this.queuedMessages.length,
      lastSync
    };
  }

  /**
   * Merge remote state with local state
   */
  public mergeRemoteState(remoteMessages: Message[], threadId: string): void {
    const localState = this.conversationStates.get(threadId);
    
    if (!localState) {
      // No local state, just update with remote
      this.updateConversationState(threadId, {
        lastSyncTimestamp: Date.now()
      });
      return;
    }

    // Find the latest message from remote
    const latestRemoteMessage = remoteMessages.reduce((latest, msg) => {
      const msgTime = new Date(msg.createdAt).getTime();
      const latestTime = latest ? new Date(latest.createdAt).getTime() : 0;
      return msgTime > latestTime ? msg : latest;
    }, null as Message | null);

    if (latestRemoteMessage) {
      // Update last read if remote is newer
      const remoteTime = new Date(latestRemoteMessage.createdAt).getTime();
      if (remoteTime > localState.lastSyncTimestamp) {
        this.updateConversationState(threadId, {
          lastSyncTimestamp: remoteTime
        });
      }
    }
  }
}

// Export singleton instance
export const stateSyncService = new StateSyncService();

export default stateSyncService;
