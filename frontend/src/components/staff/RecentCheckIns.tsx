import React, { useState, useEffect } from 'react';
import { Clock, QrCode, Search } from 'lucide-react';

interface RecentCheckInsProps {
  weddingId: number;
  refreshTrigger?: number;
}

interface RecentCheckIn {
  guest_name: string;
  checked_in_at: string;
  method: string;
}

const RecentCheckIns: React.FC<RecentCheckInsProps> = ({ weddingId, refreshTrigger }) => {
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentCheckIns = async () => {
    try {
      setError(null);
      
      const staffToken = localStorage.getItem('access_token');
      if (!staffToken) {
        throw new Error('Staff session expired. Please log in again.');
      }

      const response = await fetch('/api/staff/wedding/stats', {
        headers: {
          'Authorization': `Bearer ${staffToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load recent check-ins');
      }

      const statsData = await response.json();
      
      // Use real data from the backend
      if (statsData.recent_checkins && Array.isArray(statsData.recent_checkins)) {
        setRecentCheckIns(statsData.recent_checkins);
      } else {
        setRecentCheckIns([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent check-ins');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentCheckIns();
    
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchRecentCheckIns, 10000);
    return () => clearInterval(interval);
  }, [weddingId]);

  // Refresh when triggered by check-in
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchRecentCheckIns();
    }
  }, [refreshTrigger]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMethodIcon = (method: string) => {
    return method === 'QR' ? QrCode : Search;
  };

  const getMethodColor = (method: string) => {
    return method === 'QR' 
      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
      : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recent Check-ins</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recent Check-ins</h3>
        <div className="text-center py-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{error}</p>
          <button 
            onClick={fetchRecentCheckIns}
            className="mt-3 text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recent Check-ins</h3>
        <Clock size={18} className="text-slate-400 dark:text-slate-500" />
      </div>

      {recentCheckIns.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No recent check-ins</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Check-ins will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentCheckIns.slice(0, 5).map((checkIn, index) => {
            const MethodIcon = getMethodIcon(checkIn.method);
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className={`p-2 rounded-lg ${getMethodColor(checkIn.method)}`}>
                  <MethodIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-white truncate">
                    {checkIn.guest_name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>{formatTime(checkIn.checked_in_at)}</span>
                    <span>•</span>
                    <span className="capitalize">{checkIn.method}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recentCheckIns.length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium">
            View All Check-ins
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentCheckIns;