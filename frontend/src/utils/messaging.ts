/**
 * Messaging Utilities
 * 
 * Utility functions for messaging functionality
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

export interface CreateThreadRequest {
  vendorId: string;
  initialMessage?: string;
}

export interface CreateThreadResponse {
  thread: {
    id: string;
    coupleId: string;
    vendorId: string;
    createdAt: string;
  };
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const authToken = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
  return !!authToken;
};

/**
 * Create or get existing thread with a vendor
 * If thread already exists, returns the existing thread
 * If not, creates a new thread with optional initial message
 */
export const createOrGetThread = async (vendorId: string, initialMessage?: string): Promise<CreateThreadResponse> => {
  const authToken = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
  
  if (!authToken) {
    throw new Error('Authentication required');
  }

  const response = await fetch('/api/v1/messaging/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      vendorId,
      initialMessage: initialMessage || `Hi, I'm interested in your services for my wedding. Could you please provide more information?`
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.message || `Route /api/v1/messaging/threads not found`);
  }

  const result = await response.json();
  
  // Handle different response structures
  if (result.success && result.data) {
    return {
      thread: result.data.thread || result.data
    };
  } else if (result.thread) {
    return result;
  } else {
    throw new Error('Invalid response structure from server');
  }
};

/**
 * Navigate to Communication tab with specific thread open
 * This function handles the redirect logic for opening a thread
 */
export const navigateToThread = (threadId: string) => {
  // Store the thread ID to open in localStorage for the dashboard to pick up
  localStorage.setItem('openThreadId', threadId);
  
  // Trigger a custom event to notify the dashboard
  window.dispatchEvent(new CustomEvent('openThread', { 
    detail: { threadId } 
  }));
};

/**
 * Handle "Message Vendor" button click
 * Creates/opens thread and redirects to Communication tab
 * For vendors on landing page, stores intent and redirects to login/dashboard
 */
export const handleMessageVendor = async (
  vendorId: string, 
  vendorName: string,
  onSuccess?: (threadId: string) => void,
  onError?: (error: string) => void
) => {
  try {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // Store the vendor message intent for after login
      localStorage.setItem('pendingVendorMessage', JSON.stringify({ vendorId, vendorName }));
      
      // Redirect to login with return path
      window.location.href = '/login?returnTo=vendor-messages';
      return;
    }
    
    // User is authenticated - create or get existing thread
    const result = await createOrGetThread(vendorId);
    
    // Store the thread ID to open
    localStorage.setItem('openThreadId', result.thread.id);
    
    // Check if user is already on the dashboard
    const currentPath = window.location.pathname;
    const isDashboard = currentPath.includes('/dashboard');
    
    if (isDashboard) {
      // Already on dashboard - just trigger the event to open the thread
      navigateToThread(result.thread.id);
    } else {
      // Not on dashboard - redirect to dashboard with Messages tab
      window.location.href = '/dashboard?tab=communication';
    }
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess(result.thread.id);
    }
    
    return result.thread;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
    console.error('Error creating thread with vendor:', error);
    
    // Call error callback if provided
    if (onError) {
      onError(errorMessage);
    }
    
    throw error;
  }
};