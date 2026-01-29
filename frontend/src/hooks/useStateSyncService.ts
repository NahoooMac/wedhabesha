import { useEffect, useState, useCallback } from 'react';
import { stateSyncService } from '../services/stateSyncService';
import { Message, MessageType } from '../types/messaging';

/**
 * useStateSyncService Hook
 * 
 * React hook for managing cross-platform state synchronization
 * 
 * Requirements: 6.4 (cross-platform state synchronization)
 */

interface UseStateSyncServiceOptions {
  threadId: string;
  onQueuedMessageProcessed?: (messageId: string) => void;
}

export const useStateSyncService = ({ threadId, onQueuedMessageProcessed }: UseStateSyncServiceOptions) => {
  const [isOnline, setIsOnline] = useState(stateSyncService.isConnected());
  const [queuedMessageCount, setQueuedMessageCount] = useState(0);
  const [lastSync, setLastSync] = useState<number>(0);

  // Update sync status
  const updateSyncStatus = useCallback(() => {
    const status = stateSyncService.getSyncStatus();
    setIsOnline(status.isOnline);
    setQueuedMessageCount(status.queuedMessageCount);
    setLastSync(status.lastSync);
  }, []);

  // Queue message for offline sending
  const queueMessage = useCallback(
    (content: string, messageType: MessageType, files?: File[]): string => {
      const messageId = stateSyncService.queueMessage(
        threadId,
        content,
        messageType,
        files
      );
      updateSyncStatus();
      return messageId;
    },
    [threadId, updateSyncStatus]
  );

  // Update conversation state
  const updateConversationState = useCallback(
    (updates: {
      lastReadMessageId?: string;
      scrollPosition?: number;
      unreadCount?: number;
    }) => {
      stateSyncService.updateConversationState(threadId, updates);
    },
    [threadId]
  );

  // Get conversation state
  const getConversationState = useCallback(() => {
    return stateSyncService.getConversationState(threadId);
  }, [threadId]);

  // Merge remote messages
  const mergeRemoteMessages = useCallback(
    (messages: Message[]) => {
      stateSyncService.mergeRemoteState(messages, threadId);
    },
    [threadId]
  );

  // Force sync
  const syncNow = useCallback(async () => {
    await stateSyncService.syncNow();
    updateSyncStatus();
  }, [updateSyncStatus]);

  // Setup sync listener
  useEffect(() => {
    const unsubscribe = stateSyncService.onSync(() => {
      updateSyncStatus();
    });

    return unsubscribe;
  }, [updateSyncStatus]);

  // Setup queued message processor
  useEffect(() => {
    const handleQueuedMessage = (event: CustomEvent) => {
      const message = event.detail;
      if (message.threadId === threadId && onQueuedMessageProcessed) {
        onQueuedMessageProcessed(message.id);
      }
    };

    window.addEventListener('process-queued-message', handleQueuedMessage as EventListener);

    return () => {
      window.removeEventListener('process-queued-message', handleQueuedMessage as EventListener);
    };
  }, [threadId, onQueuedMessageProcessed]);

  // Initial status update
  useEffect(() => {
    updateSyncStatus();
  }, [updateSyncStatus]);

  return {
    isOnline,
    queuedMessageCount,
    lastSync,
    queueMessage,
    updateConversationState,
    getConversationState,
    mergeRemoteMessages,
    syncNow
  };
};

export default useStateSyncService;
