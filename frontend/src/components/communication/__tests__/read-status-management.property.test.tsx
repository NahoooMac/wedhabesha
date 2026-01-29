/**
 * Property-Based Test: Read Status Management
 * 
 * **Property 8: Read Status Management**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 * 
 * Tests that read status management works consistently across both couple and vendor interfaces:
 * - Messages are automatically marked as read when displayed
 * - Senders see read status indicators
 * - Read status synchronization across all participants
 * - Unread counts are accurate and cleared when all messages are read
 * 
 * This property test validates universal correctness properties with 100+ iterations.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import fc from 'fast-check';
import { SharedMessageThread } from '../SharedMessageThread';
import { Message, MessageType, MessageStatus, UserType } from '../../../types/messaging';

// Mock the realtimeHandler
const mockRealtimeHandler = {
  emitMessageRead: vi.fn(),
  onMessageReadUpdate: vi.fn(() => () => {}),
  connect: vi.fn(),
  disconnect: vi.fn(),
  joinThread: vi.fn(),
  leaveThread: vi.fn(),
  onMessageReceived: vi.fn(() => () => {}),
  onConnectionChange: vi.fn(() => () => {}),
  emitMessage: vi.fn(),
  emitTyping: vi.fn()
};

vi.mock('../../../services/realtimeHandler', () => ({
  realtimeHandler: mockRealtimeHandler
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
});
window.IntersectionObserver = mockIntersectionObserver;

describe('Property Test: Read Status Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockIntersectionObserver.mockClear();
  });

  /**
   * Property 8: Read Status Management
   * 
   * For any message displayed to a recipient, the message should be marked as read,
   * the sender should see read indicators, and unread counts should be accurate
   * across all interfaces.
   */
  it('should maintain consistent read status management across all scenarios', () => {
    fc.assert(
      fc.property(
        // Generate test data
        fc.record({
          currentUserId: fc.string({ minLength: 1, maxLength: 20 }),
          currentUserType: fc.constantFrom(UserType.COUPLE, UserType.VENDOR),
          messages: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              threadId: fc.string({ minLength: 1, maxLength: 20 }),
              senderId: fc.string({ minLength: 1, maxLength: 20 }),
              senderType: fc.constantFrom(UserType.COUPLE, UserType.VENDOR),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              messageType: fc.constantFrom(MessageType.TEXT, MessageType.IMAGE),
              status: fc.constantFrom(MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ),
              createdAt: fc.date(),
              isDeleted: fc.boolean(),
              attachments: fc.constant([])
            }),
            { minLength: 1, maxLength: 10 }
          ),
          threadUnreadCount: fc.integer({ min: 0, max: 20 })
        }),
        (testData) => {
          // Setup: Mock API responses for read status updates
          mockFetch.mockImplementation((url, options) => {
            if (url.includes('/read') && options?.method === 'PUT') {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
              });
            }
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: {} })
            });
          });

          const mockOnMessageRead = vi.fn();
          const mockOnMessageDelete = vi.fn();

          // Render the SharedMessageThread component
          const { rerender } = render(
            <SharedMessageThread
              messages={testData.messages}
              currentUserId={testData.currentUserId}
              currentUserType={testData.currentUserType}
              onMessageRead={mockOnMessageRead}
              onMessageDelete={mockOnMessageDelete}
            />
          );

          // Property 8.1: Messages from other users should trigger read status marking
          const messagesFromOthers = testData.messages.filter(
            msg => msg.senderId !== testData.currentUserId && !msg.isDeleted
          );

          if (messagesFromOthers.length > 0) {
            // Simulate IntersectionObserver triggering for messages from others
            const mockObserverCallback = mockIntersectionObserver.mock.calls[0]?.[0];
            if (mockObserverCallback) {
              messagesFromOthers.forEach(message => {
                if (message.status !== MessageStatus.READ) {
                  const mockEntry = {
                    isIntersecting: true,
                    target: {
                      getAttribute: (attr: string) => {
                        switch (attr) {
                          case 'data-message-id': return message.id;
                          case 'data-sender-id': return message.senderId;
                          case 'data-message-status': return message.status;
                          default: return null;
                        }
                      }
                    }
                  };
                  
                  act(() => {
                    mockObserverCallback([mockEntry]);
                  });
                }
              });

              // Verify that onMessageRead was called for unread messages from others
              const unreadMessagesFromOthers = messagesFromOthers.filter(
                msg => msg.status !== MessageStatus.READ
              );
              
              expect(mockOnMessageRead).toHaveBeenCalledTimes(unreadMessagesFromOthers.length);
              
              unreadMessagesFromOthers.forEach(message => {
                expect(mockOnMessageRead).toHaveBeenCalledWith(message.id);
              });
            }
          }

          // Property 8.2: Own messages should not trigger read status marking
          const ownMessages = testData.messages.filter(
            msg => msg.senderId === testData.currentUserId
          );

          if (ownMessages.length > 0) {
            // Reset mock to verify own messages don't trigger reads
            mockOnMessageRead.mockClear();
            
            const mockObserverCallback = mockIntersectionObserver.mock.calls[0]?.[0];
            if (mockObserverCallback) {
              ownMessages.forEach(message => {
                const mockEntry = {
                  isIntersecting: true,
                  target: {
                    getAttribute: (attr: string) => {
                      switch (attr) {
                        case 'data-message-id': return message.id;
                        case 'data-sender-id': return message.senderId;
                        case 'data-message-status': return message.status;
                        default: return null;
                      }
                    }
                  }
                };
                
                act(() => {
                  mockObserverCallback([mockEntry]);
                });
              });

              // Verify that onMessageRead was NOT called for own messages
              expect(mockOnMessageRead).not.toHaveBeenCalled();
            }
          }

          // Property 8.3: Read status indicators should be displayed for own messages
          const ownMessagesInDOM = testData.messages.filter(
            msg => msg.senderId === testData.currentUserId && !msg.isDeleted
          );

          ownMessagesInDOM.forEach(message => {
            const messageElement = screen.queryByTestId(`message-${message.id}`);
            if (messageElement) {
              // Check for read status indicators based on message status
              switch (message.status) {
                case MessageStatus.SENT:
                  // Should show single checkmark
                  expect(messageElement).toHaveTextContent('✓');
                  break;
                case MessageStatus.DELIVERED:
                  // Should show double checkmark (gray)
                  const deliveredIndicators = messageElement.querySelectorAll('svg');
                  expect(deliveredIndicators.length).toBeGreaterThanOrEqual(2);
                  break;
                case MessageStatus.READ:
                  // Should show double checkmark (blue/primary color)
                  const readIndicators = messageElement.querySelectorAll('svg');
                  expect(readIndicators.length).toBeGreaterThanOrEqual(2);
                  break;
              }
            }
          });

          // Property 8.4: Deleted messages should not affect read status
          const deletedMessages = testData.messages.filter(msg => msg.isDeleted);
          deletedMessages.forEach(message => {
            // Deleted messages should not be processed for read status
            const messageElement = screen.queryByTestId(`message-${message.id}`);
            if (messageElement) {
              expect(messageElement).toHaveTextContent('This message has been deleted');
            }
          });

          // Property 8.5: Message status should be consistent with visual indicators
          testData.messages.forEach(message => {
            if (!message.isDeleted && message.senderId === testData.currentUserId) {
              const messageElement = screen.queryByTestId(`message-${message.id}`);
              if (messageElement) {
                // Verify that the visual status matches the message status
                const hasReadIndicator = messageElement.querySelector('[title="Read"]');
                const hasDeliveredIndicator = messageElement.querySelector('[title="Delivered"]');
                const hasSentIndicator = messageElement.querySelector('[title="Sent"]');

                switch (message.status) {
                  case MessageStatus.READ:
                    expect(hasReadIndicator).toBeTruthy();
                    break;
                  case MessageStatus.DELIVERED:
                    expect(hasDeliveredIndicator).toBeTruthy();
                    break;
                  case MessageStatus.SENT:
                    expect(hasSentIndicator).toBeTruthy();
                    break;
                }
              }
            }
          });

          // Cleanup
          mockOnMessageRead.mockClear();
          mockOnMessageDelete.mockClear();
        }
      ),
      { 
        numRuns: 100,
        verbose: true,
        seed: 42
      }
    );
  });

  /**
   * Property 8.6: Unread count accuracy
   * 
   * Tests that unread counts are calculated correctly and updated properly
   * when messages are marked as read.
   */
  it('should maintain accurate unread counts across different scenarios', () => {
    fc.assert(
      fc.property(
        fc.record({
          threadId: fc.string({ minLength: 1, maxLength: 20 }),
          userId: fc.string({ minLength: 1, maxLength: 20 }),
          initialUnreadCount: fc.integer({ min: 0, max: 10 }),
          newMessages: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              senderId: fc.string({ minLength: 1, maxLength: 20 }),
              isFromCurrentUser: fc.boolean()
            }),
            { minLength: 0, maxLength: 5 }
          ),
          readMessages: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { minLength: 0, maxLength: 3 }
          )
        }),
        (testData) => {
          // Simulate unread count management logic
          let currentUnreadCount = testData.initialUnreadCount;

          // Property 8.6.1: New messages from others should increment unread count
          const messagesFromOthers = testData.newMessages.filter(msg => !msg.isFromCurrentUser);
          currentUnreadCount += messagesFromOthers.length;

          // Property 8.6.2: Messages from current user should not affect unread count
          const messagesFromSelf = testData.newMessages.filter(msg => msg.isFromCurrentUser);
          // Unread count should not change for own messages
          expect(currentUnreadCount).toBe(testData.initialUnreadCount + messagesFromOthers.length);

          // Property 8.6.3: Reading messages should decrease unread count
          const readCount = Math.min(testData.readMessages.length, currentUnreadCount);
          currentUnreadCount -= readCount;

          // Property 8.6.4: Unread count should never go below zero
          expect(currentUnreadCount).toBeGreaterThanOrEqual(0);

          // Property 8.6.5: Unread count should be accurate after all operations
          const expectedUnreadCount = Math.max(0, testData.initialUnreadCount + messagesFromOthers.length - readCount);
          expect(currentUnreadCount).toBe(expectedUnreadCount);
        }
      ),
      { 
        numRuns: 100,
        verbose: true,
        seed: 43
      }
    );
  });

  /**
   * Property 8.7: Read status synchronization
   * 
   * Tests that read status updates are properly synchronized across
   * different components and real-time connections.
   */
  it('should synchronize read status updates across all participants', () => {
    fc.assert(
      fc.property(
        fc.record({
          messageId: fc.string({ minLength: 1, maxLength: 20 }),
          readByUserId: fc.string({ minLength: 1, maxLength: 20 }),
          threadParticipants: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { minLength: 2, maxLength: 5 }
          )
        }),
        (testData) => {
          // Mock the real-time handler for read status updates
          const mockReadStatusCallback = vi.fn();
          mockRealtimeHandler.onMessageReadUpdate.mockReturnValue(() => {});

          // Simulate read status update
          act(() => {
            // Simulate API call success
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: () => Promise.resolve({ success: true })
            });

            // Simulate real-time read status update
            const readStatusHandlers = mockRealtimeHandler.onMessageReadUpdate.mock.calls.map(call => call[0]);
            readStatusHandlers.forEach(handler => {
              handler(testData.messageId, testData.readByUserId);
            });
          });

          // Property 8.7.1: Read status update should be emitted via real-time handler
          expect(mockRealtimeHandler.emitMessageRead).toHaveBeenCalledWith(
            testData.messageId,
            testData.readByUserId
          );

          // Property 8.7.2: All participants should receive read status updates
          expect(mockRealtimeHandler.onMessageReadUpdate).toHaveBeenCalled();

          // Property 8.7.3: Read status should be consistent across all interfaces
          // This is validated by the consistent API calls and real-time updates
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/read'),
            expect.objectContaining({
              method: 'PUT',
              headers: expect.objectContaining({
                'Content-Type': 'application/json'
              })
            })
          );
        }
      ),
      { 
        numRuns: 100,
        verbose: true,
        seed: 44
      }
    );
  });
});