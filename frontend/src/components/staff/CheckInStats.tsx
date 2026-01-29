import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';

interface CheckInStatsProps {
  weddingId: number;
}

interface CheckInStatsData {
  total_guests: number;
  checked_in_count: number;
  pending_count: number;
  checkin_rate: number;
  recent_checkins: Array<{
    guest_name: string;
    checked_in_at: string;
    method: string;
  }>;
}

const CheckInStats: React.FC<CheckInStatsProps> = ({ weddingId }) => {
  const [stats, setStats] = useState<CheckInStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      
      const staffToken = localStorage.getItem('access_token');
      if (!staffToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/staff/wedding/stats`, {
        headers: {
          'Authorization': `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats({
        total_guests: data.total_guests || 0,
        checked_in_count: data.checked_in_guests || 0,
        pending_count: data.pending_guests || 0,
        checkin_rate: data.check_in_percentage || 0,
        recent_checkins: data.recent_checkins || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [weddingId]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load stats</p>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <button 
            onClick={fetchStats}
            className="mt-3 text-sm text-rose-600 hover:text-rose-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: 'Total Guests',
      value: stats.total_guests,
      icon: Users,
      color: 'blue'
    },
    {
      label: 'Checked In',
      value: stats.checked_in_count,
      icon: UserCheck,
      color: 'green'
    },
    {
      label: 'Pending',
      value: stats.pending_count,
      icon: Clock,
      color: 'orange'
    },
    {
      label: 'Check-in Rate',
      value: `${stats.checkin_rate}%`,
      icon: TrendingUp,
      color: 'rose'
    }
  ];

  const colorStyles = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    rose: 'text-rose-600 bg-rose-50'
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">Live Stats</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, index) => (
          <div key={index} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${colorStyles[item.color as keyof typeof colorStyles]}`}>
                <item.icon size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{item.value}</p>
              <p className="text-xs text-slate-500 font-medium">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">Progress</span>
          <span className="text-sm font-bold text-slate-800">{stats.checkin_rate}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-rose-500 to-pink-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.checkin_rate, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default CheckInStats;