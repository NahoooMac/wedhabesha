/**
 * @fileoverview Thread Management Utilities
 * 
 * Provides utility functions for managing messaging threads including sorting,
 * reordering, and preview generation to ensure consistent thread management
 * across couple and vendor messaging interfaces.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * Requirements satisfied:
 * - 9.1: Thread sorting by most recent activity
 * - 9.2: Automatic thread reordering when new messages arrive
 * - 9.3: Accurate thread previews with most recent message content
 */

/**
 * Thread interface for sorting and management
 */
export interface SortableThread {
  id: string;
  lastMessage: string;
  lastMessageTime: Date | string;
  unreadCount: number;
  status: 'active' | 'archived';
  [key: string]: any; // Allow additional properties
}

/**
 * Sort threads by most recent activity (lastMessageTime)
 * 
 * Threads are sorted in descending order with most recent first.
 * Handles both Date objects and ISO string dates.
 * 
 * @param threads - Array of threads to sort
 * @returns Sorted array of threads (most recent first)
 * 
 * @example
 * ```typescript
 * const sorted = sortThreadsByActivity(threads);
 * // Returns threads with most recent message first
 * ```
 * 
 * @satisfies Requirement 9.1
 */
export function sortThreadsByActivity<T extends SortableThread>(threads: T[]): T[] {
  return [...threads].sort((a, b) => {
    const timeA = typeof a.lastMessageTime === 'string' 
      ? new Date(a.lastMessageTime).getTime() 
      : a.lastMessageTime.getTime();
    
    const timeB = typeof b.lastMessageTime === 'string' 
      ? new Date(b.lastMessageTime).getTime() 
      : b.lastMessageTime.getTime();
    
    // Sort in descending order (most recent first)
    return timeB - timeA;
  });
}

/**
 * Reorder threads when a new message arrives
 * 
 * Moves the thread with the new message to the top of the list
 * and updates its last message information.
 * 
 * @param threads - Current array of threads
 * @param threadId - ID of the thread that received a new message
 * @param newMessage - Content of the new message
 * @param newMessageTime - Timestamp of the new message
 * @param incrementUnread - Whether to increment unread count (default: false)
 * @returns Updated and reordered array of threads
 * 
 * @example
 * ```typescript
 * const updated = reorderThreadOnNewMessage(
 *   threads,
 *   'thread-123',
 *   'Hello!',
 *   new Date(),
 *   true
 * );
 * ```
 * 
 * @satisfies Requirements 9.2, 9.3
 */
export function reorderThreadOnNewMessage<T extends SortableThread>(
  threads: T[],
  threadId: string,
  newMessage: string,
  newMessageTime: Date | string,
  incrementUnread: boolean = false
): T[] {
  // Find the thread that received the message
  const threadIndex = threads.findIndex(t => t.id === threadId);
  
  if (threadIndex === -1) {
    // Thread not found, return original array
    return threads;
  }
  
  // Create a copy of the threads array
  const updatedThreads = [...threads];
  
  // Update the thread with new message information
  const updatedThread = {
    ...updatedThreads[threadIndex],
    lastMessage: newMessage,
    lastMessageTime: newMessageTime,
    unreadCount: incrementUnread 
      ? updatedThreads[threadIndex].unreadCount + 1 
      : updatedThreads[threadIndex].unreadCount
  };
  
  // Remove the thread from its current position
  updatedThreads.splice(threadIndex, 1);
  
  // Add the updated thread to the beginning of the array
  updatedThreads.unshift(updatedThread);
  
  return updatedThreads;
}

/**
 * Update thread preview with most recent message
 * 
 * Updates a specific thread's preview information without reordering.
 * Useful for updating thread details without changing sort order.
 * 
 * @param threads - Current array of threads
 * @param threadId - ID of the thread to update
 * @param updates - Partial thread updates to apply
 * @returns Updated array of threads
 * 
 * @example
 * ```typescript
 * const updated = updateThreadPreview(threads, 'thread-123', {
 *   lastMessage: 'New message content',
 *   lastMessageTime: new Date()
 * });
 * ```
 * 
 * @satisfies Requirement 9.3
 */
export function updateThreadPreview<T extends SortableThread>(
  threads: T[],
  threadId: string,
  updates: Partial<T>
): T[] {
  return threads.map(thread => 
    thread.id === threadId 
      ? { ...thread, ...updates }
      : thread
  );
}

/**
 * Clear unread count for a specific thread
 * 
 * Sets the unread count to 0 for the specified thread.
 * Used when a thread is opened and all messages are marked as read.
 * 
 * @param threads - Current array of threads
 * @param threadId - ID of the thread to clear unread count
 * @returns Updated array of threads
 * 
 * @example
 * ```typescript
 * const updated = clearThreadUnreadCount(threads, 'thread-123');
 * ```
 * 
 * @satisfies Requirement 9.4
 */
export function clearThreadUnreadCount<T extends SortableThread>(
  threads: T[],
  threadId: string
): T[] {
  return threads.map(thread => 
    thread.id === threadId 
      ? { ...thread, unreadCount: 0 }
      : thread
  );
}

/**
 * Get threads with unread messages
 * 
 * Filters threads to return only those with unread messages.
 * Useful for displaying unread indicators or counts.
 * 
 * @param threads - Array of threads to filter
 * @returns Array of threads with unread messages
 * 
 * @example
 * ```typescript
 * const unreadThreads = getUnreadThreads(threads);
 * console.log(`You have ${unreadThreads.length} unread conversations`);
 * ```
 * 
 * @satisfies Requirement 9.4
 */
export function getUnreadThreads<T extends SortableThread>(threads: T[]): T[] {
  return threads.filter(thread => thread.unreadCount > 0);
}

/**
 * Get total unread message count across all threads
 * 
 * Calculates the sum of unread messages across all threads.
 * 
 * @param threads - Array of threads
 * @returns Total number of unread messages
 * 
 * @example
 * ```typescript
 * const totalUnread = getTotalUnreadCount(threads);
 * console.log(`You have ${totalUnread} unread messages`);
 * ```
 * 
 * @satisfies Requirement 9.4
 */
export function getTotalUnreadCount<T extends SortableThread>(threads: T[]): number {
  return threads.reduce((total, thread) => total + thread.unreadCount, 0);
}

/**
 * Archive or unarchive a thread
 * 
 * Updates the status of a thread to 'archived' or 'active'.
 * 
 * @param threads - Current array of threads
 * @param threadId - ID of the thread to archive/unarchive
 * @param archive - Whether to archive (true) or unarchive (false)
 * @returns Updated array of threads
 * 
 * @example
 * ```typescript
 * const archived = archiveThread(threads, 'thread-123', true);
 * const unarchived = archiveThread(threads, 'thread-123', false);
 * ```
 * 
 * @satisfies Requirement 9.5
 */
export function archiveThread<T extends SortableThread>(
  threads: T[],
  threadId: string,
  archive: boolean = true
): T[] {
  return threads.map(thread => 
    thread.id === threadId 
      ? { ...thread, status: archive ? 'archived' as const : 'active' as const }
      : thread
  );
}

/**
 * Remove a thread from the list
 * 
 * Removes a thread completely from the array.
 * Used when a thread is deleted.
 * 
 * @param threads - Current array of threads
 * @param threadId - ID of the thread to remove
 * @returns Updated array of threads without the removed thread
 * 
 * @example
 * ```typescript
 * const updated = removeThread(threads, 'thread-123');
 * ```
 * 
 * @satisfies Requirement 9.5
 */
export function removeThread<T extends SortableThread>(
  threads: T[],
  threadId: string
): T[] {
  return threads.filter(thread => thread.id !== threadId);
}

/**
 * Truncate message preview to a maximum length
 * 
 * Truncates a message string to the specified length and adds ellipsis.
 * Useful for displaying message previews in thread lists.
 * 
 * @param message - Message content to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated message with ellipsis if needed
 * 
 * @example
 * ```typescript
 * const preview = truncateMessagePreview('This is a very long message...', 20);
 * // Returns: "This is a very long..."
 * ```
 * 
 * @satisfies Requirement 9.3
 */
export function truncateMessagePreview(message: string, maxLength: number = 50): string {
  if (!message || message.length <= maxLength) {
    return message || '';
  }
  
  return message.substring(0, maxLength).trim() + '...';
}
