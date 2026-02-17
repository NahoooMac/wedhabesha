/**
 * Offline Check-In Service
 * Main service for handling offline-first check-in operations
 */

import { indexedDBService, Guest, PendingCheckIn, WeddingMetadata } from './indexedDBService';
import { syncService } from './syncService';

export interface CheckInResult {
  success: boolean;
  guestName: string;
  isDuplicate: boolean;
  isOffline: boolean;
  message: string;
  timestamp: string;
}

export interface InitializationResult {
  success: boolean;
  guestsDownloaded: number;
  error?: string;
}

class OfflineCheckInService {
  private autoInitEnabled = false;
  private currentWeddingId: number | null = null;
  private currentWeddingCode: string | null = null;
  private currentSessionToken: string | null = null;

  constructor() {
    // Listen for connection changes to auto-download data
    syncService.onOnlineStatusChange((isOnline) => {
      if (isOnline && this.autoInitEnabled && this.currentSessionToken) {
        console.log('🌐 Connection restored - checking for data updates');
        this.refreshGuestData();
      }
    });
  }

  /**
   * Enable automatic initialization when connection is available
   */
  enableAutoInit(weddingId: number, weddingCode: string, sessionToken: string): void {
    this.autoInitEnabled = true;
    this.currentWeddingId = weddingId;
    this.currentWeddingCode = weddingCode;
    this.currentSessionToken = sessionToken;
    
    console.log('✅ Auto-init enabled for offline mode');
  }

  /**
   * Disable automatic initialization
   */
  disableAutoInit(): void {
    this.autoInitEnabled = false;
    this.currentWeddingId = null;
    this.currentWeddingCode = null;
    this.currentSessionToken = null;
    
    console.log('🛑 Auto-init disabled');
  }

