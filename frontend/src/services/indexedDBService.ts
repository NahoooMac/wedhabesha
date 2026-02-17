/**
 * IndexedDB Service for Offline-First Check-In System
 * Stores guest data and pending check-ins locally for offline operation
 */

const DB_NAME = 'WeddingCheckInDB';
const DB_VERSION = 1;
const GUESTS_STORE = 'guests';
const PENDING_CHECKINS_STORE = 'pendingCheckIns';
const METADATA_STORE = 'metadata';

export interface Guest {
  id: number;
  name: string;
  qr_code: string;
  table_number?: number;
  is_checked_in: boolean;
  checked_in_at?: string;
}

export interface PendingCheckIn {
  id: string; // UUID
  guest_id: number;
  guest_name: string;
  qr_code: string;
  checked_in_at: string;
  synced: boolean;
  created_at: string;
}

export interface WeddingMetadata {
  wedding_id: number;
  wedding_code: string;
  session_token: string;
  last_sync: string;
  total_guests: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create guests store
        if (!db.objectStoreNames.contains(GUESTS_STORE)) {
          const guestsStore = db.createObjectStore(GUESTS_STORE, { keyPath: 'id' });
          guestsStore.createIndex('qr_code', 'qr_code', { unique: true });
          guestsStore.createIndex('is_checked_in', 'is_checked_in', { unique: false });
        }

        // Create pending check-ins store
        if (!db.objectStoreNames.contains(PENDING_CHECKINS_STORE)) {
          const pendingStore = db.createObjectStore(PENDING_CHECKINS_STORE, { keyPath: 'id' });
          pendingStore.createIndex('synced', 'synced', { unique: false });
          pendingStore.createIndex('guest_id', 'guest_id', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'wedding_id' });
        }
      };
    });
  }

  /**
   * Store wedding metadata
   */
  async saveMetadata(metadata: WeddingMetadata): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.put(metadata);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save metadata'));
    });
  }

  /**
   * Get wedding metadata
   */
  async getMetadata(weddingId: number): Promise<WeddingMetadata | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(weddingId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get metadata'));
    });
  }

  /**
   * Store guest list (bulk operation)
   */
  async saveGuests(guests: Guest[]): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GUESTS_STORE], 'readwrite');
      const store = transaction.objectStore(GUESTS_STORE);

      // Clear existing guests first
      store.clear();

      // Add all guests
      guests.forEach(guest => {
        store.put(guest);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to save guests'));
    });
  }

  /**
   * Get all guests
   */
  async getAllGuests(): Promise<Guest[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GUESTS_STORE], 'readonly');
      const store = transaction.objectStore(GUESTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get guests'));
    });
  }

  /**
   * Get guest by QR code
   */
  async getGuestByQRCode(qrCode: string): Promise<Guest | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GUESTS_STORE], 'readonly');
      const store = transaction.objectStore(GUESTS_STORE);
      const index = store.index('qr_code');
      const request = index.get(qrCode);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get guest by QR code'));
    });
  }

  /**
   * Update guest check-in status locally
   */
  async updateGuestCheckIn(guestId: number, checkedInAt: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GUESTS_STORE], 'readwrite');
      const store = transaction.objectStore(GUESTS_STORE);
      const request = store.get(guestId);

      request.onsuccess = () => {
        const guest = request.result;
        if (guest) {
          guest.is_checked_in = true;
          guest.checked_in_at = checkedInAt;
          store.put(guest);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to update guest check-in'));
    });
  }

  /**
   * Add pending check-in (for offline sync)
   */
  async addPendingCheckIn(pendingCheckIn: PendingCheckIn): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_CHECKINS_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_CHECKINS_STORE);
      const request = store.put(pendingCheckIn);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to add pending check-in'));
    });
  }

  /**
   * Get all unsynced check-ins
   */
  async getUnsyncedCheckIns(): Promise<PendingCheckIn[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_CHECKINS_STORE], 'readonly');
      const store = transaction.objectStore(PENDING_CHECKINS_STORE);
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get unsynced check-ins'));
    });
  }

  /**
   * Mark check-in as synced
   */
  async markCheckInAsSynced(checkInId: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_CHECKINS_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_CHECKINS_STORE);
      const request = store.get(checkInId);

      request.onsuccess = () => {
        const checkIn = request.result;
        if (checkIn) {
          checkIn.synced = true;
          store.put(checkIn);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to mark check-in as synced'));
    });
  }

  /**
   * Get check-in statistics
   */
  async getCheckInStats(): Promise<{
    total: number;
    checkedIn: number;
    pending: number;
    unsyncedCount: number;
  }> {
    if (!this.db) await this.init();
    
    const guests = await this.getAllGuests();
    const unsyncedCheckIns = await this.getUnsyncedCheckIns();
    
    const checkedIn = guests.filter(g => g.is_checked_in).length;
    
    return {
      total: guests.length,
      checkedIn,
      pending: guests.length - checkedIn,
      unsyncedCount: unsyncedCheckIns.length
    };
  }

  /**
   * Clear all data (for logout)
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [GUESTS_STORE, PENDING_CHECKINS_STORE, METADATA_STORE],
        'readwrite'
      );

      transaction.objectStore(GUESTS_STORE).clear();
      transaction.objectStore(PENDING_CHECKINS_STORE).clear();
      transaction.objectStore(METADATA_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to clear data'));
    });
  }

  /**
   * Check if guest is already checked in locally
   */
  async isGuestCheckedIn(guestId: number): Promise<boolean> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GUESTS_STORE], 'readonly');
      const store = transaction.objectStore(GUESTS_STORE);
      const request = store.get(guestId);

      request.onsuccess = () => {
        const guest = request.result;
        resolve(guest ? guest.is_checked_in : false);
      };
      request.onerror = () => reject(new Error('Failed to check guest status'));
    });
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
