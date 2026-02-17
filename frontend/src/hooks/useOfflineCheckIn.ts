/**
 * React Hook for Offline Check-In
 * Provides offline check-in functionality with sync status
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineCheckInService, CheckInResult } from '../services/offlineCheckInService';
import { syncService, SyncStatus } from '../services/syncService';

export interface UseOfflineCheckInReturn {
  // Check-in functions
  checkInByQRCode: (qrCode: string) => Promise<CheckInResult>;
  checkInByGuestId: (guestId: number) => Promise<CheckInResult>;
  
  // Initialization
  initializeOfflineMode: (weddingId: number, weddingCode: string, sessionToken: string) => Promise<void>;
  isOfflineModeReady: boolean;
  
  // Online/offline status
  isOnline: boolean;
  
  // Sync status
  syncStatus: SyncStatus;
  forceSyncNow: () => Promise<void>;
  
  // Stats
  stats: {
    total: number;
    checkedIn: number;
    pending: number;
    unsyncedCount: number;
  } | null;
  refreshStats: () => Promise<void>;
  
  // Loading states
  isInitializing: boolean;
  initError: string | null;
}

export function useOfflineCheckIn(): UseOfflineCheckInReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineModeReady, setIsOfflineModeReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    unsyncedCount: 0,
    error: null
  });
  
  const [stats, setStats] = useState<{
    total: number;
    checkedIn: number;
    pending: number;
    unsyncedCount: number;
  } | null>(null);

  // Subscribe to online/offline status
  useEffect(() => {
    const unsubscribe = syncService.onOnlineStatusChange((online) => {
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  // Subscribe to sync status updates
  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
      
      // Refresh stats after sync completes
      if (!status.isSyncing && status.lastSyncTime) {
        refreshStats();
      }
    });

    return unsubscribe;
  }, []);

  // Check if offline mode is ready on mount
  useEffect(() => {
    offlineCheckInService.isOfflineModeReady().then(setIsOfflineModeReady);
  }, []);

  // Initialize offline mode
  const initializeOfflineMode = useCallback(async (
    weddingId: number,
    weddingCode: string,
    sessionToken: string
  ) => {
    setIsInitializing(true);
    setInitError(null);

    try {
      const result = await offlineCheckInService.initializeOfflineMode(
        weddingId,
        weddingCode,
        sessionToken
      );

      if (!result.success) {
        throw new Error(result.error || 'Initialization failed');
      }

      setIsOfflineModeReady(true);
      await refreshStats();
      
      console.log(`✅ Offline mode initialized with ${result.guestsDownloaded} guests`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
      setInitError(errorMessage);
      console.error('❌ Failed to initialize offline mode:', errorMessage);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Check in by QR code
  const checkInByQRCode = useCallback(async (qrCode: string): Promise<CheckInResult> => {
    const result = await offlineCheckInService.checkInByQRCode(qrCode);
    await refreshStats();
    return result;
  }, []);

  // Check in by guest ID
  const checkInByGuestId = useCallback(async (guestId: number): Promise<CheckInResult> => {
    const result = await offlineCheckInService.checkInByGuestId(guestId);
    await refreshStats();
    return result;
  }, []);

  // Refresh statistics
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await offlineCheckInService.getStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, []);

  // Force sync now
  const forceSyncNow = useCallback(async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return;
    }

    try {
      const result = await syncService.forceSyncNow();
      console.log(`Sync result: ${result.syncedCount} synced`);
      await refreshStats();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  }, [isOnline]);

  return {
    checkInByQRCode,
    checkInByGuestId,
    initializeOfflineMode,
    isOfflineModeReady,
    isOnline,
    syncStatus,
    forceSyncNow,
    stats,
    refreshStats,
    isInitializing,
    initError
  };
}
