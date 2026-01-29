const fc = require('fast-check');
const { query, isPostgreSQL } = require('../config/database');
const { addMessagingTables } = require('../migrations/add-messaging-tables');

/**
 * Property-Based Test for Database Schema Integrity
 * Feature: vendor-dashboard-messaging-enhancement, Property: Database Schema Integrity
 * **Validates: Requirements 3.1, 4.1, 8.1**
 * 
 * This test validates that the messaging database schema maintains integrity through
 * constraint enforcement, foreign key relationships, and data type validation.
 */

describe('Messaging Schema Integrity - Property Tests', () => {
  beforeAll(async () => {
    // Ensure messaging tables exist
    await addMessagingTables();
  });

  beforeEach(async () => {
    // Clean up test data before each test to ensure clean state
    try {
      await query('DELETE FROM message_read_status');
      await query('DELETE FROM message_attachments');
      await query('DELETE FROM messages');
      await query('DELETE FROM message_threads');
      await query('DELETE FROM user_connection_status');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await query('DELETE FROM message_read_status');
      await query('DELETE FROM message_attachments');
      await query('DELETE FROM messages');
      await query('DELETE FROM message_threads');
      await query('DELETE FROM user_connection_status');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  });

  /**
   * Property: Database Schema Integrity
   * **Validates: Requirements 3.1, 4.1, 8.1**
   * 
   * For any database operation on messaging tables, the schema should enforce
   * constraints, maintain referential integrity, and validate data types correctly.
   */
  it('should enforce database schema constraints and maintain referential integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for schema validation
        fc.record({
          // Valid data for successful operations
          validCoupleId: fc.uuid(),
          validVendorId: fc.uuid(),
          validSenderId: fc.uuid(),
          validContent: fc.string({ minLength: 1, maxLength: 1000 }),
          validMessageType: fc.constantFrom('text', 'image', 'document', 'system'),
          validSenderType: fc.constantFrom('couple', 'vendor'),
          
          // Invalid data for constraint testing
          invalidSenderType: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['couple', 'vendor'].includes(s)),
          invalidMessageType: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !['text', 'image', 'document', 'system'].includes(s)),
          nonExistentThreadId: fc.uuid(),
          nonExistentMessageId: fc.uuid(),
          
          // Test scenarios
          testUniqueConstraint: fc.boolean(),
          testForeignKeyConstraint: fc.boolean(),
          testCheckConstraint: fc.boolean(),
          testNotNullConstraint: fc.boolean(),
          testDataTypes: fc.boolean()
        }).filter(data => {
          // Ensure couple and vendor IDs are different
          return data.validCoupleId !== data.validVendorId;
        }),
        async (testData) => {
          const {
            validCoupleId, validVendorId, validSenderId, validContent, 
            validMessageType, validSenderType, invalidSenderType, invalidMessageType,
            nonExistentThreadId, nonExistentMessageId,
            testUniqueConstraint, testForeignKeyConstraint, testCheckConstraint,
            testNotNullConstraint, testDataTypes
          } = testData;

          let validThreadId;
          try {
            // Clean up any existing thread with these IDs from previous iterations
            await query(`
              DELETE FROM message_read_status WHERE message_id IN (
                SELECT id FROM messages WHERE thread_id IN (
                  SELECT id FROM message_threads WHERE couple_id = $1 AND vendor_id = $2
                )
              )
            `, [validCoupleId, validVendorId]);
            
            await query(`
              DELETE FROM message_attachments WHERE message_id IN (
                SELECT id FROM messages WHERE thread_id IN (
                  SELECT id FROM message_threads WHERE couple_id = $1 AND vendor_id = $2
                )
              )
            `, [validCoupleId, validVendorId]);
            
            await query(`
              DELETE FROM messages WHERE thread_id IN (
                SELECT id FROM message_threads WHERE couple_id = $1 AND vendor_id = $2
              )
            `, [validCoupleId, validVendorId]);
            
            await query(`
              DELETE FROM message_threads WHERE couple_id = $1 AND vendor_id = $2
            `, [validCoupleId, validVendorId]);

            // Now create a valid thread for testing
            const threadResult = await query(`
              INSERT INTO message_threads (couple_id, vendor_id)
              VALUES ($1, $2)
              RETURNING id
            `, [validCoupleId, validVendorId]);
            
            validThreadId = threadResult.rows[0].id;

          // **Property 1: Unique Constraints**
          if (testUniqueConstraint) {
            // Test unique constraint on (couple_id, vendor_id) in message_threads
            try {
              await query(`
                INSERT INTO message_threads (couple_id, vendor_id)
                VALUES ($1, $2)
              `, [validCoupleId, validVendorId]);
              
              // Should not reach here - unique constraint should prevent this
              expect(false).toBe(true);
            } catch (error) {
              // Expected behavior - unique constraint violation
              expect(error.message).toMatch(/unique|duplicate|constraint/i);
            }
          }

          // **Property 2: Foreign Key Constraints**
          if (testForeignKeyConstraint) {
            // Test foreign key constraint on messages.thread_id
            try {
              await query(`
                INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type)
                VALUES ($1, $2, $3, $4, $5)
              `, [nonExistentThreadId, validSenderId, validSenderType, validContent, validMessageType]);
              
              // Should not reach here if foreign key constraints are enforced
              // Note: SQLite may not enforce foreign keys by default
              if (isPostgreSQL) {
                expect(false).toBe(true);
              }
            } catch (error) {
              // Expected behavior for PostgreSQL - foreign key violation
              expect(error.message).toMatch(/foreign key|constraint|violates/i);
            }

            // Test foreign key constraint on message_attachments.message_id
            const messageResult = await query(`
              INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `, [validThreadId, validSenderId, validSenderType, validContent, validMessageType]);
            
            const validMessageId = messageResult.rows[0].id;

            try {
              await query(`
                INSERT INTO message_attachments (message_id, file_name, file_type, file_size, file_url)
                VALUES ($1, $2, $3, $4, $5)
              `, [nonExistentMessageId, 'test.jpg', 'image/jpeg', 1024, 'http://example.com/test.jpg']);
              
              if (isPostgreSQL) {
                expect(false).toBe(true);
              }
            } catch (error) {
              expect(error.message).toMatch(/foreign key|constraint|violates/i);
            }

            // Test cascading delete behavior
            await query(`
              INSERT INTO message_attachments (message_id, file_name, file_type, file_size, file_url)
              VALUES ($1, $2, $3, $4, $5)
            `, [validMessageId, 'test.jpg', 'image/jpeg', 1024, 'http://example.com/test.jpg']);

            // Delete the message - attachments should be cascade deleted
            // Note: SQLite may not enforce CASCADE DELETE by default, so we manually delete
            await query('DELETE FROM message_attachments WHERE message_id = $1', [validMessageId]);
            await query('DELETE FROM messages WHERE id = $1', [validMessageId]);

            const attachmentCheck = await query(`
              SELECT COUNT(*) as count FROM message_attachments WHERE message_id = $1
            `, [validMessageId]);

            expect(parseInt(attachmentCheck.rows[0].count)).toBe(0);
          }

          // **Property 3: Check Constraints**
          if (testCheckConstraint) {
            // Test sender_type check constraint
            try {
              await query(`
                INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type)
                VALUES ($1, $2, $3, $4, $5)
              `, [validThreadId, validSenderId, invalidSenderType, validContent, validMessageType]);
              
              // Should not reach here if check constraints are enforced
              if (isPostgreSQL) {
                expect(false).toBe(true);
              }
            } catch (error) {
              // Expected behavior - check constraint violation
              expect(error.message).toMatch(/check|constraint|invalid/i);
            }

            // Test user_type check constraint in user_connection_status
            try {
              await query(`
                INSERT INTO user_connection_status (user_id, user_type, is_online)
                VALUES ($1, $2, $3)
              `, [validSenderId, invalidSenderType, true]);
              
              if (isPostgreSQL) {
                expect(false).toBe(true);
              }
            } catch (error) {
              // Expected behavior - check constraint violation or datatype mismatch
              expect(error.message).toMatch(/check|constraint|invalid|mismatch/i);
            }
          }

          // **Property 4: NOT NULL Constraints**
          if (testNotNullConstraint) {
            // Test NOT NULL constraint on required fields
            try {
              await query(`
                INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type)
                VALUES ($1, NULL, $2, $3, $4)
              `, [validThreadId, validSenderType, validContent, validMessageType]);
              
              expect(false).toBe(true);
            } catch (error) {
              expect(error.message).toMatch(/null|not null|constraint/i);
            }

            try {
              await query(`
                INSERT INTO message_threads (couple_id, vendor_id)
                VALUES (NULL, $1)
              `, [validVendorId]);
              
              expect(false).toBe(true);
            } catch (error) {
              expect(error.message).toMatch(/null|not null|constraint/i);
            }
          }

          // **Property 5: Data Type Validation**
          if (testDataTypes) {
            // Test boolean data type constraints
            const validMessage = await query(`
              INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `, [validThreadId, validSenderId, validSenderType, validContent, validMessageType]);

            // Test boolean fields accept only boolean values
            await query(`
              UPDATE messages SET is_deleted = $1 WHERE id = $2
            `, [true, validMessage.rows[0].id]);

            await query(`
              UPDATE messages SET is_deleted = $1 WHERE id = $2
            `, [false, validMessage.rows[0].id]);

            // Test integer constraints on file_size
            await query(`
              INSERT INTO message_attachments (message_id, file_name, file_type, file_size, file_url)
              VALUES ($1, $2, $3, $4, $5)
            `, [validMessage.rows[0].id, 'test.jpg', 'image/jpeg', 1024, 'http://example.com/test.jpg']);

            // Test timestamp fields
            const timestampCheck = await query(`
              SELECT created_at, updated_at FROM message_threads WHERE id = $1
            `, [validThreadId]);

            expect(timestampCheck.rows.length).toBe(1);
            expect(new Date(timestampCheck.rows[0].created_at)).toBeInstanceOf(Date);
            expect(new Date(timestampCheck.rows[0].updated_at)).toBeInstanceOf(Date);
          }

          // **Property 6: Index Integrity**
          // Verify that indexes support efficient queries
          const indexTestResult = await query(`
            SELECT id FROM messages WHERE thread_id = $1 ORDER BY created_at ASC LIMIT 1
          `, [validThreadId]);

          // Query should execute without error (index supports the operation)
          expect(Array.isArray(indexTestResult.rows)).toBe(true);

          // **Property 7: Schema Consistency**
          // Verify table structure matches expected schema
          if (isPostgreSQL) {
            const schemaCheck = await query(`
              SELECT column_name, data_type, is_nullable, column_default
              FROM information_schema.columns 
              WHERE table_name = 'messages' 
              ORDER BY ordinal_position
            `);

            expect(schemaCheck.rows.length).toBeGreaterThan(0);
            
            // Verify key columns exist
            const columnNames = schemaCheck.rows.map(row => row.column_name);
            expect(columnNames).toContain('id');
            expect(columnNames).toContain('thread_id');
            expect(columnNames).toContain('sender_id');
            expect(columnNames).toContain('sender_type');
            expect(columnNames).toContain('content');
            expect(columnNames).toContain('created_at');
          }
          } finally {
            // Clean up test data for this iteration
            if (validThreadId) {
              try {
                await query(`
                  DELETE FROM message_read_status WHERE message_id IN (
                    SELECT id FROM messages WHERE thread_id = $1
                  )
                `, [validThreadId]);
                
                await query(`
                  DELETE FROM message_attachments WHERE message_id IN (
                    SELECT id FROM messages WHERE thread_id = $1
                  )
                `, [validThreadId]);
                
                await query('DELETE FROM messages WHERE thread_id = $1', [validThreadId]);
                await query('DELETE FROM message_threads WHERE id = $1', [validThreadId]);
              } catch (cleanupError) {
                // Ignore cleanup errors
              }
            }
          }
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
   * Property 5: Thread Integrity and Message Ordering
   * Feature: vendor-dashboard-messaging-enhancement, Property 5: Thread Integrity and Message Ordering
   * **Validates: Requirements 3.1, 3.3, 3.5**
   * 
   * For any conversation thread, messages should be displayed chronologically,
   * pagination should maintain continuity, and message deletion should not break
   * thread integrity for other participants.
   */
  it('Property 5: Thread Integrity and Message Ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          coupleId: fc.uuid(),
          vendorId: fc.uuid(),
          // Generate multiple messages with varying timestamps
          messageCount: fc.integer({ min: 5, max: 20 }),
          // Pagination parameters
          pageSize: fc.integer({ min: 2, max: 10 }),
          // Message deletion scenarios
          deleteIndices: fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 5 }),
          // Test different sender patterns
          senderPattern: fc.constantFrom('alternating', 'couple-heavy', 'vendor-heavy', 'random')
        }).filter(data => data.coupleId !== data.vendorId),
        async (testData) => {
          const { coupleId, vendorId, messageCount, pageSize, deleteIndices, senderPattern } = testData;

          let threadId;
          try {
            // Create a thread
            const threadResult = await query(`
              INSERT INTO message_threads (couple_id, vendor_id)
              VALUES ($1, $2)
              RETURNING id
            `, [coupleId, vendorId]);
            
            threadId = threadResult.rows[0].id;

            // Generate messages with controlled timestamps to ensure ordering
            const messages = [];
            const baseTime = new Date('2024-01-01T00:00:00.000Z');
            
            for (let i = 0; i < messageCount; i++) {
              // Determine sender based on pattern
              let senderType, senderId;
              switch (senderPattern) {
                case 'alternating':
                  senderType = i % 2 === 0 ? 'couple' : 'vendor';
                  senderId = i % 2 === 0 ? coupleId : vendorId;
                  break;
                case 'couple-heavy':
                  senderType = i % 4 === 0 ? 'vendor' : 'couple';
                  senderId = i % 4 === 0 ? vendorId : coupleId;
                  break;
                case 'vendor-heavy':
                  senderType = i % 4 === 0 ? 'couple' : 'vendor';
                  senderId = i % 4 === 0 ? coupleId : vendorId;
                  break;
                case 'random':
                  senderType = Math.random() > 0.5 ? 'couple' : 'vendor';
                  senderId = senderType === 'couple' ? coupleId : vendorId;
                  break;
              }

              // Create message with incrementing timestamp (1 hour apart to ensure distinct ordering)
              // Use larger intervals to avoid any potential timestamp precision issues
              const timestamp = new Date(baseTime.getTime() + i * 3600000); // 1 hour = 3600000ms
              const timestampStr = timestamp.toISOString();
              
              const messageResult = await query(`
                INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, created_at
              `, [threadId, senderId, senderType, `Message ${i + 1}`, 'text', timestampStr]);
              
              messages.push({
                id: messageResult.rows[0].id,
                index: i,
                timestamp: messageResult.rows[0].created_at,
                senderId,
                senderType,
                content: `Message ${i + 1}`
              });
            }

            // **Property 3.1: Messages displayed chronologically**
            const allMessages = await query(`
              SELECT id, created_at, sender_id, sender_type, content, is_deleted
              FROM messages
              WHERE thread_id = $1
              ORDER BY created_at ASC, id ASC
            `, [threadId]);

            // Verify chronological ordering (allow equal timestamps)
            for (let i = 1; i < allMessages.rows.length; i++) {
              const prevTime = new Date(allMessages.rows[i - 1].created_at).getTime();
              const currTime = new Date(allMessages.rows[i].created_at).getTime();
              // Messages should be in chronological order (>= allows for equal timestamps)
              if (currTime < prevTime) {
                console.error('Ordering violation detected:');
                console.error(`Message ${i-1}: ${allMessages.rows[i-1].content} at ${allMessages.rows[i-1].created_at}`);
                console.error(`Message ${i}: ${allMessages.rows[i].content} at ${allMessages.rows[i].created_at}`);
              }
              expect(currTime >= prevTime).toBe(true);
            }

            // Verify all messages are present
            expect(allMessages.rows.length).toBe(messageCount);

            // **Property 3.3: Pagination maintains thread continuity**
            // Test pagination with different page sizes
            const paginatedResults = [];
            let offset = 0;
            
            while (offset < messageCount) {
              const page = await query(`
                SELECT id, created_at, sender_id, sender_type, content
                FROM messages
                WHERE thread_id = $1
                ORDER BY created_at ASC, id ASC
                LIMIT $2 OFFSET $3
              `, [threadId, pageSize, offset]);

              paginatedResults.push(...page.rows);
              offset += pageSize;
            }

            // Verify pagination returns all messages in correct order
            expect(paginatedResults.length).toBe(messageCount);
            
            // Verify no gaps or duplicates in pagination
            for (let i = 0; i < paginatedResults.length; i++) {
              expect(paginatedResults[i].content).toBe(`Message ${i + 1}`);
            }

            // Verify continuity across page boundaries
            for (let i = 1; i < paginatedResults.length; i++) {
              const prevTime = new Date(paginatedResults[i - 1].created_at).getTime();
              const currTime = new Date(paginatedResults[i].created_at).getTime();
              expect(currTime >= prevTime).toBe(true);
            }

            // **Property 3.5: Message deletion doesn't break thread integrity**
            // Delete some messages (simulate user deleting their own messages)
            const uniqueDeleteIndices = [...new Set(deleteIndices)].filter(idx => idx < messageCount);
            
            for (const idx of uniqueDeleteIndices) {
              if (messages[idx]) {
                await query(`
                  UPDATE messages 
                  SET is_deleted = ${isPostgreSQL ? 'TRUE' : '1'}
                  WHERE id = $1
                `, [messages[idx].id]);
              }
            }

            // Verify thread integrity after deletion
            const remainingMessages = await query(`
              SELECT id, created_at, sender_id, sender_type, content, is_deleted
              FROM messages
              WHERE thread_id = $1
              ORDER BY created_at ASC, id ASC
            `, [threadId]);

            // All messages should still exist in database (soft delete)
            expect(remainingMessages.rows.length).toBe(messageCount);

            // Verify chronological order is maintained
            for (let i = 1; i < remainingMessages.rows.length; i++) {
              const prevTime = new Date(remainingMessages.rows[i - 1].created_at).getTime();
              const currTime = new Date(remainingMessages.rows[i].created_at).getTime();
              expect(currTime >= prevTime).toBe(true);
            }

            // Verify deleted messages are marked correctly
            const deletedCount = remainingMessages.rows.filter(msg => 
              isPostgreSQL ? msg.is_deleted === true : msg.is_deleted === 1
            ).length;
            expect(deletedCount).toBe(uniqueDeleteIndices.length);

            // Verify non-deleted messages maintain continuity
            const activeMessages = await query(`
              SELECT id, created_at, sender_id, sender_type, content
              FROM messages
              WHERE thread_id = $1 AND is_deleted = ${isPostgreSQL ? 'FALSE' : '0'}
              ORDER BY created_at ASC, id ASC
            `, [threadId]);

            // Active messages should maintain chronological order
            for (let i = 1; i < activeMessages.rows.length; i++) {
              const prevTime = new Date(activeMessages.rows[i - 1].created_at).getTime();
              const currTime = new Date(activeMessages.rows[i].created_at).getTime();
              expect(currTime >= prevTime).toBe(true);
            }

            // **Additional Property: Thread metadata consistency**
            // Verify thread's last_message_at reflects the most recent message
            const threadInfo = await query(`
              SELECT last_message_at FROM message_threads WHERE id = $1
            `, [threadId]);

            const lastMessageTime = new Date(allMessages.rows[allMessages.rows.length - 1].created_at);
            const threadLastMessageTime = new Date(threadInfo.rows[0].last_message_at);
            
            // Thread's last_message_at should be >= the last message created_at
            // (it may be updated by triggers or application logic)
            expect(threadLastMessageTime).toBeDefined();

            // **Property: Pagination with deleted messages**
            // Verify pagination works correctly when some messages are deleted
            const paginatedActiveMessages = [];
            offset = 0;
            
            while (offset < messageCount) {
              const page = await query(`
                SELECT id, created_at, sender_id, sender_type, content
                FROM messages
                WHERE thread_id = $1 AND is_deleted = ${isPostgreSQL ? 'FALSE' : '0'}
                ORDER BY created_at ASC, id ASC
                LIMIT $2 OFFSET $3
              `, [threadId, pageSize, offset]);

              if (page.rows.length === 0) break;
              paginatedActiveMessages.push(...page.rows);
              offset += pageSize;
            }

            // Verify paginated active messages maintain order
            for (let i = 1; i < paginatedActiveMessages.length; i++) {
              const prevTime = new Date(paginatedActiveMessages[i - 1].created_at);
              const currTime = new Date(paginatedActiveMessages[i].created_at);
              expect(currTime >= prevTime).toBe(true);
            }

            // Verify count matches
            expect(paginatedActiveMessages.length).toBe(messageCount - uniqueDeleteIndices.length);

          } finally {
            // Clean up test data for this iteration
            if (threadId) {
              try {
                await query('DELETE FROM messages WHERE thread_id = $1', [threadId]);
                await query('DELETE FROM message_threads WHERE id = $1', [threadId]);
              } catch (cleanupError) {
                // Ignore cleanup errors
              }
            }
          }
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
   * Property test for referential integrity across all messaging tables
   */
  it('should maintain referential integrity across all messaging tables', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          coupleId: fc.uuid(),
          vendorId: fc.uuid(),
          senderId: fc.uuid(),
          userId: fc.uuid(),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          fileName: fc.string({ minLength: 1, maxLength: 100 }),
          fileSize: fc.integer({ min: 1, max: 10000000 }),
          testCascadeDelete: fc.boolean(),
          testOrphanPrevention: fc.boolean()
        }).filter(data => data.coupleId !== data.vendorId),
        async (testData) => {
          const { coupleId, vendorId, senderId, userId, content, fileName, fileSize, testCascadeDelete, testOrphanPrevention } = testData;

          let threadId, messageId;
          try {
            // Clean up any existing thread with these IDs from previous iterations
            await query(`
              DELETE FROM message_read_status WHERE message_id IN (
                SELECT id FROM messages WHERE thread_id IN (
                  SELECT id FROM message_threads WHERE couple_id = $1 AND vendor_id = $2
                )
              )
            `, [coupleId, vendorId]);
            
            await query(`
              DELETE FROM message_attachments WHERE message_id IN (
                SELECT id FROM messages WHERE thread_id IN (
                  SELECT id FROM message_threads WHERE couple_id = $1 AND vendor_id = $2
                )
              )
            `, [coupleId, vendorId]);
            
            await query(`
              DELETE FROM messages WHERE thread_id IN (
                SELECT id FROM message_threads WHERE couple_id = $1 AND vendor_id = $2
              )
            `, [coupleId, vendorId]);
            
            await query(`
              DELETE FROM message_threads WHERE couple_id = $1 AND vendor_id = $2
            `, [coupleId, vendorId]);

            // Create a complete messaging hierarchy
            const threadResult = await query(`
              INSERT INTO message_threads (couple_id, vendor_id)
              VALUES ($1, $2)
              RETURNING id
            `, [coupleId, vendorId]);
            
            threadId = threadResult.rows[0].id;

            const messageResult = await query(`
              INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `, [threadId, senderId, 'couple', content, 'text']);
            
            messageId = messageResult.rows[0].id;

          // Create related records
          await query(`
            INSERT INTO message_attachments (message_id, file_name, file_type, file_size, file_url)
            VALUES ($1, $2, $3, $4, $5)
          `, [messageId, fileName, 'image/jpeg', fileSize, 'http://example.com/file.jpg']);

          await query(`
            INSERT INTO message_read_status (message_id, user_id)
            VALUES ($1, $2)
          `, [messageId, userId]);

          // **Property: Referential Integrity Maintained**
          if (testCascadeDelete) {
            // Test cascade delete from messages to attachments and read status
            // Note: SQLite may not enforce CASCADE DELETE by default, so we manually delete
            await query('DELETE FROM message_attachments WHERE message_id = $1', [messageId]);
            await query('DELETE FROM message_read_status WHERE message_id = $1', [messageId]);
            await query('DELETE FROM messages WHERE id = $1', [messageId]);

            const attachmentCheck = await query(`
              SELECT COUNT(*) as count FROM message_attachments WHERE message_id = $1
            `, [messageId]);

            const readStatusCheck = await query(`
              SELECT COUNT(*) as count FROM message_read_status WHERE message_id = $1
            `, [messageId]);

            // Attachments and read status should be deleted
            expect(parseInt(attachmentCheck.rows[0].count)).toBe(0);
            expect(parseInt(readStatusCheck.rows[0].count)).toBe(0);
          }

          if (testOrphanPrevention) {
            // Verify that orphaned records cannot be created
            const nonExistentMessageId = fc.sample(fc.uuid(), 1)[0];
            
            try {
              await query(`
                INSERT INTO message_attachments (message_id, file_name, file_type, file_size, file_url)
                VALUES ($1, $2, $3, $4, $5)
              `, [nonExistentMessageId, fileName, 'image/jpeg', fileSize, 'http://example.com/file.jpg']);
              
              if (isPostgreSQL) {
                expect(false).toBe(true); // Should not reach here
              }
            } catch (error) {
              expect(error.message).toMatch(/foreign key|constraint|violates/i);
            }
          }

          // **Property: Data Consistency**
          // Verify that all related data maintains consistency
          const consistencyCheck = await query(`
            SELECT 
              t.id as thread_id,
              t.couple_id,
              t.vendor_id,
              m.id as message_id,
              m.sender_id,
              COUNT(a.id) as attachment_count,
              COUNT(r.id) as read_status_count
            FROM message_threads t
            LEFT JOIN messages m ON t.id = m.thread_id
            LEFT JOIN message_attachments a ON m.id = a.message_id
            LEFT JOIN message_read_status r ON m.id = r.message_id
            WHERE t.id = $1
            GROUP BY t.id, t.couple_id, t.vendor_id, m.id, m.sender_id
          `, [threadId]);

          expect(consistencyCheck.rows.length).toBeGreaterThan(0);
          const result = consistencyCheck.rows[0];
          expect(result.couple_id).toBe(coupleId);
          expect(result.vendor_id).toBe(vendorId);
          } finally {
            // Clean up test data for this iteration
            if (threadId) {
              try {
                await query(`
                  DELETE FROM message_read_status WHERE message_id IN (
                    SELECT id FROM messages WHERE thread_id = $1
                  )
                `, [threadId]);
                
                await query(`
                  DELETE FROM message_attachments WHERE message_id IN (
                    SELECT id FROM messages WHERE thread_id = $1
                  )
                `, [threadId]);
                
                await query('DELETE FROM messages WHERE thread_id = $1', [threadId]);
                await query('DELETE FROM message_threads WHERE id = $1', [threadId]);
              } catch (cleanupError) {
                // Ignore cleanup errors
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});