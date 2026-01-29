/**
 * useMessageSearch Hook
 * 
 * Custom hook for message search and filtering functionality.
 * Provides consistent search behavior across couple and vendor messaging interfaces.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { useState, useCallback, useMemo } from 'react';
import { Message } from '../types/messaging';
import { SearchFilters } from '../components/communication/SharedMessageSearch';

export interface UseMessageSearchResult {
  filteredMessages: Message[];
  searchFilters: SearchFilters;
  updateFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
}

/**
 * Custom hook for message search and filtering
 * 
 * @param messages - Array of messages to search/filter
 * @returns Search state and control functions
 */
export const useMessageSearch = (messages: Message[]): UseMessageSearchResult => {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: ''
  });

  /**
   * Filter messages based on search criteria
   */
  const filteredMessages = useMemo(() => {
    let result = [...messages];

    // Text search filter
    if (searchFilters.query && searchFilters.query.trim()) {
      const query = searchFilters.query.toLowerCase().trim();
      result = result.filter(message => 
        message.content.toLowerCase().includes(query) ||
        message.attachments?.some(att => 
          att.fileName.toLowerCase().includes(query)
        )
      );
    }

    // Date range filter
    if (searchFilters.dateFrom) {
      const fromDate = new Date(searchFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(message => {
        const messageDate = new Date(message.createdAt);
        return messageDate >= fromDate;
      });
    }

    if (searchFilters.dateTo) {
      const toDate = new Date(searchFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(message => {
        const messageDate = new Date(message.createdAt);
        return messageDate <= toDate;
      });
    }

    // Attachment filter
    if (searchFilters.hasAttachments) {
      result = result.filter(message => 
        message.attachments && message.attachments.length > 0
      );
    }

    return result;
  }, [messages, searchFilters]);

  /**
   * Update search filters
   */
  const updateFilters = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setSearchFilters({ query: '' });
  }, []);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return !!(
      searchFilters.query ||
      searchFilters.dateFrom ||
      searchFilters.dateTo ||
      searchFilters.hasAttachments
    );
  }, [searchFilters]);

  return {
    filteredMessages,
    searchFilters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    resultCount: filteredMessages.length
  };
};

/**
 * Filter threads based on search query
 * 
 * @param threads - Array of threads to filter
 * @param query - Search query
 * @returns Filtered threads
 */
export const filterThreads = <T extends { 
  vendorName?: string; 
  coupleName?: string; 
  lastMessage?: string;
}>(threads: T[], query: string): T[] => {
  if (!query || !query.trim()) {
    return threads;
  }

  const searchQuery = query.toLowerCase().trim();
  
  return threads.filter(thread => {
    const vendorName = thread.vendorName?.toLowerCase() || '';
    const coupleName = thread.coupleName?.toLowerCase() || '';
    const lastMessage = thread.lastMessage?.toLowerCase() || '';
    
    return (
      vendorName.includes(searchQuery) ||
      coupleName.includes(searchQuery) ||
      lastMessage.includes(searchQuery)
    );
  });
};
