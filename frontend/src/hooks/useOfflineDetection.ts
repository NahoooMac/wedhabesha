import { useState, useEffect } from 'react';

interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
}

export const useOfflineDetection = () => {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    wasOffline: false,
  });

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({
        isOnline: true,
        isOffline: false,
        wasOffline: prev.isOffline,
      }));
    };

    const handleOffline = () => {
      setState(prev => ({
        isOnline: false,
        isOffline: true,
        wasOffline: prev.wasOffline,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const resetWasOffline = () => {
    setState(prev => ({ ...prev, wasOffline: false }));
  };

  return {
    ...state,
    resetWasOffline,
  };
};

export default useOfflineDetection;