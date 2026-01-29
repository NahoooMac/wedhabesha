/**
 * @fileoverview Messaging API Service
 * 
 * Provides API functions for messaging between couples and vendors.
 * Handles threads, messages, and real-time communication.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-29
 */

import { apiClient } from '../lib/api';
import { Message, MessageThread, MessageType, UserType } from '../types/messaging';

/**
 * API Response Types
 */
export interface ThreadsResponse {
  success: boolean;
  data: {
    threads: Array<{
      id: string;
      participants: {
        coupleId: string;
        vendorId: string;
      };
      vendorName: string;
      vendorCategory: string;
      vendorAvatar?: string;
      vendorPhone?: string;
      isVerified?: boolean;
      lastMessage: string;
      lastMessageTime: string;
      unreadCount: number;
      status: 'active' | 'archived';
      metadata?: {
        leadId?: string;
        serviceType?: string;
      };
    }>;
  };
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
  };
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SendMessageRequest {
  threadId: string;
  content: string;
  messageType: MessageType;
  attachments?: File[];
}

export interface SendMessageResponse {
  success: boolean;
  data: {
    message: Message;
  };
}

export interface CreateThreadRequest {
  vendorId: string;
  initialMessage?: string;
  metadata?: {
    leadId?: string;
    serviceType?: string;
  };
}

export interface CreateThreadResponse {
  success: boolean;
  data: {
    thread: MessageThread;
  };
}

/**
 * Messaging API Client
 */
export const messagingApi = {
  /**
   * Get all threads for the current user (couple)
   */
  getThreads: async (limit = 50, offset = 0): Promise<ThreadsResponse> => {
    return apiClient.get<ThreadsResponse>(
      `/api/v1/messaging/threads?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Get a specific thread by ID
   */
  getThread: async (threadId: string): Promise<{ success: boolean; data: { thread: MessageThread } }> => {
    return apiClient.get(`/api/v1/messaging/threads/${threadId}`);
  },

  /**
   * Create a new thread with a vendor
   */
  createThread: async (data: CreateThreadRequest): Promise<CreateThreadResponse> => {
    return apiClient.post<CreateThreadResponse>('/api/v1/messaging/threads', data);
  },

  /**
   * Get messages for a specific thread
   */
  getMessages: async (
    threadId: string,
    limit = 50,
    offset = 0
  ): Promise<MessagesResponse> => {
    return apiClient.get<MessagesResponse>(
      `/api/v1/messaging/messages/${threadId}?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Send a message in a thread
   */
  sendMessage: async (data: SendMessageRequest): Promise<SendMessageResponse> => {
    const { threadId, content, messageType, attachments } = data;

    // If there are attachments, use FormData
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      formData.append('threadId', threadId);
      formData.append('content', content);
      formData.append('messageType', messageType);
      
      // Append files with the correct field name expected by multer
      attachments.forEach((file) => {
        formData.append('files', file);
      });

      // Make request with FormData (no Content-Type header, browser will set it)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/messaging/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || localStorage.getItem('access_token') || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('File upload failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    }

    // No attachments, use JSON
    return apiClient.post<SendMessageResponse>('/api/v1/messaging/messages', {
      threadId,
      content,
      messageType,
    });
  },

  /**
   * Mark a message as read
   */
  markMessageAsRead: async (messageId: string): Promise<{ success: boolean }> => {
    return apiClient.put<{ success: boolean }>(
      `/api/v1/messaging/messages/${messageId}/read`,
      {}
    );
  },

  /**
   * Mark all messages in a thread as read
   */
  markThreadAsRead: async (threadId: string): Promise<{ success: boolean }> => {
    return apiClient.put<{ success: boolean }>(
      `/api/v1/messaging/threads/${threadId}/read`,
      {}
    );
  },

  /**
   * Delete a message
   */
  deleteMessage: async (messageId: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(
      `/api/v1/messaging/messages/${messageId}`
    );
  },

  /**
   * Search messages in a thread
   */
  searchMessages: async (
    threadId: string,
    query: string
  ): Promise<MessagesResponse> => {
    return apiClient.get<MessagesResponse>(
      `/api/v1/messaging/search/${threadId}?q=${encodeURIComponent(query)}`
    );
  },

  /**
   * Get unread message count
   */
  getUnreadCount: async (): Promise<{ success: boolean; data: { count: number } }> => {
    return apiClient.get('/api/v1/messaging/unread-count');
  },
};
