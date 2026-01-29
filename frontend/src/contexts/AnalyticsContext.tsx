import React, { createContext, useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AnalyticsContextType {
  weddingId: number | null;
  setWeddingId: (id: number) => void;
  refreshAnalytics: () => void;
  isLoading: boolean;
  error: string | null;
  analyticsData: any;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const [weddingId, setWeddingId] = useState<number | null>(null);

  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-overview', weddingId],
    queryFn: async () => {
      if (!weddingId) return null;
      
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      const response = await fetch(`/api/analytics/wedding/${weddingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      return response.json();
    },
    enabled: !!weddingId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const refreshAnalytics = () => {
    refetch();
  };

  const value: AnalyticsContextType = {
    weddingId,
    setWeddingId,
    refreshAnalytics,
    isLoading,
    error: error?.message || null,
    analyticsData
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};