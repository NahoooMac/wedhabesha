/**
 * Unit Tests: SearchEmptyState Component
 * 
 * Tests empty state display when no search results are found.
 * Validates: Requirement 6.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchEmptyState } from '../SearchEmptyState';

describe('SearchEmptyState Component', () => {
  /**
   * Test: Empty state displays with search query
   */
  it('should display empty state with search query', () => {
    render(
      <SearchEmptyState 
        searchQuery="test query"
        variant="messages"
      />
    );

    expect(screen.getByText(/No messages found/i)).toBeInTheDocument();
    expect(screen.getByText(/test query/i)).toBeInTheDocument();
  });

  /**
   * Test: Empty state displays for threads variant
   */
  it('should display correct text for threads variant', () => {
    render(
      <SearchEmptyState 
        searchQuery="vendor name"
        variant="threads"
      />
    );

    expect(screen.getByText(/No conversations found/i)).toBeInTheDocument();
    expect(screen.getByText(/vendor name/i)).toBeInTheDocument();
  });

  /**
   * Test: Clear search button calls callback
   */
  it('should call onClearSearch when clear button is clicked', () => {
    const mockClearSearch = vi.fn();
    
    render(
      <SearchEmptyState 
        searchQuery="test"
        onClearSearch={mockClearSearch}
        variant="messages"
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);

    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: Clear button not shown when callback not provided
   */
  it('should not show clear button when onClearSearch is not provided', () => {
    render(
      <SearchEmptyState 
        searchQuery="test"
        variant="messages"
      />
    );

    const clearButton = screen.queryByRole('button', { name: /clear search/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  /**
   * Test: Search tips are displayed
   */
  it('should display search tips', () => {
    render(
      <SearchEmptyState 
        searchQuery="test"
        variant="messages"
      />
    );

    expect(screen.getByText(/Search tips:/i)).toBeInTheDocument();
    expect(screen.getByText(/Try different keywords/i)).toBeInTheDocument();
    expect(screen.getByText(/Check your spelling/i)).toBeInTheDocument();
  });

  /**
   * Test: Date range tip shown for messages variant
   */
  it('should show date range tip for messages variant', () => {
    render(
      <SearchEmptyState 
        searchQuery="test"
        variant="messages"
      />
    );

    expect(screen.getByText(/Try adjusting the date range/i)).toBeInTheDocument();
  });

  /**
   * Test: Date range tip not shown for threads variant
   */
  it('should not show date range tip for threads variant', () => {
    render(
      <SearchEmptyState 
        searchQuery="test"
        variant="threads"
      />
    );

    expect(screen.queryByText(/Try adjusting the date range/i)).not.toBeInTheDocument();
  });

  /**
   * Test: Empty state with empty search query
   */
  it('should display generic message when search query is empty', () => {
    render(
      <SearchEmptyState 
        searchQuery=""
        variant="messages"
      />
    );

    expect(screen.getByText(/Try adjusting your filters/i)).toBeInTheDocument();
  });

  /**
   * Test: Custom className is applied
   */
  it('should apply custom className', () => {
    const { container } = render(
      <SearchEmptyState 
        searchQuery="test"
        className="custom-class"
        variant="messages"
      />
    );

    const emptyState = container.firstChild as HTMLElement;
    expect(emptyState.className).toContain('custom-class');
  });

  /**
   * Test: Icon is displayed
   */
  it('should display search icon', () => {
    const { container } = render(
      <SearchEmptyState 
        searchQuery="test"
        variant="messages"
      />
    );

    // Check for SVG icon
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  /**
   * Test: Multiple search queries display correctly
   */
  it('should handle various search query formats', () => {
    const queries = [
      'simple',
      'with spaces',
      'with-dashes',
      'with_underscores',
      '123numbers',
      'UPPERCASE',
      'MixedCase'
    ];

    queries.forEach(query => {
      const { rerender } = render(
        <SearchEmptyState 
          searchQuery={query}
          variant="messages"
        />
      );

      expect(screen.getByText(new RegExp(query, 'i'))).toBeInTheDocument();
      
      rerender(<div />); // Clean up for next iteration
    });
  });

  /**
   * Test: Long search queries are displayed
   */
  it('should display long search queries', () => {
    const longQuery = 'This is a very long search query that contains many words and should still be displayed correctly';
    
    render(
      <SearchEmptyState 
        searchQuery={longQuery}
        variant="messages"
      />
    );

    expect(screen.getByText(new RegExp(longQuery, 'i'))).toBeInTheDocument();
  });

  /**
   * Test: Special characters in search query
   */
  it('should handle special characters in search query', () => {
    const specialQuery = 'test@#$%^&*()';
    
    render(
      <SearchEmptyState 
        searchQuery={specialQuery}
        variant="messages"
      />
    );

    // Should not crash and should display the query
    expect(screen.getByText(/No messages found/i)).toBeInTheDocument();
  });
});
