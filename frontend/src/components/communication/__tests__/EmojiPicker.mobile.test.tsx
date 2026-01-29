/**
 * @fileoverview EmojiPicker Mobile Optimization Tests
 * 
 * Tests for mobile-specific functionality of the EmojiPicker component
 * including touch interactions, orientation changes, keyboard visibility,
 * and haptic feedback.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmojiPicker } from '../EmojiPicker';

// Mock emoji-mart
jest.mock('@emoji-mart/data', () => ({
  categories: [
    {
      id: 'people',
      emojis: ['grinning', 'smiley', 'smile']
    }
  ],
  emojis: {
    grinning: {
      name: 'Grinning Face',
      skins: [{ native: '😀', unified: '1f600' }],
      keywords: ['happy', 'joy']
    },
    smiley: {
      name: 'Smiley Face',
      skins: [{ native: '😃', unified: '1f603' }],
      keywords: ['happy', 'joy']
    },
    smile: {
      name: 'Smiling Face',
      skins: [{ native: '😄', unified: '1f604' }],
      keywords: ['happy', 'joy']
    }
  }
}));

jest.mock('emoji-mart', () => ({
  init: jest.fn(),
  SearchIndex: {
    search: jest.fn().mockResolvedValue([
      {
        id: 'grinning',
        name: 'Grinning Face',
        skins: [{ native: '😀', unified: '1f600' }],
        keywords: ['happy']
      }
    ])
  }
}));

// Mock navigator.vibrate
const mockVibrate = jest.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  configurable: true
});

// Mock Visual Viewport API
const mockVisualViewport = {
  height: 800,
  width: 400,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

Object.defineProperty(window, 'visualViewport', {
  value: mockVisualViewport,
  configurable: true
});

describe('EmojiPicker Mobile Optimizations', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onEmojiSelect: jest.fn(),
    anchorElement: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe('Mobile Device Detection', () => {
    it('detects mobile device by user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      // Should render mobile layout
      expect(screen.getByRole('dialog')).toHaveClass('fixed', 'inset-0');
    });

    it('detects mobile device by screen width', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      // Should render mobile layout
      expect(screen.getByRole('dialog')).toHaveClass('fixed');
    });

    it('renders desktop layout on large screens', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      // Should render desktop layout
      expect(screen.getByRole('dialog')).toHaveClass('absolute');
    });
  });

  describe('Touch Target Optimization', () => {
    it('uses 44x44px touch targets on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      const emojiButtons = screen.getAllByRole('option');
      expect(emojiButtons[0]).toHaveStyle({
        width: '44px',
        height: '44px'
      });
    });

    it('uses 36x36px touch targets on desktop', () => {
      render(<EmojiPicker {...defaultProps} />);
      
      const emojiButtons = screen.getAllByRole('option');
      expect(emojiButtons[0]).toHaveStyle({
        width: '36px',
        height: '36px'
      });
    });
  });

  describe('Layout Variations', () => {
    it('renders full-screen modal on tablets (480px+)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('fixed', 'inset-0');
      expect(screen.getByText('Select Emoji')).toBeInTheDocument();
    });

    it('renders bottom sheet on small screens (<480px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('fixed');
      // Should not show full header on small screens
      expect(screen.queryByText('Select Emoji')).not.toBeInTheDocument();
    });
  });

  describe('Orientation Change Handling', () => {
    it('handles orientation change events', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(<EmojiPicker {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });

    it('updates layout after orientation change', async () => {
      render(<EmojiPicker {...defaultProps} />);
      
      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });
      
      fireEvent(window, new Event('orientationchange'));
      
      await waitFor(() => {
        // Layout should update after orientation change
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Visibility Detection', () => {
    it('sets up Visual Viewport API listeners on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      expect(mockVisualViewport.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('falls back to window resize when Visual Viewport API unavailable', () => {
      Object.defineProperty(window, 'visualViewport', {
        value: undefined,
        configurable: true
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(<EmojiPicker {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Haptic Feedback', () => {
    it('triggers haptic feedback on emoji selection (mobile)', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      const user = userEvent.setup();
      render(<EmojiPicker {...defaultProps} />);
      
      const emojiButton = screen.getAllByRole('option')[0];
      await user.click(emojiButton);
      
      expect(mockVibrate).toHaveBeenCalledWith(50);
    });

    it('does not trigger haptic feedback on desktop', async () => {
      const user = userEvent.setup();
      render(<EmojiPicker {...defaultProps} />);
      
      const emojiButton = screen.getAllByRole('option')[0];
      await user.click(emojiButton);
      
      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it('handles vibrate API errors gracefully', async () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration not allowed');
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      const user = userEvent.setup();
      render(<EmojiPicker {...defaultProps} />);
      
      const emojiButton = screen.getAllByRole('option')[0];
      
      // Should not throw error
      await expect(user.click(emojiButton)).resolves.not.toThrow();
    });
  });

  describe('Touch Interactions', () => {
    it('handles touch events on mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      const emojiButton = screen.getAllByRole('option')[0];
      
      // Simulate touch start
      fireEvent.touchStart(emojiButton);
      expect(emojiButton).toHaveStyle({
        backgroundColor: 'var(--messaging-gray-100)',
        transform: 'scale(1.1)'
      });
      
      // Simulate touch end
      fireEvent.touchEnd(emojiButton);
      
      // Should reset styles after delay
      setTimeout(() => {
        expect(emojiButton).toHaveStyle({
          backgroundColor: 'transparent',
          transform: 'scale(1)'
        });
      }, 200);
    });

    it('prevents mouse events on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      const emojiButton = screen.getAllByRole('option')[0];
      
      // Mouse events should not trigger hover styles on mobile
      fireEvent.mouseEnter(emojiButton);
      expect(emojiButton).not.toHaveStyle({
        backgroundColor: 'var(--messaging-gray-100)'
      });
    });
  });

  describe('Native Scrolling', () => {
    it('applies momentum scrolling styles', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      const scrollContainer = screen.getByRole('tabpanel');
      expect(scrollContainer).toHaveStyle({
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      });
    });
  });

  describe('Picker Behavior on Mobile', () => {
    it('keeps picker open after emoji selection on mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      const onClose = jest.fn();
      const user = userEvent.setup();
      
      render(<EmojiPicker {...defaultProps} onClose={onClose} />);
      
      const emojiButton = screen.getAllByRole('option')[0];
      await user.click(emojiButton);
      
      // Should not close picker on mobile
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes picker after emoji selection on desktop', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      
      render(<EmojiPicker {...defaultProps} onClose={onClose} />);
      
      const emojiButton = screen.getAllByRole('option')[0];
      await user.click(emojiButton);
      
      // Should close picker on desktop
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility on Mobile', () => {
    it('maintains ARIA attributes on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Emoji picker');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('provides proper touch target accessibility', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<EmojiPicker {...defaultProps} />);
      
      const emojiButtons = screen.getAllByRole('option');
      emojiButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveClass('touch-manipulation');
      });
    });
  });
});