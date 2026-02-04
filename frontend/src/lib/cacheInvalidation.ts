import { QueryClient } from '@tanstack/react-query';

/**
 * Cache Invalidation Service
 * Provides utilities for invalidating React Query caches across the application
 */

export class CacheInvalidationService {
  private static instance: CacheInvalidationService;
  private queryClient: QueryClient | null = null;

  private constructor() {}

  static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  setQueryClient(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Invalidate guest-related caches for a wedding
   */
  async invalidateGuestData(weddingId: number) {
    if (!this.queryClient) {
      console.warn('QueryClient not set in CacheInvalidationService');
      return;
    }

    try {
      // Invalidate guest list
      await this.queryClient.invalidateQueries({ 
        queryKey: ['guests', weddingId] 
      });

      // Invalidate RSVP analytics
      await this.queryClient.invalidateQueries({ 
        queryKey: ['rsvp-analytics', weddingId] 
      });

      // Invalidate any other guest-related queries
      await this.queryClient.invalidateQueries({ 
        queryKey: ['wedding', weddingId] 
      });
    } catch (error) {
      console.error(`❌ Failed to invalidate cache for wedding ${weddingId}:`, error);
    }
  }

  /**
   * Trigger cache invalidation from RSVP submission
   */
  async handleRSVPUpdate(weddingId: number) {
    console.log(`🎯 RSVP update detected for wedding ${weddingId}, triggering cache invalidation`);
    
    await this.invalidateGuestData(weddingId);
    
    // Also trigger a small delay to ensure backend has processed the update
    setTimeout(() => {
      this.invalidateGuestData(weddingId);
    }, 1000);
  }

  /**
   * Set up periodic refresh for guest data (polling fallback)
   */
  setupPeriodicRefresh(weddingId: number, intervalMs: number = 30000) {
    if (!this.queryClient) {
      console.warn('QueryClient not set in CacheInvalidationService');
      return null;
    }

    const interval = setInterval(() => {
      this.invalidateGuestData(weddingId);
    }, intervalMs);

    return () => clearInterval(interval);
  }
}

// Export singleton instance
export const cacheInvalidationService = CacheInvalidationService.getInstance();

// Utility function for components to use
export const useInvalidateGuestData = () => {
  return (weddingId: number) => {
    cacheInvalidationService.invalidateGuestData(weddingId);
  };
};