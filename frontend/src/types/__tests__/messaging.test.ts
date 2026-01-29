/**
 * Unit tests for messaging type definitions
 * 
 * These tests verify that the TypeScript interfaces and types are correctly defined
 * and can be used to create valid objects.
 */

import {
  UserType,
  MessageType,
  MessageStatus,
  Message,
  MessageThread,
  Attachment,
  NotificationPreferences,
  VendorProfile,
  MessagingAnalytics,
  DateRange,
  MessagingError,
  ConnectionError,
  MessageError,
  FileUploadError,
  WebSocketEvent,
  TypingIndicator,
  UserStatus,
  PaginatedResponse
} from '../messaging';

describe('Messaging Type Definitions', () => {
  describe('Enums', () => {
    it('should define UserType enum correctly', () => {
      expect(UserType.COUPLE).toBe('couple');
      expect(UserType.VENDOR).toBe('vendor');
    });

    it('should define MessageType enum correctly', () => {
      expect(MessageType.TEXT).toBe('text');
      expect(MessageType.IMAGE).toBe('image');
      expect(MessageType.DOCUMENT).toBe('document');
      expect(MessageType.SYSTEM).toBe('system');
    });

    it('should define MessageStatus enum correctly', () => {
      expect(MessageStatus.SENT).toBe('sent');
      expect(MessageStatus.DELIVERED).toBe('delivered');
      expect(MessageStatus.READ).toBe('read');
    });

    it('should define WebSocketEvent enum correctly', () => {
      expect(WebSocketEvent.MESSAGE_RECEIVED).toBe('message:received');
      expect(WebSocketEvent.MESSAGE_SENT).toBe('message:sent');
      expect(WebSocketEvent.TYPING_START).toBe('typing:start');
      expect(WebSocketEvent.USER_ONLINE).toBe('user:online');
    });
  });

  describe('Core Data Interfaces', () => {
    it('should create a valid MessageThread object', () => {
      const thread: MessageThread = {
        id: 'thread-123',
        participants: {
          coupleId: 'couple-456',
          vendorId: 'vendor-789'
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastMessageAt: new Date('2024-01-02'),
        isActive: true,
        metadata: {
          leadId: 'lead-001',
          serviceType: 'photography'
        }
      };

      expect(thread.id).toBe('thread-123');
      expect(thread.participants.coupleId).toBe('couple-456');
      expect(thread.isActive).toBe(true);
    });

    it('should create a valid Message object', () => {
      const message: Message = {
        id: 'msg-123',
        threadId: 'thread-456',
        senderId: 'user-789',
        senderType: UserType.COUPLE,
        content: 'Hello, vendor!',
        messageType: MessageType.TEXT,
        createdAt: new Date('2024-01-01'),
        status: MessageStatus.SENT,
        isDeleted: false
      };

      expect(message.id).toBe('msg-123');
      expect(message.senderType).toBe(UserType.COUPLE);
      expect(message.messageType).toBe(MessageType.TEXT);
      expect(message.status).toBe(MessageStatus.SENT);
    });

    it('should create a valid Message with attachments', () => {
      const attachment: Attachment = {
        id: 'att-123',
        messageId: 'msg-456',
        fileName: 'wedding-photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024000,
        url: 'https://example.com/files/wedding-photo.jpg',
        thumbnailUrl: 'https://example.com/files/wedding-photo-thumb.jpg',
        uploadedAt: new Date('2024-01-01')
      };

      const message: Message = {
        id: 'msg-456',
        threadId: 'thread-789',
        senderId: 'user-123',
        senderType: UserType.VENDOR,
        content: 'Here are some sample photos',
        messageType: MessageType.IMAGE,
        attachments: [attachment],
        createdAt: new Date('2024-01-01'),
        status: MessageStatus.DELIVERED,
        isDeleted: false
      };

      expect(message.attachments).toHaveLength(1);
      expect(message.attachments![0].fileName).toBe('wedding-photo.jpg');
      expect(message.attachments![0].fileType).toBe('image/jpeg');
    });

    it('should create a valid Attachment object', () => {
      const attachment: Attachment = {
        id: 'att-123',
        messageId: 'msg-456',
        fileName: 'contract.pdf',
        fileType: 'application/pdf',
        fileSize: 2048000,
        url: 'https://example.com/files/contract.pdf',
        uploadedAt: new Date('2024-01-01')
      };

      expect(attachment.fileName).toBe('contract.pdf');
      expect(attachment.fileType).toBe('application/pdf');
      expect(attachment.fileSize).toBe(2048000);
    });

    it('should create a valid NotificationPreferences object', () => {
      const prefs: NotificationPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      };

      expect(prefs.emailNotifications).toBe(true);
      expect(prefs.quietHours.start).toBe('22:00');
      expect(prefs.quietHours.end).toBe('08:00');
    });

    it('should create a valid VendorProfile object', () => {
      const profile: VendorProfile = {
        id: 'vendor-123',
        name: 'John Doe',
        businessName: 'Perfect Photos',
        serviceType: 'photography',
        avatarUrl: 'https://example.com/avatar.jpg',
        isOnline: true,
        lastSeen: new Date('2024-01-01')
      };

      expect(profile.businessName).toBe('Perfect Photos');
      expect(profile.isOnline).toBe(true);
    });

    it('should create a valid MessagingAnalytics object', () => {
      const analytics: MessagingAnalytics = {
        totalMessages: 150,
        responseTime: 12.5,
        activeConversations: 8,
        messagesByDay: [
          { date: '2024-01-01', count: 25 },
          { date: '2024-01-02', count: 30 }
        ]
      };

      expect(analytics.totalMessages).toBe(150);
      expect(analytics.responseTime).toBe(12.5);
      expect(analytics.messagesByDay).toHaveLength(2);
    });

    it('should create a valid DateRange object', () => {
      const range: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      expect(range.startDate).toBeInstanceOf(Date);
      expect(range.endDate).toBeInstanceOf(Date);
    });
  });

  describe('Error Types', () => {
    it('should create a MessagingError', () => {
      const error = new MessagingError('Test error', 'TEST_ERROR', { detail: 'test' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('MessagingError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ detail: 'test' });
    });

    it('should create a ConnectionError', () => {
      const error = new ConnectionError('Connection failed');
      
      expect(error).toBeInstanceOf(MessagingError);
      expect(error.name).toBe('ConnectionError');
      expect(error.code).toBe('CONNECTION_ERROR');
    });

    it('should create a MessageError', () => {
      const error = new MessageError('Message send failed');
      
      expect(error).toBeInstanceOf(MessagingError);
      expect(error.name).toBe('MessageError');
      expect(error.code).toBe('MESSAGE_ERROR');
    });

    it('should create a FileUploadError', () => {
      const error = new FileUploadError('File too large');
      
      expect(error).toBeInstanceOf(MessagingError);
      expect(error.name).toBe('FileUploadError');
      expect(error.code).toBe('FILE_UPLOAD_ERROR');
    });
  });

  describe('Utility Types', () => {
    it('should create a valid TypingIndicator object', () => {
      const indicator: TypingIndicator = {
        threadId: 'thread-123',
        userId: 'user-456',
        userName: 'John Doe',
        isTyping: true
      };

      expect(indicator.threadId).toBe('thread-123');
      expect(indicator.isTyping).toBe(true);
    });

    it('should create a valid UserStatus object', () => {
      const status: UserStatus = {
        userId: 'user-123',
        userType: UserType.VENDOR,
        isOnline: true,
        lastSeen: new Date('2024-01-01')
      };

      expect(status.userId).toBe('user-123');
      expect(status.userType).toBe(UserType.VENDOR);
      expect(status.isOnline).toBe(true);
    });

    it('should create a valid PaginatedResponse object', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          threadId: 'thread-1',
          senderId: 'user-1',
          senderType: UserType.COUPLE,
          content: 'Message 1',
          messageType: MessageType.TEXT,
          createdAt: new Date(),
          status: MessageStatus.SENT,
          isDeleted: false
        }
      ];

      const response: PaginatedResponse<Message> = {
        data: messages,
        total: 100,
        limit: 20,
        offset: 0,
        hasMore: true
      };

      expect(response.data).toHaveLength(1);
      expect(response.total).toBe(100);
      expect(response.hasMore).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const message: Message = {
        id: 'msg-empty',
        threadId: 'thread-1',
        senderId: 'user-1',
        senderType: UserType.COUPLE,
        content: '',
        messageType: MessageType.TEXT,
        createdAt: new Date(),
        status: MessageStatus.SENT,
        isDeleted: false
      };

      expect(message.content).toBe('');
    });

    it('should handle message without attachments', () => {
      const message: Message = {
        id: 'msg-no-attach',
        threadId: 'thread-1',
        senderId: 'user-1',
        senderType: UserType.COUPLE,
        content: 'Text only',
        messageType: MessageType.TEXT,
        createdAt: new Date(),
        status: MessageStatus.SENT,
        isDeleted: false
      };

      expect(message.attachments).toBeUndefined();
    });

    it('should handle thread without metadata', () => {
      const thread: MessageThread = {
        id: 'thread-minimal',
        participants: {
          coupleId: 'couple-1',
          vendorId: 'vendor-1'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        isActive: true,
        metadata: {}
      };

      expect(thread.metadata.leadId).toBeUndefined();
      expect(thread.metadata.serviceType).toBeUndefined();
    });

    it('should handle vendor profile without avatar or lastSeen', () => {
      const profile: VendorProfile = {
        id: 'vendor-minimal',
        name: 'Jane Smith',
        businessName: 'Smith Catering',
        serviceType: 'catering',
        isOnline: false
      };

      expect(profile.avatarUrl).toBeUndefined();
      expect(profile.lastSeen).toBeUndefined();
    });

    it('should handle attachment without thumbnail', () => {
      const attachment: Attachment = {
        id: 'att-no-thumb',
        messageId: 'msg-1',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 500000,
        url: 'https://example.com/document.pdf',
        uploadedAt: new Date()
      };

      expect(attachment.thumbnailUrl).toBeUndefined();
    });
  });
});
