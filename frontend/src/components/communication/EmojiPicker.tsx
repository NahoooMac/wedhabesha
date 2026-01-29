/**
 * @fileoverview EmojiPicker Component
 * 
 * A comprehensive emoji picker component with search, categories, keyboard navigation,
 * and recent emoji tracking. Integrates with emoji-mart library for emoji data and
 * rendering while providing custom UI that matches the messaging design system.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Features:
 * - Categorized emoji display (Smileys, Animals, Food, Activities, Travel, Objects, Symbols, Flags)
 * - Real-time search with debouncing (100ms)
 * - Recent emojis tracking (localStorage, max 30)
 * - Keyboard navigation (Tab, Arrow keys, Enter, Escape)
 * - Positioning logic (above/below input based on space)
 * - ARIA labels and screen reader support
 * - Mobile-optimized with touch support
 * - Lazy loading for performance
 * 
 * Requirements satisfied:
 * - 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9: Emoji Picker Integration
 * - 6.1, 6.2, 6.3, 6.4: Mobile Responsiveness
 * - 7.1, 7.2, 7.5: Accessibility
 * - 8.1, 8.2: Performance
 * - 10.1, 10.2: UI Consistency
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import data from '@emoji-mart/data';
import { init, SearchIndex } from 'emoji-mart';
import '../../styles/messaging-design-tokens.css';

// Initialize emoji-mart
init({ data });

// Emoji categories with icons
const EMOJI_CATEGORIES = [
  { id: 'frequent', name: 'Recent', icon: '🕒' },
  { id: 'people', name: 'Smileys', icon: '😊' },
  { id: 'nature', name: 'Animals', icon: '🐶' },
  { id: 'foods', name: 'Food', icon: '🍕' },
  { id: 'activity', name: 'Activities', icon: '⚽' },
  { id: 'places', name: 'Travel', icon: '✈️' },
  { id: 'objects', name: 'Objects', icon: '💡' },
  { id: 'symbols', name: 'Symbols', icon: '❤️' },
  { id: 'flags', name: 'Flags', icon: '🏁' },
] as const;

const RECENT_EMOJIS_KEY = 'messaging-recent-emojis';
const MAX_RECENT_EMOJIS = 30;

interface EmojiData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
}

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  anchorElement: HTMLElement | null;
  position?: 'top' | 'bottom' | 'auto';
  className?: string;
}

/**
 * EmojiPicker Component
 * 
 * Provides a comprehensive emoji selection interface with search, categories,
 * keyboard navigation, and recent emoji tracking.
 * 
 * @component
 * @param {EmojiPickerProps} props - Component props
 * @returns {JSX.Element} Rendered EmojiPicker component
 * 
 * @example
 * ```tsx
 * <EmojiPicker
 *   isOpen={isPickerOpen}
 *   onClose={() => setIsPickerOpen(false)}
 *   onEmojiSelect={(emoji) => insertEmoji(emoji)}
 *   anchorElement={buttonRef.current}
 *   position="auto"
 * />
 * ```
 * 
 * @satisfies Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 6.1-6.4, 7.1, 7.2, 7.5, 8.1, 8.2, 10.1, 10.2
 */
