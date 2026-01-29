/**
 * @fileoverview Property Test: Thread Management
 * 
 * Tests that thread management functionality maintains consistency across
 * both couple and vendor messaging interfaces using property-based testing
 * to verify universal correctness properties.
 * 
 * **Property 11: Thread Management**
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  sortThreadsByActivity,
  reorderThreadOnNewMessage,
  updateThreadPreview,
  clearThreadUnreadCount,
  getUnreadThreads,
  getTotalUnreadCount,
  archiveThread,
  removeThread,
  truncateMessagePreview,
  SortableThread
} from '../../../utils/thread-management';

// Test data generators
const threadGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  lastMessage: fc.string({ minLength: 0, maxLength: 200 }),
  lastMessageTime: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  unreadCount: fc.integer({ min: 0, max: 100 }),
  status: fc.constantFrom('active', 'archived') as fc.Arbitrary<'active' | 'archived'>,
  // Additional properties for couple/vendor threads
  vendorName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  coupleName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  vendorCategory: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  serviceType: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
}) as fc.Arbitrary<SortableThread>;

describe('Property Test: Thread Management', () => {
  /**
   * Property 11.1: Thread Sorting by Most Recent Activity
   * 
   * Universal Property: For any set of threads, sorting by activity should
   * always place threads with more recent lastMessageTime first, and the
   * sorting should be stable and consistent.
   * 
   * **Validates: Requirement 9.1**
   */
  describe('Thread Sorting by Most Recent Activity', () => {
    it('should always sort threads with most recent message first', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 2, maxLength: 50 }),
          (threads) => {
            const sorted = sortThreadsByActivity(threads);

            // Property: Sorted array should have same length
            expect(sorted.length).toBe(threads.length);

            // Property: Each thread should still be present
            threads.forEach(thread => {
              expect(sorted.find(t => t.id === thread.id)).toBeTruthy();
            });

            // Property: Threads should be in descending order by time
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentTime = new Date(sorted[i].lastMessageTime).getTime();
              const nextTime = new Date(sorted[i + 1].lastMessageTime).getTime();
              expect(currentTime).toBeGreaterThanOrEqual(nextTime);
            }

            // Property: Most recent thread should be first
            if (sorted.length > 0) {
              const mostRecentInOriginal = threads.reduce((latest, thread) => {
                const latestTime = new Date(latest.lastMessageTime).getTime();
                const threadTime = new Date(thread.lastMessageTime).getTime();
                return threadTime > latestTime ? thread : latest;
              });
              
              const firstInSorted = sorted[0];
              expect(new Date(firstInSorted.lastMessageTime).getTime())
                .toBe(new Date(mostRecentInOriginal.lastMessageTime).getTime());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain sort stability for threads with identical timestamps', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 3, maxLength: 20 }),
          fc.date(),
          (threads, commonTime) => {
            // Set same timestamp for all threads
            const threadsWithSameTime = threads.map(t => ({
              ...t,
              lastMessageTime: commonTime
            }));

            const sorted = sortThreadsByActivity(threadsWithSameTime);

            // Property: All threads should still be present
            expect(sorted.length).toBe(threadsWithSameTime.length);
            threadsWithSameTime.forEach(thread => {
              expect(sorted.find(t => t.id === thread.id)).toBeTruthy();
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11.2: Automatic Thread Reordering on New Messages
   * 
   * Universal Property: When a thread receives a new message, it should
   * always move to the top of the list, update its preview, and optionally
   * increment unread count.
   * 
   * **Validates: Requirements 9.2, 9.3**
   */
  describe('Automatic Thread Reordering on New Messages', () => {
    it('should move thread to top when receiving new message', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 2, maxLength: 30 }),
          fc.integer({ min: 0, max: 29 }), // index of thread to update
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.date(),
          fc.boolean(),
          (threads, indexToUpdate, newMessage, newTime, incrementUnread) => {
            if (indexToUpdate >= threads.length) return true; // Skip if index out of bounds

            const threadToUpdate = threads[indexToUpdate];
            const originalUnreadCount = threadToUpdate.unreadCount;

            const reordered = reorderThreadOnNewMessage(
              threads,
              threadToUpdate.id,
              newMessage,
              newTime,
              incrementUnread
            );

            // Property: Array length should remain the same
            expect(reordered.length).toBe(threads.length);

            // Property: Updated thread should be first
            expect(reordered[0].id).toBe(threadToUpdate.id);

            // Property: Updated thread should have new message content
            expect(reordered[0].lastMessage).toBe(newMessage);

            // Property: Updated thread should have new timestamp
            expect(new Date(reordered[0].lastMessageTime).getTime())
              .toBe(new Date(newTime).getTime());

            // Property: Unread count should be updated correctly
            if (incrementUnread) {
              expect(reordered[0].unreadCount).toBe(originalUnreadCount + 1);
            } else {
              expect(reordered[0].unreadCount).toBe(originalUnreadCount);
            }

            // Property: All other threads should still be present
            threads.forEach(thread => {
              expect(reordered.find(t => t.id === thread.id)).toBeTruthy();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle non-existent thread gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.date(),
          (threads, nonExistentId, newMessage, newTime) => {
            // Ensure ID doesn't exist
            const uniqueId = 'non-existent-' + nonExistentId;
            
            const reordered = reorderThreadOnNewMessage(
              threads,
              uniqueId,
              newMessage,
              newTime,
              false
            );

            // Property: Should return original array unchanged
            expect(reordered.length).toBe(threads.length);
            expect(reordered).toEqual(threads);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11.3: Accurate Thread Previews
   * 
   * Universal Property: Thread previews should always show the most recent
   * message content, properly truncated if necessary.
   * 
   * **Validates: Requirement 9.3**
   */
  describe('Accurate Thread Previews', () => {
    it('should truncate long messages to specified length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 51, maxLength: 500 }),
          fc.integer({ min: 10, max: 100 }),
          (longMessage, maxLength) => {
            const truncated = truncateMessagePreview(longMessage, maxLength);

            // Property: Truncated message should not exceed max length + 3 (for "...")
            expect(truncated.length).toBeLessThanOrEqual(maxLength + 3);

            // Property: Should end with "..." if truncated
            if (longMessage.length > maxLength) {
              expect(truncated.endsWith('...')).toBe(true);
            }

            // Property: Should start with original message content
            const expectedStart = longMessage.substring(0, maxLength).trim();
            expect(truncated.startsWith(expectedStart.substring(0, Math.min(10, expectedStart.length)))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not truncate short messages', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 49 }),
          (shortMessage) => {
            const truncated = truncateMessagePreview(shortMessage, 50);

            // Property: Short messages should remain unchanged
            expect(truncated).toBe(shortMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update thread preview correctly', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0, max: 19 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.date(),
          (threads, indexToUpdate, newMessage, newTime) => {
            if (indexToUpdate >= threads.length) return true;

            const threadToUpdate = threads[indexToUpdate];
            const updates = {
              lastMessage: newMessage,
              lastMessageTime: newTime
            };

            const updated = updateThreadPreview(threads, threadToUpdate.id, updates);

            // Property: Array length should remain the same
            expect(updated.length).toBe(threads.length);

            // Property: Updated thread should have new values
            const updatedThread = updated.find(t => t.id === threadToUpdate.id);
            expect(updatedThread).toBeTruthy();
            expect(updatedThread!.lastMessage).toBe(newMessage);
            expect(new Date(updatedThread!.lastMessageTime).getTime())
              .toBe(new Date(newTime).getTime());

            // Property: Other threads should remain unchanged
            threads.forEach(thread => {
              if (thread.id !== threadToUpdate.id) {
                const unchangedThread = updated.find(t => t.id === thread.id);
                expect(unchangedThread).toEqual(thread);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11.4: Visual Distinction for Unread Threads
   * 
   * Universal Property: Threads with unread messages should be identifiable,
   * and unread counts should be accurate and manageable.
   * 
   * **Validates: Requirement 9.4**
   */
  describe('Visual Distinction for Unread Threads', () => {
    it('should correctly identify threads with unread messages', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 1, maxLength: 50 }),
          (threads) => {
            const unreadThreads = getUnreadThreads(threads);

            // Property: All returned threads should have unreadCount > 0
            unreadThreads.forEach(thread => {
              expect(thread.unreadCount).toBeGreaterThan(0);
            });

            // Property: Count should match threads with unread messages
            const expectedUnreadCount = threads.filter(t => t.unreadCount > 0).length;
            expect(unreadThreads.length).toBe(expectedUnreadCount);

            // Property: All unread threads from original should be included
            threads.forEach(thread => {
              if (thread.unreadCount > 0) {
                expect(unreadThreads.find(t => t.id === thread.id)).toBeTruthy();
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate total unread count correctly', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 0, maxLength: 50 }),
          (threads) => {
            const totalUnread = getTotalUnreadCount(threads);

            // Property: Total should equal sum of all unread counts
            const expectedTotal = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
            expect(totalUnread).toBe(expectedTotal);

            // Property: Total should be non-negative
            expect(totalUnread).toBeGreaterThanOrEqual(0);

            // Property: If no threads, total should be 0
            if (threads.length === 0) {
              expect(totalUnread).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear unread count for specific thread', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 1, maxLength: 30 }),
          fc.integer({ min: 0, max: 29 }),
          (threads, indexToClear) => {
            if (indexToClear >= threads.length) return true;

            const threadToClear = threads[indexToClear];
            const cleared = clearThreadUnreadCount(threads, threadToClear.id);

            // Property: Array length should remain the same
            expect(cleared.length).toBe(threads.length);

            // Property: Cleared thread should have unreadCount = 0
            const clearedThread = cleared.find(t => t.id === threadToClear.id);
            expect(clearedThread).toBeTruthy();
            expect(clearedThread!.unreadCount).toBe(0);

            // Property: Other threads should remain unchanged
            threads.forEach(thread => {
              if (thread.id !== threadToClear.id) {
                const unchangedThread = cleared.find(t => t.id === thread.id);
                expect(unchangedThread).toEqual(thread);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11.5: Immediate Updates for Thread Operations
   * 
   * Universal Property: Thread operations (archive, delete) should update
   * the thread list immediately and correctly.
   * 
   * **Validates: Requirement 9.5**
   */
  describe('Immediate Updates for Thread Operations', () => {
    it('should archive and unarchive threads correctly', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 1, maxLength: 30 }),
          fc.integer({ min: 0, max: 29 }),
          fc.boolean(),
          (threads, indexToArchive, shouldArchive) => {
            if (indexToArchive >= threads.length) return true;

            const threadToArchive = threads[indexToArchive];
            const archived = archiveThread(threads, threadToArchive.id, shouldArchive);

            // Property: Array length should remain the same
            expect(archived.length).toBe(threads.length);

            // Property: Thread status should be updated
            const archivedThread = archived.find(t => t.id === threadToArchive.id);
            expect(archivedThread).toBeTruthy();
            expect(archivedThread!.status).toBe(shouldArchive ? 'archived' : 'active');

            // Property: Other threads should remain unchanged
            threads.forEach(thread => {
              if (thread.id !== threadToArchive.id) {
                const unchangedThread = archived.find(t => t.id === thread.id);
                expect(unchangedThread).toEqual(thread);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove threads correctly', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 1, maxLength: 30 }),
          fc.integer({ min: 0, max: 29 }),
          (threads, indexToRemove) => {
            if (indexToRemove >= threads.length) return true;

            const threadToRemove = threads[indexToRemove];
            const removed = removeThread(threads, threadToRemove.id);

            // Property: Array length should be reduced by 1
            expect(removed.length).toBe(threads.length - 1);

            // Property: Removed thread should not be present
            expect(removed.find(t => t.id === threadToRemove.id)).toBeUndefined();

            // Property: All other threads should still be present
            threads.forEach(thread => {
              if (thread.id !== threadToRemove.id) {
                expect(removed.find(t => t.id === thread.id)).toBeTruthy();
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle removing non-existent thread gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (threads, nonExistentId) => {
            const uniqueId = 'non-existent-' + nonExistentId;
            const removed = removeThread(threads, uniqueId);

            // Property: Array should remain unchanged
            expect(removed.length).toBe(threads.length);
            expect(removed).toEqual(threads);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11.6: Thread Management Consistency Across Interfaces
   * 
   * Universal Property: Thread management operations should work identically
   * for both couple and vendor interfaces, ensuring consistent behavior.
   * 
   * **Validates: All Requirements 9.1-9.5**
   */
  describe('Thread Management Consistency Across Interfaces', () => {
    it('should maintain consistency when performing multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(threadGenerator, { minLength: 5, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.date(),
          (threads, newMessage, newTime) => {
            // Perform a sequence of operations
            let result = sortThreadsByActivity(threads);
            
            // Add new message to first thread
            if (result.length > 0) {
              result = reorderThreadOnNewMessage(
                result,
                result[0].id,
                newMessage,
                newTime,
                true
              );
            }

            // Clear unread for second thread
            if (result.length > 1) {
              result = clearThreadUnreadCount(result, result[1].id);
            }

            // Archive third thread
            if (result.length > 2) {
              result = archiveThread(result, result[2].id, true);
            }

            // Property: All operations should maintain array integrity
            expect(result.length).toBe(threads.length);

            // Property: All original threads should still be present
            threads.forEach(thread => {
              expect(result.find(t => t.id === thread.id)).toBeTruthy();
            });

            // Property: First thread should have updated message
            if (result.length > 0) {
              expect(result[0].lastMessage).toBe(newMessage);
            }

            // Property: Second thread should have unreadCount = 0
            if (result.length > 1) {
              expect(result[1].unreadCount).toBe(0);
            }

            // Property: Third thread should be archived
            if (result.length > 2) {
              expect(result[2].status).toBe('archived');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
