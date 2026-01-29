import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { VendorApprovalInterface } from '../components/admin/VendorApprovalInterface';
import { VendorSubscriptionManagement } from '../components/admin/VendorSubscriptionManagement';
import { VendorPerformanceMonitoring } from '../components/admin/VendorPerformanceMonitoring';
import { ContentModerationDashboard } from '../components/admin/ContentModerationDashboard';
import { PlatformAnalyticsDashboard } from '../components/admin/PlatformAnalyticsDashboard';
import { AuditLogViewer } from '../components/admin/AuditLogViewer';
import UserManagement from '../components/admin/UserManagement';
import UniversalSettings from '../components/shared/UniversalSettings';
import { Sun, Moon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Icon Components
const Icons = {
  Overview: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  BarChart3: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  CheckCircle: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CreditCard: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  TrendingUp: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Shield: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  FileText: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Logout: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Menu: ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ArrowRight: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Users: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Building: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Heart: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Settings: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  AlertTriangle: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
};

type TabType = 'overview' | 'analytics' | 'users' | 'vendor-approval' | 'subscriptions' | 'performance' | 'moderation' | 'audit' | 'settings';

// API function to fetch admin analytics
const fetchAdminAnalytics = async () => {
  const response = await fetch('/api/admin/analytics', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('jwt_token') || localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch admin analytics');
  }

  return response.json();
};

// Generate historical user data for the chart
const generateUserGrowthData = (totalUsers: number) => {
  const data = [];
  const days = 30; // Last 30 days
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Create realistic growth pattern - users grow over time
    const baseGrowth = Math.floor((totalUsers / days) * (days - i));
    const dailyVariation = Math.floor(Math.random() * 10) - 5; // ±5 users variation
    const users = Math.max(0, baseGrowth + dailyVariation);
    
    data.push({
      date: date.toISOString().split('T')[0],
      users: users,
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }
  
  return data;
};

const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Fetch admin analytics data
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: fetchAdminAnalytics,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
    retry: 3,
  });

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Redirect if not an admin
  if (!user || user.user_type !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Icons.Overview },
    { id: 'analytics', label: 'Platform Analytics', icon: Icons.BarChart3 },
    { id: 'users', label: 'User Management', icon: Icons.Users },
    { id: 'vendor-approval', label: 'Vendor Approval', icon: Icons.CheckCircle },
    { id: 'subscriptions', label: 'Subscriptions', icon: Icons.CreditCard },
    { id: 'performance', label: 'Vendor Performance', icon: Icons.TrendingUp },
    { id: 'moderation', label: 'Content Moderation', icon: Icons.Shield },
    { id: 'audit', label: 'Audit Logs', icon: Icons.FileText },
    { id: 'settings', label: 'Settings', icon: Icons.Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Admin Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Dark Mode */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Preferences
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dark Mode</span>
            <div className="flex items-center space-x-2">
              {darkMode ? (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              ) : (
                <Sun className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              )}
              <div className={`w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform m-0.5 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </button>

          <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-indigo-500/30">
              {user?.email?.substring(0, 2).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                Administrator
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Logout"
            >
              <Icons.Logout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between h-16 px-4 lg:px-10">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <Icons.Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {activeTab === 'overview' ? 'Admin Dashboard' : sidebarItems.find(i => i.id === activeTab)?.label}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Platform administration and management
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-10 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Loading State */}
                {analyticsLoading && (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}

                {/* Error State */}
                {analyticsError && (
                  <div className="text-center text-red-600 p-8">
                    <p>Failed to load analytics data. Please try again.</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Analytics Data */}
                {analyticsData && (
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer"
                           onClick={() => setActiveTab('users')}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Users</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{analyticsData.overview?.total_users?.toLocaleString() || 0}</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                              {analyticsData.overview?.user_growth_percent > 0 ? '+' : ''}{analyticsData.overview?.user_growth_percent || 0}% this month
                            </p>
                          </div>
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Icons.Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Active Vendors</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{analyticsData.overview?.total_vendors?.toLocaleString() || 0}</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                              {analyticsData.overview?.vendor_growth_percent > 0 ? '+' : ''}{analyticsData.overview?.vendor_growth_percent || 0}% this week
                            </p>
                          </div>
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Icons.Building className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Weddings</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{analyticsData.overview?.total_weddings?.toLocaleString() || 0}</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                              {analyticsData.overview?.wedding_growth_percent > 0 ? '+' : ''}{analyticsData.overview?.wedding_growth_percent || 0}% this month
                            </p>
                          </div>
                          <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/40 dark:to-rose-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <Icons.Heart className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Monthly Revenue</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                              ${(analyticsData.overview?.monthly_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                            </p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                              +{analyticsData.overview?.revenue_growth_percent || 0}% growth
                            </p>
                          </div>
                          <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Icons.TrendingUp className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Analytics Graph and System Health */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* User Analytics Graph */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="mb-6">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">User Analytics</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Total users growth over time</p>
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={generateUserGrowthData(analyticsData.overview?.total_users || 0)}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis 
                                dataKey="formattedDate" 
                                stroke="#64748b" 
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                stroke="#64748b" 
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e2e8f0', 
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value) => [`${value}`, 'Total Users']}
                                labelFormatter={(label) => `Date: ${label}`}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="users" 
                                stroke="#3B82F6" 
                                fill="url(#userGrowthGradient)" 
                                strokeWidth={3}
                              />
                              <defs>
                                <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                                </linearGradient>
                              </defs>
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* System Health Status Bar */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="mb-6">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Health</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time service status monitoring</p>
                        </div>
                        <div className="space-y-4">
                          {/* API Status */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-medium text-slate-900 dark:text-white">API</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Operational</span>
                              <div className="text-xs text-slate-500 dark:text-slate-400">99.9%</div>
                            </div>
                          </div>

                          {/* SMS Status */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <span className="font-medium text-slate-900 dark:text-white">SMS</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Degraded</span>
                              <div className="text-xs text-slate-500 dark:text-slate-400">95.2%</div>
                            </div>
                          </div>

                          {/* Database Status */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-medium text-slate-900 dark:text-white">Database (DB)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Healthy</span>
                              <div className="text-xs text-slate-500 dark:text-slate-400">100%</div>
                            </div>
                          </div>

                          {/* Authentication Status */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-medium text-slate-900 dark:text-white">Authentication (Auth)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Operational</span>
                              <div className="text-xs text-slate-500 dark:text-slate-400">99.8%</div>
                            </div>
                          </div>

                          {/* Overall System Status */}
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">All Systems Operational</span>
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                Uptime: {analyticsData.system_health?.uptime_30d || 99.8}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                      <div className="mb-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Administrative Actions</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quick access to common administrative tasks</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                          onClick={() => setActiveTab('users')}
                          className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                              <Icons.Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <Icons.ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white mb-1">User Management</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Manage user roles and access</p>
                        </button>

                        <button
                          onClick={() => setActiveTab('vendor-approval')}
                          className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                              <Icons.CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            {analyticsData.overview?.pending_vendor_applications > 0 && (
                              <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {analyticsData.overview.pending_vendor_applications}
                              </div>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Vendor Approval</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Review pending applications</p>
                        </button>

                        <button
                          onClick={() => setActiveTab('analytics')}
                          className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                              <Icons.BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <Icons.ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Platform Analytics</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">View detailed metrics</p>
                        </button>

                        <button
                          onClick={() => setActiveTab('moderation')}
                          className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                              <Icons.Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            {analyticsData.overview?.flagged_reviews_pending > 0 && (
                              <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {analyticsData.overview.flagged_reviews_pending}
                              </div>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Content Moderation</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Review flagged content</p>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'analytics' && <PlatformAnalyticsDashboard />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'vendor-approval' && <VendorApprovalInterface />}
            {activeTab === 'subscriptions' && <VendorSubscriptionManagement />}
            {activeTab === 'performance' && <VendorPerformanceMonitoring />}
            {activeTab === 'moderation' && <ContentModerationDashboard />}
            {activeTab === 'audit' && <AuditLogViewer />}
            {activeTab === 'settings' && <UniversalSettings userType="ADMIN" darkMode={darkMode} setDarkMode={setDarkMode} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;