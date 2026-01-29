/**
 * Property Test: Search and Filter Functionality
 * 
 * Feature: messaging-ui-consistency-fixes
 * Property 9: Search and Filter Functionality
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 * 
 * Property: For any search query or filter applied, only matching results should be displayed,
 * with proper highlighting and the ability to clear filters to return to full view.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Message, MessageType, UserType, MessageStatus } from '../../../types/messaging';
import { useMessageSearch, filterThreads } from '../../../hooks/useMessageSearch';
import { renderHook, act } from '@testing-library/react';

// Test data generators
const messageArbitrary = fc.record({
  id: fc.uuid(),
  threadId: fc.uuid(),
  senderId: fc.uuid(),
  senderType: fc.constantFrom(UserType.COUPLE, UserType.VENDOR),
  content: fc.string({ minLength: 1, maxLength: 200 }),
  messageType: fc.constantFrom(MessageType.TEXT, MessageType.IMAGE, MessageType.DOCUMENT),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  status: fc.constantFrom(MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ),
  isDeleted: fc.constant(false),
  attachments: fc.option(fc.array(fc.record({
    id: fc.uuid(),
    messageId: fc.uuid(),
    fileName: fc.string({ minLength: 5, maxLength: 50 }),
    fileType: fc.constantFrom('image/jpeg', 'application/pdf', 'image/png'),
    fileSize: fc.integer({ min: 1000, max: 5000000 }),
    url: fc.webUrl(),
    uploadedAt: fc.date()
  }), { minLength: 0, maxLength: 3 }), { nil: undefined })
});

const threadArbitrary = fc.record({
  id: fc.uuid(),
  vendorName: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
  coupleName: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
  lastMessage: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  lastMessageTime: fc.date(),
  unreadCount: fc.integer({ min: 0, max: 50 }),
  status: fc.constantFrom('active' as const, 'archived' as const)
});

describe('Property 9: Search and Filter Functionality', () => {
  /**
   * Property 9.1: Text search filters messages correctly
   * 
   * For any search query, only messages containing that query in content
   * or attachment filenames should be returned.
   */
  it('should filter messages by text query correctly', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (messages, searchQuery) => {
          const { result } = renderHook(() => useMessageSearch(messages));

          act(() => {
            result.current.updateFilters({ query: searchQuery });
          });

          const filtered = result.current.filteredMessages;
          const query = searchQuery.toLowerCase();

          // All filtered messages should contain the query
          const allMatch = filtered.every(msg => 
            msg.content.toLowerCase().includes(query) ||
            msg.attachments?.some(att => att.fileName.toLowerCase().includes(query))
          );

          // No unfiltered messages should be missing if they match
          const noMissing = messages.every(msg => {
            const matches = msg.content.toLowerCase().includes(query) ||
              msg.attachments?.some(att => att.fileName.toLowerCase().includes(query));
            
            if (matches) {
              return filtered.some(f => f.id === msg.id);
            }
            return true;
          });

          expect(allMatch).toBe(true);
          expect(noMissing).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.2: Date range filter works correctly
   * 
   * For any date range, only messages within that range should be returned.
   */
  it('should filter messages by date range correctly', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 10, maxLength: 50 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        (messages, dateFrom, dateTo) => {
          const { result } = renderHook(() => useMessageSearch(messages));

          act(() => {
            result.current.updateFilters({ 
              query: '',
              dateFrom,
              dateTo
            });
          });

          const filtered = result.current.filteredMessages;
          
          // All filtered messages should be within date range
          const allInRange = filtered.every(msg => {
            const msgDate = new Date(msg.createdAt);
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            
            return msgDate >= from && msgDate <= to;
          });

          expect(allInRange).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.3: Attachment filter works correctly
   * 
   * When attachment filter is enabled, only messages with attachments should be returned.
   */
  it('should filter messages by attachment presence correctly', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 10, maxLength: 50 }),
        (messages) => {
          const { result } = renderHook(() => useMessageSearch(messages));

          act(() => {
            result.current.updateFilters({ 
              query: '',
              hasAttachments: true
            });
          });

          const filtered = result.current.filteredMessages;
          
          // All filtered messages should have attachments
          const allHaveAttachments = filtered.every(msg => 
            msg.attachments && msg.attachments.length > 0
          );

          expect(allHaveAttachments).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.4: Combined filters work correctly
   * 
   * When multiple filters are applied, messages should match ALL criteria.
   */
  it('should apply multiple filters correctly (AND logic)', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 20, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        (messages, query, dateFrom, dateTo) => {
          const { result } = renderHook(() => useMessageSearch(messages));

          act(() => {
            result.current.updateFilters({ 
              query,
              dateFrom,
              dateTo,
              hasAttachments: true
            });
          });

          const filtered = result.current.filteredMessages;
          const searchQuery = query.toLowerCase();
          
          // All filtered messages should match ALL criteria
          const allMatchAllCriteria = filtered.every(msg => {
            const matchesQuery = msg.content.toLowerCase().includes(searchQuery) ||
              msg.attachments?.some(att => att.fileName.toLowerCase().includes(searchQuery));
            
            const msgDate = new Date(msg.createdAt);
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            const matchesDateRange = msgDate >= from && msgDate <= to;
            
            const hasAttachments = msg.attachments && msg.attachments.length > 0;
            
            return matchesQuery && matchesDateRange && hasAttachments;
          });

          expect(allMatchAllCriteria).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.5: Clear filters returns all messages
   * 
   * After clearing filters, all original messages should be returned.
   */
  it('should return all messages when filters are cleared', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 10, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (messages, query) => {
          const { result } = renderHook(() => useMessageSearch(messages));

          // Apply filter
          act(() => {
            result.current.updateFilters({ query });
          });

          const filteredCount = result.current.filteredMessages.length;

          // Clear filter
          act(() => {
            result.current.clearFilters();
          });

          const clearedCount = result.current.filteredMessages.length;

          // After clearing, should have all messages
          expect(clearedCount).toBe(messages.length);
          expect(result.current.hasActiveFilters).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.6: Thread filtering works correctly
   * 
   * For any search query, only threads matching vendor name, couple name,
   * or last message should be returned.
   */
  it('should filter threads by search query correctly', () => {
    fc.assert(
      fc.property(
        fc.array(threadArbitrary, { minLength: 5, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 15 }),
        (threads, query) => {
          const filtered = filterThreads(threads, query);
          const searchQuery = query.toLowerCase();

          // All filtered threads should match the query
          const allMatch = filtered.every(thread => {
            const vendorName = thread.vendorName?.toLowerCase() || '';
            const coupleName = thread.coupleName?.toLowerCase() || '';
            const lastMessage = thread.lastMessage?.toLowerCase() || '';
            
            return vendorName.includes(searchQuery) ||
                   coupleName.includes(searchQuery) ||
                   lastMessage.includes(searchQuery);
          });

          // No matching threads should be excluded
          const noMissing = threads.every(thread => {
            const vendorName = thread.vendorName?.toLowerCase() || '';
            const coupleName = thread.coupleName?.toLowerCase() || '';
            const lastMessage = thread.lastMessage?.toLowerCase() || '';
            
            const matches = vendorName.includes(searchQuery) ||
                           coupleName.includes(searchQuery) ||
                           lastMessage.includes(searchQuery);
            
            if (matches) {
              return filtered.some(f => f.id === thread.id);
            }
            return true;
          });

          expect(allMatch).toBe(true);
          expect(noMissing).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.7: Empty query returns all items
   * 
   * When search query is empty or whitespace, all items should be returned.
   */
  it('should return all items when query is empty or whitespace', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 5, maxLength: 30 }),
        fc.constantFrom('', '   ', '\t', '\n'),
        (messages, emptyQuery) => {
          const { result } = renderHook(() => useMessageSearch(messages));

          act(() => {
            result.current.updateFilters({ query: emptyQuery });
          });

          expect(result.current.filteredMessages.length).toBe(messages.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.8: Search is case-insensitive
   * 
   * Search should work regardless of case in query or content.
   */
  it('should perform case-insensitive search', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 5, maxLength: 30 }),
        fc.string({ minLength: 3, maxLength: 10 }),
        (messages, baseQuery) => {
          const { result: lowerResult } = renderHook(() => useMessageSearch(messages));
          const { result: upperResult } = renderHook(() => useMessageSearch(messages));
          const { result: mixedResult } = renderHook(() => useMessageSearch(messages));

          act(() => {
            lowerResult.current.updateFilters({ query: baseQuery.toLowerCase() });
            upperResult.current.updateFilters({ query: baseQuery.toUpperCase() });
            mixedResult.current.updateFilters({ query: baseQuery });
          });

          // All three should return the same results
          expect(lowerResult.current.filteredMessages.length).toBe(
            upperResult.current.filteredMessages.length
          );
          expect(lowerResult.current.filteredMessages.length).toBe(
            mixedResult.current.filteredMessages.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.9: Result count is accurate
   * 
   * The result count should always match the number of filtered messages.
   */
  it('should maintain accurate result count', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (messages, query) => {
          const { result } = renderHook(() => useMessageSearch(messages));

          act(() => {
            result.current.updateFilters({ query });
          });

          expect(result.current.resultCount).toBe(
            result.current.filteredMessages.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.10: hasActiveFilters flag is accurate
   * 
   * The hasActiveFilters flag should correctly reflect whether any filters are applied.
   */
  it('should correctly track active filters state', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 5, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (messages, query) => {
          const { result } = renderHook(() => useMessageSearch(messages));

          // Initially no filters
          expect(result.current.hasActiveFilters).toBe(false);

          // Apply query filter
          act(() => {
            result.current.updateFilters({ query });
          });
          expect(result.current.hasActiveFilters).toBe(true);

          // Clear filters
          act(() => {
            result.current.clearFilters();
          });
          expect(result.current.hasActiveFilters).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
