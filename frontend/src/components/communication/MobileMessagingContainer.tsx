import React, { useState, useEffect, useCallback } from 'react';
import { Message, MessageType, UserType } from '../../types/messaging';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useStateSyncService } from '../../hooks/useStateSyncService';

interface MobileMessagingContainerProps {
  threadId: string;
  currentUserId: string;
  currentUserType: UserType;
  onSendMessage: (content: string, type: MessageType, files?: File[]) => Promise<void>;
  onLoadMore: (offset: number, limit: number) => Promise<Message[]>;
  onMessageRead?: (messageId: string) => void;
  onSearch?: (query: string) => Promise<Message[]>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  isTyping?: boolean;
  typingUserName?: string;
  recipientName?: string;
  onBack?: () => void;
}

/**
 * MobileMessagingContainer Component
 * 
 * Mobile-optimized messaging interface with touch-friendly controls,
 * proper keyboard handling, responsive layout, and cross-platform state sync.
 * 
 * Requirements: 6.1 (touch-optimized interface), 6.2 (keyboard handling), 6.4 (state sync)
 */
export const MobileMessagingContainer: React.FC<MobileMessagingContainerProps> = ({
  threadId,
  currentUserId,
  currentUserType,
  onSendMessage,
  onLoadMore,
  onMessageRead,
  onSearch,
  onTypingStart,
  onTypingStop,
  isTyping,
  typingUserName,
  recipientName,
  onBack
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // State synchronization
  const {
    isOnline,
    queuedMessageCount,
    queueMessage,
    updateConversationState,
    getConversationState,
    mergeRemoteMessages,
    syncNow
  } = useStateSyncService({
    threadId,
    onQueuedMessageProcessed: (messageId) => {
      // Message processed successfully
    }
  });

  // Enhanced send message with offline support
  const handleSendMessage = useCallback(async (
    content: string,
    type: MessageType,
    files?: File[]
  ) => {
    if (!isOnline) {
      // Queue message for later sending
      queueMessage(content, type, files);
      return;
    }

    try {
      await onSendMessage(content, type, files);
    } catch (error) {
      // If send fails, queue it
      queueMessage(content, type, files);
      throw error;
    }
  }, [isOnline, queueMessage, onSendMessage]);

  // Enhanced load more with state sync
  const handleLoadMore = useCallback(async (offset: number, limit: number) => {
    const messages = await onLoadMore(offset, limit);
    
    // Merge with local state
    mergeRemoteMessages(messages);
    
    return messages;
  }, [onLoadMore, mergeRemoteMessages]);

  // Enhanced message read with state sync
  const handleMessageRead = useCallback((messageId: string) => {
    updateConversationState({ lastReadMessageId: messageId });
    onMessageRead?.(messageId);
  }, [updateConversationState, onMessageRead]);

  // Restore conversation state on mount
  useEffect(() => {
    const state = getConversationState();
    if (state) {
      // Could restore scroll position, unread count, etc.
    }
  }, [getConversationState]);

  // Sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
  }, [isOnline, syncNow]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle keyboard visibility on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      // On mobile, when keyboard appears, viewport height changes
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;

      if (heightDiff > 150) {
        // Keyboard is likely visible
        setIsKeyboardVisible(true);
        setKeyboardHeight(heightDiff);
      } else {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    };

    // Use visualViewport API if available (better for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isMobile]);

  // Prevent body scroll when keyboard is visible on mobile
  useEffect(() => {
    if (isMobile && isKeyboardVisible) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isMobile, isKeyboardVisible]);

  // Handle safe area insets for notched devices
  const getSafeAreaStyle = useCallback(() => {
    if (!isMobile) return {};

    return {
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: isKeyboardVisible ? 0 : 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    };
  }, [isMobile, isKeyboardVisible]);

  const containerStyle: React.CSSProperties = {
    height: isMobile && isKeyboardVisible 
      ? `calc(100vh - ${keyboardHeight}px)` 
      : '100vh',
    ...getSafeAreaStyle()
  };

  return (
    <div 
      className={`flex flex-col bg-white ${isMobile ? 'fixed inset-0 z-50' : 'h-full'}`}
      style={containerStyle}
    >
      {/* Mobile header */}
      {isMobile && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors touch-manipulation"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {recipientName || 'Conversation'}
            </h2>
            {isTyping && typingUserName && (
              <p className="text-sm text-gray-500 italic truncate">
                {typingUserName} is typing...
              </p>
            )}
            {/* Offline indicator */}
            {!isOnline && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
                Offline {queuedMessageCount > 0 && `(${queuedMessageCount} queued)`}
              </p>
            )}
          </div>
          {/* Optional: Add menu button for mobile */}
          <button
            className="p-2 text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors touch-manipulation"
            aria-label="More options"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      )}

      {/* Message list with mobile optimizations */}
      <div className={`flex-1 overflow-hidden ${isMobile ? 'touch-pan-y' : ''}`}>
        <MessageList
          threadId={threadId}
          currentUserId={currentUserId}
          currentUserType={currentUserType}
          onLoadMore={handleLoadMore}
          onMessageRead={handleMessageRead}
          onSearch={onSearch}
          pageSize={isMobile ? 30 : 50} // Smaller page size on mobile for better performance
        />
      </div>

      {/* Message input with mobile keyboard handling */}
      <div className={isMobile ? 'touch-manipulation' : ''}>
        <MessageInput
          threadId={threadId}
          onSendMessage={handleSendMessage}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
          isTyping={isTyping}
          typingUserName={typingUserName}
          disabled={!isOnline && queuedMessageCount >= 10} // Limit queue size
        />
      </div>
    </div>
  );
};

export default MobileMessagingContainer;
