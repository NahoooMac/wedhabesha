import { useState, useEffect, useCallback } from 'react';
import { messagingApi } from '../services/messagingApi';
import { realtimeHandler } from '../services/realtimeHandler';

interface UnreadMessageData {
  totalUnread: number;
  threadCounts: Record<string, number>;
  loading: boolean;
  error: string | null;
}

export const useUnreadMessages = (userId: string) => {
  const [unreadData, setUnreadData] = useState<UnreadMessageData>({
    totalUnread: 0,
    threadCounts: {},
    loading: true,
    error: null
  });

  // Load initial unread counts
  const loadUnreadCounts = useCallback(async () => {
    try {
      setUnreadData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await messagingApi.getUnreadCounts();
      const data = response.success ? response.data : response;
      
      setUnreadData({
        totalUnread: data.totalUnread || 0,
        threadCounts: data.threadCounts || {},
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load unread counts:', error);
      setUnreadData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load unread counts'
      }));
    }
  }, []);

  // Update unread count for a specific thread
  const updateThreadUnreadCount = useCallback((threadId: string, count: number) => {
    setUnreadData(prev => {
      const newThreadCounts = { ...prev.threadCounts };
      const oldCount = newThreadCounts[threadId] || 0;
      
      if (count === 0) {
        delete newThreadCounts[threadId];
      } else {
        newThreadCounts[threadId] = count;
      }
      
      const totalUnread = Math.max(0, prev.totalUnread - oldCount + count);
      
      return {
        ...prev,
        totalUnread,
        threadCounts: newThreadCounts
      };
    });
  }, []);

  // Increment total unread count (for new messages)
  const incrementUnreadCount = useCallback((threadId?: string) => {
    setUnreadData(prev => {
      const newThreadCounts = { ...prev.threadCounts };
      
      if (threadId) {
        newThreadCounts[threadId] = (newThreadCounts[threadId] || 0) + 1;
      }
      
      return {
        ...prev,
        totalUnread: prev.totalUnread + 1,
        threadCounts: newThreadCounts
      };
    });
  }, []);

  // Decrement total unread count (when messages are read)
  const decrementUnreadCount = useCallback((threadId?: string, amount: number = 1) => {
    setUnreadData(prev => {
      const newThreadCounts = { ...prev.threadCounts };
      
      if (threadId) {
        const currentCount = newThreadCounts[threadId] || 0;
        const newCount = Math.max(0, currentCount - amount);
        
        if (newCount === 0) {
          delete newThreadCounts[threadId];
        } else {
          newThreadCounts[threadId] = newCount;
        }
      }
      
      return {
        ...prev,
        totalUnread: Math.max(0, prev.totalUnread - amount),
        threadCounts: newThreadCounts
      };
    });
  }, []);

  // Mark thread as read
  const markThreadAsRead = useCallback(async (threadId: string) => {
    try {
      const currentUnread = unreadData.threadCounts[threadId] || 0;
      if (currentUnread > 0) {
        await messagingApi.markThreadAsRead(threadId);
        updateThreadUnreadCount(threadId, 0);
      }
    } catch (error) {
      console.error('Failed to mark thread as read:', error);
    }
  }, [unreadData.threadCounts, updateThreadUnreadCount]);

  // Set up real-time listeners
  useEffect(() => {
    if (!userId) return;

    // Load initial data
    loadUnreadCounts();

    // Set up real-time message listener
    const unsubscribeMessage = realtimeHandler.onMessageReceived((message: any) => {
      // Only increment if message is not from current user
      if (message.senderId !== userId) {
        incrementUnreadCount(message.threadId);
      }
    });

    // Set up read status listener
    const unsubscribeRead = realtimeHandler.onMessageReadUpdate((messageId: string, readByUserId: string) => {
      // If current user read the message, decrement count
      if (readByUserId === userId) {
        // We don't have thread info here, so we'll reload counts
        loadUnreadCounts();
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeRead();
    };
  }, [userId, loadUnreadCounts, incrementUnreadCount]);

  return {
    ...unreadData,
    updateThreadUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
    markThreadAsRead,
    reload: loadUnreadCounts
  };
};

export default useUnreadMessages;