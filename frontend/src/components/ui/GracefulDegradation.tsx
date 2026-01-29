import React, { ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface GracefulDegradationProps {
  children: ReactNode;
  fallback?: ReactNode;
  feature: string;
  isAvailable: boolean;
  reason?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

const GracefulDegradation: React.FC<GracefulDegradationProps> = ({
  children,
  fallback,
  feature,
  isAvailable,
  reason,
  onRetry,
  showRetry = true,
}) => {
  if (isAvailable) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-secondary-900 mb-2">
        {feature} Unavailable
      </h3>
      
      <p className="text-secondary-600 mb-4">
        {reason || `${feature} is temporarily unavailable. Please try again later.`}
      </p>
      
      {showRetry && onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </Card>
  );
};

export default GracefulDegradation;

// Specific degradation components for common scenarios
export const OfflineDegradation: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  feature: string;
}> = ({ children, fallback, feature }) => (
  <GracefulDegradation
    isAvailable={navigator.onLine}
    feature={feature}
    reason={`${feature} requires an internet connection. Please check your connection and try again.`}
    showRetry={false}
    fallback={fallback}
  >
    {children}
  </GracefulDegradation>
);

export const ServiceDegradation: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  feature: string;
  isServiceAvailable: boolean;
  onRetry?: () => void;
}> = ({ children, fallback, feature, isServiceAvailable, onRetry }) => (
  <GracefulDegradation
    isAvailable={isServiceAvailable}
    feature={feature}
    reason={`${feature} service is currently unavailable. Our team is working to restore it.`}
    onRetry={onRetry}
    fallback={fallback}
  >
    {children}
  </GracefulDegradation>
);

export const FeatureDegradation: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  feature: string;
  isFeatureEnabled: boolean;
  reason?: string;
}> = ({ children, fallback, feature, isFeatureEnabled, reason }) => (
  <GracefulDegradation
    isAvailable={isFeatureEnabled}
    feature={feature}
    reason={reason || `${feature} is currently disabled.`}
    showRetry={false}
    fallback={fallback}
  >
    {children}
  </GracefulDegradation>
);