export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onEmojiSelect,
  anchorElement,
  position = 'auto',
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('frequent');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<EmojiData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('bottom');
  const [focusedEmojiIndex, setFocusedEmojiIndex] = useState<number>(-1);
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const emojiGridRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Detect mobile device and handle orientation changes
   */
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      setIsMobile(mobile);
    };

    const handleOrientationChange = () => {
      // Small delay to allow for orientation change to complete
      setTimeout(checkMobile, 100);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  /**
   * Detect keyboard visibility on mobile devices
   */
  useEffect(() => {
    if (!isMobile) return;

    const handleViewportChange = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      
      // Consider keyboard visible if viewport is significantly smaller than screen
      const keyboardVisible = viewportHeight < windowHeight * 0.75;
      setIsKeyboardVisible(keyboardVisible);
    };

    // Use Visual Viewport API if available (modern browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleViewportChange);
      return () => {
        window.removeEventListener('resize', handleViewportChange);
      };
    }
  }, [isMobile]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentEmojis(parsed.slice(0, MAX_RECENT_EMOJIS));
        }
      }
    } catch (error) {
      console.error('Failed to load recent emojis:', error);
    }
  }, []);

  /**
   * Calculate picker position based on available space
   */
  useEffect(() => {
    if (!isOpen || !anchorElement || position !== 'auto') {
      if (position !== 'auto') {
        setPickerPosition(position);
      }
      return;
    }

    const rect = anchorElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const pickerHeight = 435; // Default picker height

    // Position above if not enough space below
    if (spaceBelow < pickerHeight && spaceAbove > spaceBelow) {
      setPickerPosition('top');
    } else {
      setPickerPosition('bottom');
    }
  }, [isOpen, anchorElement, position]);

  /**
   * Focus search input when picker opens
   */
  useEffect(() => {
    if (isOpen && searchInputRef.current && !isMobile) {
      // Small delay to ensure picker is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMobile]);

  /**
   * Handle click outside to close picker
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        anchorElement &&
        !anchorElement.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorElement]);

  /**
   * Handle escape key to close picker
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * Debounced emoji search
   */
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const startTime = performance.now();

    try {
      const results = await SearchIndex.search(query);
      const emojis = results.slice(0, 50).map((result: any) => ({
        id: result.id,
        name: result.name,
        native: result.skins[0].native,
        unified: result.skins[0].unified,
        keywords: result.keywords || [],
        shortcodes: result.shortcodes || '',
      }));

      setSearchResults(emojis);
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      // Log if search takes longer than 100ms (performance requirement)
      if (searchTime > 100) {
        console.warn(`Emoji search took ${searchTime.toFixed(2)}ms (target: <100ms)`);
      }
    } catch (error) {
      console.error('Emoji search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Handle search input with debouncing (100ms)
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFocusedEmojiIndex(-1);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search by 100ms
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 100);
  }, [performSearch]);

  /**
   * Add emoji to recent list
   */
  const addToRecent = useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      // Remove if already exists
      const filtered = prev.filter((e) => e !== emoji);
      // Add to beginning
      const updated = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS);
      
      // Save to localStorage
      try {
        localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent emojis:', error);
      }
      
      return updated;
    });
  }, []);

  /**
   * Handle emoji selection with haptic feedback on mobile
   */
  const handleEmojiClick = useCallback((emoji: string, name: string) => {
    // Add haptic feedback on mobile devices
    if (isMobile && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50); // Short vibration for emoji selection
      } catch (error) {
        // Silently fail if vibration is not supported
      }
    }

    onEmojiSelect(emoji);
    addToRecent(emoji);
    
    // Announce to screen readers
    const announcement = `Selected ${name} emoji`;
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = announcement;
    document.body.appendChild(liveRegion);
    setTimeout(() => document.body.removeChild(liveRegion), 1000);
    
    // Don't close picker on mobile for better UX
    if (!isMobile) {
      onClose();
    }
  }, [onEmojiSelect, addToRecent, onClose, isMobile]);

  /**
   * Get emojis for current category
   */
  const categoryEmojis = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }

    if (selectedCategory === 'frequent') {
      return recentEmojis.map((emoji) => ({
        id: emoji,
        name: emoji,
        native: emoji,
        unified: '',
        keywords: [],
        shortcodes: '',
      }));
    }

    // Get emojis from emoji-mart data for selected category
    const category = (data as any).categories.find((cat: any) => cat.id === selectedCategory);
    if (!category) return [];

    return category.emojis.slice(0, 100).map((emojiId: string) => {
      const emoji = (data as any).emojis[emojiId];
      return {
        id: emojiId,
        name: emoji.name,
        native: emoji.skins[0].native,
        unified: emoji.skins[0].unified,
        keywords: emoji.keywords || [],
        shortcodes: emoji.shortcodes || '',
      };
    });
  }, [selectedCategory, searchQuery, searchResults, recentEmojis]);

  /**
   * Handle keyboard navigation in emoji grid
   */
  const handleEmojiGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    const emojisPerRow = isMobile ? 6 : 8;
    const totalEmojis = categoryEmojis.length;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocusedEmojiIndex((prev) => Math.min(prev + 1, totalEmojis - 1));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedEmojiIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedEmojiIndex((prev) => Math.min(prev + emojisPerRow, totalEmojis - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedEmojiIndex((prev) => Math.max(prev - emojisPerRow, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedEmojiIndex >= 0 && focusedEmojiIndex < totalEmojis) {
          const emoji = categoryEmojis[focusedEmojiIndex];
          handleEmojiClick(emoji.native, emoji.name);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedEmojiIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedEmojiIndex(totalEmojis - 1);
        break;
    }
  }, [categoryEmojis, focusedEmojiIndex, handleEmojiClick, isMobile]);

  /**
   * Scroll focused emoji into view
   */
  useEffect(() => {
    if (focusedEmojiIndex >= 0 && emojiGridRef.current) {
      const emojiButtons = emojiGridRef.current.querySelectorAll('button');
      const focusedButton = emojiButtons[focusedEmojiIndex];
      if (focusedButton && typeof focusedButton.scrollIntoView === 'function') {
        focusedButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedEmojiIndex]);

  if (!isOpen) return null;

  // Determine picker layout based on screen size and keyboard visibility
  const getPickerClasses = () => {
    if (!isMobile) {
      return `absolute z-50 bg-white border rounded-lg shadow-lg ${
        pickerPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      }`;
    }

    // Mobile layouts
    if (window.innerWidth < 480) {
      // Bottom sheet for very small screens
      return isKeyboardVisible 
        ? 'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-2xl'
        : 'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-2xl';
    } else {
      // Full screen modal for tablets and larger mobile screens
      return 'fixed inset-0 z-50 flex flex-col bg-white';
    }
  };

  const getPickerHeight = () => {
    if (!isMobile) return '435px';
    
    if (window.innerWidth < 480) {
      // Bottom sheet height - adjust based on keyboard visibility
      return isKeyboardVisible ? '50vh' : '60vh';
    } else {
      // Full screen on larger mobile devices
      return '100%';
    }
  };

  const pickerClasses = getPickerClasses();

  return (
    <div
      ref={pickerRef}
      className={`emoji-picker ${pickerClasses} ${className}`}
      role="dialog"
      aria-label="Emoji picker"
      aria-modal={isMobile}
      style={{
        width: isMobile ? '100%' : '352px',
        height: getPickerHeight(),
        backgroundColor: 'var(--messaging-gray-50)',
        borderColor: 'var(--messaging-gray-200)',
        borderRadius: isMobile 
          ? (window.innerWidth < 480 ? 'var(--messaging-radius-2xl) var(--messaging-radius-2xl) 0 0' : '0')
          : 'var(--messaging-radius-lg)',
        boxShadow: isMobile ? 'var(--messaging-shadow-2xl)' : 'var(--messaging-shadow-lg)',
        zIndex: 'var(--messaging-z-dropdown)',
        maxHeight: isMobile && isKeyboardVisible ? '50vh' : undefined,
      }}
    >
      {/* Bottom sheet drag handle for small screens */}
      {isMobile && window.innerWidth < 480 && (
        <div className="flex justify-center py-2">
          <div
            className="w-8 h-1 rounded-full"
            style={{
              backgroundColor: 'var(--messaging-gray-300)',
            }}
          />
        </div>
      )}

      {/* Mobile header - only show on full screen layouts */}
      {isMobile && window.innerWidth >= 480 && (
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{
            borderColor: 'var(--messaging-gray-200)',
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{
              fontSize: 'var(--messaging-font-size-lg)',
              fontWeight: 'var(--messaging-font-weight-semibold)',
              color: 'var(--messaging-gray-900)',
            }}
          >
            Select Emoji
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            aria-label="Close emoji picker"
            style={{
              color: 'var(--messaging-gray-500)',
              transition: 'all var(--messaging-transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--messaging-gray-100)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search input */}
      <div
        className="p-3"
        style={{
          backgroundColor: 'white',
          borderBottom: `1px solid var(--messaging-gray-200)`,
        }}
      >
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search emojis..."
          aria-label="Search emojis"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none"
          style={{
            borderColor: 'var(--messaging-gray-300)',
            borderRadius: 'var(--messaging-radius-lg)',
            fontSize: 'var(--messaging-font-size-sm)',
            transition: 'border-color var(--messaging-transition-fast)',
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
      </div>

      {/* Category tabs */}
      {!searchQuery && (
        <div
          className="flex overflow-x-auto border-b"
          role="tablist"
          aria-label="Emoji categories"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--messaging-gray-200)',
            scrollbarWidth: 'thin',
          }}
        >
          {EMOJI_CATEGORIES.map((category) => (
            <button
              key={category.id}
              role="tab"
              aria-selected={selectedCategory === category.id}
              aria-label={category.name}
              onClick={() => {
                setSelectedCategory(category.id);
                setFocusedEmojiIndex(-1);
              }}
              className="flex-shrink-0 px-3 py-2 text-2xl transition-colors"
              style={{
                borderBottom: selectedCategory === category.id
                  ? `2px solid var(--messaging-primary-500)`
                  : '2px solid transparent',
                color: selectedCategory === category.id
                  ? 'var(--messaging-primary-500)'
                  : 'var(--messaging-gray-400)',
                transition: 'all var(--messaging-transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.backgroundColor = 'var(--messaging-gray-50)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {category.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div
        ref={emojiGridRef}
        role="tabpanel"
        aria-label={searchQuery ? 'Search results' : EMOJI_CATEGORIES.find(c => c.id === selectedCategory)?.name}
        className="flex-1 overflow-y-auto p-2"
        style={{
          backgroundColor: 'var(--messaging-gray-50)',
          WebkitOverflowScrolling: 'touch', // Enable native momentum scrolling on iOS
          overscrollBehavior: 'contain', // Prevent scroll chaining
        }}
        onKeyDown={handleEmojiGridKeyDown}
        tabIndex={0}
      >
        {isSearching ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="text-sm"
              style={{
                color: 'var(--messaging-gray-500)',
                fontSize: 'var(--messaging-font-size-sm)',
              }}
            >
              Searching...
            </div>
          </div>
        ) : categoryEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="text-4xl mb-2"
              style={{ color: 'var(--messaging-gray-400)' }}
            >
              {searchQuery ? '🔍' : '😊'}
            </div>
            <div
              className="text-sm text-center"
              style={{
                color: 'var(--messaging-gray-500)',
                fontSize: 'var(--messaging-font-size-sm)',
              }}
            >
              {searchQuery
                ? 'No emojis found'
                : selectedCategory === 'frequent'
                ? 'No recent emojis yet'
                : 'No emojis in this category'}
            </div>
          </div>
        ) : (
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: isMobile
                ? 'repeat(6, minmax(0, 1fr))'
                : 'repeat(8, minmax(0, 1fr))',
            }}
          >
            {categoryEmojis.map((emoji, index) => (
              <button
                key={`${emoji.id}-${index}`}
                role="option"
                aria-label={emoji.name}
                onClick={() => handleEmojiClick(emoji.native, emoji.name)}
                className="flex items-center justify-center rounded transition-all touch-manipulation"
                style={{
                  width: isMobile ? '44px' : '36px',
                  height: isMobile ? '44px' : '36px',
                  fontSize: isMobile ? '1.75rem' : '1.5rem',
                  backgroundColor: focusedEmojiIndex === index
                    ? 'var(--messaging-primary-100)'
                    : 'transparent',
                  transform: focusedEmojiIndex === index ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all var(--messaging-transition-fast)',
                  // Improve touch responsiveness
                  touchAction: 'manipulation',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.backgroundColor = 'var(--messaging-gray-100)';
                    e.currentTarget.style.transform = 'scale(1.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile && focusedEmojiIndex !== index) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
                onTouchStart={(e) => {
                  if (isMobile) {
                    e.currentTarget.style.backgroundColor = 'var(--messaging-gray-100)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }
                }}
                onTouchEnd={(e) => {
                  if (isMobile && focusedEmojiIndex !== index) {
                    setTimeout(() => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }, 150);
                  }
                }}
                onFocus={() => setFocusedEmojiIndex(index)}
              >
                {emoji.native}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmojiPicker;
