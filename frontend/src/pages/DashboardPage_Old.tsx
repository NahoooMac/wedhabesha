import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import WeddingSetupWizard from '../components/wedding/WeddingSetupWizard';
import WeddingConfiguration from '../components/wedding/WeddingConfiguration';
import GuestManagement from '../components/guests/GuestManagement';
import RealTimeAnalytics from '../components/analytics/RealTimeAnalytics';
import BudgetPlanning from '../components/budget/BudgetPlanning';
import CommunicationCenter from '../components/communication/CommunicationCenter';
import VendorDirectory from '../components/vendors/VendorDirectory';
import { weddingApi, WeddingCreateResponse } from '../lib/api';

// Enhanced Modern Icons with animations
const Icons = {
  Dashboard: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
    </svg>
  ),
  Wedding: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Guests: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  Budget: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Communication: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Vendors: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Analytics: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Menu: ({ className = "w-6 h-6" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: ({ className = "w-6 h-6" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Settings: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Logout: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Notification: ({ className = "w-5 h-5" }) => (
    <svg className={`${className} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.07 2.82l3.12 3.12M7.05 5.84l3.12 3.12M4.03 8.86l3.12 3.12M1.01 11.88l3.12 3.12" />
    </svg>
  )
};

type TabType = 'overview' | 'wedding' | 'guests' | 'budget' | 'communication' | 'vendors' | 'analytics';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

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
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: Icons.Dashboard, 
      color: 'from-blue-500 to-cyan-500',
      emoji: '📊'
    },
    { 
      id: 'wedding', 
      label: 'Wedding Details', 
      icon: Icons.Wedding, 
      color: 'from-rose-500 to-pink-500',
      emoji: '💒'
    },
    { 
      id: 'guests', 
      label: 'Guest Management', 
      icon: Icons.Guests, 
      color: 'from-purple-500 to-indigo-500',
      emoji: '👥'
    },
    { 
      id: 'budget', 
      label: 'Budget Planning', 
      icon: Icons.Budget, 
      color: 'from-green-500 to-emerald-500',
      emoji: '💰'
    },
    { 
      id: 'communication', 
      label: 'Communication', 
      icon: Icons.Communication, 
      color: 'from-orange-500 to-red-500',
      emoji: '💬'
    },
    { 
      id: 'vendors', 
      label: 'Vendor Directory', 
      icon: Icons.Vendors, 
      color: 'from-teal-500 to-cyan-500',
      emoji: '🏪'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: Icons.Analytics, 
      color: 'from-violet-500 to-purple-500',
      emoji: '📈'
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-rose-200 dark:border-rose-900 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="w-20 h-20 border-4 border-rose-600 dark:border-rose-400 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">Loading your wedding dashboard...</p>
            <p className="text-gray-600 dark:text-gray-400">Preparing your perfect planning experience ✨</p>
          </div>
        </div>
      </div>
    );
  }

  const hasWedding = currentWedding && !error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl transform transition-all duration-500 ease-out lg:translate-x-0 lg:relative lg:flex lg:flex-col border-r border-gray-200/50 dark:border-slate-700/50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200/50 dark:border-slate-700/50 bg-gradient-to-r from-rose-500 to-pink-500 dark:from-rose-600 dark:to-pink-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Icons.Wedding className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">WedHabesha</span>
              <div className="text-xs text-rose-100">Wedding Planner</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
          >
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-8 px-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDisabled = !hasWedding && item.id !== 'overview' && item.id !== 'wedding';
            
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
                className={`group w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 ${
                  isActive
                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`
                    : isDisabled
                    ? 'text-gray-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white hover:scale-105 hover:shadow-md'
                }`}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl mr-4 transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/20 backdrop-blur-sm' 
                    : 'bg-gray-100 dark:bg-slate-700 group-hover:bg-gray-200 dark:group-hover:bg-slate-600'
                }`}>
                  {isActive ? (
                    <span className="text-lg">{item.emoji}</span>
                  ) : (
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600 dark:text-slate-400'}`} />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{item.label}</div>
                  {isDisabled && (
                    <div className="text-xs opacity-75">Setup required</div>
                  )}
                </div>
                {isActive && (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Enhanced User Profile Section */}
        <div className="p-4 border-t border-gray-200/50 dark:border-slate-700/50 bg-gradient-to-r from-gray-50 dark:from-slate-800 to-gray-100 dark:to-slate-700">
          <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-lg">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-700"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {user?.user_type} • Online
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
              title="Logout"
            >
              <Icons.Logout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Enhanced Top Bar */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between h-20 px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <Icons.Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white capitalize">
                  {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.replace(/([A-Z])/g, ' $1')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {activeTab === 'overview' ? 'Welcome back! Here\'s your wedding planning progress' : `Manage your ${activeTab}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {hasWedding && (
                <div className="hidden md:flex items-center space-x-4 bg-gradient-to-r from-rose-50 dark:from-rose-900/20 to-pink-50 dark:to-pink-900/20 px-4 py-2 rounded-2xl border border-rose-200 dark:border-rose-800">
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900 dark:text-white">{currentWedding.venue_name}</div>
                    <div className="text-gray-600 dark:text-slate-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {new Date(currentWedding.wedding_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
              
              <button className="relative p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200">
                <Icons.Notification className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Page Content */}
        <main className="flex-1 p-6 lg:p-8 space-y-8 overflow-auto">
          {!hasWedding ? (
            <div className="max-w-4xl mx-auto h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-100 dark:from-rose-900/30 to-pink-100 dark:to-pink-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Icons.Wedding className="w-10 h-10 text-rose-600 dark:text-rose-400" />
                </div>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Welcome to Your Wedding Dashboard
                </h2>
                <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
                  Let's start planning your perfect wedding day with our comprehensive tools and features ✨
                </p>
                <WeddingSetupWizard onComplete={handleWeddingCreated} />
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8 h-full">
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Enhanced Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <Card className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 dark:from-rose-600 dark:to-pink-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <CardContent className="relative p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-rose-100 dark:text-rose-200 text-sm font-medium">Wedding Date</p>
                            <p className="text-2xl font-bold mt-2">
                              {new Date(currentWedding.wedding_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-rose-100 dark:text-rose-200 text-xs mt-1">
                              {new Date(currentWedding.wedding_date).getFullYear()}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl">💒</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <CardContent className="relative p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100 dark:text-blue-200 text-sm font-medium">Expected Guests</p>
                            <p className="text-2xl font-bold mt-2">{currentWedding.expected_guests}</p>
                            <p className="text-blue-100 dark:text-blue-200 text-xs mt-1">People invited</p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl">👥</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <CardContent className="relative p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-100 dark:text-green-200 text-sm font-medium">Budget Status</p>
                            <p className="text-2xl font-bold mt-2">On Track</p>
                            <p className="text-green-100 dark:text-green-200 text-xs mt-1">85% allocated</p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl">💰</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-violet-600 dark:from-purple-600 dark:to-violet-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <CardContent className="relative p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100 dark:text-purple-200 text-sm font-medium">Days Until</p>
                            <p className="text-2xl font-bold mt-2">
                              {Math.ceil((new Date(currentWedding.wedding_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                            </p>
                            <p className="text-purple-100 dark:text-purple-200 text-xs mt-1">Days remaining</p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl">⏰</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Enhanced Quick Actions */}
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl dark:border-slate-700/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-3xl">⚡</span>
                        Quick Actions
                      </CardTitle>
                      <CardDescription className="text-gray-600 dark:text-slate-400">
                        Jump to the most important tasks for your wedding planning
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        <Button
                          onClick={() => setActiveTab('guests')}
                          className="group h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-indigo-50 dark:to-indigo-900/20 hover:from-purple-100 dark:hover:from-purple-900/40 hover:to-indigo-100 dark:hover:to-indigo-900/40 text-purple-700 dark:text-purple-300 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 transform hover:scale-105 rounded-2xl"
                          variant="outline"
                        >
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Icons.Guests className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="font-semibold">Manage Guests</span>
                        </Button>
                        
                        <Button
                          onClick={() => setActiveTab('budget')}
                          className="group h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 hover:from-green-100 dark:hover:from-green-900/40 hover:to-emerald-100 dark:hover:to-emerald-900/40 text-green-700 dark:text-green-300 border-2 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 transform hover:scale-105 rounded-2xl"
                          variant="outline"
                        >
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Icons.Budget className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="font-semibold">Plan Budget</span>
                        </Button>
                        
                        <Button
                          onClick={() => setActiveTab('vendors')}
                          className="group h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-orange-50 dark:from-orange-900/20 to-red-50 dark:to-red-900/20 hover:from-orange-100 dark:hover:from-orange-900/40 hover:to-red-100 dark:hover:to-red-900/40 text-orange-700 dark:text-orange-300 border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 transform hover:scale-105 rounded-2xl"
                          variant="outline"
                        >
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Icons.Vendors className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                          </div>
                          <span className="font-semibold">Find Vendors</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'wedding' && (
                <WeddingConfiguration wedding={currentWedding} />
              )}

              {activeTab === 'guests' && (
                <div className="space-y-8">
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border-0 dark:border-slate-700/50 p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 rounded-3xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">👥</span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Guest Management</h2>
                        <p className="text-gray-600 dark:text-slate-400">Manage your wedding guest list with ease</p>
                      </div>
                    </div>
                    <GuestManagement weddingId={currentWedding.id} />
                  </div>
                </div>
              )}

              {activeTab === 'budget' && (
                <div className="space-y-8">
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-0 p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">💰</span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">Budget Planning</h2>
                        <p className="text-gray-600">Track and manage your wedding expenses</p>
                      </div>
                    </div>
                    <BudgetPlanning weddingId={currentWedding.id} />
                  </div>
                </div>
              )}

              {activeTab === 'communication' && (
                <div className="space-y-8">
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-0 p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">💬</span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">Communication Center</h2>
                        <p className="text-gray-600">Send messages and updates to your guests</p>
                      </div>
                    </div>
                    <CommunicationCenter weddingId={currentWedding.id} />
                  </div>
                </div>
              )}

              {activeTab === 'vendors' && (
                <div className="space-y-8">
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-0 p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">🏪</span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">Vendor Directory</h2>
                        <p className="text-gray-600">Discover and connect with wedding vendors</p>
                      </div>
                    </div>
                    <VendorDirectory />
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-0 p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">📈</span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">Real-Time Analytics</h2>
                        <p className="text-gray-600">Monitor your wedding planning progress</p>
                      </div>
                    </div>
                    <RealTimeAnalytics weddingId={currentWedding.id} />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;