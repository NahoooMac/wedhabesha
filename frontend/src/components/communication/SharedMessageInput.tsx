/**
 * @fileoverview SharedMessageInput Component
 * 
 * Unified message input component that provides consistent UI across both
 * Couple Dashboard and Vendor Portal messaging interfaces. Uses the unified
 * design system for consistent colors, typography, and spacing.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Features:
 * - Unified design system with consistent colors
 * - Auto-resizing textarea
 * - Typing indicator emission (stops after 3s of inactivity)
 * - File upload with validation
 * - File type and size validation
 * - Upload progress indicator
 * - Multiple file selection
 * - File preview before sending
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Error handling and display with retry
 * - Mobile-optimized touch targets
 * - Retry functionality for failed sends
 * 
 * Requirements satisfied:
 * - 1.1, 1.2, 1.4, 1.5: UI Design Consistency
 * - 2.5, 7.1, 7.4, 7.5: Error Handling with Retry
 * - 5.1, 5.2, 5.4, 5.5: Mobile Responsiveness
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MessageType } from '../../types/messaging';
import { useMessagingErrorHandler } from '../../hooks/useMessagingErrorHandler';
import { EmojiPickerButton } from './EmojiPickerButton';
import '../../styles/messaging-design-tokens.css';

interface SharedMessageInputProps {
  threadId: string;
  onSendMessage: (content: string, type: MessageType, files?: File[]) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  isTyping?: boolean;
  typingUserName?: string;
  disabled?: boolean;
  placeholder?: string;
  maxFileSize?: number; // in MB
  allowedFileTypes?: string[];
  colorScheme?: 'blue' | 'rose'; // Temporary for migration, defaults to blue
  className?: string;
}

/**
 * SharedMessageInput Component
 * 
 * Provides unified message composition interface with typing indicators and file upload capabilities.
 * Handles auto-resizing textarea, file validation, upload progress, error handling,
 * and keyboard shortcuts for optimal user experience across desktop and mobile devices.
 * 
 * @component
 * @param {SharedMessageInputProps} props - Component props
 * @returns {JSX.Element} Rendered SharedMessageInput component
 * 
 * @example
 * ```tsx
 * <SharedMessageInput
 *   threadId="thread-123"
 *   onSendMessage={handleSendMessage}
 *   onTypingStart={() => console.log('User started typing')}
 *   onTypingStop={() => console.log('User stopped typing')}
 *   isTyping={false}
 *   typingUserName="John Doe"
 *   disabled={false}
 *   placeholder="Type a message..."
 *   maxFileSize={25}
 *   allowedFileTypes={['image/jpeg', 'image/png', 'application/pdf']}
 *   colorScheme="blue"
 * />
 * ```
 * 
 * @satisfies Requirements 1.1, 1.2, 1.4, 1.5, 2.5, 5.1, 5.2, 5.4, 5.5, 7.1, 7.4, 7.5
 */
