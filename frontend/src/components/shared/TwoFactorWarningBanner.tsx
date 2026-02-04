import React, { useState } from 'react';
import { Shield, AlertTriangle, X, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import TwoFactorSetup from '../auth/TwoFactorSetup';

interface TwoFactorStatus {
  enabled: boolean;
  hasSecret: boolean;
  backupCodes: {
    total: number;
    unused: number;
  };
}

interface TwoFactorWarningBannerProps {
  className?: string;
}

const TwoFactorWarningBanner: React.FC<TwoFactorWarningBannerProps> = ({ className = "" }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Get 2FA status
  const { data: twoFactorStatus, isLoading } = useQuery<TwoFactorStatus>({
    queryKey: ['2fa-status'],
    queryFn: () => apiClient.get('/api/v1/auth/2fa/status'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Don't show banner if loading, dismissed, or 2FA is already enabled
  if (isLoading || isDismissed || twoFactorStatus?.enabled) {
    return null;
  }

  return (
    <>
      <div className={`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm ${className}`}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Enable Two-Factor Authentication
                  </h3>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  Secure your account with 2FA. If you forget your password, we can send an OTP to your verified phone number for account recovery.
                </p>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSetup(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Enable 2FA Now
                  </button>
                  <button
                    onClick={() => setIsDismissed(true)}
                    className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
                  >
                    Remind me later
                  </button>
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => setIsDismissed(true)}
                className="flex-shrink-0 p-1 text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Security Benefits */}
        <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <span>Password recovery via SMS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <span>Enhanced account security</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <span>Protect against unauthorized access</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <TwoFactorSetup
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onSuccess={() => {
          setShowSetup(false);
          setIsDismissed(true); // Hide banner after successful setup
        }}
      />
    </>
  );
};

export default TwoFactorWarningBanner;