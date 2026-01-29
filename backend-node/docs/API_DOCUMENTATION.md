# Wedding Platform API Documentation

## Overview

This document provides comprehensive API documentation for the Wedding Platform, including the new couple-to-vendor messaging system.

## Authentication

All API endpoints require JWT authentication unless otherwise specified. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Base URL

Development: `http://localhost:3001/api/v1`
Production: `https://your-domain.com/api/v1`

## Couple Messaging API

### Get Couple Threads

Retrieve all messaging threads for the authenticated couple.

**Endpoint:** `GET /messaging/couple/threads`

**Authentication:** Required (user_type='COUPLE')

**Response:**
```json
{
  "threads": [
    {
      "id": "thread-123",
      "vendorId": "vendor-456",
      "vendorName": "Elegant Photography",
      "vendorCategory": "Photography",
      "lastMessage": "Thank you for your inquiry...",
      "lastMessageTime": "2024-01-27T10:30:00Z",
      "unreadCount": 2,
      "leadId": "lead-789",
      "status": "active"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not a couple)
- `500` - Internal server error

### Create Thread with Vendor

Create a new messaging thread between a couple and vendor.

**Endpoint:** `POST /messaging/couple/threads`

**Authentication:** Required (user_type='COUPLE')

**Request Body:**
```json
{
  "vendorId": "vendor-456",
  "initialMessage": "Hi, I'm interested in your photography services..."
}
```

**Response:**
```json
{
  "thread": {
    "id": "thread-123",
    "coupleId": "couple-789",
    "vendorId": "vendor-456",
    "createdAt": "2024-01-27T10:30:00Z"
  }
}
```

**Status Codes:**
- `201` - Thread created successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `403` - Forbidden
- `409` - Thread already exists
- `500` - Internal server error

### Get Thread Messages

Retrieve messages from a specific thread with pagination.

**Endpoint:** `GET /messaging/couple/threads/:threadId/messages`

**Authentication:** Required (user_type='COUPLE')

**Query Parameters:**
- `limit` (optional): Number of messages to retrieve (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-123",
      "threadId": "thread-123",
      "senderId": "couple-789",
      "senderType": "couple",
      "content": "Hi, I'm interested in your services",
      "messageType": "text",
      "status": "read",
      "createdAt": "2024-01-27T10:30:00Z",
      "attachments": []
    }
  ],
  "hasMore": false,
  "totalCount": 15
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (no access to thread)
- `404` - Thread not found
- `500` - Internal server error

### Send Message

Send a message in a thread as a couple.

**Endpoint:** `POST /messaging/couple/messages`

**Authentication:** Required (user_type='COUPLE')

**Request Body:**
```json
{
  "threadId": "thread-123",
  "content": "What are your rates for a full-day wedding?",
  "messageType": "text",
  "attachments": []
}
```

**Response:**
```json
{
  "message": {
    "id": "msg-124",
    "threadId": "thread-123",
    "senderId": "couple-789",
    "senderType": "couple",
    "content": "What are your rates for a full-day wedding?",
    "status": "sent",
    "createdAt": "2024-01-27T10:31:00Z"
  }
}
```

**Status Codes:**
- `201` - Message sent successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `403` - Forbidden (no access to thread)
- `404` - Thread not found
- `413` - Message too large
- `429` - Rate limit exceeded
- `500` - Internal server error

### Mark Message as Read

Mark a message as read by the couple.

**Endpoint:** `PUT /messaging/couple/messages/:messageId/read`

**Authentication:** Required (user_type='COUPLE')

**Response:**
```json
{
  "success": true,
  "readAt": "2024-01-27T10:32:00Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Message not found
- `500` - Internal server error

## WebSocket Events

### Connection

Connect to the WebSocket server for real-time messaging:

```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Couple Events

#### Join Couple Rooms

Join all messaging rooms for the authenticated couple:

```javascript
socket.emit('couple:join', {
  coupleId: 'couple-123'
});
```

#### Send Message

Send a message in real-time:

```javascript
socket.emit('couple:message:send', {
  threadId: 'thread-123',
  content: 'Hello!',
  messageType: 'text'
});
```

#### Typing Indicators

Start/stop typing indicators:

```javascript
// Start typing
socket.emit('couple:typing:start', {
  threadId: 'thread-123'
});

// Stop typing
socket.emit('couple:typing:stop', {
  threadId: 'thread-123'
});
```

#### Mark as Read

Mark messages as read:

```javascript
socket.emit('couple:message:read', {
  messageId: 'msg-123'
});
```

### Server Events

#### New Message

Receive new messages:

```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data.message);
});
```

#### Typing Status

Receive typing indicators:

```javascript
socket.on('typing:start', (data) => {
  console.log(`${data.senderName} is typing...`);
});

socket.on('typing:stop', (data) => {
  console.log(`${data.senderName} stopped typing`);
});
```

#### Read Receipts

Receive read receipt updates:

```javascript
socket.on('message:read', (data) => {
  console.log(`Message ${data.messageId} was read`);
});
```

## Error Handling

### Error Response Format

All API errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "vendorId",
      "reason": "Vendor not found"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - Missing or invalid JWT token
- `AUTHORIZATION_FAILED` - User doesn't have required permissions
- `VALIDATION_ERROR` - Invalid request parameters
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Messaging endpoints:** 60 requests per minute per user
- **File upload:** 10 uploads per minute per user
- **WebSocket connections:** 5 connections per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1643723400
```

## File Attachments

### Supported File Types

- **Images:** JPEG, PNG, GIF (max 10MB)
- **Documents:** PDF (max 25MB)

### Upload Process

1. Upload file to `/api/v1/upload` endpoint
2. Receive file URL in response
3. Include file URL in message attachments array

### Security

- All files are scanned for malware
- File types are validated server-side
- Files are stored with unique identifiers
- Access is restricted to thread participants

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

```
GET /messaging/couple/threads/:threadId/messages?limit=20&offset=40
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 40,
    "total": 150,
    "hasMore": true
  }
}
```

## Security

### Encryption

- Messages are encrypted at rest using AES-256-GCM
- All API communication uses HTTPS
- WebSocket connections use WSS (WebSocket Secure)

### Access Control

- Couples can only access their own threads
- Vendors can only access threads they participate in
- All access is logged for security auditing

### Data Privacy

- Messages can be deleted by senders
- Deleted messages are marked as deleted but preserved for other participants
- User data can be exported or deleted upon request

## Testing

### Test Environment

Base URL: `http://localhost:3001/api/v1`

### Sample Test Data

Use these test accounts for development:

```json
{
  "couple": {
    "email": "test.couple@example.com",
    "password": "testpass123",
    "coupleId": "couple-test-123"
  },
  "vendor": {
    "email": "test.vendor@example.com",
    "password": "testpass123",
    "vendorId": "vendor-test-456"
  }
}
```

### Postman Collection

A Postman collection with all endpoints is available at:
`/docs/Wedding_Platform_API.postman_collection.json`

## Support

For API support or questions:
- Email: api-support@weddingplatform.com
- Documentation: https://docs.weddingplatform.com
- Status Page: https://status.weddingplatform.com

---

**Last Updated:** January 28, 2025
**API Version:** v1.0.0

## Recent Updates

### January 28, 2025
- Added comprehensive couple messaging API endpoints
- Enhanced WebSocket event documentation
- Updated error handling and rate limiting information
- Added file attachment support documentation
- Improved security and authentication details