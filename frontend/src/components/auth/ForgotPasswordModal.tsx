import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ForgotPasswordRequest {
  phone: string;
}

interface ForgotPasswordResponse {
  message: string;
  resetToken: string;
}

interface ResetPasswordRequest {
  resetToken: string;
  otpCode: string;
  newPassword: string;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Request password reset
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
      return apiClient.post('/api/v1/auth/forgot-password', data);
    },
    onSuccess: (data) => {
      setResetToken(data.resetToken);
      setStep('otp');
    },
    onError: (error: any) => {
      console.error('Forgot password error:', error);
    }
  });

  // Reset password with OTP
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      return apiClient.post('/api/v1/auth/reset-password', data);
    },
    onSuccess: () => {
      setStep('success');
    },
    onError: (error: any) => {
      console.error('Reset password error:', error);
      // Error will be displayed in the form
    }
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone) {
      forgotPasswordMutation.mutate({ phone });
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode || !newPassword || !confirmPassword) {
      return;
    }

    if (newPassword !== confirmPassword) {
      return;
    }

    if (newPassword.length < 8) {
      return;
    }

    resetPasswordMutation.mutate({
      resetToken,
      otpCode,
      newPassword
    });
  };

  const handleClose = () => {
    setStep('phone');
    setPhone('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    onClose();
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) return { level: 'weak', color: 'bg-red-500', text: 'Weak' };
    if (strength <= 3) return { level: 'medium', color: 'bg-yellow-500', text: 'Medium' };
    if (strength <= 4) return { level: 'strong', color: 'bg-green-500', text: 'Strong' };
    return { level: 'very-strong', color: 'bg-green-600', text: 'Very Strong' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {step === 'phone' && 'Reset Password'}
            {step === 'otp' && 'Verify & Reset'}
            {step === 'success' && 'Password Reset'}
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
          {/* Step 1: Phone Input */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Enter your phone number and we'll send you a verification code to reset your password.
                </p>
                
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your phone number"
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Format: +251912345678 or 0912345678
                </p>
              </div>

              {forgotPasswordMutation.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {(forgotPasswordMutation.error as any)?.message || 'Failed to send reset code'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={forgotPasswordMutation.isPending || !phone}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {/* Step 2: OTP and New Password */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  We've sent a 6-digit verification code to <strong>{phone}</strong>. 
                  Enter the code and your new password below.
                </p>
                
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.level === 'weak' ? 20 : passwordStrength.level === 'medium' ? 40 : passwordStrength.level === 'strong' ? 70 : 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength.level === 'weak' ? 'text-red-600' : passwordStrength.level === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Must contain uppercase, lowercase, number, and special character
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Confirm new password"
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>

              {resetPasswordMutation.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {(resetPasswordMutation.error as any)?.message || 'Failed to reset password'}
                  </p>
                  {(resetPasswordMutation.error as any)?.details && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                      {JSON.stringify((resetPasswordMutation.error as any).details)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending || !otpCode || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Password Reset Successfully!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Continue to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;