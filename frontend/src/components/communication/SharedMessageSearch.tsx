/**
 * SharedMessageSearch Component
 * 
 * Unified search and filter component for messaging interfaces.
 * Provides consistent search functionality with text filtering, date range selection,
 * and result highlighting across both couple and vendor messaging interfaces.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useState, useCallback } from 'react';
import { Search, X, Calendar, Filter } from 'lucide-react';
import '../../styles/messaging-design-tokens.css';

export interface SearchFilters {
  query: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasAttachments?: boolean;
}

export interface SharedMessageSearchProps {
  onSearchChange: (filters: SearchFilters) => void;
  placeholder?: string;
  showDateFilter?: boolean;
  showAttachmentFilter?: boolean;
  className?: string;
}

/**
 * SharedMessageSearch Component
 * 
 * Provides unified search and filtering functionality for messaging interfaces.
 * Supports text search, date range filtering, and attachment filtering with
 * consistent UI design across couple and vendor interfaces.
 */
export const SharedMessageSearch: React.FC<SharedMessageSearchProps> = ({
  onSearchChange,
  placeholder = 'Search messages...',
  showDateFilter = true,
  showAttachmentFilter = false,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [hasAttachments, setHasAttachments] = useState(false);

  /**
   * Handle search query change with debouncing
   */
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    
    const filters: SearchFilters = {
      query: value,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      hasAttachments: showAttachmentFilter ? hasAttachments : undefined
    };
    
    onSearchChange(filters);
  }, [dateFrom, dateTo, hasAttachments, showAttachmentFilter, onSearchChange]);

  /**
   * Handle date filter change
   */
  const handleDateChange = useCallback((from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    
    const filters: SearchFilters = {
      query,
      dateFrom: from ? new Date(from) : undefined,
      dateTo: to ? new Date(to) : undefined,
      hasAttachments: showAttachmentFilter ? hasAttachments : undefined
    };
    
    onSearchChange(filters);
  }, [query, hasAttachments, showAttachmentFilter, onSearchChange]);

  /**
   * Handle attachment filter toggle
   */
  const handleAttachmentToggle = useCallback(() => {
    const newValue = !hasAttachments;
    setHasAttachments(newValue);
    
    const filters: SearchFilters = {
      query,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      hasAttachments: newValue
    };
    
    onSearchChange(filters);
  }, [query, dateFrom, dateTo, hasAttachments, onSearchChange]);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setHasAttachments(false);
    setShowFilters(false);
    
    onSearchChange({ query: '' });
  }, [onSearchChange]);

  const hasActiveFilters = query || dateFrom || dateTo || hasAttachments;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--messaging-gray-400)' }}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="w-full pl-10 pr-20 py-2 border rounded-lg messaging-input"
          style={{
            borderColor: 'var(--messaging-gray-300)',
            borderRadius: 'var(--messaging-radius-lg)',
            fontSize: 'var(--messaging-font-size-sm)',
            padding: 'var(--messaging-space-2) 5rem var(--messaging-space-2) 2.5rem'
          }}
        />
        
        {/* Filter Toggle and Clear Buttons */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--messaging-gray-500)',
                borderRadius: 'var(--messaging-radius-lg)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--messaging-gray-100)';
                e.currentTarget.style.color = 'var(--messaging-gray-700)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--messaging-gray-500)';
              }}
              title="Clear filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {(showDateFilter || showAttachmentFilter) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${showFilters ? 'active' : ''}`}
              style={{
                color: showFilters ? 'var(--messaging-primary-600)' : 'var(--messaging-gray-500)',
                backgroundColor: showFilters ? 'var(--messaging-primary-50)' : 'transparent',
                borderRadius: 'var(--messaging-radius-lg)'
              }}
              onMouseEnter={(e) => {
                if (!showFilters) {
                  e.currentTarget.style.backgroundColor = 'var(--messaging-gray-100)';
                  e.currentTarget.style.color = 'var(--messaging-gray-700)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showFilters) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--messaging-gray-500)';
                }
              }}
              title="Show filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div 
          className="p-3 border rounded-lg space-y-3"
          style={{
            backgroundColor: 'var(--messaging-gray-50)',
            borderColor: 'var(--messaging-gray-200)',
            borderRadius: 'var(--messaging-radius-lg)',
            padding: 'var(--messaging-space-3)'
          }}
        >
          {/* Date Range Filter */}
          {showDateFilter && (
            <div className="space-y-2">
              <label 
                className="text-sm font-medium flex items-center gap-2"
                style={{
                  color: 'var(--messaging-gray-700)',
                  fontSize: 'var(--messaging-font-size-sm)',
                  fontWeight: 'var(--messaging-font-weight-medium)'
                }}
              >
                <Calendar className="w-4 h-4" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label 
                    className="text-xs mb-1 block"
                    style={{
                      color: 'var(--messaging-gray-600)',
                      fontSize: 'var(--messaging-font-size-xs)'
                    }}
                  >
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleDateChange(e.target.value, dateTo)}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    style={{
                      borderColor: 'var(--messaging-gray-300)',
                      borderRadius: 'var(--messaging-radius-lg)',
                      fontSize: 'var(--messaging-font-size-sm)',
                      padding: 'var(--messaging-space-2) var(--messaging-space-3)'
                    }}
                  />
                </div>
                <div>
                  <label 
                    className="text-xs mb-1 block"
                    style={{
                      color: 'var(--messaging-gray-600)',
                      fontSize: 'var(--messaging-font-size-xs)'
                    }}
                  >
                    To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleDateChange(dateFrom, e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    style={{
                      borderColor: 'var(--messaging-gray-300)',
                      borderRadius: 'var(--messaging-radius-lg)',
                      fontSize: 'var(--messaging-font-size-sm)',
                      padding: 'var(--messaging-space-2) var(--messaging-space-3)'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Attachment Filter */}
          {showAttachmentFilter && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has-attachments"
                checked={hasAttachments}
                onChange={handleAttachmentToggle}
                className="w-4 h-4 rounded"
                style={{
                  accentColor: 'var(--messaging-primary-600)',
                  borderRadius: 'var(--messaging-radius-base)'
                }}
              />
              <label 
                htmlFor="has-attachments"
                className="text-sm cursor-pointer"
                style={{
                  color: 'var(--messaging-gray-700)',
                  fontSize: 'var(--messaging-font-size-sm)'
                }}
              >
                Only show messages with attachments
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Highlight search query in text
 * 
 * @param text - Text to highlight
 * @param query - Search query to highlight
 * @returns JSX with highlighted text
 */
export const highlightSearchQuery = (text: string, query: string): JSX.Element => {
  if (!query || !text) {
    return <>{text}</>;
  }

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark 
            key={index}
            style={{
              backgroundColor: 'var(--messaging-warning-100)',
              color: 'var(--messaging-warning-800)',
              padding: '0 2px',
              borderRadius: '2px'
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};
