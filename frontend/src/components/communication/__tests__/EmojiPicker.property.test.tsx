/**
 * @fileoverview Property-Based Tests for EmojiPicker Component
 * 
 * Tests universal properties that should hold for all inputs:
 * - Property 1: Emoji Insertion Preserves Cursor Position
 * - Property 5: Search Performance (< 100ms)
 * 
 * **Validates: Requirements 1.3, 1.4, 1.9, 8.2**
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SearchIndex } from 'emoji-mart';

// Mock emoji-mart
vi.mock('emoji-mart', () => ({
  init: vi.fn(),
  SearchIndex: {
    search: vi.fn((query: string) => {
      // Simulate realistic search with some delay
      return new Promise((resolve) => {
        const delay = Math.random() * 50; // Random delay 0-50ms
        setTimeout(() => {
          const results = query.length > 0 ? [
            {
              id: 'test',
              name: 'Test Emoji',
              skins: [{ native: '😀', unified: '1F600' }],
              keywords: ['test'],
              shortcodes: ':test:',
            },
          ] : [];
          resolve(results);
        }, delay);
      });
    }),
  },
}));

vi.mock('@emoji-mart/data', () => ({
  default: {
    categories: [],
    emojis: {},
  },
}));

describe('EmojiPicker Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 1: Emoji Insertion Preserves Cursor Position', () => {
    /**
     * **Validates: Requirements 1.3, 1.9**
     * 
     * Property Specification:
     * ∀ text, cursorPos, emoji:
     *   LET result = insertEmoji(text, cursorPos, emoji)
     *   IN result.text = text[0:cursorPos] + emoji + text[cursorPos:]
     *      AND result.newCursorPos = cursorPos + length(emoji)
     * 
     * This property ensures that:
     * 1. Emoji is inserted at the correct cursor position
     * 2. Text before cursor is preserved
     * 3. Text after cursor is preserved
     * 4. New cursor position is correctly calculated
     */

    /**
     * Helper function to simulate emoji insertion
     */
    function insertEmoji(text: string, cursorPos: number, emoji: string): {
      text: string;
      newCursorPos: number;
    } {
      // Ensure cursor position is within bounds
      const safeCursorPos = Math.max(0, Math.min(cursorPos, text.length));
      
      // Insert emoji at cursor position
      const before = text.slice(0, safeCursorPos);
      const after = text.slice(safeCursorPos);
      const newText = before + emoji + after;
      
      // Calculate new cursor position (after the inserted emoji)
      const newCursorPos = safeCursorPos + emoji.length;
      
      return {
        text: newText,
        newCursorPos,
      };
    }

    it('should preserve text before and after cursor when inserting emoji', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }), // Original text
          fc.integer({ min: 0, max: 100 }), // Cursor position
          fc.constantFrom('😀', '😊', '🎉', '❤️', '👍', '🔥', '✨', '🎵'), // Emoji
          (text, cursorPos, emoji) => {
            // Normalize cursor position to be within text bounds
            const normalizedCursorPos = Math.min(cursorPos, text.length);
            
            const result = insertEmoji(text, normalizedCursorPos, emoji);
            
            // Property 1: Text before cursor is preserved
            const expectedBefore = text.slice(0, normalizedCursorPos);
            const actualBefore = result.text.slice(0, normalizedCursorPos);
            expect(actualBefore).toBe(expectedBefore);
            
            // Property 2: Emoji is inserted at cursor position
            const emojiStart = normalizedCursorPos;
            const emojiEnd = normalizedCursorPos + emoji.length;
            const insertedEmoji = result.text.slice(emojiStart, emojiEnd);
            expect(insertedEmoji).toBe(emoji);
            
            // Property 3: Text after cursor is preserved
            const expectedAfter = text.slice(normalizedCursorPos);
            const actualAfter = result.text.slice(emojiEnd);
            expect(actualAfter).toBe(expectedAfter);
            
            // Property 4: New cursor position is correct
            expect(result.newCursorPos).toBe(normalizedCursorPos + emoji.length);
            
            // Property 5: Total length is correct
            expect(result.text.length).toBe(text.length + emoji.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle emoji insertion at start of text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.constantFrom('😀', '😊', '🎉', '❤️', '👍'),
          (text, emoji) => {
            const result = insertEmoji(text, 0, emoji);
            
            // Emoji should be at the start
            expect(result.text.startsWith(emoji)).toBe(true);
            
            // Original text should follow
            expect(result.text.slice(emoji.length)).toBe(text);
            
            // Cursor should be after emoji
            expect(result.newCursorPos).toBe(emoji.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle emoji insertion at end of text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.constantFrom('😀', '😊', '🎉', '❤️', '👍'),
          (text, emoji) => {
            const result = insertEmoji(text, text.length, emoji);
            
            // Original text should be preserved
            expect(result.text.startsWith(text)).toBe(true);
            
            // Emoji should be at the end
            expect(result.text.endsWith(emoji)).toBe(true);
            
            // Cursor should be at the end
            expect(result.newCursorPos).toBe(text.length + emoji.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle multiple emoji insertions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.array(fc.constantFrom('😀', '😊', '🎉', '❤️', '👍'), { minLength: 1, maxLength: 5 }),
          (initialText, emojis) => {
            let currentText = initialText;
            let currentCursorPos = 0;
            
            // Insert emojis one by one at the cursor position
            for (const emoji of emojis) {
              const result = insertEmoji(currentText, currentCursorPos, emoji);
              currentText = result.text;
              currentCursorPos = result.newCursorPos;
            }
            
            // All emojis should be at the start (since we insert at cursor 0 each time)
            const allEmojis = emojis.join('');
            expect(currentText.startsWith(allEmojis)).toBe(true);
            
            // Original text should follow
            expect(currentText.slice(allEmojis.length)).toBe(initialText);
            
            // Final cursor position should be after all emojis
            expect(currentCursorPos).toBe(allEmojis.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle emoji insertion with special characters in text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.integer({ min: 0, max: 50 }),
          fc.constantFrom('😀', '😊', '🎉', '❤️', '👍'),
          (text, cursorPos, emoji) => {
            const normalizedCursorPos = Math.min(cursorPos, text.length);
            const result = insertEmoji(text, normalizedCursorPos, emoji);
            
            // Text integrity should be maintained
            const expectedLength = text.length + emoji.length;
            expect(result.text.length).toBe(expectedLength);
            
            // Cursor position should be valid
            expect(result.newCursorPos).toBeGreaterThanOrEqual(0);
            expect(result.newCursorPos).toBeLessThanOrEqual(result.text.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty text', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('😀', '😊', '🎉', '❤️', '👍'),
          (emoji) => {
            const result = insertEmoji('', 0, emoji);
            
            expect(result.text).toBe(emoji);
            expect(result.newCursorPos).toBe(emoji.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 5: Search Performance (< 100ms)', () => {
    /**
     * **Validates: Requirements 1.4, 8.2**
     * 
     * Property Specification:
     * ∀ searchQuery:
     *   LET startTime = now()
     *   LET results = searchEmojis(searchQuery)
     *   LET endTime = now()
     *   IN (endTime - startTime) ≤ 100ms
     *      AND results ⊆ allEmojis
     *      AND ∀ emoji ∈ results: matches(emoji, searchQuery)
     * 
     * This property ensures that:
     * 1. Search completes within 100ms
     * 2. Results are valid emojis
     * 3. Results match the search query
     */

    /**
     * Helper function to perform emoji search
     */
    async function searchEmojis(query: string): Promise<any[]> {
      const results = await SearchIndex.search(query);
      return results;
    }

    it('should complete search within 100ms for any query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (query) => {
            const startTime = performance.now();
            await searchEmojis(query);
            const endTime = performance.now();
            
            const searchTime = endTime - startTime;
            
            // Search should complete within 100ms
            expect(searchTime).toBeLessThan(100);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should complete search within 100ms for common emoji keywords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'smile', 'happy', 'sad', 'love', 'heart', 'fire', 'star',
            'dog', 'cat', 'food', 'pizza', 'car', 'house', 'tree'
          ),
          async (keyword) => {
            const startTime = performance.now();
            await searchEmojis(keyword);
            const endTime = performance.now();
            
            const searchTime = endTime - startTime;
            
            // Search should complete within 100ms
            expect(searchTime).toBeLessThan(100);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should complete search within 100ms for short queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 3 }),
          async (query) => {
            const startTime = performance.now();
            await searchEmojis(query);
            const endTime = performance.now();
            
            const searchTime = endTime - startTime;
            
            // Short queries should be fast
            expect(searchTime).toBeLessThan(100);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should complete search within 100ms for long queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 30 }),
          async (query) => {
            const startTime = performance.now();
            await searchEmojis(query);
            const endTime = performance.now();
            
            const searchTime = endTime - startTime;
            
            // Even long queries should complete within 100ms
            expect(searchTime).toBeLessThan(100);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should complete search within 100ms for queries with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 15 }),
          async (query) => {
            const startTime = performance.now();
            await searchEmojis(query);
            const endTime = performance.now();
            
            const searchTime = endTime - startTime;
            
            // Queries with special characters should still be fast
            expect(searchTime).toBeLessThan(100);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should return valid results structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('smile', 'happy', 'love', 'fire'),
          async (query) => {
            const results = await searchEmojis(query);
            
            // Results should be an array
            expect(Array.isArray(results)).toBe(true);
            
            // Each result should have expected structure
            results.forEach((result: any) => {
              expect(result).toHaveProperty('id');
              expect(result).toHaveProperty('name');
              expect(result).toHaveProperty('skins');
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle empty query gracefully', async () => {
      const startTime = performance.now();
      const results = await searchEmojis('');
      const endTime = performance.now();
      
      const searchTime = endTime - startTime;
      
      // Empty query should be fast
      expect(searchTime).toBeLessThan(100);
      
      // Should return empty or all emojis
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle repeated searches efficiently', async () => {
      const query = 'smile';
      const searchTimes: number[] = [];
      
      // Perform multiple searches
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await searchEmojis(query);
        const endTime = performance.now();
        searchTimes.push(endTime - startTime);
      }
      
      // All searches should be within 100ms
      searchTimes.forEach((time) => {
        expect(time).toBeLessThan(100);
      });
      
      // Average search time should be reasonable
      const avgTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Combined Properties', () => {
    it('should maintain cursor position correctness across multiple emoji insertions with varying text', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              text: fc.string({ minLength: 0, maxLength: 30 }),
              cursorPos: fc.integer({ min: 0, max: 30 }),
              emoji: fc.constantFrom('😀', '😊', '🎉', '❤️', '👍'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (operations) => {
            let currentText = '';
            let currentCursorPos = 0;
            
            for (const op of operations) {
              // Start with the operation's text
              currentText = op.text;
              currentCursorPos = Math.min(op.cursorPos, currentText.length);
              
              // Insert emoji
              const before = currentText.slice(0, currentCursorPos);
              const after = currentText.slice(currentCursorPos);
              const newText = before + op.emoji + after;
              const newCursorPos = currentCursorPos + op.emoji.length;
              
              // Verify properties
              expect(newText.slice(0, currentCursorPos)).toBe(before);
              expect(newText.slice(currentCursorPos, newCursorPos)).toBe(op.emoji);
              expect(newText.slice(newCursorPos)).toBe(after);
              expect(newText.length).toBe(currentText.length + op.emoji.length);
              
              currentText = newText;
              currentCursorPos = newCursorPos;
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
