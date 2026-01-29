import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckInInterface from '../components/staff/CheckInInterface';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import UniversalSettings from '../components/shared/UniversalSettings';
import { Sun, Moon, Settings } from 'lucide-react';

// Icon Components matching the main dashboard design
const Icons = {
  Overview: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  QrCode: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  ),
  Users: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  UserCheck: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  BarChart3: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Calendar: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

interface StaffSession {
  wedding_id: number;
  wedding_code: string;
  wedding_date: string;
  venue_name: string;
  expected_guests: number;
}

type TabType = 'overview' | 'scanner' | 'guests' | 'analytics' | 'settings';

const StaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Check if user is authenticated as staff
    const token = localStorage.getItem('access_token');
    const userType = localStorage.getItem('user_type');
    const sessionData = localStorage.getItem('staff_session');

    if (!token || userType !== 'STAFF' || !sessionData) {
      navigate('/staff');
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      setStaffSession(session);
    } catch (err) {
      console.error('Failed to parse staff session:', err);
      setError('Invalid session data');
      navigate('/staff');
      return;
    }

    setIsLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    // Clear all staff session data
    localStorage.removeItem('access_token');
    localStorage.removeItem('staff_session');
    localStorage.removeItem('user_type');
    
    // Navigate back to staff login
    navigate('/staff');
  };

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

  if (error || !staffSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Session Error</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error || 'Invalid or expired session'}
          </p>
          <button 
            onClick={() => navigate('/staff')} 
            className="w-full bg-rose-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-rose-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Icons.Overview },
    { id: 'scanner', label: 'QR Scanner', icon: Icons.QrCode },
    { id: 'guests', label: 'Guest List', icon: Icons.Users },
    { id: 'analytics', label: 'Analytics', icon: Icons.BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
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

      {/* Sidebar - Fixed position with independent scrolling */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Staff Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Wedding Info */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Current Wedding
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Icons.Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700 dark:text-slate-300">{new Date(staffSession.wedding_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Icons.MapPin className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700 dark:text-slate-300">{staffSession.venue_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Icons.Users className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700 dark:text-slate-300">{staffSession.expected_guests} Expected</span>
              </div>
              <div className="mt-3 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium text-center">
                ID: {staffSession.wedding_code}
              </div>
            </div>
          </div>
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
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
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
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-rose-500/30">
              S
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                Staff Member
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Check-in Portal</p>
            </div>
            <button
              onClick={handleLogout}
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
                  {activeTab === 'overview' ? 'Staff Dashboard' : sidebarItems.find(i => i.id === activeTab)?.label}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Wedding check-in management system
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
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Guests */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Guests</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{staffSession.expected_guests}</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Icons.Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  {/* Checked In */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Checked In</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Icons.UserCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Pending</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{staffSession.expected_guests}</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Icons.Clock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  </div>

                  {/* Check-in Rate */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Check-in Rate</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">0%</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Icons.BarChart3 className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Common tasks for guest check-in</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* QR Scanner */}
                    <button
                      onClick={() => setActiveTab('scanner')}
                      className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/40 dark:to-rose-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/20">
                          <Icons.QrCode className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <Icons.ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">QR Scanner</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Scan guest QR codes for check-in</p>
                    </button>

                    {/* Guest List */}
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
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">Guest List</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">View and manage guest check-ins</p>
                    </button>

                    {/* Analytics */}
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                          <Icons.BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <Icons.ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">Analytics</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">View check-in statistics</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Check-In Interface for scanner, guests, and analytics tabs */}
            {(activeTab === 'scanner' || activeTab === 'guests' || activeTab === 'analytics') && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <CheckInInterface 
                  weddingId={staffSession.wedding_id}
                  onLogout={handleLogout}
                />
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <UniversalSettings userType="STAFF" darkMode={darkMode} setDarkMode={setDarkMode} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffDashboardPage;