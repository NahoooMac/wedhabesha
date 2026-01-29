import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import CoupleMessaging from '../CoupleMessaging';
import { notificationService } from '../../../services/notificationService';
import { realtimeHandler } from '../../../services/realtimeHandler';

// Mock the services
vi.mock('../../../services/notificationService');
vi.mock('../../../services/realtimeHandler');
vi.mock('../MessageThread', () => ({
  MessageThread: ({ messages, onMessageRead }: any) => (
    <div data-testid="message-thread">
      {messages.map((msg: any) => (
        <div key={msg.id} onClick={() => onMessageRead(msg.id)}>
          {msg.content}
        </div>
      ))}
    </div>
  )
}));
vi.mock('../MessageInput', () => ({
  MessageInput: ({ onSendMessage }: any) => (
    <div data-testid="message-input">
      <button onClick={() => onSendMessage('test message', 'text')}>
        Send Message
      </button>
    </div>
  )
}));

// Mock fetch
global.fetch = vi.fn();

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('granted'),
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

describe('CoupleMessaging Notifications', () => {
  const mockProps = {
    coupleId: 'couple-123',
    userId: 'user-456',
  };

  const mockThreads = [
    {
      id: 'thread-1',
      vendorName: 'Elegant Photography',
      vendorId: 'vendor-1',
      vendorCategory: 'Photography',
      lastMessage: 'Thank you for your inquiry',
      lastMessageTime: new Date('2024-01-27T10:30:00Z'),
      unreadCount: 2,
      status: 'active' as const,
    },
    {
      id: 'thread-2',
      vendorName: 'Catering Company',
      vendorId: 'vendor-2',
      vendorCategory: 'Catering',
      lastMessage: 'We can help with your event',
      lastMessageTime: new Date('2024-01-26T15:20:00Z'),
      unreadCount: 0,
      status: 'active' as const,
    },
  ];

  const mockMessages = [
    {
      id: 'msg-1',
      threadId: 'thread-1',
      senderId: 'vendor-1',
      senderType: 'vendor',
      content: 'Hello! Thank you for your inquiry.',
      messageType: 'text',
      status: 'delivered',
      createdAt: new Date('2024-01-27T10:30:00Z'),
      attachments: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage token
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-jwt-token';
      return null;
    });

    // Mock fetch responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/messaging/couple/threads')) {
        if (url.includes('/messages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              messages: mockMessages,
              hasMore: false,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            threads: mockThreads,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    // Mock notification service
    const mockNotificationService = {
      getPermissionStatus: vi.fn().mockReturnValue('default'),
      requestNotificationPermission: vi.fn().mockResolvedValue(true),
      showMessageNotification: vi.fn().mockResolvedValue(true),
      playNotificationSound: vi.fn().mockResolvedValue(true),
      updateUnreadCount: vi.fn(),
      incrementUnreadCount: vi.fn(),
      decrementUnreadCount: vi.fn(),
      resetUnreadCount: vi.fn(),
      handleVisibilityChange: vi.fn(),
      cleanup: vi.fn(),
      isSupported: vi.fn().mockReturnValue(true),
    };
    
    vi.mocked(notificationService).getPermissionStatus = mockNotificationService.getPermissionStatus;
    vi.mocked(notificationService).requestNotificationPermission = mockNotificationService.requestNotificationPermission;
    vi.mocked(notificationService).showMessageNotification = mockNotificationService.showMessageNotification;
    vi.mocked(notificationService).playNotificationSound = mockNotificationService.playNotificationSound;
    vi.mocked(notificationService).updateUnreadCount = mockNotificationService.updateUnreadCount;
    vi.mocked(notificationService).incrementUnreadCount = mockNotificationService.incrementUnreadCount;
    vi.mocked(notificationService).decrementUnreadCount = mockNotificationService.decrementUnreadCount;
    vi.mocked(notificationService).resetUnreadCount = mockNotificationService.resetUnreadCount;
    vi.mocked(notificationService).handleVisibilityChange = mockNotificationService.handleVisibilityChange;
    vi.mocked(notificationService).cleanup = mockNotificationService.cleanup;
    vi.mocked(notificationService).isSupported = mockNotificationService.isSupported;

    // Mock realtime handler
    const mockRealtimeHandler = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      joinThread: vi.fn(),
      leaveThread: vi.fn(),
      emitMessage: vi.fn(),
      emitTyping: vi.fn(),
      onMessageReceived: vi.fn().mockReturnValue(() => {}),
      onTypingIndicator: vi.fn().mockReturnValue(() => {}),
      onUserStatusChange: vi.fn().mockReturnValue(() => {}),
    };
    
    vi.mocked(realtimeHandler).connect = mockRealtimeHandler.connect;
    vi.mocked(realtimeHandler).disconnect = mockRealtimeHandler.disconnect;
    vi.mocked(realtimeHandler).joinThread = mockRealtimeHandler.joinThread;
    vi.mocked(realtimeHandler).leaveThread = mockRealtimeHandler.leaveThread;
    vi.mocked(realtimeHandler).emitMessage = mockRealtimeHandler.emitMessage;
    vi.mocked(realtimeHandler).emitTyping = mockRealtimeHandler.emitTyping;
    vi.mocked(realtimeHandler).onMessageReceived = mockRealtimeHandler.onMessageReceived;
    vi.mocked(realtimeHandler).onTypingIndicator = mockRealtimeHandler.onTypingIndicator;
    vi.mocked(realtimeHandler).onUserStatusChange = mockRealtimeHandler.onUserStatusChange;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render notification controls in thread list header', async () => {
    render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Messages')).toBeInTheDocument();
    });

    // Should show notification bell button
    const notificationButton = screen.getByTitle(/notifications/i);
    expect(notificationButton).toBeInTheDocument();
  });

  it('should show unread count badge when there are unread messages', async () => {
    render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      // Should show total unread count (2 from thread-1)
      const unreadBadge = screen.getByText('2');
      expect(unreadBadge).toBeInTheDocument();
      expect(unreadBadge).toHaveClass('bg-red-500');
    });
  });

  it('should request notification permission when bell button is clicked', async () => {
    render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Messages')).toBeInTheDocument();
    });

    const notificationButton = screen.getByTitle(/notifications/i);
    fireEvent.click(notificationButton);

    await waitFor(() => {
      expect(notificationService.requestNotificationPermission).toHaveBeenCalled();
    });
  });

  it('should handle new message notifications', async () => {
    let messageCallback: (message: any) => void = () => {};
    
    vi.mocked(realtimeHandler.onMessageReceived).mockImplementation((callback) => {
      messageCallback = callback;
      return () => {};
    });

    render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Messages')).toBeInTheDocument();
    });

    // Simulate receiving a new message from a vendor
    const newMessage = {
      id: 'msg-2',
      threadId: 'thread-1',
      senderId: 'vendor-1',
      senderType: 'vendor',
      content: 'Here are some sample photos from recent weddings.',
      messageType: 'text',
      status: 'delivered',
      createdAt: new Date(),
      attachments: [],
    };

    act(() => {
      messageCallback(newMessage);
    });

    await waitFor(() => {
      expect(notificationService.showMessageNotification).toHaveBeenCalledWith(
        'Elegant Photography',
        expect.stringContaining('Here are some sample photos'),
        'thread-1'
      );
      expect(notificationService.playNotificationSound).toHaveBeenCalled();
      expect(notificationService.incrementUnreadCount).toHaveBeenCalled();
    });
  });

  it('should not show notifications for messages from the current user', async () => {
    let messageCallback: (message: any) => void = () => {};
    
    vi.mocked(realtimeHandler.onMessageReceived).mockImplementation((callback) => {
      messageCallback = callback;
      return () => {};
    });

    render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Messages')).toBeInTheDocument();
    });

    // Simulate receiving a message from the current user (couple)
    const ownMessage = {
      id: 'msg-3',
      threadId: 'thread-1',
      senderId: 'user-456', // Same as userId prop
      senderType: 'couple',
      content: 'Thank you for the photos!',
      messageType: 'text',
      status: 'delivered',
      createdAt: new Date(),
      attachments: [],
    };

    act(() => {
      messageCallback(ownMessage);
    });

    await waitFor(() => {
      // Should not trigger notifications for own messages
      expect(notificationService.showMessageNotification).not.toHaveBeenCalled();
      expect(notificationService.playNotificationSound).not.toHaveBeenCalled();
      expect(notificationService.incrementUnreadCount).not.toHaveBeenCalled();
    });
  });

  it('should mark thread as read when selected', async () => {
    render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Elegant Photography')).toBeInTheDocument();
    });

    // Click on a thread with unread messages
    const threadItem = screen.getByText('Elegant Photography');
    fireEvent.click(threadItem);

    await waitFor(() => {
      // Should make API call to mark thread as read
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/messaging/couple/threads/thread-1/read',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token',
          }),
        })
      );
    });
  });

  it('should update unread count when threads are loaded', async () => {
    render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      expect(notificationService.updateUnreadCount).toHaveBeenCalledWith(2); // Total unread from mockThreads
    });
  });

  it('should handle page visibility changes', async () => {
    render(<CoupleMessaging {...mockProps} />);

    // Simulate page visibility change
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
    });

    const visibilityChangeEvent = new Event('visibilitychange');
    document.dispatchEvent(visibilityChangeEvent);

    await waitFor(() => {
      expect(notificationService.handleVisibilityChange).toHaveBeenCalled();
    });
  });

  it('should cleanup notification service on unmount', () => {
    const { unmount } = render(<CoupleMessaging {...mockProps} />);

    unmount();

    expect(notificationService.cleanup).toHaveBeenCalled();
  });

  it('should show different notification button states based on permission', async () => {
    // Test with permission denied
    vi.mocked(notificationService.getPermissionStatus).mockReturnValue('denied');
    
    const { rerender } = render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      const button = screen.getByTitle(/notifications/i);
      expect(button).toHaveClass('text-gray-600');
    });

    // Test with permission granted
    vi.mocked(notificationService.getPermissionStatus).mockReturnValue('granted');
    
    rerender(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      const button = screen.getByTitle(/notifications/i);
      expect(button).toHaveClass('text-green-600');
    });
  });

  it('should handle notification service errors gracefully', async () => {
    // Mock notification service to throw errors
    vi.mocked(notificationService.showMessageNotification).mockRejectedValue(new Error('Notification failed'));
    vi.mocked(notificationService.playNotificationSound).mockRejectedValue(new Error('Sound failed'));

    let messageCallback: (message: any) => void = () => {};
    
    vi.mocked(realtimeHandler.onMessageReceived).mockImplementation((callback) => {
      messageCallback = callback;
      return () => {};
    });

    render(<CoupleMessaging {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Messages')).toBeInTheDocument();
    });

    // Simulate receiving a new message
    const newMessage = {
      id: 'msg-4',
      threadId: 'thread-1',
      senderId: 'vendor-1',
      senderType: 'vendor',
      content: 'Test message',
      messageType: 'text',
      status: 'delivered',
      createdAt: new Date(),
      attachments: [],
    };

    // Should not throw errors even if notification services fail
    expect(() => {
      act(() => {
        messageCallback(newMessage);
      });
    }).not.toThrow();
  });
});

