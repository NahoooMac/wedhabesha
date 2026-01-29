import React, { useEffect, useRef } from 'react';
import { Message, MessageStatus, MessageType, UserType } from '../../types/messaging';
import { formatDistanceToNow } from 'date-fns';
import AttachmentViewer from './AttachmentViewer';

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  currentUserType: UserType;
  onMessageRead?: (messageId: string) => void;
  onMessageDelete?: (messageId: string) => Promise<void>;
}

/**
 * MessageThread Component
 * 
 * Displays conversation history with chronological ordering, message status indicators,
 * and read receipts.
 * 
 * Requirements: 3.1 (conversation display), 5.2 (read status)
 */
export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  currentUserId,
  currentUserType: _currentUserType, // Reserved for future use (e.g., user-type-specific features)
  onMessageRead,
  onMessageDelete
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [deletingMessageId, setDeletingMessageId] = React.useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!onMessageRead) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            const senderId = entry.target.getAttribute('data-sender-id');
            
            // Only mark as read if it's not our own message
            if (messageId && senderId !== currentUserId) {
              onMessageRead(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [onMessageRead, currentUserId]);

  // Attach observer to message elements
  useEffect(() => {
    if (!observerRef.current) return;

    const messageElements = document.querySelectorAll('[data-message-id]');
    messageElements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      messageElements.forEach((el) => observerRef.current?.unobserve(el));
    };
  }, [messages]);

  const renderMessageStatus = (message: Message) => {
    // Only show status for messages sent by current user
    if (message.senderId !== currentUserId) return null;

    switch (message.status) {
      case MessageStatus.SENT:
        return (
          <span className="text-xs text-gray-400 ml-2" title="Sent">
            ✓
          </span>
        );
      case MessageStatus.DELIVERED:
        return (
          <span className="text-xs text-gray-400 ml-2" title="Delivered">
            ✓✓
          </span>
        );
      case MessageStatus.READ:
        return (
          <span className="text-xs text-blue-500 ml-2" title="Read">
            ✓✓
          </span>
        );
      default:
        return null;
    }
  };

  const renderAttachment = (message: Message) => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <AttachmentViewer
        attachments={message.attachments}
        className="mt-2"
      />
    );
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!onMessageDelete) return;
    
    if (!window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    setDeletingMessageId(messageId);
    try {
      await onMessageDelete(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.senderId === currentUserId;
    const isDeleted = message.isDeleted;
    const isDeleting = deletingMessageId === message.id;

    return (
      <div
        key={message.id}
        data-message-id={message.id}
        data-sender-id={message.senderId}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}
      >
        <div className="relative max-w-[70%] sm:max-w-[60%] md:max-w-[50%]">
          <div
            className={`${
              isOwnMessage
                ? 'bg-blue-500 text-white rounded-l-lg rounded-tr-lg'
                : 'bg-gray-200 text-gray-900 rounded-r-lg rounded-tl-lg'
            } px-4 py-2 shadow-sm touch-manipulation ${isDeleting ? 'opacity-50' : ''}`}
          >
            {message.messageType === MessageType.SYSTEM ? (
              <p className="text-xs text-center italic text-gray-600">
                {message.content}
              </p>
            ) : (
              <>
                {isDeleted ? (
                  <p className="text-sm italic opacity-70">
                    This message has been deleted
                  </p>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    {renderAttachment(message)}
                  </>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs opacity-70">
                    {formatDistanceToNow(new Date(message.createdAt), {
                      addSuffix: true
                    })}
                  </span>
                  {renderMessageStatus(message)}
                </div>
              </>
            )}
          </div>

          {/* Delete button - only show for own messages that aren't deleted or system messages */}
          {isOwnMessage && !isDeleted && message.messageType !== MessageType.SYSTEM && onMessageDelete && (
            <button
              onClick={() => handleDeleteMessage(message.id)}
              disabled={isDeleting}
              className={`absolute ${
                isOwnMessage ? '-left-8' : '-right-8'
              } top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
              title="Delete message"
              aria-label="Delete message"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Sort messages chronologically
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (sortedMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm mt-1">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-2 touch-pan-y overscroll-contain">
      {sortedMessages.map(renderMessage)}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageThread;
