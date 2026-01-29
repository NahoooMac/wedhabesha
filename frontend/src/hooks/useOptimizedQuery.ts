import React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { performanceMonitor } from '../lib/performance';

// Enhanced useQuery hook with performance tracking and optimizations
export function useOptimizedQuery<TData = unknown, TError = unknown>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    // Performance tracking options
    trackPerformance?: boolean;
    performanceName?: string;
    // Prefetch options
    prefetchOnMount?: boolean;
    // Background sync options
    backgroundSync?: boolean;
  } = {}
) {
  const {
    trackPerformance = false,
    performanceName,
    prefetchOnMount = false,
    backgroundSync = true,
    ...queryOptions
  } = options;

  // Enhanced query function with performance tracking
  const enhancedQueryFn = async (): Promise<TData> => {
    const perfName = performanceName || `query_${queryKey.join('_')}`;
    
    if (trackPerformance) {
      performanceMonitor.mark(`${perfName}_start`);
    }

    try {
      const result = await queryFn();
      
      if (trackPerformance) {
        performanceMonitor.mark(`${perfName}_end`);
        performanceMonitor.measure(perfName, `${perfName}_start`, `${perfName}_end`);
      }
      
      return result;
    } catch (error) {
      if (trackPerformance) {
        performanceMonitor.mark(`${perfName}_error`);
        performanceMonitor.measure(`${perfName}_error_time`, `${perfName}_start`, `${perfName}_error`);
      }
      throw error;
    }
  };

  const query = useQuery({
    queryKey,
    queryFn: enhancedQueryFn,
    // Optimized defaults
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: backgroundSync,
    refetchOnReconnect: true,
    ...queryOptions,
  });

  // Prefetch on mount if requested
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (prefetchOnMount && !query.data) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: enhancedQueryFn,
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [prefetchOnMount, queryClient, queryKey]);

  return query;
}

// Enhanced useMutation hook with performance tracking
export function useOptimizedMutation<TData = unknown, TError = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TError, TVariables> & {
    // Performance tracking options
    trackPerformance?: boolean;
    performanceName?: string;
    // Optimistic update options
    optimisticUpdate?: {
      queryKey: readonly unknown[];
      updateFn: (oldData: any, variables: TVariables) => any;
    };
    // Invalidation options
    invalidateQueries?: readonly unknown[][];
  } = {}
) {
  const {
    trackPerformance = false,
    performanceName,
    optimisticUpdate,
    invalidateQueries,
    onSuccess,
    onError,
    ...mutationOptions
  } = options;

  const queryClient = useQueryClient();

  // Enhanced mutation function with performance tracking
  const enhancedMutationFn = async (variables: TVariables): Promise<TData> => {
    const perfName = performanceName || 'mutation';
    
    if (trackPerformance) {
      performanceMonitor.mark(`${perfName}_start`);
    }

    try {
      const result = await mutationFn(variables);
      
      if (trackPerformance) {
        performanceMonitor.mark(`${perfName}_end`);
        performanceMonitor.measure(perfName, `${perfName}_start`, `${perfName}_end`);
      }
      
      return result;
    } catch (error) {
      if (trackPerformance) {
        performanceMonitor.mark(`${perfName}_error`);
        performanceMonitor.measure(`${perfName}_error_time`, `${perfName}_start`, `${perfName}_error`);
      }
      throw error;
    }
  };

  return useMutation({
    mutationFn: enhancedMutationFn,
    onMutate: async (variables) => {
      // Optimistic update
      if (optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey });
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);
        queryClient.setQueryData(
          optimisticUpdate.queryKey,
          optimisticUpdate.updateFn(previousData, variables)
        );
        return { previousData };
      }
      // Call original onMutate if provided
      if (mutationOptions.onMutate) {
        return await mutationOptions.onMutate(variables, {} as any);
      }
      return {};
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      if (invalidateQueries) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      onSuccess?.(data, variables, context, {} as any);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (optimisticUpdate && (context as any)?.previousData) {
        queryClient.setQueryData(optimisticUpdate.queryKey, (context as any).previousData);
      }
      
      onError?.(error, variables, context, {} as any);
    },
    ...mutationOptions,
  });
}

// Hook for prefetching related data
export function usePrefetchQueries() {
  const queryClient = useQueryClient();

  const prefetchWeddingData = React.useCallback((weddingId: number) => {
    // Prefetch related wedding data
    queryClient.prefetchQuery({
      queryKey: queryKeys.wedding.detail(weddingId),
      staleTime: 5 * 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.wedding.guests(weddingId),
      staleTime: 5 * 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.wedding.budget(weddingId),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const prefetchVendorData = React.useCallback((vendorId: number) => {
    // Prefetch vendor details and reviews
    queryClient.prefetchQuery({
      queryKey: queryKeys.vendor.detail(vendorId),
      staleTime: 10 * 60 * 1000, // Vendor data is more stable
    });
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.vendor.reviews(vendorId, { skip: 0, limit: 10 }),
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  const prefetchVendorCategories = React.useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vendor.categories(),
      staleTime: 60 * 60 * 1000, // Categories are very stable
    });
  }, [queryClient]);

  return {
    prefetchWeddingData,
    prefetchVendorData,
    prefetchVendorCategories,
  };
}

// Hook for background data synchronization
export function useBackgroundSync() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const interval = setInterval(() => {
      // Refetch stale queries in the background
      queryClient.refetchQueries({
        stale: true,
        type: 'active',
      });
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [queryClient]);

  // Sync on visibility change
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refetch when tab becomes visible
        queryClient.refetchQueries({
          stale: true,
          type: 'active',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);
}

// Hook for query deduplication and batching
export function useQueryBatching() {
  const queryClient = useQueryClient();
  const batchedQueries = React.useRef<Set<string>>(new Set());

  const batchQuery = React.useCallback((
    queryKey: readonly unknown[],
    queryFn: () => Promise<any>,
    delay = 50 // 50ms batching window
  ) => {
    const keyString = JSON.stringify(queryKey);
    
    if (batchedQueries.current.has(keyString)) {
      return queryClient.getQueryData(queryKey);
    }

    batchedQueries.current.add(keyString);
    
    setTimeout(() => {
      batchedQueries.current.delete(keyString);
      queryClient.prefetchQuery({ queryKey, queryFn });
    }, delay);
  }, [queryClient]);

  return { batchQuery };
}