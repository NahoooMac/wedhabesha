import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Setup2FAResponse {
  message: string;
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

interface Enable2FARequest {
  token: string;
}

interface Enable2FAResponse {
  message: string;
  backupCodes: string[];
}

interface TwoFactorStatus {
  enabled: boolean;
  hasSecret: boolean;
  backupCodes: {
    total: number;
    unused: number;
  };
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup-codes'>('setup');
  const [token, setToken] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Get 2FA status
  const { data: twoFactorStatus } = useQuery<TwoFactorStatus>({
    queryKey: ['2fa-status'],
    queryFn: () => apiClient.get('/api/v1/auth/2fa/status'),
  });

  // Setup 2FA (generate QR code)
  const setup2FAMutation = useMutation({
    mutationFn: async (): Promise<Setup2FAResponse> => {
      return apiClient.post('/api/v1/auth/2fa/setup');
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('verify');
    },
    onError: (error: any) => {
      console.error('2FA setup error:', error);
    }
  });

  // Enable 2FA (verify token)
  const enable2FAMutation = useMutation({
    mutationFn: async (data: Enable2FARequest): Promise<Enable2FAResponse> => {
      return apiClient.post('/api/v1/auth/2fa/enable', data);
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep('backup-codes');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (error: any) => {
      console.error('Enable 2FA error:', error);
    }
  });

  const handleSetupStart = () => {
    setup2FAMutation.mutate();
  };

  const handleVerifyToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length === 6) {
      enable2FAMutation.mutate({ token });
    }
  };

  const handleComplete = () => {
    setStep('setup');
    setToken('');
    setQrCode('');
    setSecret('');
    setBackupCodes([]);
    onSuccess?.();
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadBackupCodes = () => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {step === 'setup' && 'Setup Two-Factor Authentication'}
            {step === 'verify' && 'Verify Your Authenticator'}
            {step === 'backup-codes' && 'Save Your Backup Codes'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Setup Introduction */}
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Secure Your Account
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Two-factor authentication adds an extra layer of security to your account by requiring a verification code from your phone.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Install an Authenticator App</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Download Google Authenticator, Authy, or Microsoft Authenticator on your phone.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Scan QR Code</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Use your authenticator app to scan the QR code we'll generate for you.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Verify Setup</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Enter the 6-digit code from your app to complete the setup.
                    </p>
                  </div>
                </div>
              </div>

              {setup2FAMutation.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {(setup2FAMutation.error as any)?.message || 'Failed to setup 2FA'}
                  </p>
                </div>
              )}

              <button
                onClick={handleSetupStart}
                disabled={setup2FAMutation.isPending}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {setup2FAMutation.isPending ? 'Setting up...' : 'Start Setup'}
              </button>
            </div>
          )}

          {/* Step 2: QR Code and Verification */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Scan QR Code
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Open your authenticator app and scan this QR code, or enter the key manually.
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              {/* Manual Entry */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Manual Entry Key</h4>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-sm font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white break-all">
                    {secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(secret)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleVerifyToken} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Enter 6-digit code from your authenticator app
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg font-mono tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                {enable2FAMutation.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {(enable2FAMutation.error as any)?.message || 'Invalid verification code'}
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep('setup')}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={enable2FAMutation.isPending || token.length !== 6}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {enable2FAMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 'backup-codes' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  2FA Enabled Successfully!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Save these backup codes in a secure location. You can use them to access your account if you lose your phone.
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Important Security Information</h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                      <li>• Each backup code can only be used once</li>
                      <li>• Store these codes in a secure location</li>
                      <li>• Don't share them with anyone</li>
                      <li>• Generate new codes if these are compromised</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900 dark:text-white">Backup Codes</h4>
                  <button
                    onClick={downloadBackupCodes}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-sm text-center text-slate-900 dark:text-white"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Complete Setup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;