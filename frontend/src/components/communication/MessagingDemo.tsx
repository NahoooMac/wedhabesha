import React, { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Message, MessageType, UserType, MessageStatus } from '../../types/messaging';
import { realtimeHandler } from '../../services/realtimeHandler';

interface MessagingDemoProps {
  threadId: string;
  currentUserId: string;
  currentUserType: UserType;
  recipientName?: string;
}

/**
 * MessagingDemo Component
 * 
 * Example implementation showing how to use MessageList and MessageInput together
 * with real-time communication features.
 * 
 * This component demonstrates:
 * - Message list with pagination and search
 * - Message input with typing indicators
 * - Real-time message delivery
 * - File upload handling
 */
export const MessagingDemo: React.FC<MessagingDemoProps> = ({
  threadId,
  currentUserId,
  currentUserType,
  recipientName = 'Other User'
}) => {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState<string | undefined>();

  useEffect(() => {
    // Connect to WebSocket (in real app, this would use auth token)
    // realtimeHandler.connect(authToken);
    
    // Join the thread room
    realtimeHandler.joinThread(threadId);

    // Listen for typing indicators
    const unsubscribeTyping = realtimeHandler.onTypingIndicator(
      (incomingThreadId, userId, isTyping) => {
        if (incomingThreadId === threadId && userId !== currentUserId) {
          setIsTyping(isTyping);
          setTypingUserName(isTyping ? recipientName : undefined);
        }
      }
    );

    // Cleanup
    return () => {
      unsubscribeTyping();
      realtimeHandler.leaveThread(threadId);
    };
  }, [threadId, currentUserId, recipientName]);

  // Mock function to load messages (replace with actual API call)
  const handleLoadMore = async (offset: number, limit: number): Promise<Message[]> => {
    // In real implementation, this would call the backend API
    // const response = await messageService.getMessages(threadId, limit, offset);
    // return response.messages;
    
    // Mock data for demo
    return [];
  };

  // Mock function to search messages (replace with actual API call)
  const handleSearch = async (query: string): Promise<Message[]> => {
    // In real implementation, this would call the backend API
    // const response = await messageService.searchMessages(threadId, query);
    // return response.messages;
    
    // Mock data for demo
    return [];
  };

  // Handle sending a message
  const handleSendMessage = async (
    content: string,
    type: MessageType,
    files?: File[]
  ): Promise<void> => {
    try {
      // In real implementation, this would:
      // 1. Upload files if present
      // 2. Send message to backend
      // 3. Emit via WebSocket for real-time delivery
      
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        threadId,
        senderId: currentUserId,
        senderType: currentUserType,
        content,
        messageType: type,
        status: MessageStatus.SENT,
        isDeleted: false,
        createdAt: new Date(),
        attachments: files ? files.map((file, index) => ({
          id: `temp-attachment-${index}`,
          messageId: `temp-${Date.now()}`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          url: URL.createObjectURL(file),
          uploadedAt: new Date()
        })) : undefined
      };

      // Emit message via WebSocket
      await realtimeHandler.emitMessage(newMessage);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  // Handle marking message as read
  const handleMessageRead = async (messageId: string): Promise<void> => {
    try {
      // In real implementation, this would call the backend API
      // await messageService.markAsRead(messageId, currentUserId);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  // Handle typing start
  const handleTypingStart = () => {
    realtimeHandler.emitTyping(threadId, true);
  };

  // Handle typing stop
  const handleTypingStop = () => {
    realtimeHandler.emitTyping(threadId, false);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Conversation with {recipientName}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {currentUserType === UserType.VENDOR ? 'Vendor' : 'Couple'} View
        </p>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          threadId={threadId}
          currentUserId={currentUserId}
          currentUserType={currentUserType}
          onLoadMore={handleLoadMore}
          onMessageRead={handleMessageRead}
          onSearch={handleSearch}
          pageSize={50}
        />
      </div>

      {/* Message Input */}
      <MessageInput
        threadId={threadId}
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        isTyping={isTyping}
        typingUserName={typingUserName}
        maxFileSize={25}
        allowedFileTypes={['image/jpeg', 'image/png', 'image/gif', 'application/pdf']}
      />
    </div>
  );
};

export default MessagingDemo;
