import React, { useState, useEffect } from 'react';
import { Clock, QrCode, Search } from 'lucide-react';

interface RecentCheckInsProps {
  weddingId: number;
}

interface RecentCheckIn {
  guest_name: string;
  checked_in_at: string;
  method: string;
}

const RecentCheckIns: React.FC<RecentCheckInsProps> = ({ weddingId }) => {
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
      // For now, create mock recent check-ins since the backend doesn't return them yet
      setRecentCheckIns([
        {
          guest_name: 'John Smith',
          checked_in_at: new Date().toISOString(),
          method: 'QR'
        },
        {
          guest_name: 'Sarah Johnson',
          checked_in_at: new Date(Date.now() - 300000).toISOString(),
          method: 'Manual'
        }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent check-ins');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentCheckIns();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentCheckIns, 30000);
    return () => clearInterval(interval);
  }, [weddingId]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMethodIcon = (method: string) => {
    return method === 'QR' ? QrCode : Search;
  };

  const getMethodColor = (method: string) => {
    return method === 'QR' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50';
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Check-ins</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Check-ins</h3>
        <div className="text-center py-4">
          <p className="text-red-600 font-medium">Failed to load</p>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <button 
            onClick={fetchRecentCheckIns}
            className="mt-3 text-sm text-rose-600 hover:text-rose-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Recent Check-ins</h3>
        <Clock size={18} className="text-slate-400" />
      </div>

      {recentCheckIns.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No recent check-ins</p>
          <p className="text-sm text-slate-400">Check-ins will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentCheckIns.slice(0, 5).map((checkIn, index) => {
            const MethodIcon = getMethodIcon(checkIn.method);
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className={`p-2 rounded-lg ${getMethodColor(checkIn.method)}`}>
                  <MethodIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {checkIn.guest_name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
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
          <button className="text-sm text-rose-600 hover:text-rose-700 font-medium">
            View All Check-ins
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentCheckIns;