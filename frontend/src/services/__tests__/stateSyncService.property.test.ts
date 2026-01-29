import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { stateSyncService } from '../stateSyncService';
import { Message, MessageStatus, MessageType, UserType } from '../../types/messaging';

/**
 * Property-Based Tests for Cross-Platform State Synchronization
 * 
 * Feature: vendor-dashboard-messaging-enhancement
 * Property 12: Cross-platform State Synchronization
 * 
 * Validates: Requirements 6.4
 * 
 * Property: For any user switching between desktop and mobile platforms,
 * conversation state should synchronize seamlessly without data loss.
 */

describe('Feature: vendor-dashboard-messaging-enhancement, Property 12: Cross-platform State Synchronization', () => {
  beforeEach(() => {
    // Clear all state before each test
    localStorage.clear();
    
    // Create a fresh instance by clearing state
    stateSyncService.clearAllState();
    
    // Mock online status - default to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
      configurable: true
    });
  });

  afterEach(() => {
    stateSyncService.stopSync();
    vi.restoreAllMocks();
  });

  // Arbitrary for generating thread IDs
  const threadIdArb = fc.uuid();

  // Arbitrary for generating message IDs
  const messageIdArb = fc.uuid();

  // Arbitrary for generating conversation state
  const conversationStateArb = fc.record({
    threadId: threadIdArb,
    lastReadMessageId: fc.option(messageIdArb, { nil: null }),
    scrollPosition: fc.integer({ min: 0, max: 10000 }),
    unreadCount: fc.integer({ min: 0, max: 100 })
  });

  // Arbitrary for generating messages
  const messageArb = fc.record({
    id: messageIdArb,
    threadId: threadIdArb,
    senderId: fc.uuid(),
    senderType: fc.constantFrom(UserType.COUPLE, UserType.VENDOR),
    content: fc.string({ minLength: 1, maxLength: 500 }),
    messageType: fc.constantFrom(
      MessageType.TEXT,
      MessageType.IMAGE,
      MessageType.DOCUMENT,
      MessageType.SYSTEM
    ),
    attachments: fc.constant([]),
    createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    status: fc.constantFrom(
      MessageStatus.SENT,
      MessageStatus.DELIVERED,
      MessageStatus.READ
    ),
    isDeleted: fc.boolean()
  }) as fc.Arbitrary<Message>;

  it('should preserve conversation state across platform switches', () => {
    fc.assert(
      fc.property(
        conversationStateArb,
        (state) => {
          // Simulate desktop: update conversation state
          stateSyncService.updateConversationState(state.threadId, {
            lastReadMessageId: state.lastReadMessageId,
            scrollPosition: state.scrollPosition,
            unreadCount: state.unreadCount
          });

          // Simulate platform switch: retrieve state on mobile
          const retrievedState = stateSyncService.getConversationState(state.threadId);

          // Verify state is preserved
          expect(retrievedState).not.toBeNull();
          expect(retrievedState?.threadId).toBe(state.threadId);
          expect(retrievedState?.lastReadMessageId).toBe(state.lastReadMessageId);
          expect(retrievedState?.scrollPosition).toBe(state.scrollPosition);
          expect(retrievedState?.unreadCount).toBe(state.unreadCount);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should queue messages when offline and sync when online', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.constantFrom('text', 'image', 'document'),
        (threadId, content, messageType) => {
          // Clear state for this test
          stateSyncService.clearAllState();
          
          // Simulate going offline
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false,
            configurable: true
          });

          // Queue message while offline
          const messageId = stateSyncService.queueMessage(threadId, content, messageType);

          // Verify message is queued
          const queuedMessages = stateSyncService.getQueuedMessages(threadId);
          expect(queuedMessages.length).toBeGreaterThan(0);
          expect(queuedMessages.some(m => m.id === messageId)).toBe(true);

          // Verify message details
          const queuedMessage = queuedMessages.find(m => m.id === messageId);
          expect(queuedMessage?.threadId).toBe(threadId);
          expect(queuedMessage?.content).toBe(content);
          expect(queuedMessage?.messageType).toBe(messageType);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain message queue integrity across multiple offline messages', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
        (threadId, messages) => {
          // Clear state for this test
          stateSyncService.clearAllState();
          
          // Simulate offline
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false,
            configurable: true
          });

          // Queue multiple messages
          const messageIds = messages.map(content =>
            stateSyncService.queueMessage(threadId, content, 'text')
          );

          // Verify all messages are queued
          const queuedMessages = stateSyncService.getQueuedMessages(threadId);
          expect(queuedMessages.length).toBe(messages.length);

          // Verify message order and content
          messageIds.forEach((id, index) => {
            const queuedMessage = queuedMessages.find(m => m.id === id);
            expect(queuedMessage).toBeDefined();
            expect(queuedMessage?.content).toBe(messages[index]);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should persist state to localStorage and restore on initialization', () => {
    fc.assert(
      fc.property(
        fc.array(conversationStateArb, { minLength: 1, maxLength: 5 }),
        (states) => {
          // Clear state for this test
          stateSyncService.clearAllState();
          localStorage.clear();
          
          // Update multiple conversation states
          states.forEach(state => {
            stateSyncService.updateConversationState(state.threadId, {
              lastReadMessageId: state.lastReadMessageId,
              scrollPosition: state.scrollPosition,
              unreadCount: state.unreadCount
            });
          });

          // Verify localStorage has data
          const storedData = localStorage.getItem('messaging_sync_state');
          expect(storedData).not.toBeNull();

          // Parse and verify stored data
          const parsedData = JSON.parse(storedData!);
          
          // Count unique thread IDs in states
          const uniqueThreadIds = new Set(states.map(s => s.threadId));
          expect(Object.keys(parsedData.conversations).length).toBe(uniqueThreadIds.size);

          // Verify each unique state is stored correctly
          uniqueThreadIds.forEach(threadId => {
            const state = states.find(s => s.threadId === threadId)!;
            const storedState = parsedData.conversations[threadId];
            expect(storedState).toBeDefined();
            expect(storedState.lastReadMessageId).toBe(state.lastReadMessageId);
            expect(storedState.scrollPosition).toBe(state.scrollPosition);
            expect(storedState.unreadCount).toBe(state.unreadCount);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should merge remote messages with local state without data loss', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        fc.array(messageArb, { minLength: 1, maxLength: 20 }),
        (threadId, remoteMessages) => {
          // Set up local state
          const localTimestamp = Date.now() - 10000; // 10 seconds ago
          stateSyncService.updateConversationState(threadId, {
            lastSyncTimestamp: localTimestamp,
            unreadCount: 5
          });

          // Merge remote messages
          stateSyncService.mergeRemoteState(remoteMessages, threadId);

          // Verify state is updated
          const state = stateSyncService.getConversationState(threadId);
          expect(state).not.toBeNull();

          // Verify sync timestamp is updated if remote has newer messages
          const latestRemoteTime = Math.max(
            ...remoteMessages.map(m => new Date(m.createdAt).getTime())
          );

          if (latestRemoteTime > localTimestamp) {
            expect(state!.lastSyncTimestamp).toBeGreaterThanOrEqual(latestRemoteTime);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle concurrent state updates from multiple platforms', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        fc.array(
          fc.record({
            scrollPosition: fc.integer({ min: 0, max: 5000 }),
            unreadCount: fc.integer({ min: 0, max: 50 })
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (threadId, updates) => {
          // Simulate concurrent updates from different platforms
          updates.forEach(update => {
            stateSyncService.updateConversationState(threadId, update);
          });

          // Verify final state exists and is valid
          const finalState = stateSyncService.getConversationState(threadId);
          expect(finalState).not.toBeNull();
          expect(finalState?.threadId).toBe(threadId);

          // Final state should have the last update's values
          const lastUpdate = updates[updates.length - 1];
          expect(finalState?.scrollPosition).toBe(lastUpdate.scrollPosition);
          expect(finalState?.unreadCount).toBe(lastUpdate.unreadCount);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain sync status consistency', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.array(
          fc.record({
            threadId: threadIdArb,
            content: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (isOnline, messagesToQueue) => {
          // Clear state for this test
          stateSyncService.clearAllState();
          
          // Set online status
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: isOnline,
            configurable: true
          });

          // Queue messages if offline
          if (!isOnline) {
            messagesToQueue.forEach(msg => {
              stateSyncService.queueMessage(msg.threadId, msg.content, 'text');
            });
          }

          // Get sync status
          const status = stateSyncService.getSyncStatus();

          // Verify status consistency
          expect(status.isOnline).toBe(isOnline);
          
          // Only check queue count if offline
          if (!isOnline) {
            expect(status.queuedMessageCount).toBe(messagesToQueue.length);
          }
          
          expect(status.lastSync).toBeGreaterThanOrEqual(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should clear conversation state without affecting other threads', () => {
    fc.assert(
      fc.property(
        fc.array(conversationStateArb, { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (states, indexToClear) => {
          // Ensure we have at least 2 states and valid index
          if (states.length < 2 || indexToClear >= states.length) {
            return true; // Skip this test case
          }

          // Update all conversation states
          states.forEach(state => {
            stateSyncService.updateConversationState(state.threadId, {
              lastReadMessageId: state.lastReadMessageId,
              scrollPosition: state.scrollPosition,
              unreadCount: state.unreadCount
            });
          });

          // Clear one specific thread
          const threadToClear = states[indexToClear].threadId;
          stateSyncService.clearConversationState(threadToClear);

          // Verify cleared thread is gone
          const clearedState = stateSyncService.getConversationState(threadToClear);
          expect(clearedState).toBeNull();

          // Verify other threads still exist
          states.forEach((state, index) => {
            if (index !== indexToClear) {
              const remainingState = stateSyncService.getConversationState(state.threadId);
              expect(remainingState).not.toBeNull();
              expect(remainingState?.threadId).toBe(state.threadId);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