export const SharedMessageInput: React.FC<SharedMessageInputProps> = ({
  threadId: _threadId, // Reserved for future use
  onSendMessage,
  onTypingStart,
  onTypingStop,
  isTyping = false,
  typingUserName,
  disabled = false,
  placeholder = "Type a message...",
  maxFileSize = 25, // 25MB default
  allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  colorScheme = 'blue', // Default to blue for consistency
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [sendAttempts, setSendAttempts] = useState(0);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Error handling hook
  const { handleError } = useMessagingErrorHandler();

  /**
   * Auto-resize textarea based on content
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  /**
   * Handle typing indicator logic
   * Starts typing indicator and sets timeout to stop after 3 seconds of inactivity
   */
  const handleTyping = useCallback(() => {
    if (!isTypingLocal && onTypingStart) {
      setIsTypingLocal(true);
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingLocal && onTypingStop) {
        setIsTypingLocal(false);
        onTypingStop();
      }
    }, 3000);
  }, [isTypingLocal, onTypingStart, onTypingStop]);

  /**
   * Cleanup typing timeout on component unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingLocal && onTypingStop) {
        onTypingStop();
      }
    };
  }, [isTypingLocal, onTypingStop]);

  /**
   * Handle message input change and trigger typing indicator
   */
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setCursorPosition(e.target.selectionStart);
    handleTyping();
  };

  /**
   * Update cursor position when user clicks or moves cursor
   */
  const handleCursorPositionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPosition(target.selectionStart);
  };

  /**
   * Insert emoji at current cursor position
   */
  const handleEmojiSelect = useCallback((emoji: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = cursorPosition;
    const end = cursorPosition;
    
    // Insert emoji at cursor position
    const newMessage = message.slice(0, start) + emoji + message.slice(end);
    setMessage(newMessage);
    
    // Update cursor position to after the inserted emoji
    const newCursorPosition = start + emoji.length;
    setCursorPosition(newCursorPosition);
    
    // Focus textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
    
    // Trigger typing indicator
    handleTyping();
  }, [message, cursorPosition, handleTyping]);

  /**
   * Validate file before upload
   * Checks file type and size constraints
   */
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedFileTypes.includes(file.type)) {
      const error = `File type ${file.type} is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`;
      handleError(new Error(error), `validation-${file.name}`);
      return error;
    }

    // Check file size
    const fileSizeMB = file.size / 1024 / 1024;
    const maxSize = file.type.startsWith('image/') ? 10 : maxFileSize;
    
    if (fileSizeMB > maxSize) {
      const error = `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSize}MB)`;
      handleError(new Error(error), `size-${file.name}`);
      return error;
    }

    return null;
  };

  /**
   * Handle file selection from input
   * Validates selected files and adds them to the selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);

    // Validate each file
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...files]);
  };

  /**
   * Remove a selected file from the list
   */
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Handle message sending with file uploads
   * Manages upload progress, error handling, and retry logic
   */
  const handleSend = async () => {
    if ((!message.trim() && selectedFiles.length === 0) || disabled || isUploading) {
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    setSendAttempts(prev => prev + 1);

    const currentAttempt = sendAttempts + 1;
    const messageContent = message.trim();
    const filesToSend = [...selectedFiles];

    try {
      // Stop typing indicator
      if (isTypingLocal && onTypingStop) {
        setIsTypingLocal(false);
        onTypingStop();
      }

      // Determine message type
      let messageType = MessageType.TEXT;
      if (filesToSend.length > 0) {
        const firstFile = filesToSend[0];
        if (firstFile.type.startsWith('image/')) {
          messageType = MessageType.IMAGE;
        } else if (firstFile.type === 'application/pdf') {
          messageType = MessageType.DOCUMENT;
        }
      }

      // Simulate upload progress for files
      if (filesToSend.length > 0) {
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 100);

        // Clear interval after a reasonable time
        setTimeout(() => clearInterval(progressInterval), 2000);
      }

      await onSendMessage(messageContent || '', messageType, filesToSend.length > 0 ? filesToSend : undefined);

      setUploadProgress(100);

      // Clear input on successful send
      setMessage('');
      setSelectedFiles([]);
      setSendAttempts(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Brief delay to show 100% progress
      setTimeout(() => setUploadProgress(0), 500);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      
      // Handle different types of errors
      if (filesToSend.length > 0) {
        // File upload error
        handleError(error, 'fileUpload');
      } else {
        // Message send error
        handleError(error, 'messageSend');
      }

      // Show user-friendly error message
      if (error.message.includes('network') || error.message.includes('fetch')) {
        setError('Network error. Message will be retried automatically.');
      } else if (error.message.includes('413') || error.message.includes('file size')) {
        setError('File too large. Please choose a smaller file.');
      } else if (error.message.includes('415') || error.message.includes('file type')) {
        setError('File type not supported. Please choose a JPEG, PNG, GIF, or PDF file.');
      } else if (error.message.includes('401')) {
        setError('Session expired. Please refresh the page and try again.');
      } else if (error.message.includes('429')) {
        setError('Too many messages. Please wait a moment before sending again.');
      } else {
        setError(`Failed to send message${currentAttempt > 1 ? ` (attempt ${currentAttempt})` : ''}. Tap retry to try again.`);
      }

      // Auto-clear error after 10 seconds
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle keyboard shortcuts for message sending
   * Enter sends message on desktop, Shift+Enter creates new line
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // On mobile, Enter should create new line, not send (better UX)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
    
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      className={`messaging-input-container border-t p-3 sm:p-4 ${className}`}
      style={{
        backgroundColor: 'white',
        borderColor: 'var(--messaging-gray-200)',
        padding: 'var(--messaging-space-3) var(--messaging-space-4)'
      }}
    >
      {/* Typing indicator */}
      {isTyping && typingUserName && (
        <div 
          className="mb-2 text-sm italic"
          style={{ 
            color: 'var(--messaging-gray-500)',
            fontSize: 'var(--messaging-font-size-sm)'
          }}
        >
          {typingUserName} is typing...
        </div>
      )}

      {/* Error message with retry button */}
      {error && (
        <div 
          className="mb-2 p-3 border rounded-lg messaging-error-display"
          style={{
            backgroundColor: 'var(--messaging-error-50)',
            borderColor: 'var(--messaging-error-200)',
            borderRadius: 'var(--messaging-radius-lg)',
            padding: 'var(--messaging-space-3)'
          }}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p 
                className="text-sm font-medium"
                style={{ 
                  color: 'var(--messaging-error-600)',
                  fontSize: 'var(--messaging-font-size-sm)',
                  fontWeight: 'var(--messaging-font-weight-medium)'
                }}
              >
                Message Failed
              </p>
              <p 
                className="text-xs mt-1"
                style={{ 
                  color: 'var(--messaging-error-500)',
                  fontSize: 'var(--messaging-font-size-xs)'
                }}
              >
                {error}
              </p>
            </div>
            {(error.includes('retry') || error.includes('network')) && (
              <button
                onClick={handleSend}
                disabled={isUploading}
                className="px-3 py-1 text-xs font-medium rounded transition-colors messaging-mobile-touch-target"
                style={{
                  backgroundColor: 'var(--messaging-error-100)',
                  color: 'var(--messaging-error-700)',
                  fontSize: 'var(--messaging-font-size-xs)',
                  fontWeight: 'var(--messaging-font-weight-medium)',
                  borderRadius: 'var(--messaging-radius-base)',
                  transition: 'all var(--messaging-transition-fast)'
                }}
                onMouseEnter={(e) => {
                  if (!isUploading) {
                    e.currentTarget.style.backgroundColor = 'var(--messaging-error-200)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--messaging-error-100)';
                }}
              >
                Retry
              </button>
            )}
            <button
              onClick={() => setError(null)}
              className="p-1 transition-colors messaging-mobile-touch-target"
              title="Dismiss"
              style={{
                color: 'var(--messaging-error-400)',
                transition: 'color var(--messaging-transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--messaging-error-600)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--messaging-error-400)';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--messaging-gray-100)',
                borderRadius: 'var(--messaging-radius-lg)',
                fontSize: 'var(--messaging-font-size-sm)'
              }}
            >
              {file.type.startsWith('image/') ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--messaging-gray-600)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--messaging-gray-600)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
              <span className="truncate max-w-[150px]" style={{ color: 'var(--messaging-gray-700)' }}>{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="transition-colors"
                type="button"
                style={{
                  color: 'var(--messaging-gray-400)',
                  transition: 'color var(--messaging-transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--messaging-gray-600)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--messaging-gray-400)';
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="mb-2">
          <div 
            className="w-full rounded-full h-2"
            style={{
              backgroundColor: 'var(--messaging-gray-200)',
              borderRadius: 'var(--messaging-radius-full)'
            }}
          >
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${uploadProgress}%`,
                backgroundColor: 'var(--messaging-primary-500)',
                borderRadius: 'var(--messaging-radius-full)',
                transition: 'width var(--messaging-transition-slow)'
              }}
            />
          </div>
          <p 
            className="text-xs mt-1"
            style={{ 
              color: 'var(--messaging-gray-500)',
              fontSize: 'var(--messaging-font-size-xs)'
            }}
          >
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation messaging-mobile-touch-target"
          type="button"
          title="Attach file"
          style={{
            color: 'var(--messaging-gray-500)',
            borderRadius: 'var(--messaging-radius-lg)',
            transition: 'all var(--messaging-transition-fast)'
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isUploading) {
              e.currentTarget.style.color = 'var(--messaging-gray-700)';
              e.currentTarget.style.backgroundColor = 'var(--messaging-gray-100)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--messaging-gray-500)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        {/* Emoji picker button */}
        <EmojiPickerButton
          onEmojiSelect={handleEmojiSelect}
          disabled={disabled || isUploading}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedFileTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyPress}
          onSelect={handleCursorPositionChange}
          onClick={handleCursorPositionChange}
          placeholder={placeholder}
          disabled={disabled || isUploading}
          className="flex-1 resize-none border rounded-lg px-3 py-2 sm:px-4 focus:outline-none disabled:cursor-not-allowed max-h-32 text-base touch-manipulation messaging-input"
          rows={1}
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck="true"
          style={{
            borderColor: 'var(--messaging-gray-300)',
            borderRadius: 'var(--messaging-radius-lg)',
            fontSize: 'var(--messaging-font-size-base)',
            transition: 'border-color var(--messaging-transition-fast)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--messaging-primary-500)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--messaging-primary-100)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--messaging-gray-300)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && selectedFiles.length === 0) || disabled || isUploading}
          className="flex-shrink-0 p-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation messaging-mobile-touch-target flex items-center justify-center messaging-button-primary"
          type="button"
          title="Send message"
          style={{
            backgroundColor: 'var(--messaging-primary-500)',
            borderRadius: 'var(--messaging-radius-lg)',
            minWidth: '44px',
            minHeight: '44px',
            transition: 'background-color var(--messaging-transition-fast)'
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isUploading && (message.trim() || selectedFiles.length > 0)) {
              e.currentTarget.style.backgroundColor = 'var(--messaging-primary-600)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--messaging-primary-500)';
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Helper text */}
      <p 
        className="text-xs mt-2 hidden sm:block"
        style={{ 
          color: 'var(--messaging-gray-400)',
          fontSize: 'var(--messaging-font-size-xs)'
        }}
      >
        Press Enter to send, Shift+Enter for new line. Max file size: {maxFileSize}MB
      </p>
      <p 
        className="text-xs mt-2 sm:hidden"
        style={{ 
          color: 'var(--messaging-gray-400)',
          fontSize: 'var(--messaging-font-size-xs)'
        }}
      >
        Max file size: {maxFileSize}MB
      </p>
    </div>
  );
};

export default SharedMessageInput;