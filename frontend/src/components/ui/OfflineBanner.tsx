import React from 'react';
import { useOfflineDetection } from '../../hooks/useOfflineDetection';

const OfflineBanner: React.FC = () => {
  const { isOffline, wasOffline, resetWasOffline } = useOfflineDetection();

  if (!isOffline && !wasOffline) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isOffline ? 'bg-red-600' : 'bg-green-600'
    }`}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between text-white text-sm">
          <div className="flex items-center space-x-2">
            {isOffline ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
                </svg>
                <span>You're offline. Some features may not work properly.</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Connection restored! You're back online.</span>
              </>
            )}
          </div>
          
          {!isOffline && wasOffline && (
            <button
              onClick={resetWasOffline}
              className="text-white hover:text-green-200 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;