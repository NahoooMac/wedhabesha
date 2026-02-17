/**
 * Sync Service for Offline-First Check-In System
 * Handles synchronization of offline check-ins with the backend
 */

import { indexedDBService, PendingCheckIn } from './indexedDBService';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  unsyncedCount: number;
  error: string | null;
}

class SyncService {
  private syncInProgress = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private onlineStatusListeners: Array<(isOnline: boolean) => void> = [];
  private connectionCheckInterval: number | null = null;
  private autoSyncInterval: number | null = null;
  private lastConnectionCheck: Date | null = null;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly AUTO_SYNC_INTERVAL = 60000; // 1 minute

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Start periodic connection checks
    this.startConnectionMonitoring();
    
    // Start auto-sync when online
    this.startAutoSync();
  }

  /**
   * Check if browser is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Start periodic connection monitoring
   */
  private startConnectionMonitoring(): void {
    // Clear existing interval if any
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    // Check connection periodically
    this.connectionCheckInterval = window.setInterval(() => {
      this.checkBackendConnection();
    }, this.CONNECTION_CHECK_INTERVAL);

    // Do initial check
    this.checkBackendConnection();
  }

  /**
   * Start automatic sync when online
   */
  private startAutoSync(): void {
    // Clear existing interval if any
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    // Auto-sync periodically when online
    this.autoSyncInterval = window.setInterval(async () => {
      if (this.isOnline() && !this.syncInProgress) {
        const stats = await indexedDBService.getCheckInStats();
        if (stats.unsyncedCount > 0) {
          console.log(`🔄 Auto-sync: ${stats.unsyncedCount} pending check-ins`);
          this.syncPendingCheckIns();
        }
      }
    }, this.AUTO_SYNC_INTERVAL);
  }

  /**
   * Check actual backend connection (not just browser online status)
   */
  private async checkBackendConnection(): Promise<boolean> {
    try {
      // Try to fetch a lightweight endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/v1/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      const isConnected = response.ok;
      this.lastConnectionCheck = new Date();

      if (isConnected) {
        this.consecutiveFailures = 0;
        
        // If we just came back online, trigger sync
        if (!this.syncInProgress) {
          const stats = await indexedDBService.getCheckInStats();
          if (stats.unsyncedCount > 0) {
            console.log('🌐 Backend connection restored - syncing pending check-ins');
            this.syncPendingCheckIns();
          }
        }
      } else {
        this.consecutiveFailures++;
      }

      return isConnected;
    } catch (error) {
      this.consecutiveFailures++;
      
      // If we've failed multiple times, notify listeners we're offline
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        console.log('📴 Backend connection lost (multiple failures)');
        this.notifyOnlineListeners(false);
      }
      
      return false;
    }
  }

  /**
   * Check if backend is actually reachable (more reliable than navigator.onLine)
   */
  async isBackendReachable(): Promise<boolean> {
    return this.checkBackendConnection();
  }

  /**
   * Stop all monitoring (for cleanup)
   */
  stopMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Subscribe to sync status updates
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to online status changes
   */
  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.onlineStatusListeners.push(callback);
    
    // Immediately call with current status
    callback(this.isOnline());
    
    // Return unsubscribe function
    return () => {
      this.onlineStatusListeners = this.onlineStatusListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all sync listeners
   */
  private notifySyncListeners(status: SyncStatus): void {
    this.syncListeners.forEach(callback => callback(status));
  }

  /**
   * Notify all online status listeners
   */
  private notifyOnlineListeners(isOnline: boolean): void {
    this.onlineStatusListeners.forEach(callback => callback(isOnline));
  }

  /**
   * Handle online event
   */
  private async handleOnline(): Promise<void> {
    console.log('🌐 Connection restored - attempting sync...');
    this.notifyOnlineListeners(true);
    
    // Wait a bit for connection to stabilize
    setTimeout(() => {
      this.syncPendingCheckIns();
    }, 1000);
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('📴 Connection lost - operating in offline mode');
    this.notifyOnlineListeners(false);
  }

  /**
   * Sync all pending check-ins with the backend
   */
  async syncPendingCheckIns(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress, skipping...');
      return { success: false, syncedCount: 0, error: 'Sync already in progress' };
    }

    if (!this.isOnline()) {
      console.log('📴 Offline - cannot sync');
      return { success: false, syncedCount: 0, error: 'Device is offline' };
    }

    this.syncInProgress = true;
    let syncedCount = 0;
    let lastError: string | null = null;

    try {
      // Get metadata for session token
      const metadata = await indexedDBService.getMetadata(0); // We'll need to pass wedding_id properly
      if (!metadata) {
        throw new Error('No session metadata found');
      }

      // Get all unsynced check-ins
      const unsyncedCheckIns = await indexedDBService.getUnsyncedCheckIns();
      
      this.notifySyncListeners({
        isSyncing: true,
        lastSyncTime: null,
        unsyncedCount: unsyncedCheckIns.length,
        error: null
      });

      console.log(`🔄 Syncing ${unsyncedCheckIns.length} pending check-ins...`);

      // Sync each check-in
      for (const checkIn of unsyncedCheckIns) {
        try {
          await this.syncSingleCheckIn(checkIn, metadata.session_token);
          await indexedDBService.markCheckInAsSynced(checkIn.id);
          syncedCount++;
          console.log(`✅ Synced check-in for ${checkIn.guest_name}`);
        } catch (error) {
          console.error(`❌ Failed to sync check-in for ${checkIn.guest_name}:`, error);
          lastError = error instanceof Error ? error.message : 'Sync failed';
          // Continue with other check-ins even if one fails
        }
      }

      const remainingUnsynced = unsyncedCheckIns.length - syncedCount;
      
      this.notifySyncListeners({
        isSyncing: false,
        lastSyncTime: new Date(),
        unsyncedCount: remainingUnsynced,
        error: lastError
      });

      console.log(`✅ Sync complete: ${syncedCount}/${unsyncedCheckIns.length} synced`);

      return {
        success: syncedCount > 0,
        syncedCount,
        error: lastError || undefined
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('❌ Sync failed:', errorMessage);
      
      this.notifySyncListeners({
        isSyncing: false,
        lastSyncTime: null,
        unsyncedCount: 0,
        error: errorMessage
      });

      return {
        success: false,
        syncedCount,
        error: errorMessage
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single check-in to the backend
   */
  private async syncSingleCheckIn(checkIn: PendingCheckIn, sessionToken: string): Promise<void> {
    const response = await fetch('/api/checkin/scan-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        qr_code: checkIn.qr_code,
        checked_in_at: checkIn.checked_in_at // Send the original timestamp
      })
    });

    if (!response.ok) {
      // If it's a 409 (already checked in), that's okay - mark as synced
      if (response.status === 409 || response.status === 200) {
        const data = await response.json();
        if (data.is_duplicate) {
          console.log(`ℹ️ Guest ${checkIn.guest_name} already checked in on server`);
          return; // Success - will be marked as synced
        }
      }
      
      const errorData = await response.json().catch(() => ({ message: 'Sync failed' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const stats = await indexedDBService.getCheckInStats();
    
    return {
      isSyncing: this.syncInProgress,
      lastSyncTime: null, // We could store this in IndexedDB if needed
      unsyncedCount: stats.unsyncedCount,
      error: null
    };
  }

  /**
   * Force a sync attempt
   */
  async forceSyncNow(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (!this.isOnline()) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Cannot sync while offline'
      };
    }

    return this.syncPendingCheckIns();
  }
}

// Export singleton instance
export const syncService = new SyncService();
