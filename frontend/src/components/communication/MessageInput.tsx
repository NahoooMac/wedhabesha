/**
 * @fileoverview MessageInput Component
 * 
 * Provides message composition interface with typing indicators and file upload capabilities.
 * Supports auto-resizing textarea, file validation, upload progress, error handling,
 * and keyboard shortcuts for optimal user experience.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-27
 * 
 * Features:
 * - Auto-resizing textarea
 * - Typing indicator emission (stops after 3s of inactivity)
 * - File upload with validation
 * - File type and size validation
 * - Upload progress indicator
 * - Multiple file selection
 * - File preview before sending
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Error handling and display
 * - Mobile-optimized touch targets
 * - Retry functionality for failed sends
 * 
 * Requirements satisfied:
 * - 2.2: Typing indicators
 * - 7.1: File upload support
 * - 12.1-12.5: Error handling and retry logic
 * - 9.1-9.5: Mobile optimization
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MessageType } from '../../types/messaging';
import { useMessagingErrorHandler } from '../../hooks/useMessagingErrorHandler';

/**
 * Props for the MessageInput component
 * 
 * @interface MessageInputProps
 * @property {string} threadId - ID of the conversation thread
 * @property {function} onSendMessage - Callback to send message
 * @property {function} [onTypingStart] - Optional callback when user starts typing
 * @property {function} [onTypingStop] - Optional callback when user stops typing
 * @property {boolean} [isTyping] - Whether the other user is typing
 * @property {string} [typingUserName] - Name of the typing user
 * @property {boolean} [disabled] - Whether input is disabled
 * @property {number} [maxFileSize] - Maximum file size in MB (default: 25)
 * @property {string[]} [allowedFileTypes] - Allowed file MIME types
 */
interface MessageInputProps {
  threadId: string;
  onSendMessage: (content: string, type: MessageType, files?: File[]) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  isTyping?: boolean;
  typingUserName?: string;
  disabled?: boolean;
  maxFileSize?: number; // in MB
  allowedFileTypes?: string[];
}

/**
 * MessageInput Component
 * 
 * Provides message composition interface with typing indicators and file upload capabilities.
 * Handles auto-resizing textarea, file validation, upload progress, error handling,
 * and keyboard shortcuts for optimal user experience across desktop and mobile devices.
 * 
 * @component
 * @param {MessageInputProps} props - Component props
 * @returns {JSX.Element} Rendered MessageInput component
 * 
 * @example
 * ```tsx
 * <MessageInput
 *   threadId="thread-123"
 *   onSendMessage={handleSendMessage}
 *   onTypingStart={() => console.log('User started typing')}
 *   onTypingStop={() => console.log('User stopped typing')}
 *   isTyping={false}
 *   typingUserName="John Doe"
 *   disabled={false}
 *   maxFileSize={25}
 *   allowedFileTypes={['image/jpeg', 'image/png', 'application/pdf']}
 * />
 * ```
 * 
 * @satisfies Requirements 2.2, 7.1, 9.1-9.5, 12.1-12.5
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  threadId,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  isTyping = false,
  typingUserName,
  disabled = false,
  maxFileSize = 25, // 25MB default
  allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
}) => {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [sendAttempts, setSendAttempts] = useState(0);
  
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
   * 
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - Input change event
   */
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  /**
   * Validate file before upload
   * Checks file type and size constraints
   * 
   * @param {File} file - File to validate
   * @returns {string | null} Error message if validation fails, null if valid
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
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event
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
   * 
   * @param {number} index - Index of file to remove
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

      await onSendMessage(messageContent, messageType, filesToSend.length > 0 ? filesToSend : undefined);

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
   * 
   * @param {React.KeyboardEvent<HTMLTextAreaElement>} e - Keyboard event
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
    <div className="border-t border-gray-200 bg-white p-3 sm:p-4">
      {/* Typing indicator */}
      {isTyping && typingUserName && (
        <div className="mb-2 text-sm text-gray-500 italic">
          {typingUserName} is typing...
        </div>
      )}

      {/* Error message with retry button */}
      {error && (
        <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm text-red-600 font-medium">Message Failed</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
            {(error.includes('retry') || error.includes('network')) && (
              <button
                onClick={handleSend}
                disabled={isUploading}
                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => setError(null)}
              className="p-1 text-red-400 hover:text-red-600 transition-colors"
              title="Dismiss"
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
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
            >
              {file.type.startsWith('image/') ? (
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-gray-600"
                type="button"
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
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          type="button"
          title="Attach file"
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
          placeholder="Type a message..."
          disabled={disabled || isUploading}
          className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 sm:px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed max-h-32 text-base touch-manipulation"
          rows={1}
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck="true"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && selectedFiles.length === 0) || disabled || isUploading}
          className="flex-shrink-0 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          type="button"
          title="Send message"
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
      <p className="text-xs text-gray-400 mt-2 hidden sm:block">
        Press Enter to send, Shift+Enter for new line. Max file size: {maxFileSize}MB
      </p>
      <p className="text-xs text-gray-400 mt-2 sm:hidden">
        Max file size: {maxFileSize}MB
      </p>
    </div>
  );
};

export default MessageInput;
