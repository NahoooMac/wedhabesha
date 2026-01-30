# Requirements Document: Couple-to-Vendor Messaging

## Introduction

This specification defines the requirements for enabling couples to initiate and participate in messaging conversations with vendors. Currently, only vendors can message couples. This feature will provide bidirectional communication, allowing couples to contact vendors directly from their dashboard, ask questions, negotiate services, and maintain ongoing conversations.

## Glossary

- **Couple**: Users planning their wedding who need to communicate with vendors
- **Vendor**: Service providers who offer wedding-related services
- **Message_Thread**: A conversation between a couple and a vendor
- **Message**: An individual text or media communication within a thread
- **Real_Time_Messaging**: Instant message delivery via WebSocket
- **Couple_Dashboard**: The main interface where couples manage their wedding
- **Communication_Tab**: The dashboard section containing messaging and guest communication features

## Requirements

### Requirement 1: Couple Thread Access

**User Story:** As a couple, I want to see all my conversations with vendors in one place, so that I can easily manage my vendor communications.

#### Acceptance Criteria

1. WHEN a couple opens the Communication tab, THE system SHALL display a "Vendor Messages" section
2. WHEN viewing vendor messages, THE system SHALL show a list of all active conversations with vendors
3. WHEN displaying threads, THE system SHALL show vendor name, last message preview, timestamp, and unread count
4. WHEN a thread has unread messages, THE system SHALL display a badge with the unread count
5. THE system SHALL sort threads by most recent activity first

### Requirement 2: Initiate Conversation with Vendor

**User Story:** As a couple, I want to start a conversation with a vendor from their profile, so that I can inquire about their services.

#### Acceptance Criteria

1. WHEN viewing a vendor profile, THE system SHALL display a "Message Vendor" button
2. WHEN clicking "Message Vendor", THE system SHALL create a new thread if one doesn't exist
3. WHEN a thread already exists, THE system SHALL open the existing conversation
4. WHEN creating a new thread, THE system SHALL link it to any existing lead from that vendor
5. THE system SHALL redirect the couple to the messaging interface with the thread open

### Requirement 3: Send and Receive Messages

**User Story:** As a couple, I want to send text messages to vendors, so that I can communicate my needs and questions.

#### Acceptance Criteria

1. WHEN composing a message, THE system SHALL provide a text input area
2. WHEN sending a message, THE system SHALL validate the message is not empty
3. WHEN a message is sent, THE system SHALL deliver it via WebSocket for real-time delivery
4. WHEN a vendor replies, THE system SHALL display the message instantly
5. THE system SHALL show message status indicators (sending, sent, delivered, read)

### Requirement 4: File Attachments

**User Story:** As a couple, I want to share images and documents with vendors, so that I can communicate my vision and requirements clearly.

#### Acceptance Criteria

1. WHEN composing a message, THE system SHALL provide a file upload button
2. WHEN uploading files, THE system SHALL support images (JPEG, PNG, GIF) up to 10MB
3. WHEN uploading files, THE system SHALL support PDF documents up to 25MB
4. WHEN a file is attached, THE system SHALL show a preview before sending
5. THE system SHALL validate file types and sizes before upload

### Requirement 5: Real-Time Features

**User Story:** As a couple, I want to see when vendors are typing and when they've read my messages, so that I know the status of our conversation.

#### Acceptance Criteria

1. WHEN a vendor is typing, THE system SHALL display a "Vendor is typing..." indicator
2. WHEN a vendor reads a message, THE system SHALL show a read receipt (checkmark)
3. WHEN a vendor comes online, THE system SHALL update their online status
4. WHEN the WebSocket disconnects, THE system SHALL attempt reconnection with exponential backoff
5. THE system SHALL queue messages sent while offline and deliver them when reconnected

### Requirement 6: Search and Filter

**User Story:** As a couple, I want to search my vendor conversations, so that I can quickly find specific information.

#### Acceptance Criteria

1. WHEN viewing the thread list, THE system SHALL provide a search input
2. WHEN searching, THE system SHALL filter threads by vendor name or message content
3. WHEN searching within a thread, THE system SHALL highlight matching messages
4. WHEN applying filters, THE system SHALL support filtering by vendor category
5. THE system SHALL update search results in real-time as the user types

### Requirement 7: Message History and Pagination

**User Story:** As a couple, I want to scroll through my message history with vendors, so that I can review past conversations.

#### Acceptance Criteria

1. WHEN opening a thread, THE system SHALL load the most recent 50 messages
2. WHEN scrolling to the top, THE system SHALL automatically load older messages
3. WHEN loading messages, THE system SHALL show a loading indicator
4. WHEN all messages are loaded, THE system SHALL display "No more messages"
5. THE system SHALL maintain scroll position when new messages arrive

### Requirement 8: Notifications

