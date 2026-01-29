import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, AlertCircle, ChevronLeft, MoreVertical } from 'lucide-react';
import { SharedMessageThread } from '../communication/SharedMessageThread';
import { SharedMessageInput } from '../communication/SharedMessageInput';
import { SharedErrorDisplay } from '../communication/SharedErrorDisplay';
import { ConnectionStatus } from '../communication/ConnectionStatus';
import { Message, MessageType, UserType, MessageStatus } from '../../types/messaging';
import { messagingApi } from '../../services/messagingApi';
import { realtimeHandler } from '../../services/realtimeHandler';
import { notificationService } from '../../services/notificationService';
import { useResponsiveMessaging } from '../../hooks/useResponsiveMessaging';
import { useMessagingErrorHandler } from '../../hooks/useMessagingErrorHandler';
import { sortThreadsByActivity, reorderThreadOnNewMessage, clearThreadUnreadCount, truncateMessagePreview } from '../../utils/thread-management';
import '../../styles/messaging-design-tokens.css';

// Mock Types for Thread
interface Thread {
  id: string;
  coupleName: string;
  coupleId: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  leadId?: string;
  serviceType?: string;
  status: 'active' | 'archived';
  messages?: Message[];
}

/* ==========================================================================================
   VENDOR MESSAGING COMPONENT
   ========================================================================================== */

interface VendorMessagingProps {
  vendorId: string;
  userId: string;
}

/**
 * VendorMessaging Component
 * Unified messaging interface for vendor dashboard with consistent UI design.
 */
