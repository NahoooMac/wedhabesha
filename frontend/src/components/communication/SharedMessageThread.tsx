/**
 * @fileoverview SharedMessageThread Component
 * 
 * Unified message thread component that provides consistent UI across both
 * Couple Dashboard and Vendor Portal messaging interfaces. Uses the unified
 * design system for consistent colors, typography, and spacing.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Features:
 * - Unified design system with consistent colors
 * - Chronological message ordering
 * - Read status indicators
 * - Message deletion with confirmation
 * - Auto-scroll to new messages
 * - Intersection observer for read status
 * - Mobile-optimized touch targets
 * - File attachment support
 * - Empty state handling
 * 
 * Requirements satisfied:
 * - 1.1, 1.2, 1.4, 1.5: UI Design Consistency
 * - 2.4: Message Ordering Consistency
 * - 4.1, 4.2, 4.3: Read Status Management
 * - 5.1, 5.2, 5.4, 5.5: Mobile Responsiveness
 */

import React, { useEffect, useRef } from 'react';
import { Message, MessageStatus, MessageType, UserType } from '../../types/messaging';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import AttachmentViewer from './AttachmentViewer';
import MessageStatusIndicator, { MessageDeliveryStatus } from './MessageStatusIndicator';
import '../../styles/messaging-design-tokens.css';

/**
 * Decode HTML entities in a string
 * Converts entities like &#x27; to their actual characters
 */
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

interface SharedMessageThreadProps {
  messages: Message[];
  currentUserId: string;
  currentUserType: UserType;
  onMessageRead?: (messageId: string) => void;
  onMessageDelete?: (messageId: string) => Promise<void>;
  colorScheme?: 'blue' | 'rose'; // Temporary for migration, defaults to blue
  className?: string;
}

/**
 * SharedMessageThread Component
 * 
 * Displays conversation history with unified design system, chronological ordering,
 * message status indicators, and read receipts. Provides consistent experience
 * across both couple and vendor messaging interfaces.
 * 
 * @component
 * @param {SharedMessageThreadProps} props - Component props
 * @returns {JSX.Element} Rendered SharedMessageThread component
 * 
 * @example
 * ```tsx
 * <SharedMessageThread
 *   messages={messages}
 *   currentUserId="user-123"
 *   currentUserType={UserType.COUPLE}
 *   onMessageRead={handleMessageRead}
 *   onMessageDelete={handleMessageDelete}
 *   colorScheme="blue"
 * />
 * ```
 * 
 * @satisfies Requirements 1.1, 1.2, 1.4, 1.5, 2.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.4, 5.5
 */
