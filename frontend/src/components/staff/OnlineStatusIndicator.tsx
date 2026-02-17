import React from 'react';
import { useOfflineCheckIn } from '../../hooks/useOfflineCheckIn';

const OnlineStatusIndicator: React.FC = () => {
  const { isOnline, syncStatus, forceSyncNow } = useOfflineCheckIn();

  return (
    <div className="flex items-center gap-3">
      {/* Online/Offline Status */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        isOnline 
          ? 'bg-green-100 text-green-800' 
          : 'bg-orange-100 text-orange-800'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-orange-500'
        } animate-pulse`} />
        {isOnline ? 'Online' : 'Offline'}
      </div>

      {/* Sync Status */}
      {syncStatus.unsyncedCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
            {syncStatus.unsyncedCount} pending sync
          </div>
          
          {isOnline && !syncStatus.isSyncing && (
            <button
              onClick={forceSyncNow}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              title="Sync now"
            >
              🔄 Sync Now
            </button>
          )}
        </div>
      )}

      {/* Syncing Indicator */}
      {syncStatus.isSyncing && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Syncing...
        </div>
      )}

      {/* Last Sync Time */}
      {syncStatus.lastSyncTime && !syncStatus.isSyncing && syncStatus.unsyncedCount === 0 && (
        <div className="text-sm text-gray-500">
          ✅ All synced
        </div>
      )}

      {/* Sync Error */}
      {syncStatus.error && (
        <div className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-sm font-medium">
          ⚠️ Sync error
        </div>
      )}
    </div>
  );
};

export default OnlineStatusIndicator;
