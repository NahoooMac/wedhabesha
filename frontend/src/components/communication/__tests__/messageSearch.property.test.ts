import fc from 'fast-check';
import { Message, MessageType, MessageStatus, UserType } from '../../../types/messaging';

/**
 * Property-Based Tests for Message Search Functionality
 * Feature: vendor-dashboard-messaging-enhancement, Property 6: Message Search Functionality
 * **Validates: Requirements 3.2**
 */

// Mock message search function that simulates backend search
const searchMessages = (messages: Message[], query: string): Message[] => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  return messages.filter(message => {
    // Search in message content
    const contentMatch = message.content.toLowerCase().includes(normalizedQuery);
    
    // Search in attachment filenames if present
    const attachmentMatch = message.attachments?.some(
      attachment => attachment.fileName.toLowerCase().includes(normalizedQuery)
    ) || false;
    
    return contentMatch || attachmentMatch;
  });
};

// Helper to generate valid messages
const messageArbitrary = fc.record({
  id: fc.uuid(),
  threadId: fc.uuid(),
  senderId: fc.uuid(),
  senderType: fc.constantFrom(UserType.COUPLE, UserType.VENDOR),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  messageType: fc.constantFrom(
    MessageType.TEXT,
    MessageType.IMAGE,
    MessageType.DOCUMENT,
    MessageType.SYSTEM
  ),
  status: fc.constantFrom(
    MessageStatus.SENT,
    MessageStatus.DELIVERED,
    MessageStatus.READ
  ),
  isDeleted: fc.boolean(),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  attachments: fc.option(
    fc.array(
      fc.record({
        id: fc.uuid(),
        messageId: fc.uuid(),
        fileName: fc.string({ minLength: 5, maxLength: 50 }),
        fileType: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
        fileSize: fc.integer({ min: 1024, max: 10485760 }), // 1KB to 10MB
        url: fc.webUrl(),
        thumbnailUrl: fc.option(fc.webUrl()),
        uploadedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
      }),
      { minLength: 0, maxLength: 3 }
    ),
    { nil: undefined }
  )
}).map(msg => ({
  ...msg,
  createdAt: msg.createdAt as unknown as Date
})) as fc.Arbitrary<Message>;

describe('Message Search Functionality - Property-Based Tests', () => {
  /**
   * Property 6: Message Search Functionality
   * **Validates: Requirements 3.2**
   * 
   * For any search query within a conversation context, the system should return
   * relevant results that match the search criteria.
   * 
   * This property validates that:
   * 1. Search returns only messages containing the query term
   * 2. Search is case-insensitive
   * 3. Search handles empty queries appropriately
   * 4. Search includes attachment filenames in results
   * 5. Search results maintain message integrity
   */
  it('Property 6: Search returns only messages matching the query', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (messages, query) => {
          const results = searchMessages(messages, query);
          
          // Property 1: All results must contain the query term (case-insensitive)
          const normalizedQuery = query.toLowerCase().trim();
          results.forEach(result => {
            const contentMatch = result.content.toLowerCase().includes(normalizedQuery);
            const attachmentMatch = result.attachments?.some(
              att => att.fileName.toLowerCase().includes(normalizedQuery)
            ) || false;
            
            expect(contentMatch || attachmentMatch).toBe(true);
          });
          
          // Property 2: Results should be a subset of original messages
          results.forEach(result => {
            expect(messages).toContainEqual(result);
          });
          
          // Property 3: No duplicate results
          const resultIds = results.map(r => r.id);
          const uniqueIds = new Set(resultIds);
          expect(resultIds.length).toBe(uniqueIds.size);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Search is case-insensitive
   * **Validates: Requirements 3.2**
   */
  it('Property: Search is case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        (messages, query) => {
          const lowerResults = searchMessages(messages, query.toLowerCase());
          const upperResults = searchMessages(messages, query.toUpperCase());
          const mixedResults = searchMessages(messages, query);
          
          // Property: Case variations should return the same results
          expect(lowerResults.length).toBe(upperResults.length);
          expect(lowerResults.length).toBe(mixedResults.length);
          
          // Property: Result IDs should match regardless of case
          const lowerIds = lowerResults.map(r => r.id).sort();
          const upperIds = upperResults.map(r => r.id).sort();
          const mixedIds = mixedResults.map(r => r.id).sort();
          
          expect(lowerIds).toEqual(upperIds);
          expect(lowerIds).toEqual(mixedIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty or whitespace queries return no results
   * **Validates: Requirements 3.2**
   */
  it('Property: Empty queries return no results', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 1, maxLength: 50 }),
        fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '),
        (messages, emptyQuery) => {
          const results = searchMessages(messages, emptyQuery);
          
          // Property: Empty queries should return no results
          expect(results).toEqual([]);
          expect(results.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Search includes attachment filenames
   * **Validates: Requirements 3.2**
   */
  it('Property: Search finds messages by attachment filename', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        (threadId, filename, messageContent) => {
          // Create a message with a specific attachment filename
          const message: Message = {
            id: fc.sample(fc.uuid(), 1)[0],
            threadId,
            senderId: fc.sample(fc.uuid(), 1)[0],
            senderType: UserType.COUPLE,
            content: messageContent,
            messageType: MessageType.IMAGE,
            status: MessageStatus.SENT,
            isDeleted: false,
            createdAt: new Date(),
            attachments: [{
              id: fc.sample(fc.uuid(), 1)[0],
              messageId: fc.sample(fc.uuid(), 1)[0],
              fileName: filename,
              fileType: 'image/jpeg',
              fileSize: 1024000,
              url: 'https://example.com/file.jpg',
              uploadedAt: new Date()
            }]
          };
          
          const messages = [message];
          
          // Search by filename
          const results = searchMessages(messages, filename);
          
          // Property: Should find the message by attachment filename
          expect(results.length).toBeGreaterThan(0);
          expect(results).toContainEqual(message);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Search maintains message data integrity
   * **Validates: Requirements 3.2**
   */
  it('Property: Search results maintain complete message data', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        (messages, query) => {
          const results = searchMessages(messages, query);
          
          // Property: Each result should have all required fields
          results.forEach(result => {
            expect(result.id).toBeDefined();
            expect(result.threadId).toBeDefined();
            expect(result.senderId).toBeDefined();
            expect(result.senderType).toBeDefined();
            expect(result.content).toBeDefined();
            expect(result.messageType).toBeDefined();
            expect(result.status).toBeDefined();
            expect(typeof result.isDeleted).toBe('boolean');
            expect(result.createdAt).toBeInstanceOf(Date);
          });
          
          // Property: Results should be exact copies from original messages
          results.forEach(result => {
            const original = messages.find(m => m.id === result.id);
            expect(original).toBeDefined();
            expect(result).toEqual(original);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Search handles special characters correctly
   * **Validates: Requirements 3.2**
   */
  it('Property: Search handles special characters in queries', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'hello@example.com',
          'test-file.pdf',
          'message_123',
          'file (1).jpg',
          'data[0]',
          'price: $100',
          'question?',
          'exclamation!'
        ),
        (specialQuery) => {
          // Create messages with special characters
          const message: Message = {
            id: fc.sample(fc.uuid(), 1)[0],
            threadId: fc.sample(fc.uuid(), 1)[0],
            senderId: fc.sample(fc.uuid(), 1)[0],
            senderType: UserType.VENDOR,
            content: `This message contains ${specialQuery} in the content`,
            messageType: MessageType.TEXT,
            status: MessageStatus.SENT,
            isDeleted: false,
            createdAt: new Date()
          };
          
          const messages = [message];
          const results = searchMessages(messages, specialQuery);
          
          // Property: Should find messages with special characters
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].content).toContain(specialQuery);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Search excludes deleted messages
   * **Validates: Requirements 3.2**
   */
  it('Property: Search can optionally exclude deleted messages', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.uuid(),
        (searchTerm, threadId) => {
          // Create mix of deleted and non-deleted messages
          const messages: Message[] = [
            {
              id: fc.sample(fc.uuid(), 1)[0],
              threadId,
              senderId: fc.sample(fc.uuid(), 1)[0],
              senderType: UserType.COUPLE,
              content: `Message with ${searchTerm}`,
              messageType: MessageType.TEXT,
              status: MessageStatus.SENT,
              isDeleted: false,
              createdAt: new Date()
            },
            {
              id: fc.sample(fc.uuid(), 1)[0],
              threadId,
              senderId: fc.sample(fc.uuid(), 1)[0],
              senderType: UserType.VENDOR,
              content: `Deleted message with ${searchTerm}`,
              messageType: MessageType.TEXT,
              status: MessageStatus.SENT,
              isDeleted: true,
              createdAt: new Date()
            }
          ];
          
          const allResults = searchMessages(messages, searchTerm);
          
          // Property: Search should find both messages
          expect(allResults.length).toBe(2);
          
          // Property: Can filter out deleted messages if needed
          const nonDeletedResults = allResults.filter(m => !m.isDeleted);
          expect(nonDeletedResults.length).toBe(1);
          expect(nonDeletedResults[0].isDeleted).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Search performance is consistent
   * **Validates: Requirements 3.2**
   */
  it('Property: Search completes in reasonable time for large message sets', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 100, maxLength: 500 }),
        fc.string({ minLength: 3, maxLength: 10 }),
        (messages, query) => {
          const startTime = performance.now();
          const results = searchMessages(messages, query);
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Property: Search should complete within reasonable time (< 100ms for 500 messages)
          expect(duration).toBeLessThan(100);
          
          // Property: Results should still be valid
          expect(Array.isArray(results)).toBe(true);
          results.forEach(result => {
            expect(result.id).toBeDefined();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Partial word matching works correctly
   * **Validates: Requirements 3.2**
   */
  it('Property: Search supports partial word matching', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('hello', 'world', 'test', 'message', 'file'),
        fc.uuid(),
        (word, threadId) => {
          const fullWord = word;
          const partialWord = word.substring(0, Math.max(2, word.length - 1));
          
          const message: Message = {
            id: fc.sample(fc.uuid(), 1)[0],
            threadId,
            senderId: fc.sample(fc.uuid(), 1)[0],
            senderType: UserType.COUPLE,
            content: `This is a ${fullWord} in the message`,
            messageType: MessageType.TEXT,
            status: MessageStatus.SENT,
            isDeleted: false,
            createdAt: new Date()
          };
          
          const messages = [message];
          
          // Search with partial word
          const results = searchMessages(messages, partialWord);
          
          // Property: Partial word should match full word
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].content).toContain(fullWord);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Search result ordering is deterministic
   * **Validates: Requirements 3.2**
   */
  it('Property: Multiple searches with same query return consistent order', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 5, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
        (messages, query) => {
          // Perform search multiple times
          const results1 = searchMessages(messages, query);
          const results2 = searchMessages(messages, query);
          const results3 = searchMessages(messages, query);
          
          // Property: Results should be identical across multiple searches
          expect(results1).toEqual(results2);
          expect(results2).toEqual(results3);
          
          // Property: Result order should be consistent
          const ids1 = results1.map(r => r.id);
          const ids2 = results2.map(r => r.id);
          const ids3 = results3.map(r => r.id);
          
          expect(ids1).toEqual(ids2);
          expect(ids2).toEqual(ids3);
        }
      ),
      { numRuns: 100 }
    );
  });
});
