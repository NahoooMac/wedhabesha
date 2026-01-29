import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

interface TwoFactorVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (authResponse: any) => void;
  phone: string;
  password: string;
}

interface Verify2FARequest {
  phone: string;
  password: string;
  token: string;
}

const TwoFactorVerificationModal: React.FC<TwoFactorVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  phone,
  password
}) => {
  const [token, setToken] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

  // Verify 2FA during login
  const verify2FAMutation = useMutation({
    mutationFn: async (data: Verify2FARequest) => {
      return apiClient.post('/api/v1/auth/2fa/verify', data);
    },
    onSuccess: (data) => {
      onSuccess(data);
      handleClose();
    },
    onError: (error: any) => {
      console.error('2FA verification error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      verify2FAMutation.mutate({
        phone,
        password,
        token
      });
    }
  };

  const handleClose = () => {
    setToken('');
    setIsBackupCode(false);
    onClose();
  };

  const handleTokenChange = (value: string) => {
    // Auto-detect backup code format (XXXX-XXXX)
    if (value.includes('-') && value.length <= 9) {
      setIsBackupCode(true);
      setToken(value.toUpperCase());
    } else {
      setIsBackupCode(false);
      // Only allow digits for TOTP codes
      setToken(value.replace(/\D/g, '').slice(0, 6));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Two-Factor Authentication
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Verify Your Identity
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enter the 6-digit code from your authenticator app or use a backup code.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {isBackupCode ? 'Backup Code' : 'Verification Code'}
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => handleTokenChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg font-mono tracking-widest"
                placeholder={isBackupCode ? "XXXX-XXXX" : "000000"}
                maxLength={isBackupCode ? 9 : 6}
                required
                autoFocus
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                {isBackupCode 
                  ? 'Enter your 8-character backup code (XXXX-XXXX format)'
                  : 'Enter the 6-digit code from your authenticator app'
                }
              </p>
            </div>

            {verify2FAMutation.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {(verify2FAMutation.error as any)?.message || 'Invalid verification code'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={verify2FAMutation.isPending || !token || (!isBackupCode && token.length !== 6)}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {verify2FAMutation.isPending ? 'Verifying...' : 'Verify & Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setToken('');
              }}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              {isBackupCode 
                ? 'Use authenticator app instead' 
                : 'Use backup code instead'
              }
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Having trouble?</strong> Make sure your device's time is synchronized and try refreshing your authenticator app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerificationModal;