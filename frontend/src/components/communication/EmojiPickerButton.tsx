/**
 * @fileoverview EmojiPickerButton Component
 * 
 * A button component that toggles the EmojiPicker and handles emoji insertion
 * into a text input field. Designed to be integrated with SharedMessageInput.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Features:
 * - Toggle emoji picker on click
 * - Insert emoji at cursor position
 * - Maintain cursor position after insertion
 * - Accessible button with ARIA labels
 * - Mobile-optimized touch target
 * 
 * Requirements satisfied:
 * - 1.1, 1.2, 1.3, 1.9: Emoji Picker Integration
 * - 7.1: Accessibility
 * - 10.1, 10.2: UI Consistency
 */

import React, { useState, useRef, useCallback } from 'react';
import { EmojiPicker } from './EmojiPicker';
import '../../styles/messaging-design-tokens.css';

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * EmojiPickerButton Component
 * 
 * Provides a button that opens the emoji picker and handles emoji selection.
 * 
 * @component
 * @param {EmojiPickerButtonProps} props - Component props
 * @returns {JSX.Element} Rendered EmojiPickerButton component
 * 
 * @example
 * ```tsx
 * <EmojiPickerButton
 *   onEmojiSelect={(emoji) => insertEmojiAtCursor(emoji)}
 *   disabled={false}
 * />
 * ```
 * 
 * @satisfies Requirements 1.1, 1.2, 1.3, 1.9, 7.1, 10.1, 10.2
 */
export const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({
  onEmojiSelect,
  disabled = false,
  className = '',
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * Toggle emoji picker
   */
  const handleButtonClick = useCallback(() => {
    setIsPickerOpen((prev) => !prev);
  }, []);

  /**
   * Handle emoji selection
   */
  const handleEmojiSelect = useCallback((emoji: string) => {
    onEmojiSelect(emoji);
    // Picker will close automatically on desktop, stays open on mobile
  }, [onEmojiSelect]);

  /**
   * Close picker
   */
  const handleClose = useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={disabled}
        className="flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation messaging-mobile-touch-target"
        type="button"
        title="Add emoji"
        aria-label={isPickerOpen ? 'Close emoji picker' : 'Open emoji picker'}
        aria-expanded={isPickerOpen}
        aria-haspopup="dialog"
        style={{
          color: 'var(--messaging-gray-500)',
          borderRadius: 'var(--messaging-radius-lg)',
          transition: 'all var(--messaging-transition-fast)',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
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
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      <EmojiPicker
        isOpen={isPickerOpen}
        onClose={handleClose}
        onEmojiSelect={handleEmojiSelect}
        anchorElement={buttonRef.current}
        position="auto"
      />
    </div>
  );
};

export default EmojiPickerButton;
