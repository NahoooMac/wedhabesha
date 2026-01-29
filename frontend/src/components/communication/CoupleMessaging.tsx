/**
 * @fileoverview CoupleMessaging Component
 * 
 * A comprehensive messaging interface that enables couples to communicate with vendors
 * in real-time. Provides thread management, message composition, file attachments,
 * search functionality, and mobile-responsive design.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-27
 * 
 * Features:
 * - Real-time messaging via WebSocket
 * - Thread list with search and filtering
 * - File attachment support
 * - Typing indicators and read receipts
 * - Mobile-responsive layout
 * - Error handling and retry logic
 * - Notification management
 * 
 * Requirements satisfied:
 * - 1.1: Couple thread access and display
 * - 1.2: Thread list with vendor information
 * - 3.1: Send and receive messages
 * - 4.1: File attachment support
 * - 5.1: Real-time features (typing, read receipts)
 * - 6.1-6.5: Search and filter functionality
 * - 8.1-8.5: Notification support
 * - 9.1-9.5: Mobile responsiveness
 * - 12.1-12.5: Error handling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Search, ChevronLeft, Phone, Loader2, Bell, BellOff } from 'lucide-react';
import { SharedMessageThread } from './SharedMessageThread';
import { SharedMessageInput } from './SharedMessageInput';
import { ConnectionStatus } from './ConnectionStatus';
import { Message, MessageType, UserType, MessageStatus } from '../../types/messaging';
import { useResponsiveMessaging } from '../../hooks/useResponsiveMessaging';
import { messagingApi } from '../../services/messagingApi';
import { realtimeHandler } from '../../services/realtimeHandler';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/messaging-design-tokens.css';

/**
 * Thread interface representing a conversation between couple and vendor
 * 
 * @interface Thread
 * @property {string} id - Unique thread identifier
 * @property {string} vendorName - Vendor business name
 * @property {string} vendorId - Vendor unique identifier
 * @property {string} vendorCategory - Vendor service category (e.g., 'Photography')
 * @property {string} [vendorAvatar] - Optional vendor profile image URL
 * @property {boolean} [isVerified] - Whether vendor is verified
 * @property {string} lastMessage - Preview of most recent message
 * @property {Date} lastMessageTime - Timestamp of last message
 * @property {number} unreadCount - Number of unread messages in thread
 * @property {'active' | 'archived'} status - Thread status
 * @property {string} [leadId] - Associated lead ID if thread originated from lead
 */

interface Thread {
  id: string;
  vendorName: string;
  vendorId: string;
  vendorCategory: string;
  vendorAvatar?: string;
  vendorPhone?: string; // Added for call functionality
  isVerified?: boolean;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'active' | 'archived';
}

/* ==========================================================================================
   ✅ MAIN COMPONENT (Updated with Branding & Phone Feature)
   ========================================================================================== */

interface CoupleMessagingProps {
  userId?: string; 
  initialThreadId?: string | null;
  onThreadOpened?: () => void;
}

