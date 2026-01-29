import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, UserType } from '../../types/messaging';
import MessageThread from './MessageThread';

interface MessageListProps {
  threadId: string;
  currentUserId: string;
  currentUserType: UserType;
  onLoadMore: (offset: number, limit: number) => Promise<Message[]>;
  onMessageRead?: (messageId: string) => void;
  onSearch?: (query: string) => Promise<Message[]>;
  pageSize?: number;
}

/**
 * MessageList Component
 * 
 * Implements infinite scroll for long conversations and message search functionality.
 * 
 * Requirements: 3.2 (message search), 3.3 (pagination)
 */
export const MessageList: React.FC<MessageListProps> = ({
  threadId,
  currentUserId,
  currentUserType,
  onLoadMore,
  onMessageRead,
  onSearch,
  pageSize = 50
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load
  useEffect(() => {
    loadInitialMessages();
  }, [threadId]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasMore || isLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMoreMessages();
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1
      }
    );

    observerRef.current.observe(loadMoreTriggerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, isLoading, offset]);

  // Cleanup search timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const loadInitialMessages = async () => {
    setIsLoading(true);
    setError(null);
    setOffset(0);
    setHasMore(true);

    try {
      const newMessages = await onLoadMore(0, pageSize);
      setMessages(newMessages);
      setHasMore(newMessages.length === pageSize);
      setOffset(pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const newMessages = await onLoadMore(offset, pageSize);
      
      if (newMessages.length === 0) {
        setHasMore(false);
      } else {
        // Prepend older messages to the beginning
        setMessages((prev) => [...newMessages, ...prev]);
        setOffset((prev) => prev + newMessages.length);
        setHasMore(newMessages.length === pageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = useCallback(
    async (query: string) => {
      if (!onSearch) return;

      setSearchQuery(query);

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // If query is empty, clear search results
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        setError(null);

        try {
          const results = await onSearch(query.trim());
          setSearchResults(results);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Search failed');
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [onSearch]
  );

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // Reserved for future use - scroll to specific message in search results
  // const scrollToMessage = (messageId: string) => {
  //   const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  //   if (messageElement) {
  //     messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //     
  //     // Highlight the message briefly
  //     messageElement.classList.add('bg-yellow-100');
  //     setTimeout(() => {
  //       messageElement.classList.remove('bg-yellow-100');
  //     }, 2000);
  //   }
  // };

  const displayMessages = searchQuery.trim() ? searchResults : messages;

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      {onSearch && (
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
              autoComplete="off"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 active:text-gray-700 touch-manipulation p-1"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          
          {/* Search status */}
          {isSearching && (
            <p className="text-sm text-gray-500 mt-2">Searching...</p>
          )}
          {searchQuery && !isSearching && (
            <p className="text-sm text-gray-500 mt-2">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Messages container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto touch-pan-y overscroll-contain"
      >
        {/* Load more trigger (at top for older messages) */}
        {!searchQuery && hasMore && (
          <div ref={loadMoreTriggerRef} className="h-10 flex items-center justify-center">
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm">Loading older messages...</span>
              </div>
            )}
          </div>
        )}

        {/* Message thread */}
        {displayMessages.length > 0 ? (
          <MessageThread
            messages={displayMessages}
            currentUserId={currentUserId}
            currentUserType={currentUserType}
            onMessageRead={onMessageRead}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <svg
                  className="animate-spin h-8 w-8"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading messages...</span>
              </div>
            ) : searchQuery ? (
              <div className="text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="text-lg font-medium">No results found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Search results navigation */}
      {searchQuery && searchResults.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {searchResults.length} message{searchResults.length !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={clearSearch}
              className="text-blue-500 hover:text-blue-600 active:text-blue-700 font-medium touch-manipulation"
            >
              Clear search
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
