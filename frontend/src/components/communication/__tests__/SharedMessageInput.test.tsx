/**
 * @fileoverview SharedMessageInput Component Tests
 * 
 * Tests for the SharedMessageInput component including emoji integration,
 * file upload, typing indicators, and error handling.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SharedMessageInput } from '../SharedMessageInput';
import { MessageType } from '../../../types/messaging';

// Mock the EmojiPickerButton component
jest.mock('../EmojiPickerButton', () => ({
  EmojiPickerButton: ({ onEmojiSelect, disabled }: { onEmojiSelect: (emoji: string) => void; disabled?: boolean }) => (
    <button
      data-testid="emoji-picker-button"
      onClick={() => onEmojiSelect('😀')}
      disabled={disabled}
    >
      😀
    </button>
  ),
}));

// Mock the messaging error handler
jest.mock('../../../hooks/useMessagingErrorHandler', () => ({
  useMessagingErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

describe('SharedMessageInput', () => {
  const defaultProps = {
    threadId: 'test-thread-123',
    onSendMessage: jest.fn(),
    onTypingStart: jest.fn(),
    onTypingStop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<SharedMessageInput {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
      expect(screen.getByTitle('Attach file')).toBeInTheDocument();
      expect(screen.getByTestId('emoji-picker-button')).toBeInTheDocument();
      expect(screen.getByTitle('Send message')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<SharedMessageInput {...defaultProps} placeholder="Custom placeholder" />);
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('renders disabled state correctly', () => {
      render(<SharedMessageInput {...defaultProps} disabled />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByTitle('Send message');
      const fileButton = screen.getByTitle('Attach file');
      const emojiButton = screen.getByTestId('emoji-picker-button');
      
      expect(textarea).toBeDisabled();
      expect(sendButton).toBeDisabled();
      expect(fileButton).toBeDisabled();
      expect(emojiButton).toBeDisabled();
    });
  });

  describe('Message Input', () => {
    it('updates message state when typing', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SharedMessageInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello world');
      
      expect(textarea).toHaveValue('Hello world');
    });

    it('triggers typing indicators', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onTypingStart = jest.fn();
      const onTypingStop = jest.fn();
      
      render(
        <SharedMessageInput
          {...defaultProps}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
        />
      );
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');
      
      expect(onTypingStart).toHaveBeenCalledTimes(1);
      
      // Fast-forward time to trigger typing stop
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      expect(onTypingStop).toHaveBeenCalledTimes(1);
    });

    it('auto-resizes textarea', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SharedMessageInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const initialHeight = textarea.style.height;
      
      await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4');
      
      // Height should have changed (auto-resize)
      expect(textarea.style.height).not.toBe(initialHeight);
    });
  });

  describe('Emoji Integration', () => {
    it('renders emoji picker button', () => {
      render(<SharedMessageInput {...defaultProps} />);
      
      expect(screen.getByTestId('emoji-picker-button')).toBeInTheDocument();
    });

    it('inserts emoji at cursor position', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SharedMessageInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const emojiButton = screen.getByTestId('emoji-picker-button');
      
      // Type some text
      await user.type(textarea, 'Hello world');
      
      // Move cursor to middle of text
      textarea.setSelectionRange(5, 5); // After "Hello"
      fireEvent.select(textarea);
      
      // Click emoji button to insert emoji
      await user.click(emojiButton);
      
      expect(textarea.value).toBe('Hello😀 world');
    });

    it('inserts emoji at beginning when textarea is empty', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SharedMessageInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const emojiButton = screen.getByTestId('emoji-picker-button');
      
      await user.click(emojiButton);
      
      expect(textarea.value).toBe('😀');
    });

    it('maintains cursor position after emoji insertion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SharedMessageInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const emojiButton = screen.getByTestId('emoji-picker-button');
      
      await user.type(textarea, 'Hello');
      
      // Insert emoji
      await user.click(emojiButton);
      
      // Continue typing
      await user.type(textarea, ' world');
      
      expect(textarea.value).toBe('Hello😀 world');
    });

    it('triggers typing indicator when emoji is inserted', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onTypingStart = jest.fn();
      
      render(
        <SharedMessageInput
          {...defaultProps}
          onTypingStart={onTypingStart}
        />
      );
      
      const emojiButton = screen.getByTestId('emoji-picker-button');
      await user.click(emojiButton);
      
      expect(onTypingStart).toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    it('sends text message on button click', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn().mockResolvedValue(undefined);
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByTitle('Send message');
      
      await user.type(textarea, 'Hello world');
      await user.click(sendButton);
      
      expect(onSendMessage).toHaveBeenCalledWith('Hello world', MessageType.TEXT, undefined);
    });

    it('sends message with emoji', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn().mockResolvedValue(undefined);
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const emojiButton = screen.getByTestId('emoji-picker-button');
      const sendButton = screen.getByTitle('Send message');
      
      await user.type(textarea, 'Hello ');
      await user.click(emojiButton);
      await user.click(sendButton);
      
      expect(onSendMessage).toHaveBeenCalledWith('Hello 😀', MessageType.TEXT, undefined);
    });

    it('sends message on Enter key (desktop)', async () => {
      // Mock desktop environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        configurable: true,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn().mockResolvedValue(undefined);
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      
      await user.type(textarea, 'Hello world');
      await user.keyboard('{Enter}');
      
      expect(onSendMessage).toHaveBeenCalledWith('Hello world', MessageType.TEXT, undefined);
    });

    it('creates new line on Shift+Enter', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn();
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      
      await user.type(textarea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textarea, 'Line 2');
      
      expect(textarea.value).toBe('Line 1\nLine 2');
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('clears input after successful send', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn().mockResolvedValue(undefined);
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByTitle('Send message');
      
      await user.type(textarea, 'Hello world');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('disables send button when message is empty', () => {
      render(<SharedMessageInput {...defaultProps} />);
      
      const sendButton = screen.getByTitle('Send message');
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when message has content', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SharedMessageInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByTitle('Send message');
      
      await user.type(textarea, 'Hello');
      
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('File Upload', () => {
    it('renders file upload button', () => {
      render(<SharedMessageInput {...defaultProps} />);
      
      expect(screen.getByTitle('Attach file')).toBeInTheDocument();
    });

    it('opens file dialog when file button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SharedMessageInput {...defaultProps} />);
      
      const fileButton = screen.getByTitle('Attach file');
      const fileInput = screen.getByRole('textbox').parentElement?.querySelector('input[type="file"]');
      
      const clickSpy = jest.spyOn(fileInput as HTMLInputElement, 'click');
      
      await user.click(fileButton);
      
      expect(clickSpy).toHaveBeenCalled();
    });

    it('enables send button when files are selected', async () => {
      render(<SharedMessageInput {...defaultProps} />);
      
      const fileInput = screen.getByRole('textbox').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      const sendButton = screen.getByTitle('Send message');
      
      // Mock file selection
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });
      
      fireEvent.change(fileInput);
      
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when send fails', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn().mockRejectedValue(new Error('Network error'));
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByTitle('Send message');
      
      await user.type(textarea, 'Hello world');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Message Failed')).toBeInTheDocument();
      });
    });

    it('shows retry button for network errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn().mockRejectedValue(new Error('network error'));
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByTitle('Send message');
      
      await user.type(textarea, 'Hello world');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('can dismiss error message', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn().mockRejectedValue(new Error('Test error'));
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByTitle('Send message');
      
      await user.type(textarea, 'Hello world');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Message Failed')).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByTitle('Dismiss');
      await user.click(dismissButton);
      
      expect(screen.queryByText('Message Failed')).not.toBeInTheDocument();
    });
  });

  describe('Typing Indicator', () => {
    it('displays typing indicator when someone else is typing', () => {
      render(
        <SharedMessageInput
          {...defaultProps}
          isTyping={true}
          typingUserName="John Doe"
        />
      );
      
      expect(screen.getByText('John Doe is typing...')).toBeInTheDocument();
    });

    it('does not display typing indicator when no one is typing', () => {
      render(<SharedMessageInput {...defaultProps} isTyping={false} />);
      
      expect(screen.queryByText(/is typing/)).not.toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('shows mobile-specific helper text on small screens', () => {
      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true,
      });
      
      render(<SharedMessageInput {...defaultProps} />);
      
      expect(screen.getByText(/Max file size: 25MB/)).toBeInTheDocument();
    });

    it('handles Enter key differently on mobile', async () => {
      // Mock mobile environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        configurable: true,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSendMessage = jest.fn();
      
      render(<SharedMessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');
      
      // On mobile, Enter should create new line, not send
      expect(onSendMessage).not.toHaveBeenCalled();
      expect(textarea.value).toBe('Hello\n');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SharedMessageInput {...defaultProps} />);
      
      const fileButton = screen.getByTitle('Attach file');
      const sendButton = screen.getByTitle('Send message');
      
      expect(fileButton).toHaveAttribute('title', 'Attach file');
      expect(sendButton).toHaveAttribute('title', 'Send message');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SharedMessageInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type a message...');
      
      // Tab to textarea
      await user.tab();
      expect(textarea).toHaveFocus();
      
      // Type message
      await user.type(textarea, 'Hello world');
      
      // Tab to send button
      await user.tab();
      await user.tab(); // Skip file and emoji buttons
      await user.tab();
      
      const sendButton = screen.getByTitle('Send message');
      expect(sendButton).toHaveFocus();
    });
  });
});