export const VendorMessaging: React.FC<VendorMessagingProps> = ({ vendorId, userId }) => {
  // State management
  const [threads, setThreads] = useState<Thread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [loading, setLoading] = useState(true); // Start with loading true
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [selectedThreadData, setSelectedThreadData] = useState<Thread | null>(null);

  // Use responsive messaging hook for consistent mobile behavior
  const { state: responsiveState, actions: responsiveActions } = useResponsiveMessaging({
    initialThreadId: null,
    debounceDelay: 150,
    enableViewportTracking: true
  });

  // Enhanced error handling hook
  const { handleError, retryOperation, clearError, clearErrorAfterDelay, error, isRetrying, canRetry } = useMessagingErrorHandler();

  // Load threads on mount and setup real-time connection
  useEffect(() => {
    // Load threads from API
    loadThreads();
    
    // Request notification permission
    if (notificationService.isSupported() && notificationService.getPermissionStatus() === 'default') {
      notificationService.requestNotificationPermission();
    }
    
    // Connect to real-time messaging
    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('jwt_token') || localStorage.getItem('access_token')) : null;
    if (token) {
      realtimeHandler.connect(token);
    }

    // Set up real-time message listener
    const unsubscribeMessage = realtimeHandler.onMessageReceived((message: any) => {
      // Update messages if this is the active thread
      if (selectedThreadData && message.threadId === selectedThreadData.id) {
        setThreadMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }

      // Update thread list with new message
      setThreads(prev => {
        const shouldIncrementUnread = message.senderId !== userId && (!selectedThreadData || selectedThreadData.id !== message.threadId);
        
        // Show notification for messages from other users (couples)
        if (message.senderId !== userId) {
          const thread = prev.find(t => t.id === message.threadId);
          const senderName = thread?.coupleName || 'Couple';
          const messagePreview = truncateMessagePreview(message.content, 50);
          
          // Show browser notification
          notificationService.showMessageNotification(
            senderName,
            messagePreview,
            message.threadId
          );
          
          // Play notification sound
          notificationService.playNotificationSound();
          
          // Update unread count if not viewing this thread
          if (shouldIncrementUnread) {
            notificationService.incrementUnreadCount();
          }
        }
        
        const reorderedThreads = reorderThreadOnNewMessage(
          prev,
          message.threadId,
          truncateMessagePreview(message.content, 50),
          message.createdAt,
          shouldIncrementUnread
        );
        
        return reorderedThreads;
      });
    });

    const unsubscribeReadStatus = realtimeHandler.onMessageReadUpdate((messageId: string, readByUserId: string) => {
      if (selectedThreadData) {
        setThreadMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: MessageStatus.READ }
            : msg
        ));
      }
    });

    const unsubscribeConnection = realtimeHandler.onConnectionChange((connected: boolean) => {
      if (!connected) {
        console.log('Real-time connection lost, will attempt to reconnect...');
      } else {
        if (selectedThreadData) {
          realtimeHandler.joinThread(selectedThreadData.id);
        }
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeReadStatus();
      unsubscribeConnection();
      realtimeHandler.disconnect();
    };
  }, [vendorId, selectedThreadData, userId]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      clearError();

      const response = await messagingApi.getThreads();
      
      // Handle both response formats: { success, data: { threads } } and { threads }
      const threadsData = response.success ? (response.data?.threads || response.threads || []) : (response.threads || []);
      const sortedThreads = sortThreadsByActivity(threadsData) as Thread[];
      setThreads(sortedThreads);
      clearError();
    } catch (err) {
      console.error('Failed to load threads:', err);
      handleError(err as Error, 'loadThreads', true);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadSelect = async (thread: Thread) => {
    setSelectedThreadData(thread);
    responsiveActions.selectThread(thread.id);
    realtimeHandler.joinThread(thread.id);
    
    // Load messages from API
    try {
      const response = await messagingApi.getMessages(thread.id);
      // Handle both response formats: { success, data: { messages } } and { messages }
      const messagesData = response.success ? (response.data?.messages || response.messages || []) : (response.messages || []);
      setThreadMessages(messagesData);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setThreadMessages([]);
    }
    
    // Mark thread as read if it has unread messages
    if (thread.unreadCount > 0) {
      try {
        await messagingApi.markThreadAsRead(thread.id);
        setThreads(prev => clearThreadUnreadCount(prev, thread.id));
        
        // Decrement unread count in notification service
        for (let i = 0; i < thread.unreadCount; i++) {
          notificationService.decrementUnreadCount();
        }
      } catch (err) {
        console.error('Failed to mark thread as read:', err);
      }
    }
  };

  const handleSendMessage = async (
    content: string,
    messageType: MessageType,
    files?: File[]
  ): Promise<void> => {
    if (!selectedThreadData) {
      console.error('❌ Cannot send message: No thread selected');
      throw new Error('No thread selected');
    }

    console.log('📤 Sending message:', {
      threadId: selectedThreadData.id,
      content: content.substring(0, 50) + '...',
      messageType,
      filesCount: files?.length || 0
    });

    try {
      console.log('🌐 Making API call via messagingApi.sendMessage');
      const response = await messagingApi.sendMessage({
        threadId: selectedThreadData.id,
        content,
        messageType,
        attachments: files
      });

      console.log('✅ API Response:', response);
      
      // Handle both response formats: { success, data: { message } } and { message }
      const newMessage = response.success ? (response.data?.message || response.message) : response.message;
      
      if (newMessage) {
        console.log('✅ Message sent successfully:', newMessage.id);
        
        // Update UI immediately (optimistic update)
        setThreadMessages(prev => [...prev, newMessage]);
        setThreads(prev => {
          const updatedThreads = reorderThreadOnNewMessage(
            prev,
            selectedThreadData.id,
            truncateMessagePreview(content, 50),
            new Date(),
            false
          );
          return updatedThreads;
        });
        
        // Try to emit via WebSocket (non-blocking - don't fail if WS not connected)
        try {
          await realtimeHandler.emitMessage(newMessage);
          realtimeHandler.emitMessageRead(newMessage.id, userId);
          console.log('✅ WebSocket emit successful');
        } catch (wsError) {
          console.warn('⚠️  WebSocket emit failed (message already saved):', wsError);
          // Don't throw - message is already saved to database
        }
      } else {
        console.error('❌ No message in response:', response);
        throw new Error(response.error?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ Send message error:', error);
      throw error;
    }
  };

  const handleMessageRead = async (messageId: string) => {
    try {
      await messagingApi.markMessageAsRead(messageId);
      setThreadMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: MessageStatus.READ }
          : msg
      ));

      if (selectedThreadData) {
        setThreads(prev => prev.map(thread => 
          thread.id === selectedThreadData.id 
            ? { ...thread, unreadCount: Math.max(0, thread.unreadCount - 1) }
            : thread
        ));
      }
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const handleMessageDelete = async (messageId: string) => {
    try {
      await messagingApi.deleteMessage(messageId);
      setThreadMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
      throw new Error('Failed to delete message');
    }
  };

  const handleRetryLoad = () => {
    clearError();
    loadThreads();
  };

  const handleGoBack = () => {
    if (selectedThreadData) {
      realtimeHandler.leaveThread(selectedThreadData.id);
    }
    
    responsiveActions.goBackToThreadList();
    setSelectedThreadData(null);
    setThreadMessages([]);
  };

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = (thread.coupleName && typeof thread.coupleName === 'string' && thread.coupleName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (thread.lastMessage && typeof thread.lastMessage === 'string' && thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || thread.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)] bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-medium">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)] bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <SharedErrorDisplay
          error={error?.message || 'Failed to load conversations'}
          onRetry={canRetry ? handleRetryLoad : undefined}
          onDismiss={() => clearError()}
          variant="inline"
          showIcon={true}
          title="Failed to Load Conversations"
          retryText="Try Again"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-full relative">
      {/* Connection Status Banner */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none max-w-full">
        <ConnectionStatus variant="banner" />
      </div>

      {/* Sidebar - Thread List */}
      {responsiveState.showThreadList && (
        <div className={`${
          responsiveState.isMobile ? 'w-full h-full' : 'w-80 lg:w-96 border-r border-gray-200'
        } flex flex-col bg-white overflow-hidden flex-shrink-0`}>
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Messages</h2>
              {responsiveState.isMobile && (
                 <div className="w-8" /> /* Spacer for alignment */
              )}
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            
            {/* Filter Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg">
              {['all', 'active', 'archived'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as 'all' | 'active' | 'archived')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
                    filterStatus === status 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Thread List Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  {searchQuery ? 'No matching conversations found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredThreads.map((thread) => {
                  const isSelected = responsiveState.selectedThread === thread.id;
                  const hasUnread = thread.unreadCount > 0;

                  return (
                    <button
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread)}
                      className={`w-full p-4 text-left transition-all duration-200 hover:bg-gray-50 relative group ${
                        isSelected ? 'bg-indigo-50/60' : 'bg-white'
                      }`}
                    >
                      {/* Active Indicator Line */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                      )}
                      
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                            isSelected 
                              ? 'bg-indigo-100 text-indigo-700' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                          }`}>
                            {thread.coupleName ? thread.coupleName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          {hasUnread && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                              {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 py-0.5">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm truncate pr-2 ${
                              hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                            }`}>
                              {thread.coupleName || 'Unknown Couple'}
                            </h4>
                            <span className={`text-xs whitespace-nowrap ${
                              hasUnread ? 'text-indigo-600 font-semibold' : 'text-gray-400'
                            }`}>
                              {formatTime(thread.lastMessageTime)}
                            </span>
                          </div>
                          
                          <p className={`text-xs truncate mb-1.5 ${
                            hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {thread.lastMessage || 'Start the conversation...'}
                          </p>

                          {thread.serviceType && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200/50">
                              {thread.serviceType}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      {responsiveState.showMessageView && (
        <div className={`flex-1 flex flex-col bg-gray-50/50 relative overflow-hidden ${
          responsiveState.isMobile ? 'absolute inset-0 z-20 bg-white' : ''
        }`}>
          {selectedThreadData ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 md:px-6 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  {responsiveState.isMobile && (
                    <button
                      onClick={handleGoBack}
                      className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                      {selectedThreadData.coupleName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">
                        {selectedThreadData.coupleName || 'Unknown Couple'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <p className="text-xs text-gray-500">
                          {selectedThreadData.serviceType || 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   {selectedThreadData.leadId && (
                    <button className="hidden sm:flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/50">
                      View Lead
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-hidden relative bg-white">
                {/* Debug info for alignment */}
                <SharedMessageThread
                  messages={threadMessages}
                  currentUserId={userId}
                  currentUserType={UserType.VENDOR}
                  onMessageRead={handleMessageRead}
                  onMessageDelete={handleMessageDelete}
                  colorScheme="blue"
                />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-200">
                <SharedMessageInput
                  threadId={selectedThreadData.id}
                  onSendMessage={handleSendMessage}
                  onTypingStart={() => realtimeHandler.emitTyping(selectedThreadData.id, true)}
                  onTypingStop={() => realtimeHandler.emitTyping(selectedThreadData.id, false)}
                  placeholder="Type a message..."
                  maxFileSize={25}
                  allowedFileTypes={['image/jpeg', 'image/png', 'image/gif', 'application/pdf']}
                  colorScheme="blue"
                />
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 transform rotate-3 transition-transform hover:rotate-6">
                <MessageSquare className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Conversation</h3>
              <p className="text-gray-500 max-w-xs mx-auto text-sm leading-relaxed">
                Choose a conversation from the list on the left to start messaging your clients.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to format time
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(date).toLocaleDateString();
}

export default VendorMessaging;