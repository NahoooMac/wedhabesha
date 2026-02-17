import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import TwoFactorSetup from './TwoFactorSetup';

interface TwoFactorStatus {
  enabled: boolean;
  hasSecret: boolean;
  method?: 'authenticator' | 'sms';
  backupCodes: {
    total: number;
    unused: number;
  };
}

interface DisableTwoFactorRequest {
  currentPassword: string;
  token: string;
}

interface RegenerateBackupCodesRequest {
  currentPassword: string;
  token: string;
}

const TwoFactorManagement: React.FC = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [token, setToken] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const queryClient = useQueryClient();

  // Get 2FA status
  const { data: twoFactorStatus, isLoading } = useQuery<TwoFactorStatus>({
    queryKey: ['2fa-status'],
    queryFn: () => apiClient.get('/api/v1/auth/2fa/status'),
  });

  // Send SMS code for disable
  const sendDisableCodeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/api/v1/auth/2fa/disable/send-code', {});
    },
    onSuccess: () => {
      setCodeSent(true);
    },
    onError: (error: any) => {
      console.error('Send code error:', error);
    }
  });

  // Disable 2FA
  const disable2FAMutation = useMutation({
    mutationFn: async (data: DisableTwoFactorRequest) => {
      return apiClient.post('/api/v1/auth/2fa/disable', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      setShowDisableForm(false);
      setCurrentPassword('');
      setToken('');
    },
    onError: (error: any) => {
      console.error('Disable 2FA error:', error);
    }
  });

  // Regenerate backup codes
  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async (data: RegenerateBackupCodesRequest) => {
      return apiClient.post('/api/v1/auth/2fa/regenerate-backup-codes', data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      setShowRegenerateForm(false);
      setCurrentPassword('');
      setToken('');
      
      // Download new backup codes
      downloadBackupCodes(data.backupCodes);
    },
    onError: (error: any) => {
      console.error('Regenerate backup codes error:', error);
    }
  });

  const downloadBackupCodes = (backupCodes: string[]) => {
    const content = `Wedding Platform - 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes:\n${backupCodes.join('\n')}\n\nImportant:\n- Each code can only be used once\n- Store these codes in a secure location\n- Don't share them with anyone\n- Generate new codes if these are compromised`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-platform-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDisable2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPassword && token) {
      disable2FAMutation.mutate({ currentPassword, token });
    }
  };

  const handleShowDisableForm = () => {
    setShowDisableForm(true);
    setCodeSent(false);
    setCurrentPassword('');
    setToken('');
    
    // If SMS method, automatically send code
    if (twoFactorStatus?.method === 'sms') {
      sendDisableCodeMutation.mutate();
    }
  };

  const handleSendCode = () => {
    sendDisableCodeMutation.mutate();
  };

  const handleRegenerateBackupCodes = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPassword && token) {
      regenerateBackupCodesMutation.mutate({ currentPassword, token });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Two-Factor Authentication
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Add an extra layer of security to your account with two-factor authentication.
        </p>
      </div>

      {!twoFactorStatus?.enabled ? (
        // 2FA Not Enabled
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1 text-sm sm:text-base">
                Two-Factor Authentication is Disabled
              </h4>
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Your account is not protected by two-factor authentication. Enable it now to secure your account.
              </p>
              <button
                onClick={() => setShowSetup(true)}
                className="bg-yellow-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-xs sm:text-sm font-medium active:scale-[0.98]"
              >
                Enable Two-Factor Authentication
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 2FA Enabled
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-1 text-sm sm:text-base">
                Two-Factor Authentication is Enabled
              </h4>
              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 mb-3">
                Your account is protected by two-factor authentication.
              </p>
              
              {/* Backup Codes Status */}
              <div className="mb-4 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                      Backup Codes
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {twoFactorStatus.backupCodes.unused} of {twoFactorStatus.backupCodes.total} codes remaining
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRegenerateForm(true)}
                    className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex-shrink-0 ml-2 active:scale-95"
                  >
                    Regenerate
                  </button>
                </div>
                
                {twoFactorStatus.backupCodes.unused <= 2 && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      ⚠️ You're running low on backup codes. Consider regenerating them.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowRegenerateForm(true)}
                  className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm font-medium active:scale-[0.98]"
                >
                  Regenerate Backup Codes
                </button>
                <button
                  onClick={handleShowDisableForm}
                  className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium active:scale-[0.98]"
                >
                  Disable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Form */}
      {showDisableForm && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
          <h4 className="font-medium text-slate-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">
            Disable Two-Factor Authentication
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 sm:mb-4">
            {twoFactorStatus?.method === 'sms' 
              ? 'To disable 2FA, please enter your current password and the verification code sent to your phone.'
              : 'To disable 2FA, please enter your current password and a verification code from your authenticator app.'}
          </p>
          
          {twoFactorStatus?.method === 'sms' && (
            <div className="mb-4">
              {codeSent ? (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                    ✓ Verification code sent to your phone
                  </p>
                </div>
              ) : sendDisableCodeMutation.isPending ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    Sending verification code...
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleSendCode}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium active:scale-[0.98]"
                >
                  Send Verification Code
                </button>
              )}
              
              {sendDisableCodeMutation.error && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {(sendDisableCodeMutation.error as any)?.message || 'Failed to send code'}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleDisable2FA} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center font-mono text-sm sm:text-base"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>

            {disable2FAMutation.error && (
              <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                  {(disable2FAMutation.error as any)?.message || 'Failed to disable 2FA'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDisableForm(false);
                  setCurrentPassword('');
                  setToken('');
                  setCodeSent(false);
                }}
                className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={disable2FAMutation.isPending || !currentPassword || token.length !== 6}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm active:scale-[0.98]"
              >
                {disable2FAMutation.isPending ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Regenerate Backup Codes Form */}
      {showRegenerateForm && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
          <h4 className="font-medium text-slate-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">
            Regenerate Backup Codes
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 sm:mb-4">
            This will generate new backup codes and invalidate your existing ones. Enter your current password and a verification code.
          </p>
          
          <form onSubmit={handleRegenerateBackupCodes} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center font-mono text-sm sm:text-base"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>

            {regenerateBackupCodesMutation.error && (
              <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                  {(regenerateBackupCodesMutation.error as any)?.message || 'Failed to regenerate backup codes'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRegenerateForm(false);
                  setCurrentPassword('');
                  setToken('');
                }}
                className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={regenerateBackupCodesMutation.isPending || !currentPassword || token.length !== 6}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm active:scale-[0.98]"
              >
                {regenerateBackupCodesMutation.isPending ? 'Regenerating...' : 'Regenerate Codes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2FA Setup Modal */}
      <TwoFactorSetup
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onSuccess={() => {
          setShowSetup(false);
          queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
        }}
      />
    </div>
  );
};

export default TwoFactorManagement;