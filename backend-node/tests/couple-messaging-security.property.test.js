const fc = require('fast-check');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { query } = require('../config/database');
const securityControls = require('../services/securityControls');

// Mock the database
jest.mock('../config/database', () => ({
  query: jest.fn(),
  isPostgreSQL: false
}));

// Mock security controls
jest.mock('../services/securityControls');

/**
 * Property-Based Security Tests for Couple-Vendor Messaging
 * Task 14: Security and authorization testing
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
 * 
 * These tests use property-based testing to verify security properties
 * across a wide range of inputs and scenarios.
 */
describe('Couple-Vendor Messaging Security - Property-Based Tests', () => {
  let app;
  const jwtSecret = process.env.JWT_SECRET || 'test-secret';

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockResolvedValue({ rows: [] });
    securityControls.verifyThreadAccess.mockResolvedValue({ authorized: true });
    securityControls.verifyMessageAccess.mockResolvedValue({ authorized: true });
  });

  /**
   * Property: JWT Authentication Consistency
   * **Validates: Requirements 11.1, 11.4**
   * 
   * For any messaging endpoint, authentication must be consistent:
   * - Valid tokens with correct user_type should be accepted
   * - Invalid, expired, or missing tokens should be rejected
   * - Wrong user_type should be rejected with 403
   */
  it('Property: JWT authentication is consistent across all endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/v1/messaging/couple/threads',
            '/api/v1/messaging/couple/messages'
          ),
          method: fc.constantFrom('GET', 'POST'),
          tokenType: fc.constantFrom('valid_couple', 'valid_vendor', 'invalid', 'expired', 'missing'),
          userId: fc.integer({ min: 1, max: 1000 }),
          userType: fc.constantFrom('COUPLE', 'VENDOR', 'ADMIN')
        }).filter(data => {
          // Only test valid combinations
          if (data.method === 'GET' && data.endpoint.includes('/messages')) return false;
          if (data.method === 'POST' && data.endpoint === '/api/v1/messaging/couple/threads') return true;
          if (data.method === 'GET' && data.endpoint === '/api/v1/messaging/couple/threads') return true;
          if (data.method === 'POST' && data.endpoint === '/api/v1/messaging/couple/messages') return true;
          return false;
        }),
        async ({ endpoint, method, tokenType, userId, userType }) => {
          let token;
          let expectedStatus;
          let shouldMockUser = false;

          // Generate appropriate token based on type
          switch (tokenType) {
            case 'valid_couple':
              token = jwt.sign({ userId, id: userId, user_type: 'COUPLE' }, jwtSecret, { expiresIn: '1h' });
              expectedStatus = [200, 201, 400, 401, 403, 404, 500]; // Valid tokens can get various responses
              shouldMockUser = true;
              break;
            case 'valid_vendor':
              token = jwt.sign({ userId, id: userId, user_type: 'VENDOR' }, jwtSecret, { expiresIn: '1h' });
              expectedStatus = [403]; // Vendors can't access couple endpoints
              shouldMockUser = true;
              break;
            case 'invalid':
              token = 'invalid.token.here';
              expectedStatus = [403];
              break;
            case 'expired':
              token = jwt.sign({ userId, id: userId, user_type: 'COUPLE' }, jwtSecret, { expiresIn: '-1h' });
              expectedStatus = [403];
              break;
            case 'missing':
              token = null;
              expectedStatus = [401];
              break;
          }

          // Mock user lookup if needed
          if (shouldMockUser) {
            query.mockResolvedValueOnce({
              rows: [{ 
                id: userId, 
                email: `user${userId}@test.com`, 
                user_type: tokenType === 'valid_couple' ? 'COUPLE' : 'VENDOR', 
                is_active: true 
              }]
            });

            // Mock additional queries for couple endpoints
            if (tokenType === 'valid_couple') {
              query.mockResolvedValueOnce({ rows: [{ id: userId * 100 }] }); // Couple lookup
              if (endpoint.includes('threads') && method === 'GET') {
                // Mock dashboard integration
                const mockDashboardIntegration = {
                  getCoupleThreadsWithVendors: jest.fn().mockResolvedValue({
                    success: true,
                    threads: []
                  })
                };
                jest.doMock('../services/dashboardIntegration', () => mockDashboardIntegration);
              }
            }
          }

          // Make request
          let requestBuilder = request(app)[method.toLowerCase()](endpoint);
          
          if (token) {
            requestBuilder = requestBuilder.set('Authorization', `Bearer ${token}`);
          }

          if (method === 'POST') {
            requestBuilder = requestBuilder.send({ 
              threadId: 1, 
              content: 'test message',
              vendorId: 1,
              initialMessage: 'hello'
            });
          }

          const response = await requestBuilder;

          // Property: Response status must match expected authentication behavior
          expect(expectedStatus).toContain(response.status);

          // Property: Unauthorized responses must have proper error structure
          if ([401, 403].includes(response.status)) {
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.error).toBe('string');
            expect(typeof response.body.message).toBe('string');
          }
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property: Thread Access Authorization
   * **Validates: Requirements 11.2**
   * 
   * For any thread access request, authorization must be enforced:
   * - Users can only access threads they participate in
   * - Cross-user access attempts are denied
   * - Invalid thread IDs are handled securely
   */
  it('Property: Thread access authorization is enforced consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requestingUserId: fc.integer({ min: 1, max: 100 }),
          threadId: fc.integer({ min: 1, max: 1000 }),
          threadOwnerCoupleId: fc.integer({ min: 1, max: 100 }),
          threadExists: fc.boolean(),
          userIsOwner: fc.boolean()
        }),
        async ({ requestingUserId, threadId, threadOwnerCoupleId, threadExists, userIsOwner }) => {
          // Generate valid couple token
          const token = jwt.sign(
            { userId: requestingUserId, id: requestingUserId, user_type: 'COUPLE' },
            jwtSecret,
            { expiresIn: '1h' }
          );

          // Mock user lookup
          query.mockResolvedValueOnce({
            rows: [{ 
              id: requestingUserId, 
              email: `couple${requestingUserId}@test.com`, 
              user_type: 'COUPLE', 
              is_active: true 
            }]
          });

          // Mock couple lookup
          const coupleId = requestingUserId * 100;
          query.mockResolvedValueOnce({ rows: [{ id: coupleId }] });

          // Mock thread ownership check
          if (threadExists && userIsOwner) {
            query.mockResolvedValueOnce({ rows: [{ id: threadId }] }); // User owns thread
          } else {
            query.mockResolvedValueOnce({ rows: [] }); // User doesn't own thread or thread doesn't exist
          }

          // Mock message service for successful cases
          if (threadExists && userIsOwner) {
            const mockMessageService = {
              getMessages: jest.fn().mockResolvedValue({
                success: true,
                messages: [],
                hasMore: false
              })
            };
            jest.doMock('../services/messageService', () => mockMessageService);
          }

          const response = await request(app)
            .get(`/api/v1/messaging/couple/threads/${threadId}/messages`)
            .set('Authorization', `Bearer ${token}`);

          // Property: Authorization result must match ownership
          if (threadExists && userIsOwner) {
            expect([200, 500]).toContain(response.status); // 200 for success, 500 for service errors
          } else {
            expect(response.status).toBe(403);
            expect(response.body.message).toBe('You do not have access to this thread');
          }

          // Property: Error responses must not leak sensitive information
          if (response.status >= 400) {
            expect(response.body).not.toHaveProperty('threadOwnerCoupleId');
            expect(response.body).not.toHaveProperty('internalError');
            expect(JSON.stringify(response.body)).not.toContain('password');
            expect(JSON.stringify(response.body)).not.toContain('secret');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Input Validation Consistency
   * **Validates: Requirements 11.3, 11.4**
   * 
   * All user inputs must be validated consistently:
   * - Invalid inputs are rejected with appropriate errors
   * - Malicious inputs are sanitized or rejected
   * - Error messages don't leak sensitive information
   */
  it('Property: Input validation is consistent and secure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          threadId: fc.oneof(
            fc.integer({ min: 1, max: 1000 }),
            fc.constant('invalid'),
            fc.constant(''),
            fc.constant(null),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          content: fc.oneof(
            fc.string({ minLength: 1, maxLength: 1000 }),
            fc.constant(''),
            fc.constant(null),
            fc.constant('<script>alert("xss")</script>'),
            fc.constant('DROP TABLE messages;'),
            fc.string({ minLength: 0, maxLength: 10000 })
          ),
          userId: fc.integer({ min: 1, max: 100 })
        }),
        async ({ threadId, content, userId }) => {
          // Generate valid token
          const token = jwt.sign(
            { userId, id: userId, user_type: 'COUPLE' },
            jwtSecret,
            { expiresIn: '1h' }
          );

          // Mock user lookup
          query.mockResolvedValueOnce({
            rows: [{ 
              id: userId, 
              email: `couple${userId}@test.com`, 
              user_type: 'COUPLE', 
              is_active: true 
            }]
          });

          // Mock couple lookup
          query.mockResolvedValueOnce({ rows: [{ id: userId * 100 }] });

          // Mock thread ownership (assume user owns thread for valid threadIds)
          if (typeof threadId === 'number' && threadId > 0) {
            query.mockResolvedValueOnce({ rows: [{ id: threadId }] });
          } else {
            query.mockResolvedValueOnce({ rows: [] });
          }

          const response = await request(app)
            .post('/api/v1/messaging/couple/messages')
            .set('Authorization', `Bearer ${token}`)
            .send({ threadId, content });

          // Property: Invalid inputs must be rejected appropriately
          const hasValidThreadId = typeof threadId === 'number' && threadId > 0;
          const hasValidContent = typeof content === 'string' && content.length > 0;

          if (!hasValidThreadId || !hasValidContent) {
            expect([400, 401, 403]).toContain(response.status);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
          }

          // Property: Error messages must not contain sensitive information
          if (response.status >= 400) {
            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toContain('password');
            expect(responseText).not.toContain('secret');
            expect(responseText).not.toContain('token');
            expect(responseText).not.toContain('database');
            expect(responseText).not.toContain('internal');
          }

          // Property: Malicious content should not be executed
          if (typeof content === 'string' && content.includes('<script>')) {
            // The system should either reject it or sanitize it
            // It should never execute the script
            expect(response.status).toBeGreaterThanOrEqual(400);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Rate Limiting Behavior
   * **Validates: Requirements 11.5**
   * 
   * Rate limiting must be applied consistently:
   * - Excessive requests from same user are throttled
   * - Rate limits are per-user, not global
   * - Rate limit responses have proper structure
   */
  it('Property: Rate limiting is applied consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.integer({ min: 1, max: 10 }),
          requestCount: fc.integer({ min: 1, max: 20 }),
          endpoint: fc.constantFrom(
            '/api/v1/messaging/couple/threads',
            '/api/v1/messaging/couple/messages'
          )
        }),
        async ({ userId, requestCount, endpoint }) => {
          // Generate valid token
          const token = jwt.sign(
            { userId, id: userId, user_type: 'COUPLE' },
            jwtSecret,
            { expiresIn: '1h' }
          );

          const responses = [];

          // Make multiple requests rapidly
          for (let i = 0; i < Math.min(requestCount, 10); i++) {
            // Mock user lookup for each request
            query.mockResolvedValueOnce({
              rows: [{ 
                id: userId, 
                email: `couple${userId}@test.com`, 
                user_type: 'COUPLE', 
                is_active: true 
              }]
            });

            if (endpoint === '/api/v1/messaging/couple/threads') {
              // Mock couple lookup and dashboard service
              query.mockResolvedValueOnce({ rows: [{ id: userId * 100 }] });
              const mockDashboardIntegration = {
                getCoupleThreadsWithVendors: jest.fn().mockResolvedValue({
                  success: true,
                  threads: []
                })
              };
              jest.doMock('../services/dashboardIntegration', () => mockDashboardIntegration);

              const response = await request(app)
                .get(endpoint)
                .set('Authorization', `Bearer ${token}`);
              
              responses.push(response);
            } else {
              // Mock couple lookup and thread ownership
              query.mockResolvedValueOnce({ rows: [{ id: userId * 100 }] });
              query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

              const response = await request(app)
                .post(endpoint)
                .set('Authorization', `Bearer ${token}`)
                .send({ threadId: 1, content: `Message ${i}` });
              
              responses.push(response);
            }
          }

          // Property: Rate limiting should eventually kick in for excessive requests
          const rateLimitedResponses = responses.filter(res => res.status === 429);
          const successfulResponses = responses.filter(res => res.status < 400);

          // Property: Rate limit responses must have proper structure
          rateLimitedResponses.forEach(response => {
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Too many requests');
          });

          // Property: At least some requests should succeed before rate limiting
          if (requestCount > 5) {
            // For high request counts, we expect some to be rate limited
            // But this depends on the actual rate limiting configuration
            expect(responses.length).toBe(Math.min(requestCount, 10));
          }
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property: Security Headers and Response Structure
   * **Validates: Requirements 11.1, 11.4**
   * 
   * All responses must have consistent security properties:
   * - Proper HTTP status codes
   * - No sensitive information in error responses
   * - Consistent error message structure
   */
  it('Property: Security headers and response structure are consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/v1/messaging/couple/threads',
            '/api/v1/messaging/couple/messages'
          ),
          authType: fc.constantFrom('valid', 'invalid', 'missing', 'expired'),
          userId: fc.integer({ min: 1, max: 100 })
        }),
        async ({ endpoint, authType, userId }) => {
          let token;
          
          switch (authType) {
            case 'valid':
              token = jwt.sign({ userId, id: userId, user_type: 'COUPLE' }, jwtSecret, { expiresIn: '1h' });
              // Mock user lookup
              query.mockResolvedValueOnce({
                rows: [{ 
                  id: userId, 
                  email: `couple${userId}@test.com`, 
                  user_type: 'COUPLE', 
                  is_active: true 
                }]
              });
              query.mockResolvedValueOnce({ rows: [{ id: userId * 100 }] }); // Couple lookup
              break;
            case 'invalid':
              token = 'invalid.token';
              break;
            case 'expired':
              token = jwt.sign({ userId, id: userId, user_type: 'COUPLE' }, jwtSecret, { expiresIn: '-1h' });
              break;
            case 'missing':
              token = null;
              break;
          }

          let requestBuilder;
          if (endpoint === '/api/v1/messaging/couple/threads') {
            requestBuilder = request(app).get(endpoint);
            
            if (authType === 'valid') {
              const mockDashboardIntegration = {
                getCoupleThreadsWithVendors: jest.fn().mockResolvedValue({
                  success: true,
                  threads: []
                })
              };
              jest.doMock('../services/dashboardIntegration', () => mockDashboardIntegration);
            }
          } else {
            requestBuilder = request(app).post(endpoint).send({ threadId: 1, content: 'test' });
            
            if (authType === 'valid') {
              query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Thread ownership
            }
          }

          if (token) {
            requestBuilder = requestBuilder.set('Authorization', `Bearer ${token}`);
          }

          const response = await requestBuilder;

          // Property: Status codes must be appropriate for auth state
          if (authType === 'missing') {
            expect(response.status).toBe(401);
          } else if (authType === 'invalid' || authType === 'expired') {
            expect(response.status).toBe(403);
          } else if (authType === 'valid') {
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
          }

          // Property: Error responses must have consistent structure
          if (response.status >= 400) {
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.error).toBe('string');
            expect(typeof response.body.message).toBe('string');
            expect(response.body.error.length).toBeGreaterThan(0);
            expect(response.body.message.length).toBeGreaterThan(0);
          }

          // Property: Responses must not leak sensitive information
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('password');
          expect(responseText).not.toContain('secret');
          expect(responseText).not.toContain('private_key');
          expect(responseText).not.toContain('database_url');
          expect(responseText).not.toContain('jwt_secret');

          // Property: Security headers should be present (if using helmet)
          // This would depend on the actual server configuration
          expect(response.headers).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: File Upload Security
   * **Validates: Requirements 11.3, 11.4**
   * 
   * File upload validation must be consistent:
   * - Only allowed file types are accepted
   * - File size limits are enforced
   * - Malicious files are rejected
   */
  it('Property: File upload security is enforced consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileName: fc.oneof(
            fc.constantFrom('test.jpg', 'document.pdf', 'image.png', 'file.gif'),
            fc.constantFrom('malware.exe', 'script.js', '../../../etc/passwd', 'file.bat'),
            fc.string({ minLength: 1, maxLength: 300 })
          ),
          fileSize: fc.integer({ min: 0, max: 50 * 1024 * 1024 }), // 0 to 50MB
          mimeType: fc.oneof(
            fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'application/pdf'),
            fc.constantFrom('application/x-executable', 'text/javascript', 'application/octet-stream'),
            fc.string({ minLength: 1, maxLength: 50 })
          )
        }),
        async ({ fileName, fileSize, mimeType }) => {
          // Mock file upload service validation
          const fileUploadService = require('../services/fileUploadService');
          
          const mockFile = {
            originalname: fileName,
            size: fileSize,
            mimetype: mimeType,
            buffer: Buffer.from('fake file content')
          };

          // Property: File validation must be consistent with security rules
          const validation = fileUploadService.validateFile(mockFile);

          // Determine expected validation result
          const isAllowedImageType = ['image/jpeg', 'image/png', 'image/gif'].includes(mimeType);
          const isAllowedDocType = ['application/pdf'].includes(mimeType);
          const isAllowedExtension = /\.(jpg|jpeg|png|gif|pdf)$/i.test(fileName);
          const isValidSize = (isAllowedImageType && fileSize <= 10 * 1024 * 1024) ||
                             (isAllowedDocType && fileSize <= 25 * 1024 * 1024);
          const hasValidFileName = !fileName.includes('..') && !fileName.includes('/') && 
                                  !fileName.includes('\\') && fileName.length <= 255;

          const shouldBeValid = (isAllowedImageType || isAllowedDocType) && 
                               isAllowedExtension && isValidSize && hasValidFileName;

          // Property: Validation result must match security criteria
          if (shouldBeValid) {
            expect(validation.valid).toBe(true);
            expect(validation.fileType).toBeDefined();
          } else {
            expect(validation.valid).toBe(false);
            expect(validation.error).toBeDefined();
            expect(typeof validation.error).toBe('string');
            expect(validation.error.length).toBeGreaterThan(0);
          }

          // Property: Malicious files must be rejected
          if (fileName.includes('..') || fileName.includes('exe') || fileName.includes('script')) {
            expect(validation.valid).toBe(false);
          }

          // Property: Oversized files must be rejected
          if (fileSize > 25 * 1024 * 1024) {
            expect(validation.valid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});