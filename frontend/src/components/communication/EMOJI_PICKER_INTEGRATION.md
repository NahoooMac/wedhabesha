# EmojiPicker Integration Guide

## Overview

The EmojiPicker component provides a comprehensive emoji selection interface with search, categories, keyboard navigation, and recent emoji tracking. This guide explains how to integrate it with the SharedMessageInput component.

## Components

### 1. EmojiPicker

The main emoji picker component with full functionality.

**Features:**
- Categorized emoji display (Smileys, Animals, Food, Activities, Travel, Objects, Symbols, Flags)
- Real-time search with debouncing (100ms)
- Recent emojis tracking (localStorage, max 30)
- Keyboard navigation (Tab, Arrow keys, Enter, Escape)
- Automatic positioning (above/below input based on space)
- ARIA labels and screen reader support
- Mobile-optimized with touch support

### 2. EmojiPickerButton

A button component that toggles the EmojiPicker.

**Features:**
- Toggle emoji picker on click
- Accessible button with ARIA labels
- Mobile-optimized touch target
- Consistent styling with messaging design system

## Integration with SharedMessageInput

### Step 1: Import Components

```tsx
import { EmojiPickerButton } from './EmojiPickerButton';
```

### Step 2: Add State for Cursor Position

```tsx
const [cursorPosition, setCursorPosition] = useState<number>(0);
const textareaRef = useRef<HTMLTextAreaElement>(null);
```

### Step 3: Track Cursor Position

```tsx
const handleTextareaClick = useCallback(() => {
  if (textareaRef.current) {
    setCursorPosition(textareaRef.current.selectionStart);
  }
}, []);

const handleTextareaKeyUp = useCallback(() => {
  if (textareaRef.current) {
    setCursorPosition(textareaRef.current.selectionStart);
  }
}, []);
```

### Step 4: Implement Emoji Insertion

```tsx
const insertEmojiAtCursor = useCallback((emoji: string) => {
  if (!textareaRef.current) return;

  const textarea = textareaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  // Insert emoji at cursor position
  const before = text.substring(0, start);
  const after = text.substring(end);
  const newText = before + emoji + after;

  // Update message state
  setMessage(newText);

  // Set cursor position after emoji
  const newCursorPos = start + emoji.length;
  
  // Use setTimeout to ensure state update completes
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    setCursorPosition(newCursorPos);
  }, 0);
}, []);
```

### Step 5: Add EmojiPickerButton to Input Area

```tsx
<div className="flex items-end gap-2">
  {/* File upload button */}
  <button onClick={() => fileInputRef.current?.click()}>
    {/* ... */}
  </button>

  {/* Emoji picker button */}
  <EmojiPickerButton
    onEmojiSelect={insertEmojiAtCursor}
    disabled={disabled || isUploading}
  />

  {/* Text input */}
  <textarea
    ref={textareaRef}
    value={message}
    onChange={handleMessageChange}
    onClick={handleTextareaClick}
    onKeyUp={handleTextareaKeyUp}
    {/* ... */}
  />

  {/* Send button */}
  <button onClick={handleSend}>
    {/* ... */}
  </button>
</div>
```

## Complete Integration Example

```tsx
import React, { useState, useRef, useCallback } from 'react';
import { EmojiPickerButton } from './EmojiPickerButton';

export const SharedMessageInput: React.FC<Props> = ({
  onSendMessage,
  // ... other props
}) => {
  const [message, setMessage] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Track cursor position on click
   */
  const handleTextareaClick = useCallback(() => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  }, []);

  /**
   * Track cursor position on keyboard navigation
   */
  const handleTextareaKeyUp = useCallback(() => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  }, []);

  /**
   * Insert emoji at current cursor position
   */
  const insertEmojiAtCursor = useCallback((emoji: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Insert emoji at cursor position
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + emoji + after;

    // Update message state
    setMessage(newText);

    // Set cursor position after emoji
    const newCursorPos = start + emoji.length;
    
    // Use setTimeout to ensure state update completes
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPosition(newCursorPos);
    }, 0);

    // Trigger typing indicator
    handleTyping();
  }, [handleTyping]);

  return (
    <div className="messaging-input-container">
      <div className="flex items-end gap-2">
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex-shrink-0 p-2 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Emoji picker button */}
        <EmojiPickerButton
          onEmojiSelect={insertEmojiAtCursor}
          disabled={disabled || isUploading}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleMessageChange}
          onClick={handleTextareaClick}
          onKeyUp={handleTextareaKeyUp}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || isUploading}
          className="flex-1 resize-none border rounded-lg px-3 py-2"
          rows={1}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isUploading}
          className="flex-shrink-0 p-2 text-white rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
};
```

## Keyboard Shortcuts

The EmojiPicker supports the following keyboard shortcuts:

- **Tab**: Navigate between search input, category tabs, and emoji grid
- **Arrow Keys**: Navigate within emoji grid
  - Right/Left: Move horizontally
  - Up/Down: Move vertically
- **Enter/Space**: Select focused emoji
- **Escape**: Close emoji picker
- **Home**: Jump to first emoji
- **End**: Jump to last emoji

## Mobile Optimization

The EmojiPicker automatically adapts to mobile devices:

- Full-screen modal on screens < 768px
- Bottom sheet layout on screens < 480px
- Larger touch targets (44x44px minimum)
- Native momentum scrolling
- Stays open after emoji selection for easier multiple selections

## Accessibility

The EmojiPicker is fully accessible:

- ARIA labels on all interactive elements
- Screen reader announcements for emoji selection
- Keyboard navigation support
- Focus management
- High contrast support

## Performance

The EmojiPicker is optimized for performance:

- Search debouncing (100ms)
- Lazy loading of emoji images
- Virtual scrolling for large emoji lists
- Efficient re-rendering with React.memo
- LocalStorage caching for recent emojis

## Testing

The EmojiPicker includes comprehensive tests:

- Unit tests for all functionality
- Property-based tests for cursor position and search performance
- Accessibility tests
- Mobile responsiveness tests

Run tests with:
```bash
npm test -- EmojiPicker
```

## Troubleshooting

### Emoji not inserting at correct position

Make sure you're tracking cursor position correctly:
```tsx
const handleTextareaClick = useCallback(() => {
  if (textareaRef.current) {
    setCursorPosition(textareaRef.current.selectionStart);
  }
}, []);
```

### Picker not closing on mobile

This is intentional behavior for better UX. Users can select multiple emojis without reopening the picker.

### Search not working

Ensure emoji-mart is properly initialized:
```tsx
import { init } from 'emoji-mart';
import data from '@emoji-mart/data';

init({ data });
```

### Recent emojis not persisting

Check localStorage permissions and quota. The component handles errors gracefully but won't persist if localStorage is unavailable.

## Requirements Satisfied

- **1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9**: Emoji Picker Integration
- **6.1, 6.2, 6.3, 6.4**: Mobile Responsiveness
- **7.1, 7.2, 7.5**: Accessibility
- **8.1, 8.2**: Performance
- **10.1, 10.2**: UI Consistency

## Next Steps

After integrating the EmojiPicker, consider:

1. Adding emoji reactions to messages
2. Implementing emoji autocomplete while typing
3. Adding custom emoji support
4. Implementing emoji skin tone selection
5. Adding animated emoji/GIFs
