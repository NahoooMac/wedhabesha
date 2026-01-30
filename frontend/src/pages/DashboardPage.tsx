import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import WeddingSetupWizard from '../components/wedding/WeddingSetupWizard';
import WeddingConfiguration from '../components/wedding/WeddingConfiguration';
import GuestManagement from '../components/guests/GuestManagement';
import BudgetPlanning from '../components/budget/BudgetPlanning';
import CommunicationCenter from '../components/communication/CommunicationCenter';
import CoupleMessaging from '../components/communication/CoupleMessaging';
import VendorDirectory from '../components/vendors/VendorDirectory';
import ProfileSettings from '../components/profile/ProfileSettings';
import UniversalSettings from '../components/shared/UniversalSettings';
import UnifiedAnalyticsDashboard from '../components/analytics/UnifiedAnalyticsDashboard';
import MiniAnalyticsDashboard from '../components/analytics/MiniAnalyticsDashboard';
import NotificationBadge from '../components/shared/NotificationBadge';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { AnalyticsProvider } from '../contexts/AnalyticsContext';
import { weddingApi, WeddingCreateResponse } from '../lib/api';
import { Sun, Moon } from 'lucide-react';

// Icon Components matching the uploaded design
const Icons = {
  Overview: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Heart: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Users: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Dollar: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Message: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  Building: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Chart: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Settings: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Calendar: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Clock: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  MapPin: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
};

