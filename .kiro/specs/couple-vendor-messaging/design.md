# Design Document: Couple-to-Vendor Messaging

## Overview

This design enables bidirectional messaging between couples and vendors by extending the existing messaging infrastructure. The implementation reuses existing backend services (MessageService, ThreadManager, WebSocket server) and creates a couple-facing interface similar to the vendor messaging interface.

## Architecture

### System Context

The couple messaging system integrates with the existing three-tier architecture:

1. **Frontend Layer**: React/TypeScript components in the couple dashboard
2. **API Layer**: Express.js REST endpoints for couple operations
3. **Real-Time Layer**: Socket.io WebSocket server for instant messaging
4. **Data Layer**: SQLite database with existing messaging tables

### Data Flow

```
Couple Dashboard → CoupleMessaging Component → API Endpoints → MessageService
                                              ↓
                                         WebSocket Server
                                              ↓
                                    Vendor Dashboard (real-time)
```

## Components and Interfaces

### Frontend Components

#### 1. CoupleMessaging Component

**Location**: `frontend/src/components/communication/CoupleMessaging.tsx`

**Purpose**: Main messaging interface for couples

**Props**:
```typescript
interface CoupleMessagingProps {
  coupleId: string;
  userId: string;
}
```

**State**:
```typescript
{
  threads: Thread[];
  selectedThread: Thread | null;
  searchQuery: string;
  filterCategory: string;
  loading: boolean;
  error: string | null;
}
```

**Features**:
- Thread list sidebar with search and filter
- Message view with real-time updates
- File upload support
- Typing indicators
- Read receipts
- Mobile-responsive layout

#### 2. Communication Tab Enhancement

**Location**: `frontend/src/pages/DashboardPage.tsx`

**Changes**: Add tab switcher in Communication section

```typescript
{activeTab === 'communication' && (
  <div className="space-y-6">
    <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
      <button
        onClick={() => setCommTab('vendors')}
        className={commTab === 'vendors' ? 'active' : ''}
      >
        Vendor Messages
      </button>
      <button
        onClick={() => setCommTab('guests')}
        className={commTab === 'guests' ? 'active' : ''}
      >
        Guest Communication
      </button>
    </div>
    
    {commTab === 'vendors' && <CoupleMessaging coupleId={coupleId} userId={user.id} />}
    {commTab === 'guests' && <CommunicationCenter weddingId={currentWedding.id} />}
  </div>
)}
```

### Backend API Endpoints

#### 1. Get Couple Threads

**Endpoint**: `GET /api/v1/messaging/couple/threads`

**Authentication**: Required (JWT, user_type='COUPLE')

**Response**:
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

#### 2. Create Thread with Vendor

**Endpoint**: `POST /api/v1/messaging/couple/threads`

**Authentication**: Required (JWT, user_type='COUPLE')

**Request Body**:
```json
{
  "vendorId": "vendor-456",
  "initialMessage": "Hi, I'm interested in your photography services..."
}
```

**Response**:
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

#### 3. Get Thread Messages

**Endpoint**: `GET /api/v1/messaging/couple/threads/:threadId/messages`

**Authentication**: Required (JWT, user_type='COUPLE')

**Query Parameters**:
- `limit`: Number of messages (default: 50)
- `offset`: Pagination offset (default: 0)

**Response**:
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
  "hasMore": false
}
```

#### 4. Send Message

**Endpoint**: `POST /api/v1/messaging/couple/messages`

**Authentication**: Required (JWT, user_type='COUPLE')

**Request Body**:
```json
{
  "threadId": "thread-123",
  "content": "What are your rates for a full-day wedding?",
  "messageType": "text",
  "attachments": []
}
```

**Response**:
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

### Backend Service Updates

#### 1. MessageService Enhancements

**File**: `backend-node/services/messageService.js`

**Changes**: Ensure couple sender support

```javascript
// Verify sender has access to thread
async verifySenderAccess(userId, threadId, senderType) {
  if (senderType === 'couple') {
    // Verify couple owns the thread
    const thread = await this.getThread(threadId);
    const couple = await query('SELECT id FROM couples WHERE user_id = ?', [userId]);
    return thread.couple_id === couple.rows[0].id;
  }
  // ... existing vendor logic
}
```

#### 2. DashboardIntegration Updates

**File**: `backend-node/services/dashboardIntegration.js`

**New Methods**:
```javascript
// Get threads for a couple
async getCoupleThreadsWithVendors(coupleId) {
  // Query threads where couple_id matches
  // Join with vendors table for vendor info
  // Return thread list with vendor details
}

// Create thread from couple to vendor
async createThreadFromCouple(coupleId, vendorId, initialMessage) {
  // Check if thread exists
  // Create thread if needed
  // Send initial message
  // Link to any existing lead
}
```

#### 3. WebSocket Server Updates

**File**: `backend-node/services/websocketServer.js`

**Changes**: Support couple connections

```javascript
// On connection
socket.on('couple:join', async (data) => {
  const { coupleId } = data;
  
  // Get all threads for this couple
  const threads = await dashboardIntegration.getCoupleThreadsWithVendors(coupleId);
  
  // Join all thread rooms
  threads.forEach(thread => {
    socket.join(`thread:${thread.id}`);
  });
  
  // Update couple online status
  await dashboardIntegration.updateCoupleOnlineStatus(coupleId, true);
});

