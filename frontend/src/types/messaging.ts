/**
 * Core TypeScript interfaces and types for the Vendor Dashboard Messaging Enhancement
 * 
 * This file defines all the core data structures and service interfaces for the messaging system
 * that enables real-time communication between couples and vendors.
 * 
 * Requirements: 2.1, 3.1, 7.1
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * User types in the messaging system
 */
export enum UserType {
  COUPLE = 'couple',
  VENDOR = 'vendor'
}

/**
 * Message types supported by the system
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  SYSTEM = 'system',
  VOICE = 'voice'
}

/**
 * Message delivery and read status
 */
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

/**
 * Message delivery status for tracking
 */
export enum MessageDeliveryStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

// ============================================================================
// Core Data Interfaces
// ============================================================================

/**
 * Represents a conversation thread between a couple and a vendor
 */
export interface MessageThread {
  id: string;
  participants: {
    coupleId: string;
    vendorId: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  isActive: boolean;
  metadata: {
    leadId?: string;
    serviceType?: string;
  };
}

/**
 * Represents a single message in a conversation thread
 */
export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderType: UserType;
  content: string; // encrypted content
  messageType: MessageType;
  attachments?: Attachment[];
  createdAt: Date;
  status: MessageStatus;
  deliveryStatus?: MessageDeliveryStatus;
  deliveredAt?: Date;
  readAt?: Date;
  isDeleted: boolean;
}

/**
 * Represents a file attachment in a message
 */
export interface Attachment {
  id: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  soundEnabled: boolean;
  quietHours: {
    start: string; // Format: "HH:mm"
    end: string;   // Format: "HH:mm"
  };
}

/**
 * Vendor profile information for messaging context
 */
export interface VendorProfile {
  id: string;
  name: string;
  businessName: string;
  serviceType: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

/**
 * Date range for analytics queries
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Messaging analytics data for vendor dashboard
 */
export interface MessagingAnalytics {
  totalMessages: number;
  responseTime: number; // Average response time in minutes
  activeConversations: number;
  messagesByDay: Array<{
    date: string;
    count: number;
  }>;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Thread Manager Service
 * Handles conversation thread creation, management, and retrieval
 */
export interface ThreadManager {
  createThread(
    coupleId: string,
    vendorId: string,
    metadata?: object
  ): Promise<MessageThread>;
  
  getThread(threadId: string): Promise<MessageThread>;
  
  getThreadsForUser(
    userId: string,
    userType: UserType
  ): Promise<MessageThread[]>;
  
  updateThreadActivity(threadId: string): Promise<void>;
  
  archiveThread(threadId: string): Promise<void>;
}

/**
 * Message Service
 * Core messaging functionality for sending, receiving, and storing messages
 */
export interface MessageService {
  sendMessage(
    threadId: string,
    senderId: string,
    content: string,
    type: MessageType
  ): Promise<Message>;
  
  getMessages(
    threadId: string,
    limit: number,
    offset: number
  ): Promise<Message[]>;
  
  markAsRead(messageId: string, userId: string): Promise<void>;
  
  deleteMessage(messageId: string, userId: string): Promise<void>;
  
  searchMessages(threadId: string, query: string): Promise<Message[]>;
}

/**
 * Connection Manager
 * Manages WebSocket connections and real-time message delivery
 */
export interface ConnectionManager {
  connect(userId: string, userType: UserType): Promise<WebSocket>;
  
  disconnect(userId: string): Promise<void>;
  
  broadcastToThread(threadId: string, message: Message): Promise<void>;
  
  sendTypingIndicator(
    threadId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void>;
  
  getOnlineUsers(threadId: string): Promise<string[]>;
}

/**
 * Realtime Handler
 * Client-side WebSocket event handling
 */
export interface RealtimeHandler {
  onMessageReceived(callback: (message: Message) => void): () => void;
  
  onTypingIndicator(
    callback: (threadId: string, userId: string, isTyping: boolean) => void
  ): () => void;
  
