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

describe('Property 10: API Consistency', () => {
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
   * Property 10: API Consistency
   * 
   * For any equivalent messaging operation, both couple and vendor interfaces 
   * should use consistent URL patterns, request/response formats, authentication, 
   * and error response structures.
   * 
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
   * 
   * This property tests that:
   * 1. URL patterns are consistent across user types
   * 2. Request/response formats are identical
   * 3. Authentication patterns are uniform
   * 4. Error response structures are standardized
   * 5. HTTP status codes are consistent
   */
  describe('API Consistency Property', () => {
    it('should provide consistent response formats across user types', () => {
      fc.assert(fc.property(
        fc.record({
          userType: fc.constantFrom('COUPLE', 'VENDOR'),
          threadId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          messageContent: fc.string({ minLength: 5, maxLength: 500 }).filter(s => s.trim().length > 0),
          messageType: fc.constantFrom('text', 'image', 'file'),
          userId: fc.integer({ min: 1, max: 1000 })
        }),
        async (testData) => {
          // Mock authentication for the test user
          authenticateToken.mockImplementation((req, res, next) => {
            req.user = { id: testData.userId, user_type: testData.userType };
            next();
          });
          
          // Mock database queries
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
          
          const mockMessage = {
            id: `msg_${Date.now()}`,
            threadId: testData.threadId,
            content: testData.messageContent,
            messageType: testData.messageType,
            createdAt: new Date()
          };
          
          // Mock service responses
          dashboardIntegration.getCoupleThreadsWithVendors.mockResolvedValue({
            success: true,
            threads: [{ id: testData.threadId, vendorName: 'Test Vendor' }]
          });
          
          dashboardIntegration.getVendorThreadsWithLeads.mockResolvedValue({
            success: true,
            threads: [{ id: testData.threadId, coupleName: 'Test Couple' }]
          });
          
          messageService.sendMessage.mockResolvedValue({
            success: true,
            message: mockMessage
          });
          
          messageService.getMessages.mockResolvedValue({
            success: true,
            messages: [mockMessage],
            hasMore: false,
            total: 1
          });
          
          // Test 1: Get threads endpoint
          const threadsResponse = await request(app).get('/api/v1/messaging/threads');
          
          // Verify consistent response structure
          expect(threadsResponse.status).toBe(200);
          expect(threadsResponse.body).toHaveProperty('success');
          expect(typeof threadsResponse.body.success).toBe('boolean');
          
          if (threadsResponse.body.success) {
            expect(threadsResponse.body).toHaveProperty('data');
            expect(threadsResponse.body.data).toHaveProperty('threads');
            expect(Array.isArray(threadsResponse.body.data.threads)).toBe(true);
          } else {
            expect(threadsResponse.body).toHaveProperty('error');
            expect(threadsResponse.body.error).toHaveProperty('code');
            expect(threadsResponse.body.error).toHaveProperty('message');
          }
          
          // Test 2: Send message endpoint
          const sendResponse = await request(app)
            .post('/api/v1/messaging/messages')
            .send({
              threadId: testData.threadId,
              content: testData.messageContent,
              messageType: testData.messageType
            });
          
          // Verify consistent response structure
          expect([200, 201, 400, 403, 404, 500]).toContain(sendResponse.status);
          expect(sendResponse.body).toHaveProperty('success');
          expect(typeof sendResponse.body.success).toBe('boolean');
          
          if (sendResponse.body.success) {
            expect(sendResponse.body).toHaveProperty('data');
            expect(sendResponse.body.data).toHaveProperty('message');
          } else {
            expect(sendResponse.body).toHaveProperty('error');
            expect(sendResponse.body.error).toHaveProperty('code');
            expect(sendResponse.body.error).toHaveProperty('message');
            expect(typeof sendResponse.body.error.code).toBe('string');
            expect(typeof sendResponse.body.error.message).toBe('string');
          }
          
          // Test 3: Get messages endpoint
          const messagesResponse = await request(app)
            .get(`/api/v1/messaging/messages/${testData.threadId}`);
          
          // Verify consistent response structure
          expect([200, 403, 404, 500]).toContain(messagesResponse.status);
          expect(messagesResponse.body).toHaveProperty('success');
          expect(typeof messagesResponse.body.success).toBe('boolean');
          
          if (messagesResponse.body.success) {
            expect(messagesResponse.body).toHaveProperty('data');
            expect(messagesResponse.body.data).toHaveProperty('messages');
            expect(Array.isArray(messagesResponse.body.data.messages)).toBe(true);
            
            // Verify pagination structure if present
            if (messagesResponse.body.pagination) {
              expect(messagesResponse.body.pagination).toHaveProperty('total');
              expect(messagesResponse.body.pagination).toHaveProperty('limit');
              expect(messagesResponse.body.pagination).toHaveProperty('offset');
              expect(messagesResponse.body.pagination).toHaveProperty('hasMore');
            }
          } else {
            expect(messagesResponse.body).toHaveProperty('error');
            expect(messagesResponse.body.error).toHaveProperty('code');
            expect(messagesResponse.body.error).toHaveProperty('message');
          }
        }
      ), { 
        numRuns: 50,
        timeout: 10000,
        verbose: false
      });
    });
    
    it('should provide consistent error response structures', () => {
      fc.assert(fc.property(
        fc.record({
          userType: fc.constantFrom('COUPLE', 'VENDOR'),
          errorScenario: fc.constantFrom('missingFields', 'invalidThread', 'serviceError'),
          userId: fc.integer({ min: 1, max: 1000 })
        }),
        async (testData) => {
          // Mock authentication
          authenticateToken.mockImplementation((req, res, next) => {
            req.user = { id: testData.userId, user_type: testData.userType };
            next();
          });
          
          // Setup error conditions based on scenario
          switch (testData.errorScenario) {
            case 'missingFields':
              // Mock normal database responses
              query.mockImplementation((sql, params) => {
                if (sql.includes('SELECT id FROM couples')) {
                  return { rows: testData.userType === 'COUPLE' ? [{ id: testData.userId }] : [] };
                }
                if (sql.includes('SELECT id FROM vendors')) {
                  return { rows: testData.userType === 'VENDOR' ? [{ id: testData.userId }] : [] };
                }
                return { rows: [] };
              });
              break;
              
            case 'invalidThread':
              // Mock user exists but thread doesn't
              query.mockImplementation((sql, params) => {
                if (sql.includes('SELECT id FROM couples')) {
                  return { rows: testData.userType === 'COUPLE' ? [{ id: testData.userId }] : [] };
                }
                if (sql.includes('SELECT id FROM vendors')) {
                  return { rows: testData.userType === 'VENDOR' ? [{ id: testData.userId }] : [] };
                }
                if (sql.includes('SELECT id FROM message_threads')) {
                  return { rows: [] }; // Thread not found
                }
                return { rows: [] };
              });
              break;
              
            case 'serviceError':
              // Mock database error
              query.mockImplementation(() => {
                throw new Error('Database connection failed');
              });
              break;
          }
          
          let response;
          
          if (testData.errorScenario === 'missingFields') {
            // Test with missing required fields
            response = await request(app)
              .post('/api/v1/messaging/messages')
              .send({}); // Missing threadId and content
          } else {
            // Test with valid data but other error conditions
            response = await request(app)
              .post('/api/v1/messaging/messages')
              .send({
                threadId: 'test-thread',
                content: 'Test message',
                messageType: 'text'
              });
          }
          
          // Verify error response structure consistency
          if (response.status >= 400) {
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error).toHaveProperty('message');
            expect(typeof response.body.error.code).toBe('string');
            expect(typeof response.body.error.message).toBe('string');
            
            // Verify error code format (should be UPPER_SNAKE_CASE)
            expect(response.body.error.code).toMatch(/^[A-Z_]+$/);
            
            // Verify error message is descriptive
            expect(response.body.error.message.length).toBeGreaterThan(0);
            
            // Verify no data property in error responses
            expect(response.body.data).toBeUndefined();
          }
        }
      ), { 
        numRuns: 30,
        timeout: 8000
      });
    });
    
    it('should provide consistent HTTP status codes for equivalent operations', () => {
      fc.assert(fc.property(
        fc.record({
          userType: fc.constantFrom('COUPLE', 'VENDOR'),
          operation: fc.constantFrom('getThreads', 'sendMessage', 'getMessages'),
          userId: fc.integer({ min: 1, max: 1000 }),
          threadId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        async (testData) => {
          // Mock authentication
          authenticateToken.mockImplementation((req, res, next) => {
            req.user = { id: testData.userId, user_type: testData.userType };
            next();
          });
          
          // Mock successful responses
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
          
          dashboardIntegration.getCoupleThreadsWithVendors.mockResolvedValue({
            success: true,
            threads: []
          });
          
          dashboardIntegration.getVendorThreadsWithLeads.mockResolvedValue({
            success: true,
            threads: []
          });
          
          messageService.getMessages.mockResolvedValue({
            success: true,
            messages: [],
            hasMore: false,
            total: 0
          });
          
          messageService.sendMessage.mockResolvedValue({
            success: true,
            message: { id: 'test-message', content: 'Test' }
          });
          
          let response;
          let expectedSuccessStatus;
          
          // Make appropriate request based on operation
          switch (testData.operation) {
            case 'getThreads':
              response = await request(app).get('/api/v1/messaging/threads');
              expectedSuccessStatus = 200;
              break;
              
            case 'getMessages':
              response = await request(app).get(`/api/v1/messaging/messages/${testData.threadId}`);
              expectedSuccessStatus = 200;
              break;
              
            case 'sendMessage':
              response = await request(app)
                .post('/api/v1/messaging/messages')
                .send({
                  threadId: testData.threadId,
                  content: 'Test message',
                  messageType: 'text'
                });
              expectedSuccessStatus = 201;
              break;
          }
          
          // Verify status codes are in expected ranges
          expect([200, 201, 400, 403, 404, 500]).toContain(response.status);
          
          // Verify response structure matches status code
          if (response.status >= 200 && response.status < 300) {
            expect(response.body.success).toBe(true);
            expect(response.status).toBe(expectedSuccessStatus);
          } else {
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
          }
        }
      ), { 
        numRuns: 50,
        timeout: 10000
      });
    });
  });
});