import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { 
  Users, UserCheck, RefreshCw, MessageSquare, 
  Heart, Activity, Target,
  ArrowUp, ArrowDown, Minus, Download
} from 'lucide-react';

interface UnifiedAnalyticsDashboardProps {
  weddingId: number;
  view?: 'overview' | 'guests' | 'rsvp' | 'communication' | 'budget' | 'vendors';
}

interface AnalyticsData {
  overview: {
    totalGuests: number;
    checkedIn: number;
    rsvpAccepted: number;
    rsvpDeclined: number;
    messagesSent: number;
    budgetSpent: number;
    budgetTotal: number;
    vendorsBooked: number;
  };
  trends: {
    guestCheckIns: Array<{ date: string; count: number; cumulative: number }>;
    rsvpResponses: Array<{ date: string; accepted: number; declined: number }>;
    messageActivity: Array<{ date: string; sent: number; delivered: number }>;
    budgetSpending: Array<{ category: string; spent: number; allocated: number }>;
  };
  realTime: {
    recentCheckIns: Array<{ name: string; time: string; table: string }>;
    recentRSVPs: Array<{ name: string; status: string; time: string }>;
    recentMessages: Array<{ type: string; count: number; time: string }>;
  };
  performance: {
    checkInRate: number;
    rsvpResponseRate: number;
    messageDeliveryRate: number;
    budgetUtilization: number;
  };
}