// On message send
socket.on('couple:message:send', async (data) => {
  const { threadId, content, messageType } = data;
  
  // Verify couple has access
  // Create message
  // Broadcast to thread room
  // Notify vendor
});
```

### Database Queries

#### Get Couple Threads

```sql
SELECT 
  mt.id, mt.couple_id, mt.vendor_id, mt.lead_id, mt.service_type,
  mt.created_at, mt.updated_at, mt.last_message_at, mt.is_active,
  v.business_name as vendor_name, v.category as vendor_category,
  v.is_verified,
  (SELECT content FROM messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message,
  (SELECT created_at FROM messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
  (SELECT COUNT(*) FROM messages m 
   LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
   WHERE m.thread_id = mt.id AND m.sender_type = 'vendor' AND mrs.id IS NULL) as unread_count
FROM message_threads mt
JOIN vendors v ON mt.vendor_id = v.id
WHERE mt.couple_id = ?
ORDER BY mt.last_message_at DESC
```

#### Create Thread

```sql
INSERT INTO message_threads (couple_id, vendor_id, service_type, created_at, updated_at, last_message_at, is_active)
VALUES (?, ?, ?, datetime('now'), datetime('now'), datetime('now'), 1)
```

#### Send Message

```sql
INSERT INTO messages (thread_id, sender_id, sender_type, content, message_type, status, created_at, is_deleted)
VALUES (?, ?, 'couple', ?, ?, 'sent', datetime('now'), 0)
```

## UI/UX Design

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Communication Tab                                            │
├─────────────────────────────────────────────────────────────┤
│ [Vendor Messages] [Guest Communication]                      │
├──────────────────┬──────────────────────────────────────────┤
│ Thread List      │ Message View                             │
│ ┌──────────────┐ │ ┌──────────────────────────────────────┐ │
│ │ Search...    │ │ │ Elegant Photography                  │ │
│ └──────────────┘ │ │ Photography • Verified               │ │
│                  │ ├──────────────────────────────────────┤ │
│ ┌──────────────┐ │ │                                      │ │
│ │ Elegant Photo│ │ │ [Messages scroll here]               │ │
│ │ Thank you... │ │ │                                      │ │
│ │ 10:30 AM  [2]│ │ │                                      │ │
│ └──────────────┘ │ │                                      │ │
│                  │ ├──────────────────────────────────────┤ │
│ ┌──────────────┐ │ │ Type a message...          [📎] [➤] │ │
│ │ Catering Co  │ │ └──────────────────────────────────────┘ │
│ │ We can help..│ │                                          │
│ │ Yesterday    │ │                                          │
│ └──────────────┘ │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### Mobile Layout

```
Thread List View:
┌─────────────────────┐
│ ← Vendor Messages   │
├─────────────────────┤
│ Search...           │
├─────────────────────┤
│ Elegant Photography │
│ Thank you for...    │
│ 10:30 AM        [2] │
├─────────────────────┤
│ Catering Company    │
│ We can help with... │
│ Yesterday           │
└─────────────────────┘

Message View:
┌─────────────────────┐
│ ← Elegant Photo     │
│ Photography • ✓     │
├─────────────────────┤
│                     │
│ [Messages]          │
│                     │
├─────────────────────┤
│ Type message... [➤] │
└─────────────────────┘
```

## Error Handling

### Frontend Errors

1. **Network Errors**: Show retry button, queue messages for later
2. **Authentication Errors**: Redirect to login
3. **Permission Errors**: Show "Access denied" message
4. **File Upload Errors**: Display specific error (size, type, network)
5. **WebSocket Disconnect**: Show "Reconnecting..." indicator

### Backend Errors

1. **Invalid Thread Access**: Return 403 Forbidden
2. **Thread Not Found**: Return 404 Not Found
3. **Message Validation**: Return 400 Bad Request with details
4. **Database Errors**: Return 500 Internal Server Error, log details
5. **WebSocket Errors**: Emit error event to client

## Security Considerations

1. **Authentication**: Verify JWT token on all requests
2. **Authorization**: Verify couple owns the thread before allowing access
3. **Input Validation**: Sanitize message content, validate file types
4. **Rate Limiting**: Limit messages per minute per couple
5. **Encryption**: Use AES-256-GCM for message storage
6. **Audit Logging**: Log all message access and modifications

## Performance Optimization

1. **Pagination**: Load 50 messages at a time
2. **Caching**: Cache thread lists for 30 seconds
3. **Indexes**: Add indexes on couple_id, vendor_id, created_at
4. **WebSocket**: Use rooms for efficient broadcasting
5. **Lazy Loading**: Load thread details only when opened

## Testing Strategy

### Unit Tests
- Test API endpoints with mock data
- Test message validation logic
- Test thread creation and access control
- Test file upload validation

### Integration Tests
- Test complete message flow (couple → vendor)
- Test WebSocket connection and message delivery
- Test thread creation from vendor profile
- Test real-time features (typing, read receipts)

### Property-Based Tests
- Test message ordering consistency
- Test thread access permissions
- Test WebSocket reconnection logic
- Test pagination correctness

## Migration Plan

1. **Phase 1**: Add couple messaging API endpoints (no UI changes)
2. **Phase 2**: Build CoupleMessaging component
3. **Phase 3**: Integrate into dashboard with tab switcher
4. **Phase 4**: Test end-to-end messaging flow
5. **Phase 5**: Deploy and monitor

## Rollback Plan

If issues arise:
1. Remove tab switcher, revert to CommunicationCenter only
2. Disable couple messaging API endpoints
3. Keep vendor messaging functional
4. Fix issues and redeploy

## Success Criteria

- ✅ Couples can send messages to vendors
- ✅ Messages deliver in real-time via WebSocket
- ✅ File attachments work correctly
- ✅ Mobile interface is fully functional
- ✅ No security vulnerabilities
- ✅ Performance meets requirements (<2s message send)