type TabType = 'overview' | 'wedding' | 'guests' | 'budget' | 'communication' | 'vendors' | 'analytics' | 'settings';
type CommTabType = 'vendors' | 'guests';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [commTab, setCommTab] = useState<CommTabType>('vendors');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Unread messages hook
  const { totalUnread } = useUnreadMessages(user?.id?.toString() || '');

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen for thread opening events from messaging utility
  useEffect(() => {
    const handleOpenThread = (event: CustomEvent) => {
      const { threadId } = event.detail;
      
      // Switch to communication tab and vendor messages
      setActiveTab('communication');
      setCommTab('vendors');
      
      // Set the thread ID to open
      setOpenThreadId(threadId);
      
      // Clear the stored thread ID
      localStorage.removeItem('openThreadId');
    };

    // Check for stored thread ID on mount
    const storedThreadId = localStorage.getItem('openThreadId');
    if (storedThreadId) {
      handleOpenThread({ detail: { threadId: storedThreadId } } as CustomEvent);
    }

    // Listen for custom events
    window.addEventListener('openThread', handleOpenThread as EventListener);
    
    return () => {
      window.removeEventListener('openThread', handleOpenThread as EventListener);
    };
  }, []);

  const { data: currentWedding, isLoading, error } = useQuery({
    queryKey: ['wedding', 'current'],
    queryFn: () => weddingApi.getMyWedding(),
    retry: (failureCount, error: any) => {
      if (error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const handleWeddingCreated = (wedding: WeddingCreateResponse) => {
    queryClient.setQueryData(['wedding', 'current'], wedding);
    setActiveTab('wedding');
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Icons.Overview },
    { id: 'wedding', label: 'Wedding Details', icon: Icons.Heart },
    { id: 'guests', label: 'Guest Management', icon: Icons.Users },
    { id: 'budget', label: 'Budget Planning', icon: Icons.Dollar },
    { id: 'communication', label: 'Communication', icon: Icons.Message },
    { id: 'vendors', label: 'Vendor Directory', icon: Icons.Building },
    { id: 'analytics', label: 'Analytics', icon: Icons.Chart },
    { id: 'settings', label: 'Settings', icon: Icons.Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-200 dark:border-rose-900 border-t-rose-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hasWedding = currentWedding && !error;

  return (
    <AnalyticsProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed position with independent scrolling */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">WedHabesha</span>
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
            const isDisabled = !hasWedding && item.id !== 'overview' && item.id !== 'wedding' && item.id !== 'settings';
            const showNotificationBadge = item.id === 'communication' && totalUnread > 0;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isDisabled) {
                    setActiveTab(item.id as TabType);
                    setSidebarOpen(false);
                  }
                }}
                disabled={isDisabled}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all relative ${
                  isActive
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shadow-sm'
                    : isDisabled
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 mr-3" />
                  {showNotificationBadge && (
                    <div className="absolute -top-1 -right-1">
                      <NotificationBadge count={totalUnread} size="sm" />
                    </div>
                  )}
                </div>
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Dark Mode - Bottom */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          {/* Preferences Header */}
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Preferences
          </div>
          
          {/* Dark Mode Toggle */}
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
              <div className={`w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-rose-600' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform m-0.5 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </button>

          {/* User Profile Card */}
          <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/30">
              {user?.email?.substring(0, 2).toUpperCase() || 'DC'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {user?.user_type || 'USER'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              title="Logout"
            >
              <Icons.Logout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - With left margin to account for fixed sidebar */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        {/* Top Bar - Glassmorphism effect */}
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
                  {activeTab === 'overview' ? 'Dashboard' : sidebarItems.find(i => i.id === activeTab)?.label}
                </h1>
                {hasWedding && activeTab === 'overview' && currentWedding.wedding_date && (
                  <div className="flex items-center space-x-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg">
                      <Icons.Calendar className="w-3.5 h-3.5" />
                      <span className="font-medium">{new Date(currentWedding.wedding_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Icons.Users className="w-3.5 h-3.5" />
                      <span className="font-medium">{currentWedding.expected_guests || 0} guests</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-10 overflow-auto">
          {!hasWedding ? (
            <div className="max-w-2xl mx-auto">
              <Card className="shadow-lg border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="dark:text-white">Welcome to Your Wedding Dashboard</CardTitle>
                  <CardDescription className="dark:text-slate-400">
                    Let's start by setting up your wedding details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WeddingSetupWizard onComplete={handleWeddingCreated} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Cards - Enhanced with dark mode and hover effects */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Wedding Date Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Wedding Date</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {currentWedding.wedding_date 
                              ? new Date(currentWedding.wedding_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : 'Not Set'}
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/40 dark:to-rose-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                          <Icons.Calendar className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                        </div>
                      </div>
                    </div>

                    {/* Expected Guests Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Expected Guests</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{currentWedding.expected_guests || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <Icons.Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </div>

                    {/* Days Until Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Days Until</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {currentWedding.wedding_date 
                              ? Math.max(0, Math.ceil((new Date(currentWedding.wedding_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                              : '-'}
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                          <Icons.Clock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                        </div>
                      </div>
                    </div>

                    {/* Venue Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Venue</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{currentWedding.venue_name || 'Not Set'}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <Icons.MapPin className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions - Enhanced with better hover effects */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="mb-6">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Common tasks for wedding planning</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Manage Guests */}
                      <button
                        onClick={() => setActiveTab('guests')}
                        className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                            <Icons.Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <Icons.ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Manage Guests</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Add, edit, or remove guest details</p>
                      </button>

                      {/* Plan Budget */}
                      <button
                        onClick={() => setActiveTab('budget')}
                        className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                            <Icons.Dollar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <Icons.ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Plan Budget</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Track expenses and payments</p>
                      </button>

                      {/* Find Vendors */}
                      <button
                        onClick={() => setActiveTab('vendors')}
                        className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
                            <Icons.Building className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <Icons.ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Find Vendors</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Browse and contact services</p>
                      </button>
                    </div>
                  </div>

                  {/* Mini Analytics Dashboard */}
                  <MiniAnalyticsDashboard 
                    weddingId={currentWedding.id}
                    onViewFullAnalytics={() => setActiveTab('analytics')}
                  />
                </div>
              )}

              {activeTab === 'wedding' && <WeddingConfiguration wedding={currentWedding} />}
              {activeTab === 'guests' && <GuestManagement weddingId={currentWedding.id} />}
              {activeTab === 'budget' && <BudgetPlanning weddingId={currentWedding.id} />}
              {activeTab === 'communication' && (
                <div className="space-y-6">
                  {/* Communication Tab Switcher */}
                  <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setCommTab('vendors')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        commTab === 'vendors'
                          ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Vendor Messages
                    </button>
                    <button
                      onClick={() => setCommTab('guests')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        commTab === 'guests'
                          ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Guest Communication
                    </button>
                  </div>

                  {/* Tab Content */}
                  {commTab === 'vendors' && (
                    <CoupleMessaging 
                      userId={user?.id?.toString() || ''}
                      initialThreadId={openThreadId}
                      onThreadOpened={() => setOpenThreadId(null)}
                    />
                  )}
                  {commTab === 'guests' && (
                    <CommunicationCenter weddingId={currentWedding.id} />
                  )}
                </div>
              )}
              {activeTab === 'vendors' && <VendorDirectory />}
              {activeTab === 'analytics' && (
                <UnifiedAnalyticsDashboard weddingId={currentWedding.id} />
              )}
              {activeTab === 'settings' && <UniversalSettings userType="USER" darkMode={darkMode} setDarkMode={setDarkMode} />}
            </div>
          )}
        </main>
      </div>
      </div>
    </AnalyticsProvider>
  );
};

export default DashboardPage;
