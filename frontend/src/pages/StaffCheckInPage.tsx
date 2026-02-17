import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffAuthForm from '../components/staff/StaffAuthForm';
import CheckInInterface from '../components/staff/CheckInInterface';
import { Card } from '../components/ui/Card';
import { useOfflineCheckIn } from '../hooks/useOfflineCheckIn';
import { offlineCheckInService } from '../services/offlineCheckInService';

const StaffCheckInPage: React.FC = () => {
  const [staffSession, setStaffSession] = useState<{
    sessionToken: string;
    weddingId: number;
    weddingCode: string;
    expiresIn: number;
  } | null>(null);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const navigate = useNavigate();
  const { initializeOfflineMode, isOfflineModeReady } = useOfflineCheckIn();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Connection restored');
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log('📴 Connection lost - switching to offline mode');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const sessionToken = localStorage.getItem('staff_session_token');
    const weddingId = localStorage.getItem('staff_wedding_id');
    const weddingCode = localStorage.getItem('staff_wedding_code');

    if (sessionToken && weddingId && weddingCode) {
      setStaffSession({
        sessionToken,
        weddingId: parseInt(weddingId),
        weddingCode,
        expiresIn: 3600 // Default
      });
    }
  }, []);

  const handleAuthSuccess = async (session: {
    sessionToken: string;
    weddingId: number;
    weddingCode: string;
    expiresIn: number;
  }) => {
    setStaffSession(session);
    setDownloadError(null);
    
    // Store session token for API calls
    localStorage.setItem('staff_session_token', session.sessionToken);
    localStorage.setItem('staff_wedding_id', session.weddingId.toString());
    localStorage.setItem('staff_wedding_code', session.weddingCode);

    // Initialize offline mode - download guest list
    // This happens automatically regardless of connection status
    setIsDownloadingData(true);
    try {
      await initializeOfflineMode(
        session.weddingId,
        session.weddingCode,
        session.sessionToken
      );
      console.log('✅ Offline mode ready');
      
      // If offline, show a notification
      if (!isOnline) {
        console.log('📴 Operating in offline mode - no backend connection');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download guest list';
      
      // If we're offline, this is expected - allow them to proceed if data exists
      if (!isOnline) {
        console.log('📴 Offline mode - attempting to use cached data');
        const hasOfflineData = await offlineCheckInService.isOfflineModeReady();
        
        if (hasOfflineData) {
          console.log('✅ Using cached offline data');
          setIsDownloadingData(false);
          return; // Proceed with cached data
        }
      }
      
      setDownloadError(errorMessage);
      console.error('❌ Failed to initialize offline mode:', errorMessage);
    } finally {
      setIsDownloadingData(false);
    }
  };

  const handleLogout = async () => {
    // Clear offline data
    await offlineCheckInService.clearOfflineData();
    
    setStaffSession(null);
    localStorage.removeItem('staff_session_token');
    localStorage.removeItem('staff_wedding_id');
    localStorage.removeItem('staff_wedding_code');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {!staffSession ? (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Staff Check-In
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-slate-400">
                Enter wedding code and PIN to access check-in system
              </p>
            </div>
            <Card className="p-4 md:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <StaffAuthForm onAuthSuccess={handleAuthSuccess} />
            </Card>
          </div>
        ) : isDownloadingData ? (
          <div className="max-w-md mx-auto">
            <Card className="p-6 md:p-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-rose-600 mb-4"></div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Downloading Guest List
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-slate-400">
                  Preparing offline mode for wedding day...
                </p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-slate-500 mt-4">
                  This will allow you to check in guests even without internet connection
                </p>
              </div>
            </Card>
          </div>
        ) : downloadError ? (
          <div className="max-w-md mx-auto">
            <Card className="p-4 md:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-red-600 dark:text-red-400 text-4xl md:text-5xl mb-4">⚠️</div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Download Failed
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-slate-400 mb-4">
                  {downloadError}
                </p>
                <button
                  onClick={() => {
                    setDownloadError(null);
                    if (staffSession) {
                      handleAuthSuccess(staffSession);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm md:text-base"
                >
                  Retry Download
                </button>
              </div>
            </Card>
          </div>
        ) : !isOfflineModeReady ? (
          <div className="max-w-md mx-auto">
            <Card className="p-4 md:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-yellow-600 dark:text-yellow-400 text-4xl md:text-5xl mb-4">⚠️</div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Offline Mode Not Ready
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-slate-400 mb-4">
                  Guest list not downloaded. Please retry initialization.
                </p>
                <button
                  onClick={() => {
                    if (staffSession) {
                      handleAuthSuccess(staffSession);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm md:text-base"
                >
                  Initialize Offline Mode
                </button>
              </div>
            </Card>
          </div>
        ) : (
          <CheckInInterface 
            weddingId={staffSession.weddingId}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
};

export default StaffCheckInPage;