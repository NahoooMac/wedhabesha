import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import QRScanner from './QRScanner';
import GuestLookup from './GuestLookup';
import CheckInStats from './CheckInStats';
import RecentCheckIns from './RecentCheckIns';
import LiveMonitoringDashboard from './LiveMonitoringDashboard';
import CheckInHistory from './CheckInHistory';
import OnlineStatusIndicator from './OnlineStatusIndicator';

interface CheckInInterfaceProps {
  weddingId: number;
  onLogout: () => void;
}

type CheckInMode = 'scanner' | 'manual' | 'monitoring' | 'history';
type NotificationType = 'success' | 'error' | 'warning';

const CheckInInterface: React.FC<CheckInInterfaceProps> = ({ weddingId }) => {
  const [mode, setMode] = useState<CheckInMode>('scanner');
  const [notification, setNotification] = useState<{
    type: NotificationType;
    message: string;
    details?: string;
    timestamp: Date;
  } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCheckInSuccess = (guestName: string, isDuplicate: boolean = false) => {
    setNotification({
      type: isDuplicate ? 'warning' : 'success',
      message: isDuplicate ? 'Already Checked In' : 'Check-In Successful',
      details: `${guestName} • ${new Date().toLocaleTimeString()}`,
      timestamp: new Date()
    });

    // Trigger refresh for stats and recent check-ins
    setRefreshTrigger(prev => prev + 1);

    // Clear the notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleCheckInError = (errorMessage: string) => {
    setNotification({
      type: 'error',
      message: errorMessage,
      timestamp: new Date()
    });

    // Clear the notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Online/Offline Status Indicator */}
      <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <OnlineStatusIndicator />
      </div>

      {/* Notification Message */}
      {notification && (
        <div className={`p-3 md:p-4 rounded-xl border ${
          notification.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : notification.type === 'warning'
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${
              notification.type === 'error'
                ? 'bg-red-400'
                : notification.type === 'warning'
                ? 'bg-orange-400'
                : 'bg-green-400'
            }`} />
            <div className="min-w-0 flex-1">
              <p className={`font-medium text-sm md:text-base ${
                notification.type === 'error'
                  ? 'text-red-800 dark:text-red-200'
                  : notification.type === 'warning'
                  ? 'text-orange-800 dark:text-orange-200'
                  : 'text-green-800 dark:text-green-200'
              }`}>
                {notification.message}
              </p>
              {notification.details && (
                <p className={`text-xs md:text-sm truncate ${
                  notification.type === 'error'
                    ? 'text-red-600 dark:text-red-300'
                    : notification.type === 'warning'
                    ? 'text-orange-600 dark:text-orange-300'
                    : 'text-green-600 dark:text-green-300'
                }`}>
                  {notification.details}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            onClick={() => setMode('scanner')}
            variant={mode === 'scanner' ? 'primary' : 'outline'}
            className={`flex-1 text-xs md:text-sm py-2 md:py-2.5 ${mode === 'scanner' 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600'
            }`}
          >
            <span className="hidden sm:inline">📱 QR Scanner</span>
            <span className="sm:hidden">📱 QR</span>
          </Button>
          <Button
            onClick={() => setMode('manual')}
            variant={mode === 'manual' ? 'primary' : 'outline'}
            className={`flex-1 text-xs md:text-sm py-2 md:py-2.5 ${mode === 'manual' 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600'
            }`}
          >
            <span className="hidden sm:inline">👤 Manual Lookup</span>
            <span className="sm:hidden">👤 Manual</span>
          </Button>
          <Button
            onClick={() => setMode('monitoring')}
            variant={mode === 'monitoring' ? 'primary' : 'outline'}
            className={`flex-1 text-xs md:text-sm py-2 md:py-2.5 ${mode === 'monitoring' 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600'
            }`}
          >
            <span className="hidden sm:inline">📊 Live Monitoring</span>
            <span className="sm:hidden">📊 Live</span>
          </Button>
          <Button
            onClick={() => setMode('history')}
            variant={mode === 'history' ? 'primary' : 'outline'}
            className={`flex-1 text-xs md:text-sm py-2 md:py-2.5 ${mode === 'history' 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600'
            }`}
          >
            <span className="hidden sm:inline">📋 History</span>
            <span className="sm:hidden">📋 Log</span>
          </Button>
        </div>
      </div>

      {/* Content based on mode */}
      {mode === 'monitoring' ? (
        <LiveMonitoringDashboard weddingId={weddingId} />
      ) : mode === 'history' ? (
        <CheckInHistory weddingId={weddingId} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Check-In Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              {mode === 'scanner' ? (
                <QRScanner 
                  weddingId={weddingId}
                  onCheckInSuccess={handleCheckInSuccess}
                  onCheckInError={handleCheckInError}
                />
              ) : (
                <GuestLookup 
                  weddingId={weddingId}
                  onCheckInSuccess={handleCheckInSuccess}
                />
              )}
            </div>
          </div>

          {/* Stats and Recent Activity */}
          <div className="space-y-4 md:space-y-6">
            <CheckInStats weddingId={weddingId} refreshTrigger={refreshTrigger} />
            <RecentCheckIns weddingId={weddingId} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInInterface;