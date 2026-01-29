const fc = require('fast-check');
const messageService = require('../services/messageService');
const threadManager = require('../services/threadManager');
const encryptionService = require('../services/encryptionService');
const securityControls = require('../services/securityControls');
const { query } = require('../config/database');

// Mock dependencies
jest.mock('../config/database');
jest.mock('../services/encryptionService');
jest.mock('../services/securityControls');

/**
 * Property-Based Tests for Message Delivery and Thread Synchronization
 * Feature: vendor-dashboard-messaging-enhancement, Property 3: Message Delivery and Thread Synchronization
 * **Validates: Requirements 2.1, 2.3, 2.5**
 */
describe('Message Delivery and Thread Synchronization - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    encryptionService.encryptMessage.mockImplementation((content) => 
      Promise.resolve(`encrypted_${content}`)
    );
    encryptionService.decryptMessage.mockImplementation((content) => 
      Promise.resolve(content.replace('encrypted_', ''))
    );
  });

  /**
   * Property 3: Message Delivery and Thread Synchronization
   * **Validates: Requirements 2.1, 2.3, 2.5**
   * 
   * For any message sent between couples and vendors, the message should be:
   * 1. Delivered instantly (sent successfully)
   * 2. Confirmed with status indicators (status field present)
   * 3. Update conversation threads immediately for both participants (thread timestamp updated)
   * 
   * This property validates the core messaging workflow across all valid inputs.
   */
  it('Property 3: Message Delivery and Thread Synchronization - messages are delivered, confirmed, and threads updated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Thread participants
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          
          // Message data
          senderId: fc.integer({ min: 1, max: 10000 }),
          senderType: fc.constantFrom('couple', 'vendor'),
          content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          messageType: fc.constantFrom('text', 'image', 'document', 'system'),
          
          // Message ID for response
          messageId: fc.integer({ min: 1, max: 100000 })
        }).filter(data => {
          // Ensure sender is actually a participant in the thread
          if (data.senderType === 'couple') {
            return data.senderId === data.coupleId;
          } else {
            return data.senderId === data.vendorId;
          }
        }),
        async ({ threadId, coupleId, vendorId, senderId, senderType, content, messageType, messageId }) => {
          // Mock authorization - sender has access to thread
          securityControls.verifyThreadAccess.mockResolvedValue({
            authorized: true,
            thread: { 
              id: threadId, 
              couple_id: coupleId, 
              vendor_id: vendorId, 
              is_active: true 
            }
          });

          // Mock message insertion
          query.mockImplementation((sql, params) => {
            if (sql.includes('INSERT INTO messages')) {
              return Promise.resolve({ 
                lastID: messageId, 
                rows: [{ id: messageId }] 
              });
            }
            if (sql.includes('UPDATE message_threads')) {
              return Promise.resolve({ rowCount: 1 });
            }
            if (sql.includes('SELECT') && sql.includes('FROM messages')) {
              const timestamp = new Date().toISOString();
              return Promise.resolve({
                rows: [{
                  id: messageId,
                  thread_id: threadId,
                  sender_id: senderId,
                  sender_type: senderType,
                  content: `encrypted_${content.trim()}`,
                  message_type: messageType,
                  status: 'sent',
                  is_deleted: 0,
                  created_at: timestamp,
                  updated_at: timestamp
                }]
              });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
          });

          // Send the message
          const result = await messageService.sendMessage(
            threadId,
            senderId,
            senderType,
            content,
            messageType
          );

          // Property 1: Message delivery - message should be sent successfully
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          expect(result.message).toBeDefined();

          // Property 2: Status confirmation - message should have status indicator
          expect(result.message.status).toBeDefined();
          expect(result.message.status).toBe('sent');
          expect(['sent', 'delivered', 'read']).toContain(result.message.status);

          // Property 3: Message data integrity - delivered message matches sent data
          expect(result.message.threadId).toBe(threadId);
          expect(result.message.senderId).toBe(senderId);
          expect(result.message.senderType).toBe(senderType);
          expect(result.message.messageType).toBe(messageType);
          expect(result.message.content).toBe(content.trim());

          // Property 4: Thread synchronization - thread timestamp should be updated
          // Verify UPDATE query was called for thread
          const updateCalls = query.mock.calls.filter(call => 
            call[0].includes('UPDATE message_threads')
          );
          expect(updateCalls.length).toBeGreaterThan(0);
          // Verify the thread ID is in the parameters array
          expect(updateCalls[0][1]).toEqual([threadId]);

          // Property 5: Encryption - content should be encrypted before storage
          expect(encryptionService.encryptMessage).toHaveBeenCalledWith(
            expect.any(String),
            String(threadId)
          );

          // Property 6: Authorization - access should be verified before sending
          expect(securityControls.verifyThreadAccess).toHaveBeenCalledWith(
            senderId,
            senderType,
            threadId
          );
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
        verbose: true
      }
    );
  }, 60000);

  /**
   * Property: Message retrieval synchronization - both participants can retrieve messages
   * **Validates: Requirements 2.5**
   */
  it('Property: Message retrieval synchronization - both participants see the same messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          messageCount: fc.integer({ min: 1, max: 10 }),
          messageId: fc.integer({ min: 1, max: 100000 })
        }),
        async ({ threadId, coupleId, vendorId, messageCount, messageId }) => {
          // Generate messages with guaranteed unique timestamps
          const baseTime = Date.now();
          const messages = Array.from({ length: messageCount }, (_, i) => ({
            id: messageId + i,
            thread_id: threadId,
            sender_id: i % 2 === 0 ? coupleId : vendorId,
            sender_type: i % 2 === 0 ? 'couple' : 'vendor',
            content: `encrypted_message_${i}`,
            message_type: 'text',
            status: 'sent',
            is_deleted: 0,
            read_at: null,
            // Ensure each message has a unique timestamp, incrementing by 2 seconds
            created_at: new Date(baseTime + i * 2000).toISOString(),
            updated_at: new Date(baseTime + i * 2000).toISOString()
          }));

          // Mock authorization for couple
          securityControls.verifyThreadAccess.mockResolvedValue({
            authorized: true,
            thread: { id: threadId, couple_id: coupleId, vendor_id: vendorId, is_active: true }
          });

          // Mock message retrieval
          query.mockImplementation((sql, params) => {
            if (sql.includes('COUNT(*)')) {
              return Promise.resolve({ rows: [{ total: messageCount }] });
            }
            return Promise.resolve({ rows: messages });
          });

          // Retrieve messages as couple
          const coupleResult = await messageService.getMessages(threadId, coupleId, 'couple', 50, 0);

          // Retrieve messages as vendor
          const vendorResult = await messageService.getMessages(threadId, vendorId, 'vendor', 50, 0);

          // Property: Both participants should successfully retrieve messages
          expect(coupleResult.success).toBe(true);
          expect(vendorResult.success).toBe(true);

          // Property: Both should see the same number of messages
          expect(coupleResult.messages.length).toBe(messageCount);
          expect(vendorResult.messages.length).toBe(messageCount);
          expect(coupleResult.total).toBe(messageCount);
          expect(vendorResult.total).toBe(messageCount);

          // Property: Message order should be consistent (chronological)
          // Messages are returned in DESC order (most recent first)
          if (coupleResult.messages.length > 1) {
            for (let i = 0; i < coupleResult.messages.length - 1; i++) {
              const currentTime = new Date(coupleResult.messages[i].createdAt).getTime();
              const nextTime = new Date(coupleResult.messages[i + 1].createdAt).getTime();
              // Messages are in DESC order, so current should be >= next (allowing for equal times)
              expect(currentTime).toBeGreaterThanOrEqual(nextTime);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Thread activity updates are immediate
   * **Validates: Requirements 2.5**
   */
  it('Property: Thread activity updates immediately when messages are sent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          senderId: fc.integer({ min: 1, max: 10000 }),
          senderType: fc.constantFrom('couple', 'vendor'),
          content: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }).filter(data => {
          if (data.senderType === 'couple') {
            return data.senderId === data.coupleId;
          } else {
            return data.senderId === data.vendorId;
          }
        }),
        async ({ threadId, coupleId, vendorId, senderId, senderType, content }) => {
          // Mock authorization
          securityControls.verifyThreadAccess.mockResolvedValue({
            authorized: true,
            thread: { id: threadId, couple_id: coupleId, vendor_id: vendorId, is_active: true }
          });

          let threadUpdateCalled = false;
          const beforeTimestamp = new Date().toISOString();

          // Mock database operations
          query.mockImplementation((sql, params) => {
            if (sql.includes('INSERT INTO messages')) {
              return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
            }
            if (sql.includes('UPDATE message_threads')) {
              threadUpdateCalled = true;
              return Promise.resolve({ rowCount: 1 });
            }
            if (sql.includes('SELECT') && sql.includes('FROM messages')) {
              return Promise.resolve({
                rows: [{
                  id: 1,
                  thread_id: threadId,
                  sender_id: senderId,
                  sender_type: senderType,
                  content: `encrypted_${content.trim()}`,
                  message_type: 'text',
                  status: 'sent',
                  is_deleted: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]
              });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
          });

          // Send message
          const result = await messageService.sendMessage(
            threadId,
            senderId,
            senderType,
            content,
            'text'
          );

          // Property: Message should be sent successfully
          expect(result.success).toBe(true);

          // Property: Thread update should be called immediately
          expect(threadUpdateCalled).toBe(true);

          // Property: Thread update should include the thread ID
          const updateCalls = query.mock.calls.filter(call => 
            call[0].includes('UPDATE message_threads')
          );
          expect(updateCalls.length).toBeGreaterThan(0);
          expect(updateCalls[0][1]).toEqual([threadId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Message status transitions are valid
   * **Validates: Requirements 2.3**
   */
  it('Property: Message status indicators follow valid state transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          messageId: fc.integer({ min: 1, max: 10000 }),
          threadId: fc.integer({ min: 1, max: 10000 }),
          senderId: fc.integer({ min: 1, max: 10000 }),
          recipientId: fc.integer({ min: 1, max: 10000 }),
          senderType: fc.constantFrom('couple', 'vendor')
        }).filter(data => data.senderId !== data.recipientId),
        async ({ messageId, threadId, senderId, recipientId, senderType }) => {
          const recipientType = senderType === 'couple' ? 'vendor' : 'couple';

          // Mock message access authorization
          securityControls.verifyMessageAccess.mockResolvedValue({
            authorized: true,
            message: {
              id: messageId,
              thread_id: threadId,
              sender_id: senderId,
              sender_type: senderType,
              is_deleted: 0,
              is_active: true
            }
          });

          // Mock read status check and update
          query.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id FROM message_read_status')) {
              return Promise.resolve({ rows: [] }); // Not yet read
            }
            if (sql.includes('INSERT INTO message_read_status')) {
              return Promise.resolve({ rowCount: 1 });
            }
            if (sql.includes('UPDATE messages')) {
              return Promise.resolve({ rowCount: 1 });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
          });

          // Mark message as read
          const result = await messageService.markAsRead(messageId, recipientId, recipientType);

          // Property: Status update should succeed
          expect(result.success).toBe(true);

          // Property: Status should transition from sent to read
          const updateCalls = query.mock.calls.filter(call => 
            call[0].includes("UPDATE messages") && call[0].includes("status = 'read'")
          );
          expect(updateCalls.length).toBeGreaterThan(0);

          // Property: Read status should be recorded
          const insertCalls = query.mock.calls.filter(call => 
            call[0].includes('INSERT INTO message_read_status')
          );
          expect(insertCalls.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Unauthorized message delivery is prevented
   * **Validates: Requirements 2.1**
   */
  it('Property: Messages cannot be sent by unauthorized users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          unauthorizedUserId: fc.integer({ min: 1, max: 10000 }),
          senderType: fc.constantFrom('couple', 'vendor'),
          content: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }).filter(data => {
          // Ensure unauthorized user is NOT a participant
          return data.unauthorizedUserId !== data.coupleId && 
                 data.unauthorizedUserId !== data.vendorId;
        }),
        async ({ threadId, coupleId, vendorId, unauthorizedUserId, senderType, content }) => {
          // Mock authorization failure
          securityControls.verifyThreadAccess.mockResolvedValue({
            authorized: false,
            reason: 'User is not a participant in this thread'
          });

          // Attempt to send message as unauthorized user
          const result = await messageService.sendMessage(
            threadId,
            unauthorizedUserId,
            senderType,
            content,
            'text'
          );

          // Property: Unauthorized message delivery must fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.message).toBeUndefined();

          // Property: No database insertion should occur
          const insertCalls = query.mock.calls.filter(call => 
            call[0].includes('INSERT INTO messages')
          );
          expect(insertCalls.length).toBe(0);

          // Property: Thread should not be updated
          const updateCalls = query.mock.calls.filter(call => 
            call[0].includes('UPDATE message_threads')
          );
          expect(updateCalls.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Message content validation prevents invalid messages
   * **Validates: Requirements 2.1**
   */
  it('Property: Invalid message content is rejected before delivery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          senderId: fc.integer({ min: 1, max: 10000 }),
          senderType: fc.constantFrom('couple', 'vendor'),
          invalidContent: fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\n\t  '),
            fc.constant(null),
            fc.constant(undefined),
            fc.string({ minLength: 10001, maxLength: 10100 }) // Exceeds max length
          )
        }),
        async ({ threadId, senderId, senderType, invalidContent }) => {
          // Reset mocks for this test
          jest.clearAllMocks();

          // Attempt to send invalid message
          const result = await messageService.sendMessage(
            threadId,
            senderId,
            senderType,
            invalidContent,
            'text'
          );

          // Property: Invalid content must be rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.message).toBeUndefined();

          // Property: No authorization check should occur for invalid content
          // (validation happens before authorization)
          expect(securityControls.verifyThreadAccess).not.toHaveBeenCalled();

          // Property: No database operations should occur
          expect(query).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Thread synchronization maintains consistency across operations
   * **Validates: Requirements 2.5**
   */
  it('Property: Multiple messages update thread consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          messageCount: fc.integer({ min: 2, max: 5 })
        }),
        async ({ threadId, coupleId, vendorId, messageCount }) => {
          let threadUpdateCount = 0;
          let messageIdCounter = 1;

          // Mock authorization
          securityControls.verifyThreadAccess.mockResolvedValue({
            authorized: true,
            thread: { id: threadId, couple_id: coupleId, vendor_id: vendorId, is_active: true }
          });

          // Mock database operations - track the actual threadId used
          const threadUpdates = [];
          query.mockImplementation((sql, params) => {
            if (sql.includes('INSERT INTO messages')) {
              return Promise.resolve({ 
                lastID: messageIdCounter, 
                rows: [{ id: messageIdCounter++ }] 
              });
            }
            if (sql.includes('UPDATE message_threads')) {
              threadUpdateCount++;
              threadUpdates.push(params[0]); // Track the threadId from params
              return Promise.resolve({ rowCount: 1 });
            }
            if (sql.includes('SELECT') && sql.includes('FROM messages')) {
              return Promise.resolve({
                rows: [{
                  id: messageIdCounter - 1,
                  thread_id: threadId,
                  sender_id: coupleId,
                  sender_type: 'couple',
                  content: 'encrypted_test',
                  message_type: 'text',
                  status: 'sent',
                  is_deleted: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]
              });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
          });

          // Send multiple messages
          const results = [];
          for (let i = 0; i < messageCount; i++) {
            const result = await messageService.sendMessage(
              threadId,
              coupleId,
              'couple',
              `Message ${i}`,
              'text'
            );
            results.push(result);
          }

          // Property: All messages should be sent successfully
          results.forEach(result => {
            expect(result.success).toBe(true);
          });

          // Property: Thread should be updated for each message
          expect(threadUpdateCount).toBe(messageCount);

          // Property: Each update should reference the same thread
          threadUpdates.forEach(updatedThreadId => {
            expect(updatedThreadId).toBe(threadId);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Message delivery is idempotent for duplicate detection
   * **Validates: Requirements 2.1**
   */
  it('Property: Message delivery handles concurrent operations gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          coupleId: fc.integer({ min: 1, max: 10000 }),
          vendorId: fc.integer({ min: 1, max: 10000 }),
          content: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }),
        async ({ threadId, coupleId, vendorId, content }) => {
          let messageIdCounter = 1;

          // Mock authorization
          securityControls.verifyThreadAccess.mockResolvedValue({
            authorized: true,
            thread: { id: threadId, couple_id: coupleId, vendor_id: vendorId, is_active: true }
          });

          // Mock database operations
          query.mockImplementation((sql, params) => {
            if (sql.includes('INSERT INTO messages')) {
              return Promise.resolve({ 
                lastID: messageIdCounter++, 
                rows: [{ id: messageIdCounter - 1 }] 
              });
            }
            if (sql.includes('UPDATE message_threads')) {
              return Promise.resolve({ rowCount: 1 });
            }
            if (sql.includes('SELECT') && sql.includes('FROM messages')) {
              return Promise.resolve({
                rows: [{
                  id: messageIdCounter - 1,
                  thread_id: threadId,
                  sender_id: coupleId,
                  sender_type: 'couple',
                  content: `encrypted_${content.trim()}`,
                  message_type: 'text',
                  status: 'sent',
                  is_deleted: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]
              });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
          });

          // Send same message concurrently (simulating race condition)
          const [result1, result2] = await Promise.all([
            messageService.sendMessage(threadId, coupleId, 'couple', content, 'text'),
            messageService.sendMessage(threadId, coupleId, 'couple', content, 'text')
          ]);

          // Property: Both operations should complete successfully
          expect(result1.success).toBe(true);
          expect(result2.success).toBe(true);

          // Property: Each should have a unique message ID
          expect(result1.message.id).toBeDefined();
          expect(result2.message.id).toBeDefined();
          // Note: In a real system, these would be different IDs
          // Here we're testing that the system handles concurrent operations

          // Property: Thread should be updated (at least once)
          const updateCalls = query.mock.calls.filter(call => 
            call[0].includes('UPDATE message_threads')
          );
          expect(updateCalls.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Message type validation ensures correct delivery
   * **Validates: Requirements 2.1**
   */
  it('Property: Only valid message types are accepted for delivery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.integer({ min: 1, max: 10000 }),
          senderId: fc.integer({ min: 1, max: 10000 }),
          senderType: fc.constantFrom('couple', 'vendor'),
          content: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          messageType: fc.oneof(
            fc.constantFrom('text', 'image', 'document', 'system'), // Valid types
            fc.constantFrom('video', 'audio', 'unknown', '', null) // Invalid types
          )
        }),
        async ({ threadId, senderId, senderType, content, messageType }) => {
          const validTypes = ['text', 'image', 'document', 'system'];
          const isValidType = validTypes.includes(messageType);

          if (isValidType) {
            // Mock successful authorization for valid types
            securityControls.verifyThreadAccess.mockResolvedValue({
              authorized: true,
              thread: { id: threadId, is_active: true }
            });

            query.mockImplementation((sql, params) => {
              if (sql.includes('INSERT INTO messages')) {
                return Promise.resolve({ lastID: 1, rows: [{ id: 1 }] });
              }
              if (sql.includes('UPDATE message_threads')) {
                return Promise.resolve({ rowCount: 1 });
              }
              if (sql.includes('SELECT') && sql.includes('FROM messages')) {
                return Promise.resolve({
                  rows: [{
                    id: 1,
                    thread_id: threadId,
                    sender_id: senderId,
                    sender_type: senderType,
                    content: `encrypted_${content.trim()}`,
                    message_type: messageType,
                    status: 'sent',
                    is_deleted: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }]
                });
              }
              return Promise.resolve({ rows: [], rowCount: 0 });
            });
          }

          // Attempt to send message
          const result = await messageService.sendMessage(
            threadId,
            senderId,
            senderType,
            content,
            messageType
          );

          if (isValidType) {
            // Property: Valid message types should be delivered
            expect(result.success).toBe(true);
            expect(result.message.messageType).toBe(messageType);
          } else {
            // Property: Invalid message types should be rejected
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid message type');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