const CoupleMessaging: React.FC<CoupleMessagingProps> = ({ 
  userId: propUserId, 
  initialThreadId, 
  onThreadOpened 
}) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id?.toString() || 'currentUser123';
  
  // State management
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedThreadData, setSelectedThreadData] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null); // Add couple ID state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const { state: responsiveState, actions: responsiveActions } = useResponsiveMessaging({
    initialThreadId,
  });

  // Fetch couple ID from backend
  useEffect(() => {
    const fetchCoupleId = async () => {
      try {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
        if (!token) {
          console.warn('⚠️  No auth token found, using fallback userId');
          setCoupleId(userId);
          return;
        }

        console.log('🔍 Attempting to fetch couple ID from /api/v1/auth/me');
        const response = await fetch('/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const fetchedCoupleId = data.couple?.id || data.id;
          if (fetchedCoupleId) {
            setCoupleId(fetchedCoupleId?.toString());
            console.log('✅ Fetched couple ID:', fetchedCoupleId);
          } else {
            console.warn('⚠️  No couple ID in response, using fallback userId');
            setCoupleId(userId);
          }
        } else {
          console.warn('⚠️  Failed to fetch couple ID (status:', response.status, '), using fallback userId');
          setCoupleId(userId);
        }
      } catch (err) {
        console.error('❌ Failed to fetch couple ID:', err);
        // Fallback: use userId if couple ID fetch fails
        setCoupleId(userId);
      }
    };

    fetchCoupleId();
  }, [userId]);

  // Load threads from database
  const loadThreads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await messagingApi.getThreads();
      
      if (response.success && response.data && response.data.threads) {
        const formattedThreads: Thread[] = response.data.threads.map(thread => {
          // Extract vendorId from different possible locations
          const vendorId = thread.participants?.vendorId || (thread as any).vendorId || '';
          
          return {
            id: thread.id,
            vendorName: thread.vendorName || 'Unknown Vendor',
            vendorId: vendorId,
            vendorCategory: thread.vendorCategory || 'Service Provider',
            vendorAvatar: thread.vendorAvatar,
            vendorPhone: thread.vendorPhone,
            isVerified: thread.isVerified,
            lastMessage: thread.lastMessage || 'No messages yet',
            lastMessageTime: new Date(thread.lastMessageTime || Date.now()),
            unreadCount: thread.unreadCount || 0,
            status: thread.status || 'active',
          };
        });
        setThreads(formattedThreads);
      } else if (response.data && Array.isArray(response.data)) {
        // Handle case where threads are directly in data array
        const formattedThreads: Thread[] = response.data.map(thread => {
          // Extract vendorId from different possible locations
          const vendorId = thread.participants?.vendorId || (thread as any).vendorId || '';
          
          return {
            id: thread.id,
            vendorName: thread.vendorName || 'Unknown Vendor',
            vendorId: vendorId,
            vendorCategory: thread.vendorCategory || 'Service Provider',
            vendorAvatar: thread.vendorAvatar,
            vendorPhone: thread.vendorPhone,
            isVerified: thread.isVerified,
            lastMessage: thread.lastMessage || 'No messages yet',
            lastMessageTime: new Date(thread.lastMessageTime || Date.now()),
            unreadCount: thread.unreadCount || 0,
            status: thread.status || 'active',
          };
        });
        setThreads(formattedThreads);
      }
    } catch (err) {
      console.error('Failed to load threads:', err);
      setError('Failed to load conversations. Please check your connection and try again.');
      setThreads([]); // Clear threads on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages for a thread
  const loadMessages = useCallback(async (threadId: string) => {
    try {
      setLoadingMessages(true);
      const response = await messagingApi.getMessages(threadId);
      
      if (response.success && response.data.messages) {
        setMessages(response.data.messages);
        // Mark thread as read
        await messagingApi.markThreadAsRead(threadId);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages. Please try again.');
      setMessages([]); // Clear messages on error
    } finally {
      setLoadingMessages(false);
    }
  }, [threads, userId]);

  // Initial load and WebSocket connection
  useEffect(() => {
    loadThreads();
    
    // Request notification permission
    if (notificationService.isSupported() && notificationService.getPermissionStatus() === 'default') {
      notificationService.requestNotificationPermission();
    }
    
    // Update notification permission state
    setNotificationPermission(notificationService.getPermissionStatus());
    
    // Initialize WebSocket connection
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
    if (token && !realtimeHandler.isConnected()) {
      console.log('🔌 Initializing WebSocket connection...');
      realtimeHandler.connect(token);
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount as other components might be using it
      // realtimeHandler.disconnect();
    };
  }, [loadThreads]);

  // Setup real-time message listener
  useEffect(() => {
    const unsubscribe = realtimeHandler.onMessageReceived((message: Message) => {
      // Add new message to the list if it's for the current thread
      if (message.threadId === selectedThreadData?.id) {
        setMessages(prev => [...prev, message]);
      }
      
      // Show notification for messages from vendors (not our own messages)
      if (message.senderId !== (coupleId || userId)) {
        const thread = threads.find(t => t.id === message.threadId);
        const senderName = thread?.vendorName || 'Vendor';
        const messagePreview = message.content.length > 50 
          ? message.content.substring(0, 50) + '...' 
          : message.content;
        
        // Show browser notification
        notificationService.showMessageNotification(
          senderName,
          messagePreview,
          message.threadId
        );
        
        // Play notification sound
        notificationService.playNotificationSound();
        
        // Update unread count if not viewing this thread
        if (message.threadId !== selectedThreadData?.id) {
          notificationService.incrementUnreadCount();
        }
      }
      
      // Update thread list with new message
      setThreads(prev => prev.map(thread => {
        if (thread.id === message.threadId) {
          return {
            ...thread,
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            unreadCount: message.threadId === selectedThreadData?.id ? thread.unreadCount : thread.unreadCount + 1,
          };
        }
        return thread;
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [selectedThreadData, threads, coupleId, userId]);

  // Handle page visibility changes for notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      notificationService.handleVisibilityChange();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      notificationService.cleanup();
    };
  }, []);

  // Open initial thread if provided
  useEffect(() => {
    if (initialThreadId && threads.length > 0) {
      const thread = threads.find(t => t.id === initialThreadId);
      if (thread) {
        handleThreadSelect(thread);
        if (onThreadOpened) {
          onThreadOpened();
        }
      }
    }
  }, [initialThreadId, threads, onThreadOpened]);

  const handleThreadSelect = async (thread: Thread) => {
    setSelectedThreadData(thread);
    responsiveActions.selectThread(thread.id);
    
    // Join the thread room for real-time updates
    realtimeHandler.joinThread(thread.id);
    
    // Load messages for this thread
    await loadMessages(thread.id);
    
    // Clear unread count for this thread
    setThreads(prev => prev.map(t => 
      t.id === thread.id ? { ...t, unreadCount: 0 } : t
    ));
    
    // Decrement unread count in notification service
    if (thread.unreadCount > 0) {
      for (let i = 0; i < thread.unreadCount; i++) {
        notificationService.decrementUnreadCount();
      }
    }
  };

  const sendMessage = async (content: string, type: MessageType = MessageType.TEXT, files?: File[]) => {
    if (!selectedThreadData) return;

    try {
      // Optimistically add message to UI
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        threadId: selectedThreadData.id,
        senderId: coupleId || userId,
        senderType: UserType.COUPLE,
        content,
        messageType: type,
        status: MessageStatus.SENT,
        isDeleted: false,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to server
      const response = await messagingApi.sendMessage({
        threadId: selectedThreadData.id,
        content,
        messageType: type,
        attachments: files,
      });

      if (response.success && response.data.message) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg => 
          String(msg.id) === String(optimisticMessage.id) ? response.data.message : msg
        ));

        // Update thread list
        setThreads(prev => prev.map(thread => {
          if (thread.id === selectedThreadData.id) {
            return {
              ...thread,
              lastMessage: content,
              lastMessageTime: new Date(),
            };
          }
          return thread;
        }));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !String(msg.id).startsWith('temp-')));
    }
  };

  const handleGoBack = () => {
    responsiveActions.goBackToThreadList();
    setSelectedThreadData(null);
  };

  const handleNotificationToggle = async () => {
    if (notificationPermission === 'default') {
      const granted = await notificationService.requestNotificationPermission();
      setNotificationPermission(granted ? 'granted' : 'denied');
    }
  };

  // Filter threads based on search query
  const filteredThreads = threads.filter(thread =>
    (thread.vendorName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (thread.vendorCategory?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] w-full bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
          <p className="text-gray-500 font-medium">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-[600px] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-full w-full ${responsiveState.isMobile ? 'flex-col' : ''}`}>
      
      {/* Sidebar - Thread List */}
      {responsiveState.showThreadList && (
        <div className={`${
          responsiveState.isMobile ? 'w-full h-full' : 'w-80 lg:w-96 border-r border-gray-200'
        } flex flex-col bg-white flex-shrink-0 overflow-hidden`}>
          
          {/* Header */}
          <div className="p-4 border-b border-gray-100 space-y-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Vendor Messages
              </h2>
              <div className="flex items-center gap-2">
                {/* Notification Permission Button */}
                {notificationService.isSupported() && (
                  <button
                    onClick={handleNotificationToggle}
                    className={`p-2 rounded-full transition-colors ${
                      notificationPermission === 'granted'
                        ? 'text-green-600 hover:bg-green-50'
                        : notificationPermission === 'denied'
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title={
                      notificationPermission === 'granted'
                        ? 'Notifications enabled'
                        : notificationPermission === 'denied'
                        ? 'Notifications blocked'
                        : 'Enable notifications'
                    }
                  >
                    {notificationPermission === 'granted' ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                  </button>
                )}
                <ConnectionStatus />
              </div>
            </div>
            
            <div className="relative group w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {error && (
              <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    loadThreads();
                  }}
                  className="mt-2 text-sm text-red-700 underline hover:text-red-800"
                >
                  Try again
                </button>
              </div>
            )}
            
            {filteredThreads.length === 0 && !error && !loading && (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
                {!searchQuery && (
                  <p className="text-gray-400 text-xs mt-1">
                    Start by contacting a vendor from the directory
                  </p>
                )}
              </div>
            )}
            
            {filteredThreads.map(thread => {
                const isSelected = responsiveState.selectedThread === thread.id;
                return (
                  <button
                    key={thread.id}
                    onClick={() => handleThreadSelect(thread)}
                    className={`w-full p-4 text-left transition-all duration-200 hover:bg-purple-50 relative border-b border-gray-50 ${
                      isSelected ? 'bg-purple-50/60' : 'bg-white'
                    }`}
                  >
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600" />}
                    
                    <div className="flex items-start gap-3 w-full">
                      <div className="relative flex-shrink-0">
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                           isSelected 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-gray-100 text-gray-600'
                         }`}>
                           {(thread.vendorName || 'V').charAt(0)}
                         </div>
                         {thread.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                            {thread.unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <h3 className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-bold' : 'font-semibold'}`}>
                              {thread.vendorName || 'Unknown Vendor'}
                            </h3>
                            {thread.isVerified && (
                              <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">2h</span>
                        </div>
                        <p className={`text-xs truncate ${thread.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                          {thread.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                );
            })}
          </div>
        </div>
      )}

      {/* Main Chat View */}
      {responsiveState.showMessageView && (
        <div className={`flex-1 flex flex-col bg-gray-50/30 relative overflow-hidden w-full ${
          responsiveState.isMobile ? 'absolute inset-0 z-20 bg-white' : ''
        }`}>
          {selectedThreadData ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  {responsiveState.isMobile && (
                    <button onClick={handleGoBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                    {(selectedThreadData.vendorName || 'V').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-gray-900 truncate">{selectedThreadData.vendorName || 'Unknown Vendor'}</h3>
                      {selectedThreadData.isVerified && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified Vendor">
                          <title>Verified Vendor</title>
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{selectedThreadData.vendorCategory || 'Service Provider'}</p>
                  </div>
                </div>
                
                {/* ✅ FEATURE: Phone Button with proper functionality */}
                {selectedThreadData.vendorPhone ? (
                  <a 
                    href={`tel:${selectedThreadData.vendorPhone}`}
                    className="p-2.5 text-white bg-purple-600 hover:bg-purple-700 rounded-full transition-colors flex items-center justify-center shadow-sm"
                    title={`Call ${selectedThreadData.vendorName || 'Vendor'}`}
                    onClick={(e) => {
                      // Confirm before calling on desktop
                      if (window.innerWidth > 768) {
                        if (!confirm(`Call ${selectedThreadData.vendorName || 'Vendor'} at ${selectedThreadData.vendorPhone}?`)) {
                          e.preventDefault();
                        }
                      }
                    }}
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                ) : (
                  <div className="p-2.5 text-gray-400 bg-gray-100 rounded-full cursor-not-allowed" title="Phone number not available">
                    <Phone className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 min-h-0 flex flex-col bg-white w-full">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <p className="text-red-600 mb-4">{error}</p>
                      <button
                        onClick={() => {
                          setError(null);
                          if (selectedThreadData) {
                            loadMessages(selectedThreadData.id);
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Debug info for alignment */}
                <SharedMessageThread
                      messages={messages}
                      currentUserId={coupleId || userId}
                      currentUserType={UserType.COUPLE}
                    />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-200 w-full flex-shrink-0">
                <SharedMessageInput
                  threadId={selectedThreadData.id}
                  onSendMessage={sendMessage}
                  placeholder="Type a message..."
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Conversation</h3>
              <p className="text-gray-500 text-sm">Choose a vendor to start messaging.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CoupleMessaging;