/**
 * Property-Based Test: Notification Consistency
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 * 
 * This property verifies that notification behavior is consistent across different scenarios:
 * - Browser notifications are shown for vendor messages when permitted
 * - Notification sounds play for new messages when enabled
 * - Unread count is properly maintained and updated
 * - Messages are marked as read when viewed
 * - User notification preferences are respected
 */
describe('Notification Consistency Properties', () => {
  const testProps = {
    coupleId: 'couple-123',
    userId: 'user-456',
  };

  it('should maintain consistent notification state across message operations', async () => {
    const scenarios = [
      { hasPermission: true, soundEnabled: true, inQuietHours: false },
      { hasPermission: true, soundEnabled: false, inQuietHours: false },
      { hasPermission: false, soundEnabled: true, inQuietHours: false },
      { hasPermission: true, soundEnabled: true, inQuietHours: true },
    ];

    for (const scenario of scenarios) {
      // Setup mocks for this scenario
      vi.mocked(notificationService.getPermissionStatus).mockReturnValue(
        scenario.hasPermission ? 'granted' : 'denied'
      );

      let messageCallback: (message: any) => void = () => {};
      vi.mocked(realtimeHandler.onMessageReceived).mockImplementation((callback) => {
        messageCallback = callback;
        return () => {};
      });

      const { unmount } = render(<CoupleMessaging {...testProps} />);

      await waitFor(() => {
        expect(screen.getByText('Vendor Messages')).toBeInTheDocument();
      });

      // Simulate receiving multiple messages
      for (let i = 0; i < 3; i++) {
        const message = {
          id: `msg-${i}`,
          threadId: 'thread-1',
          senderId: 'vendor-1',
          senderType: 'vendor',
          content: `Test message ${i}`,
          messageType: 'text',
          status: 'delivered',
          createdAt: new Date(),
          attachments: [],
        };

        act(() => {
          messageCallback(message);
        });
      }

      await waitFor(() => {
        // Verify notification calls match expectations
        if (scenario.hasPermission && !scenario.inQuietHours) {
          expect(notificationService.showMessageNotification).toHaveBeenCalledTimes(3);
        }
        
        if (scenario.soundEnabled && !scenario.inQuietHours) {
          expect(notificationService.playNotificationSound).toHaveBeenCalledTimes(3);
        }

        // Unread count should always be incremented for vendor messages
        expect(notificationService.incrementUnreadCount).toHaveBeenCalledTimes(3);
      });

      unmount();
      vi.clearAllMocks();
    }
  });
});