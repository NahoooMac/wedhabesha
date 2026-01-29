import { QueryClient } from '@tanstack/react-query';
import { ApiError, NetworkError, TimeoutError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Enhanced caching configuration for better performance
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - increased cache time for better performance
      
      // Background refetch optimization
      refetchOnWindowFocus: false, // Disable refetch on window focus for better UX
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts
      
      // Network waterfall optimization
      networkMode: 'online', // Only run queries when online
      
      retry: (failureCount, error: any) => {
        // Don't retry on client errors (4xx) except for specific cases
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
            return false;
          }
          // Retry server errors up to 3 times
          return failureCount < 3;
        }
        
        // Always retry network and timeout errors
        if (error instanceof NetworkError || error instanceof TimeoutError) {
          return failureCount < 3;
        }
        
        // For other errors, check status if available
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
        const jitter = Math.random() * 0.1 * baseDelay;
        return baseDelay + jitter;
      },
    },
    mutations: {
      // Network mode for mutations
      networkMode: 'online',
      
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        
        // Retry network/timeout errors once for mutations
        if (error instanceof NetworkError || error instanceof TimeoutError) {
          return failureCount < 1;
        }
        
        // Retry server errors once
        if (error instanceof ApiError && error.status >= 500) {
          return failureCount < 1;
        }
        
        return false;
      },
      retryDelay: 1000, // 1 second delay for mutation retries
    },
  },
});

// Query key factory for consistent caching
export const queryKeys = {
  // Wedding related queries
  wedding: {
    all: ['wedding'] as const,
    detail: (id: number) => [...queryKeys.wedding.all, 'detail', id] as const,
    guests: (weddingId: number) => [...queryKeys.wedding.all, 'guests', weddingId] as const,
    budget: (weddingId: number) => [...queryKeys.wedding.all, 'budget', weddingId] as const,
    analytics: (weddingId: number) => [...queryKeys.wedding.all, 'analytics', weddingId] as const,
  },
  
  // Vendor related queries
  vendor: {
    all: ['vendor'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.vendor.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.vendor.all, 'detail', id] as const,
    reviews: (id: number, filters: Record<string, any>) => [...queryKeys.vendor.all, 'reviews', id, filters] as const,
    categories: () => [...queryKeys.vendor.all, 'categories'] as const,
    profile: () => [...queryKeys.vendor.all, 'profile'] as const,
    leads: (filters: Record<string, any>) => [...queryKeys.vendor.all, 'leads', filters] as const,
  },
  
  // Staff related queries
  staff: {
    all: ['staff'] as const,
    stats: (token: string) => [...queryKeys.staff.all, 'stats', token] as const,
    guests: (token: string, search?: string) => [...queryKeys.staff.all, 'guests', token, search] as const,
  },
  
  // Communication related queries
  communication: {
    all: ['communication'] as const,
    templates: () => [...queryKeys.communication.all, 'templates'] as const,
    deliveryStatus: (messageId: string) => [...queryKeys.communication.all, 'delivery', messageId] as const,
  },
  
  // Admin related queries
  admin: {
    all: ['admin'] as const,
    applications: (filters: Record<string, any>) => [...queryKeys.admin.all, 'applications', filters] as const,
    subscriptions: (filters: Record<string, any>) => [...queryKeys.admin.all, 'subscriptions', filters] as const,
    flaggedReviews: (filters: Record<string, any>) => [...queryKeys.admin.all, 'flagged-reviews', filters] as const,
    analytics: () => [...queryKeys.admin.all, 'analytics'] as const,
    auditLogs: (filters: Record<string, any>) => [...queryKeys.admin.all, 'audit-logs', filters] as const,
  },
} as const;