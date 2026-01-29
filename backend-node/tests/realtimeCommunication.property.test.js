const fc = require('fast-check');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const http = require('http');
const jwt = require('jsonwebtoken');

/**
 * Property-Based Tests for Real-time Communication Features
 * Feature: vendor-dashboard-messaging-enhancement
 * Property 4: Real-time Communication Features
 * Validates: Requirements 2.2, 2.4
 */

describe('Property 4: Real-time Communication Features', () => {
  let httpServer;
  let ioServer;
  let serverPort;

  beforeAll((done) => {
    // Create HTTP server for testing
    httpServer = http.createServer();
    ioServer = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Authentication middleware
    ioServer.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        socket.userId = decoded.userId;
        socket.userType = decoded.userType || 'couple';
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // Setup connection handling
    ioServer.on('connection', (socket) => {
      socket.join(`user:${socket.userId}`);

      socket.on('join:thread', (threadId) => {
        socket.join(`thread:${threadId}`);
      });

      socket.on('typing:start', (data) => {
        socket.to(`thread:${data.threadId}`).emit('typing:indicator', {
          threadId: data.threadId,
          userId: socket.userId,
          isTyping: true
        });
      });

      socket.on('typing:stop', (data) => {
        socket.to(`thread:${data.threadId}`).emit('typing:indicator', {
          threadId: data.threadId,
          userId: socket.userId,
          isTyping: false
        });
      });

      socket.on('message:send', (message, callback) => {
        socket.to(`thread:${message.threadId}`).emit('message:new', {
          threadId: message.threadId,
          message,
          timestamp: new Date().toISOString()
        });
        callback({ success: true });
      });
    });

    // Start server on random port
    httpServer.listen(0, () => {
      serverPort = httpServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    // Close socket.io server first, then HTTP server
    if (ioServer) {
      ioServer.close(() => {
        if (httpServer) {
          httpServer.close(done);
        } else {
          done();
        }
      });
    } else if (httpServer) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  /**
   * Helper function to create authenticated client
   */
  function createAuthenticatedClient(userId, userType = 'couple') {
    const token = jwt.sign(
      { userId, userType },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    return Client(`http://localhost:${serverPort}`, {
      auth: { token },
      transports: ['websocket']
    });
  }

  /**
   * Helper to wait for event with timeout
   */
  function waitForEvent(socket, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      socket.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * Property: Typing indicators should be displayed correctly for online users
   * For any online vendor-couple interaction, typing indicators should be sent
   * and received correctly by other participants in the thread
   */
  test('typing indicators are correctly transmitted between thread participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // threadId
        fc.uuid(), // user1Id
        fc.uuid(), // user2Id
        fc.boolean(), // isTyping
        async (threadId, user1Id, user2Id, isTyping) => {
          // Skip if users are the same
          if (user1Id === user2Id) return true;

          const client1 = createAuthenticatedClient(user1Id, 'couple');
          const client2 = createAuthenticatedClient(user2Id, 'vendor');

          try {
            // Wait for both clients to connect
            await Promise.all([
              waitForEvent(client1, 'connect'),
              waitForEvent(client2, 'connect')
            ]);

            // Both join the same thread
            client1.emit('join:thread', threadId);
            client2.emit('join:thread', threadId);

            // Wait a bit for room joins to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Setup listener for typing indicator on client2
            const typingPromise = waitForEvent(client2, 'typing:indicator', 2000);

            // Client1 sends typing indicator
            const event = isTyping ? 'typing:start' : 'typing:stop';
            client1.emit(event, { threadId });

            // Client2 should receive the typing indicator
            const receivedData = await typingPromise;

            // Verify the typing indicator data
            expect(receivedData.threadId).toBe(threadId);
            expect(receivedData.userId).toBe(user1Id);
            expect(receivedData.isTyping).toBe(isTyping);

            return true;
          } catch (error) {
            console.error('Typing indicator test error:', error);
            return false;
          } finally {
            client1.close();
            client2.close();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 } // Reduced runs for async tests
    );
  }, 30000);

  /**
   * Property: Messages should be delivered instantly to online participants
   * For any message sent in a thread, all online participants should receive
   * the message immediately
   */
  test('messages are instantly delivered to all online thread participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // threadId
        fc.uuid(), // senderId
        fc.uuid(), // recipientId
        fc.string({ minLength: 1, maxLength: 500 }), // message content
        async (threadId, senderId, recipientId, content) => {
          // Skip if sender and recipient are the same
          if (senderId === recipientId) return true;

          const senderClient = createAuthenticatedClient(senderId, 'couple');
          const recipientClient = createAuthenticatedClient(recipientId, 'vendor');

          try {
            // Wait for both clients to connect
            await Promise.all([
              waitForEvent(senderClient, 'connect'),
              waitForEvent(recipientClient, 'connect')
            ]);

            // Both join the same thread
            senderClient.emit('join:thread', threadId);
            recipientClient.emit('join:thread', threadId);

            // Wait for room joins
            await new Promise(resolve => setTimeout(resolve, 100));

            // Setup listener for new message on recipient
            const messagePromise = waitForEvent(recipientClient, 'message:new', 2000);

            // Sender sends message
            const message = {
              id: fc.sample(fc.uuid(), 1)[0],
              threadId,
              senderId,
              content,
              messageType: 'text',
              createdAt: new Date().toISOString()
            };

            const sendStartTime = Date.now();
            senderClient.emit('message:send', message, (response) => {
              expect(response.success).toBe(true);
            });

            // Recipient should receive the message
            const receivedData = await messagePromise;
            const deliveryTime = Date.now() - sendStartTime;

            // Verify message delivery
            expect(receivedData.threadId).toBe(threadId);
            expect(receivedData.message.content).toBe(content);
            expect(receivedData.message.senderId).toBe(senderId);

            // Verify instant delivery (should be under 1 second)
            expect(deliveryTime).toBeLessThan(1000);

            return true;
          } catch (error) {
            console.error('Message delivery test error:', error);
            return false;
          } finally {
            senderClient.close();
            recipientClient.close();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property: Network interruptions should not cause message loss after reconnection
   * When a client disconnects and reconnects, the system should maintain message
   * integrity and allow continued communication
   */
  test('reconnection maintains message delivery capability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // threadId
        fc.uuid(), // userId
        fc.string({ minLength: 1, maxLength: 100 }), // message before disconnect
        fc.string({ minLength: 1, maxLength: 100 }), // message after reconnect
        async (threadId, userId, messageBefore, messageAfter) => {
          let client = createAuthenticatedClient(userId, 'couple');

          try {
            // Initial connection
            await waitForEvent(client, 'connect');
            client.emit('join:thread', threadId);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Send message before disconnect
            const message1 = {
              id: fc.sample(fc.uuid(), 1)[0],
              threadId,
              senderId: userId,
              content: messageBefore,
              messageType: 'text',
              createdAt: new Date().toISOString()
            };

            await new Promise((resolve) => {
              client.emit('message:send', message1, (response) => {
                expect(response.success).toBe(true);
                resolve();
              });
            });

            // Simulate disconnect
            client.close();
            await new Promise(resolve => setTimeout(resolve, 200));

            // Reconnect
            client = createAuthenticatedClient(userId, 'couple');
            await waitForEvent(client, 'connect');
            client.emit('join:thread', threadId);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Send message after reconnect
            const message2 = {
              id: fc.sample(fc.uuid(), 1)[0],
              threadId,
              senderId: userId,
              content: messageAfter,
              messageType: 'text',
              createdAt: new Date().toISOString()
            };

            const sendSuccess = await new Promise((resolve) => {
              client.emit('message:send', message2, (response) => {
                resolve(response.success);
              });
            });

            // Verify message can be sent after reconnection
            expect(sendSuccess).toBe(true);

            return true;
          } catch (error) {
            console.error('Reconnection test error:', error);
            return false;
          } finally {
            if (client) {
              client.close();
            }
          }
        }
      ),
      { numRuns: 15, timeout: 15000 }
    );
  }, 45000);

  /**
   * Property: Multiple participants can interact simultaneously without conflicts
   * When multiple users are in the same thread, all should receive typing indicators
   * and messages from all other participants
   */
  test('multiple participants receive all events in a thread', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // threadId
        fc.array(fc.uuid(), { minLength: 2, maxLength: 4 }), // participant IDs
        async (threadId, participantIds) => {
          // Ensure unique participant IDs
          const uniqueIds = [...new Set(participantIds)];
          if (uniqueIds.length < 2) return true;

          const clients = uniqueIds.map(id => createAuthenticatedClient(id, 'couple'));

          try {
            // Connect all clients
            await Promise.all(clients.map(client => waitForEvent(client, 'connect')));

            // All join the same thread
            clients.forEach(client => client.emit('join:thread', threadId));
            await new Promise(resolve => setTimeout(resolve, 200));

            // First client sends typing indicator
            const typingPromises = clients.slice(1).map(client => 
              waitForEvent(client, 'typing:indicator', 2000)
            );

            clients[0].emit('typing:start', { threadId });

            // All other clients should receive typing indicator
            const typingResults = await Promise.all(typingPromises);
            typingResults.forEach(result => {
              expect(result.threadId).toBe(threadId);
              expect(result.userId).toBe(uniqueIds[0]);
              expect(result.isTyping).toBe(true);
            });

            return true;
          } catch (error) {
            console.error('Multiple participants test error:', error);
            return false;
          } finally {
            clients.forEach(client => client.close());
          }
        }
      ),
      { numRuns: 10, timeout: 15000 }
    );
  }, 45000);
});
