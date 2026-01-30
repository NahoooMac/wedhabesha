# Implementation Plan: Couple-to-Vendor Messaging

## Overview

This implementation plan enables couples to message vendors by extending the existing messaging infrastructure. The approach prioritizes backend endpoints first, then builds the frontend interface, and finally integrates everything into the couple dashboard.

## Tasks

- [x] 1. Add couple messaging API endpoints
  - Modify `backend-node/routes/messaging.js` to add couple-specific routes
  - Add `GET /api/v1/messaging/couple/threads` endpoint
  - Add `POST /api/v1/messaging/couple/threads` endpoint
  - Add `GET /api/v1/messaging/couple/threads/:threadId/messages` endpoint
  - Add `POST /api/v1/messaging/couple/messages` endpoint
  - Add authentication middleware to verify user_type='COUPLE'
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2_

- [x] 2. Update DashboardIntegration service for couples
  - Modify `backend-node/services/dashboardIntegration.js`
  - Add `getCoupleThreadsWithVendors(coupleId)` method
  - Add `createThreadFromCouple(coupleId, vendorId, initialMessage)` method
  - Add `updateCoupleOnlineStatus(coupleId, isOnline)` method
  - Ensure thread queries include vendor information
  - _Requirements: 1.3, 2.2, 2.3, 10.1, 10.2_

- [x] 3. Update MessageService for couple senders
  - Modify `backend-node/services/messageService.js`
  - Update `verifySenderAccess` to handle couple senders
  - Ensure `sendMessage` supports sender_type='couple'
  - Update message validation for couple messages
  - _Requirements: 3.1, 3.2, 11.2_

- [x] 4. Update WebSocket server for couple connections
  - Modify `backend-node/services/websocketServer.js`
  - Add `couple:join` event handler
  - Add `couple:message:send` event handler
  - Add `couple:typing:start` and `couple:typing:stop` handlers
  - Ensure couples join appropriate thread rooms
  - Update online status tracking for couples
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Test backend endpoints
  - Create test script to verify couple thread creation
  - Test message sending as couple
  - Test WebSocket connection for couples
  - Verify authorization checks work correctly
  - Test error handling for invalid requests
  - _Requirements: All backend requirements_

- [x] 6. Create CoupleMessaging component
  - Create `frontend/src/components/communication/CoupleMessaging.tsx`
  - Implement thread list sidebar with search
  - Implement message view with real-time updates
  - Add file upload support
  - Add typing indicators
  - Add read receipts
  - Ensure mobile-responsive layout
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 4.1, 5.1, 5.2, 9.1, 9.2_

- [x] 7. Integrate CoupleMessaging into dashboard
  - Modify `frontend/src/pages/DashboardPage.tsx`
  - Add tab switcher in Communication section
  - Add "Vendor Messages" and "Guest Communication" tabs
  - Render CoupleMessaging component in Vendor Messages tab
  - Keep CommunicationCenter in Guest Communication tab
  - _Requirements: 1.1, 10.3_

- [x] 8. Add "Message Vendor" button to vendor profiles
  - Modify vendor profile component
  - Add "Message Vendor" button
  - Implement click handler to create/open thread
  - Redirect to Communication tab with thread open
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 9. Implement search and filter functionality
  - Add search input to CoupleMessaging component
  - Implement thread filtering by vendor name
  - Implement message search within threads
  - Add category filter dropdown
  - Update results in real-time
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Implement message pagination
  - Add infinite scroll to message list
  - Load 50 messages initially
  - Load more when scrolling to top
  - Show loading indicator during load
  - Maintain scroll position on new messages
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 11. Add notification support
  - Implement browser notifications for new messages
  - Add notification sound
  - Update unread count badge
  - Mark messages as read when viewed
  - Respect user notification preferences
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Implement mobile optimizations
  - Add mobile-specific layout (list OR conversation)
  - Add back button for mobile navigation
  - Handle keyboard opening on mobile
  - Add touch gesture support
  - Test on various mobile devices
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13. Add comprehensive error handling
  - Implement retry logic for failed messages
  - Show reconnecting indicator for WebSocket
  - Display specific file upload errors
  - Add retry button for failed operations
  - Log errors to console for debugging
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 14. Security and authorization testing
  - Test JWT authentication on all endpoints
  - Verify couples can only access their threads
  - Test message encryption
  - Verify file upload validation
  - Test rate limiting
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 15. End-to-end integration testing
  - Test complete flow: couple → vendor → couple
  - Test file attachments end-to-end
  - Test real-time features (typing, read receipts)
  - Test mobile interface
  - Test error scenarios
  - _Requirements: All requirements_

- [x] 16. Performance optimization
  - Implement thread list caching
  - Add database indexes for queries
  - Optimize WebSocket message size
  - Test with large message histories
  - Monitor and optimize load times
  - _Requirements: TR-5_

- [x] 17. Documentation and cleanup
  - Update API documentation
  - Add JSDoc comments to new code
  - Update README with couple messaging info
  - Remove console.log statements
  - Verify code follows style guidelines
  - _Requirements: All_

## Notes

- Backend endpoints must be completed before frontend work
- Reuse existing MessageService, ThreadManager, and WebSocket infrastructure
- No database schema changes required
- Mobile testing is critical for user experience
- Security testing must pass before deployment
- Performance requirements: <2s message send, <3s mobile load