  /**
   * Refresh guest data from backend (when connection is available)
   */
  private async refreshGuestData(): Promise<void> {
    if (!this.currentWeddingId || !this.currentWeddingCode || !this.currentSessionToken) {
      return;
    }

    try {
      console.log('🔄 Refreshing guest data from backend...');
      const result = await this.initializeOfflineMode(
        this.currentWeddingId,
        this.currentWeddingCode,
        this.currentSessionToken
      );

      if (result.success) {
        console.log(`✅ Guest data refreshed: ${result.guestsDownloaded} guests`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to refresh guest data:', error);
    }
  }
  /**
   * Initialize offline mode - download guest list and store locally
   */
  async initializeOfflineMode(
    weddingId: number,
    weddingCode: string,
    sessionToken: string
  ): Promise<InitializationResult> {
    try {
      console.log('📥 Downloading guest list for offline mode...');

      // Check if we're online first
      if (!syncService.isOnline()) {
        // Try to use cached data if available
        const cachedGuests = await indexedDBService.getAllGuests();
        if (cachedGuests.length > 0) {
          console.log(`ℹ️ Offline - using ${cachedGuests.length} cached guests`);
          return {
            success: true,
            guestsDownloaded: cachedGuests.length
          };
        }
        
        return {
          success: false,
          guestsDownloaded: 0,
          error: 'No internet connection and no cached data available'
        };
      }

      // Fetch guest list from backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`/api/checkin/guests?wedding_id=${weddingId}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch guest list`);
      }

      const guests: Guest[] = await response.json();

      // Store guests in IndexedDB
      await indexedDBService.saveGuests(guests);

      // Store metadata
      const metadata: WeddingMetadata = {
        wedding_id: weddingId,
        wedding_code: weddingCode,
        session_token: sessionToken,
        last_sync: new Date().toISOString(),
        total_guests: guests.length
      };
      await indexedDBService.saveMetadata(metadata);

      // Enable auto-init for future connection changes
      this.enableAutoInit(weddingId, weddingCode, sessionToken);

      console.log(`✅ Downloaded ${guests.length} guests for offline mode`);

      return {
        success: true,
        guestsDownloaded: guests.length
      };

    } catch (error) {
      console.error('❌ Failed to initialize offline mode:', error);
      
      // Check if we have cached data to fall back on
      try {
        const cachedGuests = await indexedDBService.getAllGuests();
        if (cachedGuests.length > 0) {
          console.log(`⚠️ Using ${cachedGuests.length} cached guests (download failed)`);
          
          // Still enable auto-init so we can try again later
          this.enableAutoInit(weddingId, weddingCode, sessionToken);
          
          return {
            success: true,
            guestsDownloaded: cachedGuests.length
          };
        }
      } catch (cacheError) {
        console.error('Failed to check cached data:', cacheError);
      }
      
      return {
        success: false,
        guestsDownloaded: 0,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Check in a guest by QR code (works offline)
   */
  async checkInByQRCode(qrCode: string): Promise<CheckInResult> {
    const timestamp = new Date().toISOString();
    const isOffline = !syncService.isOnline();

    try {
      // Look up guest in local database
      const guest = await indexedDBService.getGuestByQRCode(qrCode);

      if (!guest) {
        return {
          success: false,
          guestName: '',
          isDuplicate: false,
          isOffline,
          message: 'Guest not found. Invalid QR code.',
          timestamp
        };
      }

      // Check if already checked in locally
      const isAlreadyCheckedIn = await indexedDBService.isGuestCheckedIn(guest.id);

      if (isAlreadyCheckedIn) {
        return {
          success: true,
          guestName: guest.name,
          isDuplicate: true,
          isOffline,
          message: `${guest.name} is already checked in`,
          timestamp: guest.checked_in_at || timestamp
        };
      }

      // Update local database
      await indexedDBService.updateGuestCheckIn(guest.id, timestamp);

      // Add to pending sync queue
      const pendingCheckIn: PendingCheckIn = {
        id: crypto.randomUUID(),
        guest_id: guest.id,
        guest_name: guest.name,
        qr_code: qrCode,
        checked_in_at: timestamp,
        synced: false,
        created_at: timestamp
      };
      await indexedDBService.addPendingCheckIn(pendingCheckIn);

      console.log(`✅ Checked in ${guest.name} (offline: ${isOffline})`);

      // If online, try to sync immediately
      if (!isOffline) {
        syncService.syncPendingCheckIns().catch(err => {
          console.warn('Background sync failed:', err);
        });
      }

      return {
        success: true,
        guestName: guest.name,
        isDuplicate: false,
        isOffline,
        message: isOffline 
          ? `${guest.name} checked in (will sync when online)`
          : `${guest.name} checked in successfully`,
        timestamp
      };

    } catch (error) {
      console.error('❌ Check-in failed:', error);
      return {
        success: false,
        guestName: '',
        isDuplicate: false,
        isOffline,
        message: error instanceof Error ? error.message : 'Check-in failed',
        timestamp
      };
    }
  }

  /**
   * Manual check-in by guest ID (works offline)
   */
  async checkInByGuestId(guestId: number): Promise<CheckInResult> {
    const timestamp = new Date().toISOString();
    const isOffline = !syncService.isOnline();

    try {
      // Get all guests and find the one with matching ID
      const guests = await indexedDBService.getAllGuests();
      const guest = guests.find(g => g.id === guestId);

      if (!guest) {
        return {
          success: false,
          guestName: '',
          isDuplicate: false,
          isOffline,
          message: 'Guest not found',
          timestamp
        };
      }

      // Check if already checked in locally
      const isAlreadyCheckedIn = await indexedDBService.isGuestCheckedIn(guest.id);

      if (isAlreadyCheckedIn) {
        return {
          success: true,
          guestName: guest.name,
          isDuplicate: true,
          isOffline,
          message: `${guest.name} is already checked in`,
          timestamp: guest.checked_in_at || timestamp
        };
      }

      // Update local database
      await indexedDBService.updateGuestCheckIn(guest.id, timestamp);

      // Add to pending sync queue
      const pendingCheckIn: PendingCheckIn = {
        id: crypto.randomUUID(),
        guest_id: guest.id,
        guest_name: guest.name,
        qr_code: guest.qr_code,
        checked_in_at: timestamp,
        synced: false,
        created_at: timestamp
      };
      await indexedDBService.addPendingCheckIn(pendingCheckIn);

      console.log(`✅ Manually checked in ${guest.name} (offline: ${isOffline})`);

      // If online, try to sync immediately
      if (!isOffline) {
        syncService.syncPendingCheckIns().catch(err => {
          console.warn('Background sync failed:', err);
        });
      }

      return {
        success: true,
        guestName: guest.name,
        isDuplicate: false,
        isOffline,
        message: isOffline 
          ? `${guest.name} checked in (will sync when online)`
          : `${guest.name} checked in successfully`,
        timestamp
      };

    } catch (error) {
      console.error('❌ Manual check-in failed:', error);
      return {
        success: false,
        guestName: '',
        isDuplicate: false,
        isOffline,
        message: error instanceof Error ? error.message : 'Check-in failed',
        timestamp
      };
    }
  }

  /**
   * Get all guests (from local database)
   */
  async getAllGuests(): Promise<Guest[]> {
    return indexedDBService.getAllGuests();
  }

  /**
   * Search guests by name (from local database)
   */
  async searchGuests(searchTerm: string): Promise<Guest[]> {
    const allGuests = await indexedDBService.getAllGuests();
    const lowerSearch = searchTerm.toLowerCase();
    
    return allGuests.filter(guest => 
      guest.name.toLowerCase().includes(lowerSearch)
    );
  }

  /**
   * Get check-in statistics (from local database)
   */
  async getStats() {
    return indexedDBService.getCheckInStats();
  }

  /**
   * Get recent check-ins (from local database)
   */
  async getRecentCheckIns(limit: number = 10): Promise<Guest[]> {
    const allGuests = await indexedDBService.getAllGuests();
    
    return allGuests
      .filter(g => g.is_checked_in && g.checked_in_at)
      .sort((a, b) => {
        const timeA = new Date(a.checked_in_at!).getTime();
        const timeB = new Date(b.checked_in_at!).getTime();
        return timeB - timeA; // Most recent first
      })
      .slice(0, limit);
  }

  /**
   * Clear all offline data (for logout)
   */
  async clearOfflineData(): Promise<void> {
    await indexedDBService.clearAll();
    this.disableAutoInit();
    console.log('🗑️ Cleared all offline data');
  }

  /**
   * Check if offline mode is initialized
   */
  async isOfflineModeReady(): Promise<boolean> {
    try {
      const guests = await indexedDBService.getAllGuests();
      return guests.length > 0;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const offlineCheckInService = new OfflineCheckInService();