  onUserStatusChange(
    callback: (userId: string, isOnline: boolean) => void
  ): () => void;
  
  emitMessage(message: Message): Promise<void>;
  
  emitTyping(threadId: string, isTyping: boolean): Promise<void>;
}

/**
 * Notification Service
 * Handles push notifications and alert management
 */
export interface NotificationService {
  sendMessageNotification(
    recipientId: string,
    message: Message
  ): Promise<void>;
  
  sendTypingNotification(
    recipientId: string,
    threadId: string,
    senderName: string
  ): Promise<void>;
  
  markNotificationAsRead(notificationId: string): Promise<void>;
  
  getUserNotificationPreferences(
    userId: string
  ): Promise<NotificationPreferences>;
  
  updateNotificationPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void>;
}

/**
 * File Upload Service
 * Manages media and document sharing within messages
 */
export interface FileUploadService {
  uploadFile(file: File, messageId: string): Promise<Attachment>;
  
  generateThumbnail(attachment: Attachment): Promise<string>;
  
  validateFile(file: File): Promise<boolean>;
  
  deleteFile(attachmentId: string): Promise<void>;
  
  getFileUrl(attachmentId: string): Promise<string>;
}

/**
 * Dashboard Integration Service
 * Connects messaging system with existing vendor dashboard features
 */
export interface DashboardIntegration {
  linkMessageToLead(messageId: string, leadId: string): Promise<void>;
  
  createThreadFromLead(leadId: string): Promise<MessageThread>;
  
  getVendorProfile(vendorId: string): Promise<VendorProfile>;
  
  updateVendorOnlineStatus(
    vendorId: string,
    isOnline: boolean
  ): Promise<void>;
  
  getMessagingAnalytics(
    vendorId: string,
    dateRange: DateRange
  ): Promise<MessagingAnalytics>;
}

/**
 * Encryption Service
 * Handles message content encryption and decryption
 */
export interface EncryptionService {
  encryptMessage(content: string, threadId: string): Promise<string>;
  
  decryptMessage(encryptedContent: string, threadId: string): Promise<string>;
  
  generateThreadKey(threadId: string): Promise<string>;
  
