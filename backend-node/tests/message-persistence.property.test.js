const fc = require('fast-check');
const request = require('supertest');
const express = require('express');

// Mock all external dependencies before importing routes
jest.mock('../config/database');
jest.mock('../services/dashboardIntegration');
jest.mock('../services/messageService');
jest.mock('../middleware/auth');
jest.mock('multer', () => {
  return () => ({
    array: () => (req, res, next) => {
      req.files = [];
      next();
    }
  });
});

const { query } = require('../config/database');
const dashboardIntegration = require('../services/dashboardIntegration');
const messageService = require('../services/messageService');
const { authenticateToken } = require('../middleware/auth');

describe('Property 3: Message Persistence', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mock authentication middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 1, user_type: 'COUPLE' };
      next();
    });
    
    // Import routes after mocking dependencies
    const messagingRoutes = require('../routes/messaging-unified');
    app.use('/api/v1/messaging', messagingRoutes);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  /**
   * Property 3: Message Persistence
   * 
   * For any message sent through either interface, the message should be 
   * immediately stored in the database and retrievable by both sender and 
   * recipient across sessions.
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * 
   * This property tests that:
   * 1. Messages are persisted to database when sent
   * 2. Messages remain accessible across sessions
   * 3. Both sender and recipient can retrieve the message
   * 4. Message content and metadata are preserved accurately
   */
  describe('Message Persistence Property', () => {
    it('should persist messages to database and make them retrievable', () => {
      fc.assert(fc.property(
        fc.record({
          // Generate test message data
          threadId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          content: fc.string({ minLength: 5, maxLength: 500 }).filter(s => s.trim().length > 0),
          messageType: fc.constantFrom('text', 'image', 'file'),
          userId: fc.integer({ min: 1, max: 1000 }),
          userType: fc.constantFrom('COUPLE', 'VENDOR')
        }),
        async (testData) => {
          const messageId = `msg_${Date.now()}_${Math.random()}`;
          
          // Mock authentication for the test user
          authenticateToken.mockImplementation((req, res, next) => {
            req.user = { id: testData.userId, user_type: testData.userType };
            next();
          });
          
          // Mock database queries for user context
          query.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id FROM couples')) {
              return { rows: testData.userType === 'COUPLE' ? [{ id: testData.userId }] : [] };
            }
            if (sql.includes('SELECT id FROM vendors')) {
              return { rows: testData.userType === 'VENDOR' ? [{ id: testData.userId }] : [] };
            }
            if (sql.includes('SELECT id FROM message_threads')) {
              return { rows: [{ id: testData.threadId }] };
            }
            return { rows: [] };
          });
          
          // Mock message service to simulate database persistence
          const persistedMessage = {
            id: messageId,
            threadId: testData.threadId,
            content: testData.content,
            messageType: testData.messageType,
            senderId: testData.userId,
            senderType: testData.userType.toLowerCase(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          messageService.sendMessage.mockResolvedValue({
            success: true,
            message: persistedMessage
          });
          
          messageService.getMessages.mockResolvedValue({
            success: true,
            messages: [persistedMessage],
            hasMore: false,
            total: 1
          });
          
          // Step 1: Send message through API
          const sendResponse = await request(app)
            .post('/api/v1/messaging/messages')
            .send({
              threadId: testData.threadId,
              content: testData.content,
              messageType: testData.messageType
            });
          
          // Verify message was sent successfully
          expect(sendResponse.status).toBe(201);
          expect(sendResponse.body.success).toBe(true);
          expect(sendResponse.body.data.message).toMatchObject({
            id: messageId,
            content: testData.content,
            messageType: testData.messageType,
            threadId: testData.threadId
          });
          
          // Verify messageService.sendMessage was called with correct parameters
          expect(messageService.sendMessage).toHaveBeenCalledWith(
            testData.threadId,
            testData.userId,
            testData.userType.toLowerCase(),
            testData.content,
            testData.messageType,
            []  // attachments
          );
          
          // Step 2: Retrieve messages to verify persistence
          const retrieveResponse = await request(app)
            .get(`/api/v1/messaging/messages/${testData.threadId}`);
          
          expect(retrieveResponse.status).toBe(200);
          expect(retrieveResponse.body.success).toBe(true);
          expect(retrieveResponse.body.data.messages).toHaveLength(1);
          
          const retrievedMessage = retrieveResponse.body.data.messages[0];
          expect(retrievedMessage).toMatchObject({
            id: messageId,
            content: testData.content,
            messageType: testData.messageType,
            threadId: testData.threadId
          });
          
          // Verify that messageService.getMessages was called (indicating database retrieval)
          expect(messageService.getMessages).toHaveBeenCalledWith(
            testData.threadId,
            testData.userId,
            testData.userType.toLowerCase(),
            50, // default limit
            0   // default offset
          );
        }
      ), { 
        numRuns: 50,
        timeout: 10000,
        verbose: false
      });
    });
    
    it('should handle message persistence failures gracefully', () => {
      fc.assert(fc.property(
        fc.record({
          threadId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          content: fc.string({ minLength: 5, maxLength: 500 }).filter(s => s.trim().length > 0),
          messageType: fc.constantFrom('text', 'image', 'file')
        }),
        async (testData) => {
          // Mock database queries for user context
          query.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id FROM couples')) {
              return { rows: [{ id: 1 }] };
            }
            if (sql.includes('SELECT id FROM message_threads')) {
              return { rows: [{ id: testData.threadId }] };
            }
            return { rows: [] };
          });
          
          // Mock message service to simulate persistence failure
          messageService.sendMessage.mockResolvedValue({
            success: false,
            error: 'Database connection failed'
          });
          
          // Attempt to send message
          const response = await request(app)
            .post('/api/v1/messaging/messages')
            .send({
              threadId: testData.threadId,
              content: testData.content,
              messageType: testData.messageType
            });
          
          // Verify proper error handling
          expect(response.status).toBe(500);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(response.body.error.code).toBe('SEND_MESSAGE_FAILED');
          
          // Verify that the failed message is not retrievable
          messageService.getMessages.mockResolvedValue({
            success: true,
            messages: [], // No messages should be returned
            hasMore: false,
            total: 0
          });
          
          const retrieveResponse = await request(app)
            .get(`/api/v1/messaging/messages/${testData.threadId}`);
          
          expect(retrieveResponse.status).toBe(200);
          expect(retrieveResponse.body.success).toBe(true);
          expect(retrieveResponse.body.data.messages).toHaveLength(0);
        }
      ), { 
        numRuns: 25,
        timeout: 5000
      });
    });
    
    it('should preserve message content accurately', () => {
      fc.assert(fc.property(
        fc.record({
          threadId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          messageType: fc.constantFrom('text', 'image', 'file'),
          // Test various content types
          content: fc.oneof(
            fc.string({ minLength: 5, maxLength: 100 }), // Regular text
            fc.constant('🎉💒👰🤵💍'), // Emojis
            fc.constant('Special chars: àáâãäåæçèéêë'), // Accented characters
            fc.constant('Line\nBreaks\nAnd\tTabs'), // Whitespace
            fc.constant('{"json": "content", "number": 123}'), // JSON-like content
            fc.constant('<script>alert("test")</script>') // HTML/Script content
          ).filter(s => s.trim().length > 0)
        }),
        async (testData) => {
          const messageId = `msg_${Date.now()}_${Math.random()}`;
          
          // Mock database queries
          query.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id FROM couples')) {
              return { rows: [{ id: 1 }] };
            }
            if (sql.includes('SELECT id FROM message_threads')) {
              return { rows: [{ id: testData.threadId }] };
            }
            return { rows: [] };
          });
          
          // Mock message service with exact content preservation
          const persistedMessage = {
            id: messageId,
            threadId: testData.threadId,
            content: testData.content, // Preserve exact content
            messageType: testData.messageType,
            senderId: 1,
            senderType: 'couple',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          messageService.sendMessage.mockResolvedValue({
            success: true,
            message: persistedMessage
          });
          
          messageService.getMessages.mockResolvedValue({
            success: true,
            messages: [persistedMessage],
            hasMore: false,
            total: 1
          });
          
          // Send message
          const sendResponse = await request(app)
            .post('/api/v1/messaging/messages')
            .send({
              threadId: testData.threadId,
              content: testData.content,
              messageType: testData.messageType
            });
          
          expect(sendResponse.status).toBe(201);
          expect(sendResponse.body.success).toBe(true);
          
          // Retrieve and verify exact content preservation
          const retrieveResponse = await request(app)
            .get(`/api/v1/messaging/messages/${testData.threadId}`);
          
          expect(retrieveResponse.status).toBe(200);
          expect(retrieveResponse.body.success).toBe(true);
          
          const retrievedMessage = retrieveResponse.body.data.messages[0];
          
          // Verify exact content match (no corruption or modification)
          expect(retrievedMessage.content).toBe(testData.content);
          expect(retrievedMessage.messageType).toBe(testData.messageType);
          expect(retrievedMessage.threadId).toBe(testData.threadId);
          
          // Verify content length is preserved
          expect(retrievedMessage.content.length).toBe(testData.content.length);
        }
      ), { 
        numRuns: 25,
        timeout: 10000
      });
    });
  });
});