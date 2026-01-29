# Messaging Components

This directory contains the frontend messaging interface components for the Vendor Dashboard Messaging Enhancement feature.

## Components

### MessageThread

Displays conversation history with chronological ordering, message status indicators, and read receipts.

**Props:**
- `messages: Message[]` - Array of messages to display
- `currentUserId: string` - ID of the current user
- `currentUserType: UserType` - Type of current user (couple or vendor)
- `onMessageRead?: (messageId: string) => void` - Callback when a message is read

**Features:**
- Chronological message ordering
- Message status indicators (sent, delivered, read)
- Read receipts with checkmarks
- Auto-scroll to latest message
- Intersection Observer for automatic read marking
- Support for text, image, and document messages
- Deleted message handling
- Empty state display

**Requirements:** 3.1 (conversation display), 5.2 (read status)

### MessageInput

Provides message composition interface with typing indicators and file upload capabilities.

**Props:**
- `threadId: string` - ID of the conversation thread
- `onSendMessage: (content: string, type: MessageType, files?: File[]) => Promise<void>` - Callback to send message
- `onTypingStart?: () => void` - Callback when user starts typing
- `onTypingStop?: () => void` - Callback when user stops typing
- `isTyping?: boolean` - Whether the other user is typing
- `typingUserName?: string` - Name of the typing user
- `disabled?: boolean` - Whether input is disabled
- `maxFileSize?: number` - Maximum file size in MB (default: 25)
- `allowedFileTypes?: string[]` - Allowed file MIME types

**Features:**
- Auto-resizing textarea
- Typing indicator emission (stops after 3s of inactivity)
- File upload with validation
- File type and size validation
- Upload progress indicator
- Multiple file selection
- File preview before sending
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Error handling and display

**Requirements:** 2.2 (typing indicators), 7.1 (file upload)

### MessageList

Implements infinite scroll for long conversations and message search functionality.

**Props:**
- `threadId: string` - ID of the conversation thread
- `currentUserId: string` - ID of the current user
- `currentUserType: UserType` - Type of current user
- `onLoadMore: (offset: number, limit: number) => Promise<Message[]>` - Callback to load more messages
- `onMessageRead?: (messageId: string) => void` - Callback when a message is read
- `onSearch?: (query: string) => Promise<Message[]>` - Callback to search messages
- `pageSize?: number` - Number of messages per page (default: 50)

**Features:**
- Infinite scroll pagination
- Intersection Observer for automatic loading
- Message search with debouncing (300ms)
- Case-insensitive search
- Search in message content and attachment filenames
- Search result count display
- Loading states
- Error handling
- Empty state display

**Requirements:** 3.2 (message search), 3.3 (pagination)

### MessagingDemo

Example implementation showing how to use MessageList and MessageInput together with real-time communication features.

**Props:**
- `threadId: string` - ID of the conversation thread
- `currentUserId: string` - ID of the current user
- `currentUserType: UserType` - Type of current user
- `recipientName?: string` - Name of the other participant

**Features:**
- Complete messaging interface
- WebSocket integration
- Typing indicator handling
- Message sending and receiving
- File upload handling
- Read receipt handling

## Usage Example

```tsx
import { MessagingDemo } from './components/communication/MessagingDemo';
import { UserType } from './types/messaging';

function VendorMessaging() {
  return (
    <MessagingDemo
      threadId="thread-123"
      currentUserId="vendor-456"
      currentUserType={UserType.VENDOR}
      recipientName="John & Jane Doe"
    />
  );
}
```

## Integration with Backend

The components are designed to work with the following backend services:

1. **MessageService** - Core messaging operations
   - `sendMessage(threadId, senderId, content, type)`
   - `getMessages(threadId, limit, offset)`
   - `markAsRead(messageId, userId)`
   - `searchMessages(threadId, query)`

2. **RealtimeHandler** - WebSocket communication
   - `connect(token)` - Connect to WebSocket server
   - `joinThread(threadId)` - Join a conversation room
   - `emitMessage(message)` - Send message via WebSocket
   - `emitTyping(threadId, isTyping)` - Send typing indicator
   - `onMessageReceived(callback)` - Listen for new messages
   - `onTypingIndicator(callback)` - Listen for typing indicators

3. **FileUploadService** - File handling
   - `uploadFile(file, messageId)` - Upload file attachment
   - `validateFile(file)` - Validate file before upload

## Testing

Property-based tests are located in `__tests__/messageSearch.property.test.ts` and validate:

- Search returns only matching messages
- Case-insensitive search
- Empty query handling
- Attachment filename search
- Message data integrity
- Special character handling
- Deleted message filtering
- Search performance
- Partial word matching
- Result ordering consistency

Run tests with:
```bash
npm test -- messageSearch.property.test.ts --run
```

## File Structure

```
communication/
├── MessageThread.tsx          # Message display component
├── MessageInput.tsx           # Message composition component
├── MessageList.tsx            # Message list with pagination and search
├── MessagingDemo.tsx          # Example implementation
├── MESSAGING_README.md        # This file
├── __tests__/
│   └── messageSearch.property.test.ts  # Property-based tests
└── index.ts                   # Component exports
```

## Requirements Mapping

- **Requirement 2.2** (Typing indicators) - MessageInput component
- **Requirement 3.1** (Conversation display) - MessageThread component
- **Requirement 3.2** (Message search) - MessageList component
- **Requirement 3.3** (Pagination) - MessageList component
- **Requirement 5.2** (Read status) - MessageThread component
- **Requirement 7.1** (File upload) - MessageInput component

## Future Enhancements

- Message editing
- Message reactions
- Voice messages
- Video messages
- Message forwarding
- Thread archiving
- Message pinning
- Rich text formatting
- Emoji picker
- GIF support
