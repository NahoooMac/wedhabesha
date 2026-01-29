/**
 * SearchEmptyState Component
 * 
 * Displays appropriate empty state messages when no search results are found.
 * Provides consistent empty state UI across couple and vendor messaging interfaces.
 * 
 * Requirements: 6.5
 */

import React from 'react';
import { Search, X } from 'lucide-react';
import '../../styles/messaging-design-tokens.css';

export interface SearchEmptyStateProps {
  searchQuery: string;
  onClearSearch?: () => void;
  className?: string;
  variant?: 'messages' | 'threads';
}

/**
 * SearchEmptyState Component
 * 
 * Shows user-friendly empty state when search returns no results.
 * Includes option to clear search and return to full view.
 */
export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({
  searchQuery,
  onClearSearch,
  className = '',
  variant = 'messages'
}) => {
  const isThreadSearch = variant === 'threads';
  
  return (
    <div 
      className={`flex flex-col items-center justify-center text-center p-8 ${className}`}
      style={{ padding: 'var(--messaging-space-8)' }}
    >
      {/* Icon */}
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: 'var(--messaging-gray-100)',
          borderRadius: 'var(--messaging-radius-full)'
        }}
      >
        <Search 
          className="w-8 h-8"
          style={{ color: 'var(--messaging-gray-400)' }}
        />
      </div>

      {/* Title */}
      <h3 
        className="font-semibold mb-2"
        style={{
          color: 'var(--messaging-gray-900)',
          fontSize: 'var(--messaging-font-size-lg)',
          fontWeight: 'var(--messaging-font-weight-semibold)',
          marginBottom: 'var(--messaging-space-2)'
        }}
      >
        No {isThreadSearch ? 'conversations' : 'messages'} found
      </h3>

      {/* Description */}
      <p 
        className="text-sm mb-4 max-w-sm"
        style={{
          color: 'var(--messaging-gray-600)',
          fontSize: 'var(--messaging-font-size-sm)',
          marginBottom: 'var(--messaging-space-4)'
        }}
      >
        {searchQuery ? (
          <>
            No {isThreadSearch ? 'conversations' : 'messages'} match your search for{' '}
            <span 
              className="font-medium"
              style={{
                color: 'var(--messaging-gray-900)',
                fontWeight: 'var(--messaging-font-weight-medium)'
              }}
            >
              "{searchQuery}"
            </span>
          </>
        ) : (
          <>
            Try adjusting your filters or search terms to find what you're looking for.
          </>
        )}
      </p>

      {/* Clear Search Button */}
      {onClearSearch && (
        <button
          onClick={onClearSearch}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--messaging-primary-50)',
            color: 'var(--messaging-primary-600)',
            borderRadius: 'var(--messaging-radius-lg)',
            padding: 'var(--messaging-space-2) var(--messaging-space-4)',
            fontSize: 'var(--messaging-font-size-sm)',
            fontWeight: 'var(--messaging-font-weight-medium)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--messaging-primary-100)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--messaging-primary-50)';
          }}
        >
          <X className="w-4 h-4" />
          Clear search
        </button>
      )}

      {/* Suggestions */}
      <div 
        className="mt-6 text-xs space-y-1"
        style={{
          color: 'var(--messaging-gray-500)',
          fontSize: 'var(--messaging-font-size-xs)',
          marginTop: 'var(--messaging-space-6)'
        }}
      >
        <p className="font-medium" style={{ fontWeight: 'var(--messaging-font-weight-medium)' }}>
          Search tips:
        </p>
        <ul className="space-y-0.5 text-left inline-block">
          <li>• Try different keywords</li>
          <li>• Check your spelling</li>
          <li>• Use fewer or more general terms</li>
          {!isThreadSearch && <li>• Try adjusting the date range</li>}
        </ul>
      </div>
    </div>
  );
};