**User Story:** As a couple, I want to receive notifications when vendors message me, so that I don't miss important communications.

#### Acceptance Criteria

1. WHEN a vendor sends a message, THE system SHALL show a browser notification (if permitted)
2. WHEN a new message arrives, THE system SHALL play a notification sound
3. WHEN the couple is viewing another tab, THE system SHALL update the unread count badge
4. WHEN the couple returns to the messaging tab, THE system SHALL mark visible messages as read
5. THE system SHALL respect user notification preferences

### Requirement 9: Mobile Responsiveness

**User Story:** As a couple using a mobile device, I want the messaging interface to work smoothly on my phone, so that I can communicate with vendors on the go.

#### Acceptance Criteria

1. WHEN viewing on mobile, THE system SHALL display a mobile-optimized layout
2. WHEN on mobile, THE system SHALL show either the thread list OR the conversation (not both)
3. WHEN opening a thread on mobile, THE system SHALL provide a back button to return to the list
4. WHEN the keyboard opens on mobile, THE system SHALL adjust the layout appropriately
5. THE system SHALL support touch gestures for navigation

### Requirement 10: Integration with Existing Systems

**User Story:** As a system, I need to integrate couple messaging with existing vendor leads and profiles, so that all communication is tracked and linked.

#### Acceptance Criteria

1. WHEN a couple messages a vendor, THE system SHALL link the thread to any existing lead
2. WHEN viewing a thread, THE system SHALL display the vendor's profile information
3. WHEN a lead is created from a message, THE system SHALL update the lead status to "contacted"
4. WHEN viewing vendor analytics, THE system SHALL include couple-initiated conversations
5. THE system SHALL maintain data consistency between messaging and lead management systems

### Requirement 11: Security and Privacy

**User Story:** As a couple, I want my messages to be secure and private, so that my wedding planning details remain confidential.

#### Acceptance Criteria

1. WHEN messages are stored, THE system SHALL encrypt them using AES-256-GCM
2. WHEN accessing messages, THE system SHALL verify the couple has permission to view the thread
3. WHEN a couple deletes a message, THE system SHALL mark it as deleted but preserve it for the vendor
4. WHEN authenticating WebSocket connections, THE system SHALL validate JWT tokens
5. THE system SHALL log all message access for security auditing

### Requirement 12: Error Handling

**User Story:** As a couple, I want clear error messages when something goes wrong, so that I know how to resolve issues.

#### Acceptance Criteria

1. WHEN a message fails to send, THE system SHALL display a "Failed to send" error with a retry button
2. WHEN the WebSocket disconnects, THE system SHALL show a "Reconnecting..." indicator
3. WHEN file upload fails, THE system SHALL display the specific error (size, type, network)
4. WHEN loading threads fails, THE system SHALL show an error message with a retry option
5. THE system SHALL log errors to the console for debugging purposes

## Technical Requirements

### TR-1: API Endpoints

**Couple-specific endpoints:**
- `GET /api/v1/messaging/couple/threads` - Get all threads for the authenticated couple
- `POST /api/v1/messaging/couple/threads` - Create a new thread with a vendor
- `GET /api/v1/messaging/couple/threads/:threadId/messages` - Get messages in a thread
- `POST /api/v1/messaging/couple/messages` - Send a message as a couple
- `PUT /api/v1/messaging/couple/messages/:messageId/read` - Mark message as read
- `DELETE /api/v1/messaging/couple/messages/:messageId` - Delete a message

### TR-2: WebSocket Events

**Couple-specific events:**
- `couple:join` - Join couple's messaging rooms
- `couple:message:send` - Send message from couple
- `couple:typing:start` - Couple started typing
- `couple:typing:stop` - Couple stopped typing
- `couple:message:read` - Couple read a message

### TR-3: Database Schema

**No changes required** - existing tables support couple messaging:
- `message_threads` table has `couple_id` and `vendor_id` columns
- `messages` table has `sender_type` enum ('couple' | 'vendor')
- All necessary fields already exist

### TR-4: Authentication

- Use existing JWT authentication middleware
- Verify user_type is 'COUPLE' for couple endpoints
- Extract couple_id from authenticated user

### TR-5: Performance

- Implement pagination (50 messages per page)
- Use database indexes on thread queries
- Cache thread lists for 30 seconds
- Compress WebSocket messages

## Success Metrics

- Couples can send messages within 2 seconds of clicking send
- WebSocket reconnection succeeds within 10 seconds
- 95% of messages delivered in real-time
- Zero unauthorized access to threads
- Mobile interface loads in under 3 seconds

## Out of Scope

- Group messaging (multiple vendors in one thread)
- Voice/video calls
- Message editing after sending
- Message reactions/emojis
- Scheduled messages
- Auto-responses

## Priority

**Critical** - This is a blocking issue preventing couples from using the messaging system
