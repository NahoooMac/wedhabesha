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
  secret?: string;
  qrCode?: string;
  manualEntryKey?: string;
  method: 'sms' | 'authenticator';
}

interface Enable2FARequest {
  token: string;
  method: 'sms' | 'authenticator';
}

interface Enable2FAResponse {
  message: string;
  backupCodes: string[];
  method: 'sms' | 'authenticator';
}

interface TwoFactorStatus {
  enabled: boolean;
  method: 'sms' | 'authenticator';
  hasSecret: boolean;
  backupCodes: {
    total: number;
    unused: number;
  };
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'method-choice' | 'setup' | 'verify' | 'backup-codes'>('method-choice');
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'authenticator'>('authenticator');
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

  // Setup 2FA (generate QR code or send SMS)
  const setup2FAMutation = useMutation({
    mutationFn: async (method: 'sms' | 'authenticator'): Promise<Setup2FAResponse> => {
      return apiClient.post('/api/v1/auth/2fa/setup', { method });
    },
    onSuccess: (data) => {
      if (data.method === 'authenticator') {
        setQrCode(data.qrCode || '');
        setSecret(data.secret || '');
      }
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

  const handleMethodSelect = (method: 'sms' | 'authenticator') => {
    setSelectedMethod(method);
    setStep('setup');
  };

  const handleSetupStart = () => {
    setup2FAMutation.mutate(selectedMethod);
  };

  const handleVerifyToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length === 6) {
      enable2FAMutation.mutate({ token, method: selectedMethod });
    }
  };

  const handleComplete = () => {
    setStep('method-choice');
    setSelectedMethod('authenticator');
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
            {step === 'method-choice' && 'Choose 2FA Method'}
            {step === 'setup' && `Setup ${selectedMethod === 'sms' ? 'SMS' : 'Authenticator'} 2FA`}
            {step === 'verify' && 'Verify Your Code'}
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
          {/* Step 0: Method Choice */}
          {step === 'method-choice' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Choose Your 2FA Method
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Select how you'd like to receive verification codes for two-factor authentication.
                </p>
              </div>

              <div className="grid gap-4">
                {/* Authenticator App Option */}
                <button
                  onClick={() => handleMethodSelect('authenticator')}
                  className="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/40 transition-colors">
                      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Authenticator App</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Use Google Authenticator, Authy, or similar apps to generate time-based codes.
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Recommended
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">More secure</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* SMS Option */}
                <button
                  onClick={() => handleMethodSelect('sms')}
                  className="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-colors">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">SMS Text Message</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Receive verification codes via text message to your phone number.
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                          Easy to use
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Requires phone signal</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">Security Note</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Authenticator apps are more secure than SMS as they work offline and can't be intercepted. 
                      However, both methods significantly improve your account security.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Setup Introduction */}
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {selectedMethod === 'authenticator' ? (
                    <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {selectedMethod === 'authenticator' ? 'Setup Authenticator App' : 'Setup SMS 2FA'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedMethod === 'authenticator' 
                    ? 'We\'ll generate a QR code for you to scan with your authenticator app.'
                    : 'We\'ll send a verification code to your phone number to confirm setup.'
                  }
                </p>
              </div>

              {selectedMethod === 'authenticator' && (
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
              )}

              {selectedMethod === 'sms' && (
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">Verify Phone Number</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        We'll send a verification code to your registered phone number.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">Enter Verification Code</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Enter the 6-digit code you receive via SMS to complete setup.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {setup2FAMutation.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {(setup2FAMutation.error as any)?.message || 'Failed to setup 2FA'}
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('method-choice')}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleSetupStart}
                  disabled={setup2FAMutation.isPending}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {setup2FAMutation.isPending ? 'Setting up...' : 'Start Setup'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Verification */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {selectedMethod === 'authenticator' ? 'Scan QR Code' : 'Enter SMS Code'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedMethod === 'authenticator' 
                    ? 'Open your authenticator app and scan this QR code, or enter the key manually.'
                    : 'We\'ve sent a 6-digit verification code to your phone number.'
                  }
                </p>
              </div>

              {/* Authenticator Method - QR Code */}
              {selectedMethod === 'authenticator' && (
                <>
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
                </>
              )}

              {/* SMS Method - Info */}
              {selectedMethod === 'sms' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">SMS Code Sent</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        A 6-digit verification code has been sent to your registered phone number. 
                        Enter the code below to complete the setup.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Verification Form */}
              <form onSubmit={handleVerifyToken} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {selectedMethod === 'authenticator' 
                      ? 'Enter 6-digit code from your authenticator app'
                      : 'Enter 6-digit code from SMS'
                    }
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
                  {selectedMethod === 'sms' ? 'SMS 2FA' : 'Authenticator 2FA'} Enabled Successfully!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Save these backup codes in a secure location. You can use them to access your account if you {selectedMethod === 'sms' ? 'lose access to your phone' : 'lose your authenticator device'}.
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