export const SharedMessageThread: React.FC<SharedMessageThreadProps> = ({
  messages,
  currentUserId,
  currentUserType: _currentUserType, // Reserved for future use
  onMessageRead,
  onMessageDelete,
  colorScheme = 'blue', // Default to blue for consistency
  className = ''
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
            const messageStatus = entry.target.getAttribute('data-message-status');
            
            // Only mark as read if:
            // 1. It's not our own message
            // 2. The message hasn't been read yet
            // 3. The message is not deleted
            if (messageId && senderId !== currentUserId && messageStatus !== 'read') {
              onMessageRead(messageId);
            }
          }
        });
      },
      { 
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px' // Require message to be more visible before marking as read
      }
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

  /**
   * Convert MessageStatus or MessageDeliveryStatus to MessageDeliveryStatus for the indicator component
   */
  const getDeliveryStatus = (message: Message): MessageDeliveryStatus => {
    // Use deliveryStatus if available, otherwise fall back to status
    if (message.deliveryStatus) {
      return message.deliveryStatus as MessageDeliveryStatus;
    }
    
    // Map message status to delivery status
    switch (message.status) {
      case MessageStatus.SENT:
        return 'sent';
      case MessageStatus.DELIVERED:
        return 'delivered';
      case MessageStatus.READ:
        return 'read';
      default:
        return 'sent';
    }
  };

  /**
   * Render message status indicator using the new component
   */
  const renderMessageStatus = (message: Message) => {
    // Only show status for messages sent by current user
    if (message.senderId !== currentUserId) return null;

    return (
      <MessageStatusIndicator
        status={getDeliveryStatus(message)}
        timestamp={message.createdAt}
        showTimestamp={false}
        size="sm"
      />
    );
  };

  /**
   * Format date separator text
   */
  const formatDateSeparator = (date: Date): string => {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  /**
   * Check if we should show a date separator before this message
   */
  const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message): boolean => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);
    
    return !isSameDay(currentDate, previousDate);
  };

  /**
   * Check if messages should be grouped (consecutive messages from same sender within 2 minutes)
   */
  const shouldGroupWithPrevious = (currentMessage: Message, previousMessage?: Message): boolean => {
    if (!previousMessage) return false;
    
    // Don't group if different senders
    if (currentMessage.senderId !== previousMessage.senderId) return false;
    
    // Don't group system messages
    if (currentMessage.messageType === MessageType.SYSTEM || previousMessage.messageType === MessageType.SYSTEM) return false;
    
    // Don't group if deleted
    if (currentMessage.isDeleted || previousMessage.isDeleted) return false;
    
    // Check time difference (group if within 2 minutes)
    const currentTime = new Date(currentMessage.createdAt).getTime();
    const previousTime = new Date(previousMessage.createdAt).getTime();
    const timeDiff = (currentTime - previousTime) / 1000 / 60; // in minutes
    
    return timeDiff < 2;
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

  /**
   * Render a date separator
   */
  const renderDateSeparator = (date: Date) => {
    return (
      <div className="flex items-center justify-center my-4">
        <div 
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: 'var(--messaging-gray-100)',
            color: 'var(--messaging-gray-600)',
            fontSize: 'var(--messaging-font-size-xs)',
            fontWeight: 'var(--messaging-font-weight-medium)'
          }}
        >
          {formatDateSeparator(date)}
        </div>
      </div>
    );
  };

  /**
   * Render a single message with proper chat bubble alignment
   */
  const renderMessage = (message: Message, index: number, messages: Message[]) => {
    // Convert both to strings for comparison to handle type mismatches
    // Also normalize by trimming whitespace and converting to lowercase for comparison
    const messageSenderId = String(message.senderId).trim();
    const currentUserIdStr = String(currentUserId).trim();
    let isOwnMessage = messageSenderId === currentUserIdStr;
    
    // Fallback: If IDs don't match but we know the current user type, use senderType
    if (!isOwnMessage && _currentUserType) {
      isOwnMessage = message.senderType === _currentUserType;
    }
    
    // Enhanced debug logging
    console.log('🔍 Message alignment debug:', {
      messageId: message.id,
      messageSenderId,
      currentUserIdStr,
      isOwnMessage,
      senderType: message.senderType,
      currentUserType: _currentUserType,
      content: message.content.substring(0, 30) + '...',
      rawSenderId: message.senderId,
      rawCurrentUserId: currentUserId
    });
    
    const isDeleted = message.isDeleted;
    const isDeleting = deletingMessageId === message.id;
    const previousMessage = index > 0 ? messages[index - 1] : undefined;
    const isGrouped = shouldGroupWithPrevious(message, previousMessage);
    const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

    return (
      <React.Fragment key={message.id}>
        {/* Date separator */}
        {showDateSeparator && renderDateSeparator(new Date(message.createdAt))}

        {/* Message Container - Using CSS Classes for Proper Alignment */}
        <div
          data-message-id={message.id}
          data-sender-id={message.senderId}
          data-message-status={message.status}
          data-is-own-message={isOwnMessage}
          className={`w-full ${isGrouped ? 'mb-1' : 'mb-4'} group animate-fadeIn ${
            isOwnMessage ? 'chat-message-sent' : 'chat-message-received'
          }`}
        >
          {/* Message Bubble Container */}
          <div className="relative">
            {/* Actual Message Bubble - Using CSS Classes */}
            <div
              className={`${
                isOwnMessage ? 'chat-bubble-sent' : 'chat-bubble-received'
              } touch-manipulation transition-all duration-200 ${
                isDeleting ? 'opacity-50' : ''
              }`}
            >
              {message.messageType === MessageType.SYSTEM ? (
                <p 
                  className="text-xs text-center italic"
                  style={{ 
                    color: '#6b7280',
                    fontSize: '12px'
                  }}
                >
                  {decodeHtmlEntities(message.content)}
                </p>
              ) : (
                <>
                  {isDeleted ? (
                    <p 
                      className="text-sm italic opacity-70"
                      style={{ fontSize: '14px' }}
                    >
                      This message has been deleted
                    </p>
                  ) : (
                    <>
                      <p 
                        className="text-sm whitespace-pre-wrap"
                        style={{ 
                          fontSize: '14px',
                          lineHeight: '1.5',
                          margin: 0
                        }}
                      >
                        {decodeHtmlEntities(message.content)}
                      </p>
                      {renderAttachment(message)}
                    </>
                  )}
                  
                  {/* Timestamp and Status */}
                  <div 
                    className="flex items-center gap-1 mt-1.5"
                    style={{
                      justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <span 
                      className="text-xs opacity-70"
                      style={{ 
                        fontSize: '11px',
                        color: isOwnMessage ? 'rgba(255, 255, 255, 0.8)' : '#6b7280'
                      }}
                    >
                      {format(new Date(message.createdAt), 'HH:mm')}
                    </span>
                    {renderMessageStatus(message)}
                  </div>
                </>
              )}
            </div>

            {/* Delete button - positioned based on message alignment */}
            {isOwnMessage && !isDeleted && message.messageType !== MessageType.SYSTEM && onMessageDelete && (
              <button
                onClick={() => handleDeleteMessage(message.id)}
                disabled={isDeleting}
                className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                title="Delete message"
                aria-label="Delete message"
                style={{
                  left: isOwnMessage ? '-32px' : 'auto',
                  right: isOwnMessage ? 'auto' : '-32px',
                  backgroundColor: 'transparent',
                  transition: 'all 150ms ease-in-out',
                  minWidth: '28px',
                  minHeight: '28px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: '#6b7280' }}
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
      </React.Fragment>
    );
  };

  // Messages are already sorted chronologically by the backend
  const sortedMessages = messages;

  if (sortedMessages.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center h-full ${className}`}
        style={{ color: 'var(--messaging-gray-500)' }}
      >
        <div className="text-center messaging-mobile-padding">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--messaging-gray-300)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p 
            className="font-medium mb-1"
            style={{ 
              fontSize: 'var(--messaging-font-size-lg)',
              fontWeight: 'var(--messaging-font-weight-medium)',
              color: 'var(--messaging-gray-600)'
            }}
          >
            No messages yet
          </p>
          <p 
            className="text-sm"
            style={{ 
              fontSize: 'var(--messaging-font-size-sm)',
              color: 'var(--messaging-gray-400)'
            }}
          >
            Start the conversation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col h-full overflow-y-auto touch-pan-y overscroll-contain messaging-mobile-padding ${className}`}
      style={{ padding: 'var(--messaging-space-4)' }}
    >
      {sortedMessages.map((message, index) => renderMessage(message, index, sortedMessages))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default SharedMessageThread;