  rotateThreadKey(threadId: string): Promise<void>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error class for messaging system errors
 */
export class MessagingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MessagingError';
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends MessagingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

/**
 * Message delivery errors
 */
export class MessageError extends MessagingError {
  constructor(message: string, details?: unknown) {
    super(message, 'MESSAGE_ERROR', details);
    this.name = 'MessageError';
  }
}

/**
 * File upload errors
 */
export class FileUploadError extends MessagingError {
  constructor(message: string, details?: unknown) {
    super(message, 'FILE_UPLOAD_ERROR', details);
    this.name = 'FileUploadError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination parameters for message queries
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * WebSocket event types
 */
export enum WebSocketEvent {
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_SENT = 'message:sent',
  MESSAGE_READ = 'message:read',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  THREAD_UPDATED = 'thread:updated',
  CONNECTION_ERROR = 'connection:error',
  RECONNECTING = 'reconnecting',
  RECONNECTED = 'reconnected'
}

/**
 * WebSocket message payload
 */
export interface WebSocketMessage<T = unknown> {
  event: WebSocketEvent;
  data: T;
  timestamp: Date;
}

/**
 * Typing indicator data
 */
export interface TypingIndicator {
  threadId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

/**
 * User online status
 */
export interface UserStatus {
  userId: string;
  userType: UserType;
  isOnline: boolean;
  lastSeen?: Date;
}

// ============================================================================
// Audio and Voice Message Types
// ============================================================================

/**
 * Audio attachment metadata for voice messages
 * Extends the base Attachment interface with audio-specific properties
 * 
 * Requirements: 4.1, 4.9
 */
export interface AudioAttachment extends Attachment {
  fileType: 'audio/webm' | 'audio/mp3' | 'audio/ogg' | 'audio/mp4' | 'audio/mpeg';
  metadata: {
    duration: number; // Duration in seconds
    format: 'webm' | 'mp3' | 'ogg' | 'mp4';
    waveform?: number[]; // Array of amplitude values for visualization (max 100 samples)
    bitrate?: number; // Audio bitrate in kbps
  };
}

/**
 * Recording state for voice recorder component
 * Tracks the current state of the recording process
 * 
 * Requirements: 2.1, 2.3, 2.5, 2.6, 2.8
 */
export type RecordingState = 
  | 'idle'                    // Not recording, initial state
  | 'requesting-permission'   // Requesting microphone access
  | 'recording'               // Currently recording
  | 'paused'                  // Recording paused
  | 'preview'                 // Showing preview after recording stopped
  | 'uploading'               // Uploading audio file
  | 'error';                  // Error occurred

/**
 * Audio player state for voice message playback
 * Manages playback state and progress
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export interface AudioPlayerState {
  isPlaying: boolean;         // Whether audio is currently playing
  isLoading: boolean;         // Whether audio is loading
  currentTime: number;        // Current playback position in seconds
  duration: number;           // Total audio duration in seconds
  error: string | null;       // Error message if playback failed
  volume: number;             // Volume level (0-1)
  playbackRate: number;       // Playback speed (0.5, 1, 1.5, 2)
}

/**
 * Voice recorder configuration options
 * 
 * Requirements: 2.7, 4.3
 */
export interface VoiceRecorderConfig {
  maxDuration: number;        // Maximum recording duration in seconds (default: 300)
  maxFileSize: number;        // Maximum file size in bytes (default: 10MB)
  mimeType?: string;          // Preferred MIME type (auto-detected if not provided)
  audioBitsPerSecond?: number; // Audio bitrate (default: browser default)
  sampleRate?: number;        // Sample rate in Hz (default: browser default)
}

/**
 * Voice recording data
 * Contains the recorded audio and metadata
 * 
 * Requirements: 2.8, 4.1
 */
export interface VoiceRecording {
  audioBlob: Blob;            // The recorded audio data
  duration: number;           // Recording duration in seconds
  mimeType: string;           // Audio MIME type
  size: number;               // File size in bytes
  waveformData?: number[];    // Waveform visualization data
  timestamp: Date;            // When the recording was created
}

/**
 * Microphone permission state
 * 
 * Requirements: 5.3, 5.4, 5.5
 */
export type MicrophonePermissionState = 
  | 'prompt'      // Permission not yet requested
  | 'granted'     // Permission granted
  | 'denied'      // Permission denied
  | 'unavailable'; // Microphone not available

/**
 * Audio error types for voice recording and playback
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export enum AudioErrorType {
  PERMISSION_DENIED = 'permission_denied',
  NOT_FOUND = 'not_found',
  NOT_READABLE = 'not_readable',
  OVERCONSTRAINED = 'overconstrained',
  TYPE_ERROR = 'type_error',
  RECORDING_FAILED = 'recording_failed',
  UPLOAD_FAILED = 'upload_failed',
  PLAYBACK_FAILED = 'playback_failed',
  FILE_TOO_LARGE = 'file_too_large',
  INVALID_FORMAT = 'invalid_format',
  NETWORK_ERROR = 'network_error',
  UNSUPPORTED_BROWSER = 'unsupported_browser'
}

/**
 * Audio error with detailed information
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7
 */
export interface AudioError {
  type: AudioErrorType;
  message: string;
  title: string;
  action?: string;            // Suggested action (e.g., "Retry", "Learn How")
  details?: unknown;          // Additional error details for debugging
}

/**
 * Waveform visualization data
 * 
 * Requirements: 2.3, 3.5, 3.6
 */
export interface WaveformData {
  samples: number[];          // Array of amplitude values (0-1)
  sampleRate: number;         // Samples per second
  duration: number;           // Total duration in seconds
}