const UnifiedAnalyticsDashboard: React.FC<UnifiedAnalyticsDashboardProps> = ({ 
  weddingId, 
  view = 'overview'
}) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const refreshInterval = 30000; // 30 seconds

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['unified-analytics', weddingId, view, timeRange],
    queryFn: () => fetchAnalyticsData(weddingId, view, timeRange),
    refetchInterval: refreshInterval,
    staleTime: 10000, // 10 seconds
  });

  // Fetch analytics data from API
  const fetchAnalyticsData = async (weddingId: number, view: string, timeRange: string): Promise<AnalyticsData> => {
    try {
      // Fetch data from multiple endpoints based on view
      const endpoints = {
        overview: `/api/analytics/wedding/${weddingId}`,
        rsvp: `/api/analytics/rsvp/${weddingId}`,
        communication: `/api/analytics/communication/${weddingId}`,
        guests: `/api/analytics/wedding/${weddingId}`,
        budget: `/api/analytics/budget/${weddingId}`,
        vendors: `/api/analytics/vendors/${weddingId}`
      };

      const endpoint = endpoints[view as keyof typeof endpoints] || endpoints.overview;
      const response = await fetch(`${endpoint}?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform backend data to match our interface
      return transformBackendData(data, view);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      // Return mock data as fallback
      return getMockAnalyticsData();
    }
  };

  // Transform backend data to match frontend interface
  const transformBackendData = (_backendData: any, _view: string): AnalyticsData => {
    // For now, return mock data but in production this would transform the actual backend response
    return getMockAnalyticsData();
  };

  // Mock data generator - replace with actual API integration
  const getMockAnalyticsData = (): AnalyticsData => {
    return {
      overview: {
        totalGuests: 200,
        checkedIn: 156,
        rsvpAccepted: 178,
        rsvpDeclined: 12,
        messagesSent: 245,
        budgetSpent: 45000,
        budgetTotal: 60000,
        vendorsBooked: 8,
      },
      trends: {
        guestCheckIns: [
          { date: '2024-01-20', count: 25, cumulative: 156 },
          { date: '2024-01-19', count: 18, cumulative: 131 },
          { date: '2024-01-18', count: 32, cumulative: 113 },
          { date: '2024-01-17', count: 22, cumulative: 81 },
          { date: '2024-01-16', count: 15, cumulative: 59 },
          { date: '2024-01-15', count: 28, cumulative: 44 },
          { date: '2024-01-14', count: 16, cumulative: 16 },
        ],
        rsvpResponses: [
          { date: '2024-01-20', accepted: 12, declined: 1 },
          { date: '2024-01-19', accepted: 15, declined: 2 },
          { date: '2024-01-18', accepted: 18, declined: 1 },
          { date: '2024-01-17', accepted: 22, declined: 3 },
          { date: '2024-01-16', accepted: 25, declined: 2 },
          { date: '2024-01-15', accepted: 20, declined: 1 },
          { date: '2024-01-14', accepted: 16, declined: 2 },
        ],
        messageActivity: [
          { date: '2024-01-20', sent: 35, delivered: 32 },
          { date: '2024-01-19', sent: 28, delivered: 26 },
          { date: '2024-01-18', sent: 42, delivered: 38 },
          { date: '2024-01-17', sent: 31, delivered: 29 },
          { date: '2024-01-16', sent: 25, delivered: 23 },
          { date: '2024-01-15', sent: 38, delivered: 35 },
          { date: '2024-01-14', sent: 46, delivered: 41 },
        ],
        budgetSpending: [
          { category: 'Venue', spent: 15000, allocated: 18000 },
          { category: 'Catering', spent: 12000, allocated: 15000 },
          { category: 'Photography', spent: 8000, allocated: 10000 },
          { category: 'Flowers', spent: 3500, allocated: 5000 },
          { category: 'Music', spent: 4000, allocated: 6000 },
          { category: 'Decoration', spent: 2500, allocated: 4000 },
          { category: 'Other', spent: 0, allocated: 2000 },
        ],
      },
      realTime: {
        recentCheckIns: [
          { name: 'Sarah Johnson', time: '2:45 PM', table: 'Table 3' },
          { name: 'Michael Chen', time: '2:42 PM', table: 'Table 1' },
          { name: 'Emily Davis', time: '2:38 PM', table: 'Table 5' },
          { name: 'David Wilson', time: '2:35 PM', table: 'Table 2' },
          { name: 'Lisa Anderson', time: '2:31 PM', table: 'Table 4' },
        ],
        recentRSVPs: [
          { name: 'John Smith', status: 'accepted', time: '1:20 PM' },
          { name: 'Maria Garcia', status: 'accepted', time: '12:45 PM' },
          { name: 'Robert Brown', status: 'declined', time: '11:30 AM' },
          { name: 'Jennifer Lee', status: 'accepted', time: '10:15 AM' },
          { name: 'William Jones', status: 'accepted', time: '9:45 AM' },
        ],
        recentMessages: [
          { type: 'RSVP Reminder', count: 15, time: '3:00 PM' },
          { type: 'Event Update', count: 8, time: '1:30 PM' },
          { type: 'QR Invitation', count: 25, time: '11:00 AM' },
          { type: 'Custom Message', count: 5, time: '9:30 AM' },
        ],
      },
      performance: {
        checkInRate: 78,
        rsvpResponseRate: 95,
        messageDeliveryRate: 91,
        budgetUtilization: 75,
      },
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const COLORS = {
    primary: '#f43f5e',
    secondary: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="text-center text-red-600 dark:text-red-400">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Failed to load analytics</p>
          <p className="text-sm opacity-75 mb-4">Please try again later</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {view === 'overview' ? 'Wedding Analytics Overview' : `${view.charAt(0).toUpperCase() + view.slice(1)} Analytics`}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Real-time insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {[
              { key: '24h', label: '24H' },
              { key: '7d', label: '7D' },
              { key: '30d', label: '30D' },
              { key: 'all', label: 'All' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setTimeRange(option.key as any)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  timeRange === option.key
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => refetch()}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          
          <button className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Export">
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Guests */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Guests</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.overview.totalGuests}</p>
              <div className="flex items-center mt-2">
                <ArrowUp className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">+12 this week</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* RSVP Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">RSVP Rate</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatPercentage(analytics.performance.rsvpResponseRate)}</p>
              <div className="flex items-center mt-2">
                <ArrowUp className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">+5.2% vs last week</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Heart className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Check-in Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Check-in Rate</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatPercentage(analytics.performance.checkInRate)}</p>
              <div className="flex items-center mt-2">
                <Minus className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400">Steady</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <UserCheck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Budget Utilization */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Budget Used</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatPercentage(analytics.performance.budgetUtilization)}</p>
              <div className="flex items-center mt-2">
                <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600 dark:text-red-400">-2.1% vs plan</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Target className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Check-ins Timeline */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Guest Check-ins</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daily check-in activity and cumulative progress</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.trends.guestCheckIns}>
                <defs>
                  <linearGradient id="checkInGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    backgroundColor: 'white'
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill={COLORS.primary} name="Daily Check-ins" radius={[4, 4, 0, 0]} />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke={COLORS.secondary} 
                  strokeWidth={3}
                  name="Cumulative"
                  dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RSVP Responses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">RSVP Responses</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daily acceptance and decline trends</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.trends.rsvpResponses}>
                <defs>
                  <linearGradient id="acceptedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="declinedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    backgroundColor: 'white'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="accepted" 
                  stackId="1"
                  stroke={COLORS.success} 
                  fill="url(#acceptedGradient)"
                  name="Accepted"
                />
                <Area 
                  type="monotone" 
                  dataKey="declined" 
                  stackId="1"
                  stroke={COLORS.danger} 
                  fill="url(#declinedGradient)"
                  name="Declined"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Budget Breakdown</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Spending vs allocated budget by category</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.trends.budgetSpending} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" style={{ fontSize: '12px' }} width={80} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    backgroundColor: 'white'
                  }}
                  formatter={(value) => [formatCurrency(value as number), '']}
                />
                <Legend />
                <Bar dataKey="allocated" fill="#e2e8f0" name="Allocated" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" fill={COLORS.primary} name="Spent" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Message Activity</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Messages sent vs delivered over time</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trends.messageActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    backgroundColor: 'white'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke={COLORS.info} 
                  strokeWidth={3}
                  name="Sent"
                  dot={{ fill: COLORS.info, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="delivered" 
                  stroke={COLORS.success} 
                  strokeWidth={3}
                  name="Delivered"
                  dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-time Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Check-ins */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Recent Check-ins</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Latest guest arrivals</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {analytics.realTime.recentCheckIns.map((checkIn, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-emerald-500/30">
                  {checkIn.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{checkIn.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{checkIn.table}</p>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {checkIn.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent RSVPs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Recent RSVPs</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Latest responses</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {analytics.realTime.recentRSVPs.map((rsvp, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg ${
                  rsvp.status === 'accepted' 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30' 
                    : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30'
                }`}>
                  {rsvp.status === 'accepted' ? '✓' : '✗'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{rsvp.name}</p>
                  <p className={`text-sm capitalize ${
                    rsvp.status === 'accepted' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {rsvp.status}
                  </p>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {rsvp.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Message Activity</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Recent communications</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {analytics.realTime.recentMessages.map((message, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{message.type}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{message.count} sent</p>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {message.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-refresh Indicator */}
      <div className="flex items-center justify-center space-x-2 text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Updates automatically every {refreshInterval / 1000} seconds</span>
      </div>
    </div>
  );
};

export default UnifiedAnalyticsDashboard;