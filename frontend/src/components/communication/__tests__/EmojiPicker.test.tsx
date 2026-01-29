/**
 * @fileoverview Unit Tests for EmojiPicker Component
 * 
 * Tests emoji selection, search functionality, keyboard navigation,
 * recent emoji tracking, and accessibility features.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmojiPicker } from '../EmojiPicker';

// Mock emoji-mart
vi.mock('emoji-mart', () => ({
  init: vi.fn(),
  SearchIndex: {
    search: vi.fn((query: string) => {
      // Mock search results
      if (query === 'smile') {
        return Promise.resolve([
          {
            id: 'grinning',
            name: 'Grinning Face',
            skins: [{ native: '😀', unified: '1F600' }],
            keywords: ['smile', 'happy'],
            shortcodes: ':grinning:',
          },
          {
            id: 'smile',
            name: 'Smiling Face',
            skins: [{ native: '😊', unified: '263A' }],
            keywords: ['smile', 'happy'],
            shortcodes: ':smile:',
          },
        ]);
      }
      return Promise.resolve([]);
    }),
  },
}));

vi.mock('@emoji-mart/data', () => ({
  default: {
    categories: [
      {
        id: 'people',
        emojis: ['grinning', 'smile', 'joy'],
      },
      {
        id: 'nature',
        emojis: ['dog', 'cat', 'mouse'],
      },
    ],
    emojis: {
      grinning: {
        name: 'Grinning Face',
        skins: [{ native: '😀', unified: '1F600' }],
        keywords: ['smile', 'happy'],
        shortcodes: ':grinning:',
      },
      smile: {
        name: 'Smiling Face',
        skins: [{ native: '😊', unified: '263A' }],
        keywords: ['smile', 'happy'],
        shortcodes: ':smile:',
      },
      joy: {
        name: 'Face with Tears of Joy',
        skins: [{ native: '😂', unified: '1F602' }],
        keywords: ['laugh', 'happy'],
        shortcodes: ':joy:',
      },
      dog: {
        name: 'Dog Face',
        skins: [{ native: '🐶', unified: '1F436' }],
        keywords: ['animal', 'pet'],
        shortcodes: ':dog:',
      },
      cat: {
        name: 'Cat Face',
        skins: [{ native: '🐱', unified: '1F431' }],
        keywords: ['animal', 'pet'],
        shortcodes: ':cat:',
      },
      mouse: {
        name: 'Mouse Face',
        skins: [{ native: '🐭', unified: '1F42D' }],
        keywords: ['animal'],
        shortcodes: ':mouse:',
      },
    },
  },
}));

describe('EmojiPicker', () => {
  const mockOnClose = vi.fn();
  const mockOnEmojiSelect = vi.fn();
  let mockAnchorElement: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Create mock anchor element
    mockAnchorElement = document.createElement('div');
    document.body.appendChild(mockAnchorElement);
    
    // Mock getBoundingClientRect
    mockAnchorElement.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 150,
      left: 0,
      right: 100,
      width: 100,
      height: 50,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }));
  });

  afterEach(() => {
    document.body.removeChild(mockAnchorElement);
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <EmojiPicker
          isOpen={false}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      expect(screen.getByRole('dialog', { name: 'Emoji picker' })).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      expect(screen.getByLabelText('Search emojis')).toBeInTheDocument();
    });

    it('should render category tabs', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      expect(screen.getByRole('tablist', { name: 'Emoji categories' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Recent' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Smileys' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Animals' })).toBeInTheDocument();
    });

    it('should render emoji grid', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
  });

  describe('Emoji Selection', () => {
    it('should call onEmojiSelect when emoji is clicked', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Switch to Smileys category
      const smileysTab = screen.getByRole('tab', { name: 'Smileys' });
      fireEvent.click(smileysTab);

      await waitFor(() => {
        const emojiButton = screen.getByRole('option', { name: 'Grinning Face' });
        expect(emojiButton).toBeInTheDocument();
      });

      const emojiButton = screen.getByRole('option', { name: 'Grinning Face' });
      fireEvent.click(emojiButton);

      expect(mockOnEmojiSelect).toHaveBeenCalledWith('😀');
    });

    it('should add selected emoji to recent emojis', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Switch to Smileys category
      const smileysTab = screen.getByRole('tab', { name: 'Smileys' });
      fireEvent.click(smileysTab);

      await waitFor(() => {
        const emojiButton = screen.getByRole('option', { name: 'Grinning Face' });
        expect(emojiButton).toBeInTheDocument();
      });

      const emojiButton = screen.getByRole('option', { name: 'Grinning Face' });
      fireEvent.click(emojiButton);

      // Check localStorage
      const stored = localStorage.getItem('messaging-recent-emojis');
      expect(stored).toBeTruthy();
      const recent = JSON.parse(stored!);
      expect(recent).toContain('😀');
    });

    it('should maintain max 30 recent emojis', async () => {
      // Pre-populate with 30 emojis
      const thirtyEmojis = Array.from({ length: 30 }, (_, i) => String.fromCodePoint(0x1F600 + i));
      localStorage.setItem('messaging-recent-emojis', JSON.stringify(thirtyEmojis));

      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Switch to Smileys category
      const smileysTab = screen.getByRole('tab', { name: 'Smileys' });
      fireEvent.click(smileysTab);

      await waitFor(() => {
        const emojiButton = screen.getByRole('option', { name: 'Grinning Face' });
        expect(emojiButton).toBeInTheDocument();
      });

      const emojiButton = screen.getByRole('option', { name: 'Grinning Face' });
      fireEvent.click(emojiButton);

      // Check that we still have max 30 emojis
      const stored = localStorage.getItem('messaging-recent-emojis');
      const recent = JSON.parse(stored!);
      expect(recent.length).toBe(30);
      expect(recent[0]).toBe('😀'); // New emoji should be first
    });
  });

  describe('Search Functionality', () => {
    it('should perform search when typing in search input', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      const searchInput = screen.getByLabelText('Search emojis');
      fireEvent.change(searchInput, { target: { value: 'smile' } });

      // Wait for debounce (100ms) and search results
      await waitFor(
        () => {
          expect(screen.getByRole('option', { name: 'Grinning Face' })).toBeInTheDocument();
        },
        { timeout: 300 }
      );
    });

    it('should debounce search by 100ms', async () => {
      const { SearchIndex } = await import('emoji-mart');
      const searchSpy = vi.spyOn(SearchIndex, 'search');

      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      const searchInput = screen.getByLabelText('Search emojis');
      
      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: 's' } });
      fireEvent.change(searchInput, { target: { value: 'sm' } });
      fireEvent.change(searchInput, { target: { value: 'smi' } });
      fireEvent.change(searchInput, { target: { value: 'smil' } });
      fireEvent.change(searchInput, { target: { value: 'smile' } });

      // Search should not be called immediately
      expect(searchSpy).not.toHaveBeenCalled();

      // Wait for debounce
      await waitFor(
        () => {
          expect(searchSpy).toHaveBeenCalledWith('smile');
        },
        { timeout: 300 }
      );

      // Should only be called once after debounce
      expect(searchSpy).toHaveBeenCalledTimes(1);
    });

    it('should hide category tabs when searching', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      const searchInput = screen.getByLabelText('Search emojis');
      fireEvent.change(searchInput, { target: { value: 'smile' } });

      // Category tabs should not be visible during search
      await waitFor(() => {
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
      });
    });

    it('should show "No emojis found" when search returns no results', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      const searchInput = screen.getByLabelText('Search emojis');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(
        () => {
          expect(screen.getByText('No emojis found')).toBeInTheDocument();
        },
        { timeout: 300 }
      );
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close picker when Escape is pressed', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate emojis with arrow keys', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Switch to Smileys category
      const smileysTab = screen.getByRole('tab', { name: 'Smileys' });
      fireEvent.click(smileysTab);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Grinning Face' })).toBeInTheDocument();
      });

      const emojiGrid = screen.getByRole('tabpanel');
      
      // Press ArrowRight to move focus
      fireEvent.keyDown(emojiGrid, { key: 'ArrowRight' });
      
      // Press Enter to select
      fireEvent.keyDown(emojiGrid, { key: 'Enter' });

      expect(mockOnEmojiSelect).toHaveBeenCalled();
    });

    it('should select emoji with Enter key', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Switch to Smileys category
      const smileysTab = screen.getByRole('tab', { name: 'Smileys' });
      fireEvent.click(smileysTab);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Grinning Face' })).toBeInTheDocument();
      });

      const emojiGrid = screen.getByRole('tabpanel');
      
      // Move focus and select with Enter
      fireEvent.keyDown(emojiGrid, { key: 'ArrowRight' });
      fireEvent.keyDown(emojiGrid, { key: 'Enter' });

      expect(mockOnEmojiSelect).toHaveBeenCalled();
    });

    it('should select emoji with Space key', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Switch to Smileys category
      const smileysTab = screen.getByRole('tab', { name: 'Smileys' });
      fireEvent.click(smileysTab);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Grinning Face' })).toBeInTheDocument();
      });

      const emojiGrid = screen.getByRole('tabpanel');
      
      // Move focus and select with Space
      fireEvent.keyDown(emojiGrid, { key: 'ArrowRight' });
      fireEvent.keyDown(emojiGrid, { key: ' ' });

      expect(mockOnEmojiSelect).toHaveBeenCalled();
    });
  });

  describe('Click Outside', () => {
    it('should close picker when clicking outside', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Click outside the picker
      fireEvent.mouseDown(document.body);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when clicking inside picker', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      const picker = screen.getByRole('dialog');
      fireEvent.mouseDown(picker);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close when clicking anchor element', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      fireEvent.mouseDown(mockAnchorElement);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Category Switching', () => {
    it('should switch categories when clicking category tab', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      const animalsTab = screen.getByRole('tab', { name: 'Animals' });
      fireEvent.click(animalsTab);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Dog Face' })).toBeInTheDocument();
      });
    });

    it('should show active state on selected category', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      const recentTab = screen.getByRole('tab', { name: 'Recent' });
      expect(recentTab).toHaveAttribute('aria-selected', 'true');

      const smileysTab = screen.getByRole('tab', { name: 'Smileys' });
      expect(smileysTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      expect(screen.getByRole('dialog', { name: 'Emoji picker' })).toBeInTheDocument();
      expect(screen.getByLabelText('Search emojis')).toBeInTheDocument();
      expect(screen.getByRole('tablist', { name: 'Emoji categories' })).toBeInTheDocument();
    });

    it('should announce emoji selection to screen readers', async () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Switch to Smileys category
      const smileysTab = screen.getByRole('tab', { name: 'Smileys' });
      fireEvent.click(smileysTab);

      await waitFor(() => {
        const emojiButton = screen.getByRole('option', { name: 'Grinning Face' });
        expect(emojiButton).toBeInTheDocument();
      });

      const emojiButton = screen.getByRole('option', { name: 'Grinning Face' });
      fireEvent.click(emojiButton);

      // Check that announcement was made (live region created)
      await waitFor(() => {
        const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
        expect(liveRegion).toBeInTheDocument();
        expect(liveRegion?.textContent).toBe('Selected Grinning Face emoji');
      });
    });
  });

  describe('Positioning', () => {
    it('should position below anchor by default', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
          position="bottom"
        />
      );

      const picker = screen.getByRole('dialog');
      expect(picker.className).toContain('top-full');
    });

    it('should position above anchor when specified', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
          position="top"
        />
      );

      const picker = screen.getByRole('dialog');
      expect(picker.className).toContain('bottom-full');
    });
  });

  describe('Recent Emojis', () => {
    it('should load recent emojis from localStorage', () => {
      const recentEmojis = ['😀', '😊', '😂'];
      localStorage.setItem('messaging-recent-emojis', JSON.stringify(recentEmojis));

      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      // Recent tab should be selected by default
      const recentTab = screen.getByRole('tab', { name: 'Recent' });
      expect(recentTab).toHaveAttribute('aria-selected', 'true');

      // Recent emojis should be displayed (use getAllByText since emoji might appear in tabs too)
      recentEmojis.forEach((emoji) => {
        const elements = screen.getAllByText(emoji);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('should show "No recent emojis yet" when no recent emojis', () => {
      render(
        <EmojiPicker
          isOpen={true}
          onClose={mockOnClose}
          onEmojiSelect={mockOnEmojiSelect}
          anchorElement={mockAnchorElement}
        />
      );

      expect(screen.getByText('No recent emojis yet')).toBeInTheDocument();
    });
  });
});
