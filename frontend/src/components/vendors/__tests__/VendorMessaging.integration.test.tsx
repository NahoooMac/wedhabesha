import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { VendorMessaging } from '../VendorMessaging';
import { realtimeHandler } from '../../../services/realtimeHandler';

/**
 * VendorMessaging Integration Tests
 * 
 * Tests the integration of messaging components with vendor dashboard
 * Requirements: 2.1, 3.1, 8.1
 * 
 * Feature: vendor-dashboard-messaging-enhancement
 */

// Mock the realtimeHandler
jest.mock('../../../services/realtimeHandler', () => ({
  realtimeHandler: {
    onMessageReceived: jest.fn(() => jest.fn()),
    onTypingIndicator: jest.fn(() => jest.fn()),
    emitMessage: jest.fn(),
    emitTyping: jest.fn(),
    joinThread: jest.fn(),
    leaveThread: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('VendorMessaging Integration Tests', () => {
  const mockVendorId = 'vendor-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Component Rendering', () => {
    test('should render loading state initially', () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(() => {}) // Never resolves to keep loading state
      );

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      expect(screen.getByText(/loading conversations/i)).toBeInTheDocument();
    });

    test('should render thread list after loading', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Hello, interested in your services',
          lastMessageTime: new Date(),
          unreadCount: 2,
          status: 'active'
        },
        {
          id: 'thread-2',
          coupleName: 'Mike & Sarah',
          coupleId: 'couple-2',
          lastMessage: 'Thank you for the information',
          lastMessageTime: new Date(),
          unreadCount: 0,
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
        expect(screen.getByText('Mike & Sarah')).toBeInTheDocument();
      });
    });

    test('should render error state on fetch failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load conversations/i)).toBeInTheDocument();
      });
    });
  });

  describe('Thread Selection and Messaging', () => {
    test('should select thread and display message interface', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Hello',
          lastMessageTime: new Date(),
          unreadCount: 1,
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
      });

      // Click on thread
      const threadButton = screen.getByText('John & Jane').closest('button');
      fireEvent.click(threadButton!);

      // Should show message interface
      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
      });
    });

    test('should clear unread count when thread is selected', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Hello',
          lastMessageTime: new Date(),
          unreadCount: 3,
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Unread badge
      });

      // Click on thread
      const threadButton = screen.getByText('John & Jane').closest('button');
      fireEvent.click(threadButton!);

      // Unread count should be cleared
      await waitFor(() => {
        expect(screen.queryByText('3')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter', () => {
    test('should filter threads by search query', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Photography services',
          lastMessageTime: new Date(),
          unreadCount: 0,
          status: 'active'
        },
        {
          id: 'thread-2',
          coupleName: 'Mike & Sarah',
          coupleId: 'couple-2',
          lastMessage: 'Catering inquiry',
          lastMessageTime: new Date(),
          unreadCount: 0,
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
        expect(screen.getByText('Mike & Sarah')).toBeInTheDocument();
      });

      // Search for "photography"
      const searchInput = screen.getByPlaceholderText(/search conversations/i);
      fireEvent.change(searchInput, { target: { value: 'photography' } });

      // Should only show matching thread
      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
        expect(screen.queryByText('Mike & Sarah')).not.toBeInTheDocument();
      });
    });

    test('should filter threads by status', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Active conversation',
          lastMessageTime: new Date(),
          unreadCount: 0,
          status: 'active'
        },
        {
          id: 'thread-2',
          coupleName: 'Mike & Sarah',
          coupleId: 'couple-2',
          lastMessage: 'Archived conversation',
          lastMessageTime: new Date(),
          unreadCount: 0,
          status: 'archived'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
        expect(screen.getByText('Mike & Sarah')).toBeInTheDocument();
      });

      // Filter by active
      const activeButton = screen.getByText('Active');
      fireEvent.click(activeButton);

      // Should only show active threads
      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
        expect(screen.queryByText('Mike & Sarah')).not.toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    test('should update thread list on new message', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Old message',
          lastMessageTime: new Date(Date.now() - 60000),
          unreadCount: 0,
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      let messageCallback: any;
      (realtimeHandler.onMessageReceived as jest.Mock).mockImplementation((callback) => {
        messageCallback = callback;
        return jest.fn();
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Old message')).toBeInTheDocument();
      });

      // Simulate new message received
      const newMessage = {
        id: 'msg-1',
        threadId: 'thread-1',
        senderId: 'couple-1',
        senderType: 'couple',
        content: 'New message received',
        createdAt: new Date()
      };

      messageCallback(newMessage);

      // Thread should update with new message
      await waitFor(() => {
        expect(screen.getByText('New message received')).toBeInTheDocument();
      });
    });

    test('should increment unread count for new messages', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Hello',
          lastMessageTime: new Date(),
          unreadCount: 0,
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      let messageCallback: any;
      (realtimeHandler.onMessageReceived as jest.Mock).mockImplementation((callback) => {
        messageCallback = callback;
        return jest.fn();
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
      });

      // Simulate new message from couple (not current user)
      const newMessage = {
        id: 'msg-1',
        threadId: 'thread-1',
        senderId: 'couple-1',
        senderType: 'couple',
        content: 'New message',
        createdAt: new Date()
      };

      messageCallback(newMessage);

      // Should show unread badge
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Integration', () => {
    test('should display lead information with thread', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Hello',
          lastMessageTime: new Date(),
          unreadCount: 0,
          leadId: 'lead-123',
          serviceType: 'Photography',
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Photography')).toBeInTheDocument();
      });
    });

    test('should show view lead button when lead exists', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Hello',
          lastMessageTime: new Date(),
          unreadCount: 0,
          leadId: 'lead-123',
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
      });

      // Select thread
      const threadButton = screen.getByText('John & Jane').closest('button');
      fireEvent.click(threadButton!);

      // Should show view lead button
      await waitFor(() => {
        expect(screen.getByText('View Lead')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    test('should show empty state when no threads exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: [] })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
      });
    });

    test('should show empty state when search has no results', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Hello',
          lastMessageTime: new Date(),
          unreadCount: 0,
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
      });

      // Search for non-existent term
      const searchInput = screen.getByPlaceholderText(/search conversations/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/no conversations found/i)).toBeInTheDocument();
      });
    });

    test('should show select conversation prompt when no thread selected', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          coupleName: 'John & Jane',
          coupleId: 'couple-1',
          lastMessage: 'Hello',
          lastMessageTime: new Date(),
          unreadCount: 0,
          status: 'active'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads })
      });

      render(<VendorMessaging vendorId={mockVendorId} userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/select a conversation/i)).toBeInTheDocument();
      });
    });
  });
});
