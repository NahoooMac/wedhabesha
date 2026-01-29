# Messaging System Type Definitions

This directory contains all TypeScript interfaces, types, and enums for the Vendor Dashboard Messaging Enhancement feature.

## Overview

The messaging system enables real-time communication between couples and vendors on the wedding platform. These type definitions provide type safety and documentation for all messaging-related data structures and service interfaces.

## Files

- **`messaging.ts`** - Core type definitions for the messaging system
- **`index.ts`** - Central export point for all types
- **`__tests__/messaging.test.ts`** - Unit tests for type definitions

## Usage

Import types from the central export point:

```typescript
import {
  Message,
  MessageThread,
  MessageType,
  MessageStatus,
  UserType,
  MessageService,
  NotificationPreferences
} from '@/types';
```

Or import directly from the messaging module:

```typescript
import { Message, MessageThread } from '@/types/messaging';
```

## Core Types

### Enums

- **`UserType`** - User types in the system (COUPLE, VENDOR)
- **`MessageType`** - Message content types (TEXT, IMAGE, DOCUMENT, SYSTEM)
- **`MessageStatus`** - Message delivery status (SENT, DELIVERED, READ)
- **`WebSocketEvent`** - Real-time event types

### Data Interfaces

- **`Message`** - Individual message in a conversation
- **`MessageThread`** - Conversation between a couple and vendor
- **`Attachment`** - File attachment in a message
- **`NotificationPreferences`** - User notification settings
- **`VendorProfile`** - Vendor information for messaging context
- **`MessagingAnalytics`** - Analytics data for vendor dashboard

### Service Interfaces

- **`MessageService`** - Core messaging operations
- **`ThreadManager`** - Thread management operations
- **`ConnectionManager`** - WebSocket connection management
- **`RealtimeHandler`** - Client-side real-time event handling
- **`NotificationService`** - Notification delivery and management
- **`FileUploadService`** - File upload and attachment handling
- **`DashboardIntegration`** - Integration with vendor dashboard
- **`EncryptionService`** - Message encryption and decryption

### Error Types

- **`MessagingError`** - Base error class
- **`ConnectionError`** - WebSocket connection errors
- **`MessageError`** - Message delivery errors
- **`FileUploadError`** - File upload errors

## Examples

### Creating a Message

```typescript
import { Message, MessageType, MessageStatus, UserType } from '@/types';

const message: Message = {
  id: 'msg-123',
  threadId: 'thread-456',
  senderId: 'user-789',
  senderType: UserType.COUPLE,
  content: 'Hello, I would like to inquire about your services',
  messageType: MessageType.TEXT,
  createdAt: new Date(),
  status: MessageStatus.SENT,
  isDeleted: false
};
```

### Creating a Message Thread

```typescript
import { MessageThread } from '@/types';

const thread: MessageThread = {
  id: 'thread-123',
  participants: {
    coupleId: 'couple-456',
    vendorId: 'vendor-789'
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  lastMessageAt: new Date(),
  isActive: true,
  metadata: {
    leadId: 'lead-001',
    serviceType: 'photography'
  }
};
```

### Implementing a Service

```typescript
import { MessageService, Message, MessageType } from '@/types';

class MessageServiceImpl implements MessageService {
  async sendMessage(
    threadId: string,
    senderId: string,
    content: string,
    type: MessageType
  ): Promise<Message> {
    // Implementation here
  }
  
  async getMessages(
    threadId: string,
    limit: number,
    offset: number
  ): Promise<Message[]> {
    // Implementation here
  }
  
  // ... other methods
}
```

### Handling Errors

```typescript
import { ConnectionError, MessageError } from '@/types';

try {
  await messageService.sendMessage(threadId, senderId, content, MessageType.TEXT);
} catch (error) {
  if (error instanceof ConnectionError) {
    console.error('Connection failed:', error.message);
    // Handle connection error
  } else if (error instanceof MessageError) {
    console.error('Message send failed:', error.message);
    // Handle message error
  }
}
```

## Requirements Mapping

These type definitions satisfy the following requirements:

- **Requirement 2.1** - Real-time messaging infrastructure (Message, MessageThread interfaces)
- **Requirement 3.1** - Message history and thread management (MessageThread, ThreadManager)
- **Requirement 7.1** - Message content and media support (Attachment, MessageType enum)

## Testing

Run the type definition tests:

```bash
npm test -- messaging.test.ts
```

The tests verify:
- Enum values are correctly defined
- Interfaces can be used to create valid objects
- Error types work correctly
- Edge cases are handled (optional fields, empty values)

## Type Safety

All interfaces are strictly typed to ensure:
- Required fields are always present
- Optional fields are clearly marked with `?`
- Enums prevent invalid values
- Service methods have clear input/output types
- Error handling is type-safe

## Future Extensions

When adding new features, follow these guidelines:

1. Add new types to `messaging.ts`
2. Export them from `index.ts`
3. Write unit tests in `__tests__/messaging.test.ts`
4. Update this README with usage examples
5. Document which requirements the new types satisfy
