import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  KeyRound,
  ChevronLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

interface LoginFormProps {
  onSuccess?: (user: any) => void;
}

type AuthMode = 'LOGIN' | 'FORGOT_REQUEST' | 'FORGOT_VERIFY' | 'NEW_PASSWORD' | 'TWO_FACTOR';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * LoginForm Component
 * 
 * Handles user authentication through multiple methods:
 * - Email/password login
 * - Phone/password login with 2FA support
 * - Google OAuth sign-in
 * - Password reset flow
 * 
 * All authentication operations use AuthContext methods to maintain
 * consistent application state. The component never directly manipulates
 * localStorage or makes direct API calls for authentication.
 * 
 * @component
 * @param {LoginFormProps} props - Component props
 * @param {Function} props.onSuccess - Optional callback when authentication succeeds
 */
const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithEmail, signInWithPhone, signInWith2FA } = useAuth();
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'sms' | 'authenticator'>('authenticator');
  
  const [identifierType, setIdentifierType] = useState<'email' | 'phone' | null>(null);
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+251|0)[79][0-9]{8}$/;

    if (emailRegex.test(identifier)) {
      setIdentifierType('email');
    } else if (phoneRegex.test(identifier)) {
      setIdentifierType('phone');
    } else {
      setIdentifierType(null);
    }
  }, [identifier]);

  useEffect(() => {
    setError('');
  }, [mode]);

  /**
   * Categorizes authentication errors into user-friendly messages.
   * Checks error messages in order of specificity to provide appropriate feedback.
   * 
   * @param error - The error object thrown during authentication
   * @returns A user-friendly error message string
   */
  const categorizeError = (error: any): string => {
    const errorMessage = error.message || 'An error occurred';
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('validation') || 
        lowerMessage.includes('required') ||
        lowerMessage.includes('format')) {
      return errorMessage;
    }
    
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('fetch') || 
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout')) {
      return 'Connection error. Please check your internet and try again.';
    }
    
    if (lowerMessage.includes('credentials') || 
        lowerMessage.includes('invalid') || 
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('password') ||
        lowerMessage.includes('email') ||
        lowerMessage.includes('phone')) {
      return 'Invalid credentials. Please check your email/phone and password.';
    }
    
    if (lowerMessage.includes('2fa') || 
        lowerMessage.includes('verification') ||
        lowerMessage.includes('otp') ||
        lowerMessage.includes('code')) {
      return 'Verification code is incorrect. Please try again.';
    }
    
    return errorMessage;
  };

  /**
   * Makes API calls to the backend server.
   * 
   * @param endpoint - The API endpoint path
   * @param method - HTTP method (default: 'POST')
   * @param body - Request body object
   * @returns Promise resolving to the response data
   * @throws Error if the response is not ok
   */
  const apiCall = async (endpoint: string, method: string = 'POST', body?: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    
    return data;
  };

  /**
   * Handles user login with email or phone credentials.
   * Uses AuthContext methods for authentication to maintain consistent state.
   * Transitions to TWO_FACTOR mode if 2FA is required.
   * 
   * @param e - Form submit event
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (identifierType === 'email') {
        const response = await signInWithEmail(identifier, password);

        if (response.requires2FA) {
          setTwoFactorMethod(response.twoFactorMethod || 'authenticator');
          setMode('TWO_FACTOR');
        } else if (response.user) {
          if (onSuccess) onSuccess(response.user);
        }
      } else if (identifierType === 'phone') {
        const response = await signInWithPhone(identifier, password);

        if (response.requires2FA) {
          setTwoFactorMethod(response.twoFactorMethod || 'authenticator');
          setMode('TWO_FACTOR');
        } else if (response.user) {
          if (onSuccess) onSuccess(response.user);
        }
      } else {
        setError('Please enter a valid email or phone number');
      }
    } catch (error: any) {
      setError(categorizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles 2FA verification using the OTP code or backup code entered by the user.
   * Uses AuthContext.signInWith2FA to complete authentication.
   * Supports both email and phone login with 2FA.
   * 
   * @throws Error if 2FA verification fails
   */
  const handle2FAVerification = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      let verificationCode = '';
      
      if (useBackupCode) {
        // Use backup code (8 characters with dash: XXXX-XXXX)
        verificationCode = backupCodeInput.trim();
        
        if (verificationCode.length < 8) {
          setError('Backup code must be 8 characters (format: XXXX-XXXX)');
          setIsLoading(false);
          return;
        }
      } else {
        // Use OTP code (6 digits)
        verificationCode = otp.join('');
        
        if (verificationCode.length < 6) {
          setError('Please enter the complete verification code');
          setIsLoading(false);
          return;
        }
      }
      
      // Support both email and phone login with 2FA
      // Pass isEmail parameter based on identifierType
      const user = await signInWith2FA(identifier, password, verificationCode, identifierType === 'email');
      
      if (onSuccess) onSuccess(user);
    } catch (error: any) {
      setError(categorizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sends an OTP code to the user's phone for password reset.
   * 
   * @param e - Form submit event
   */
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (identifierType === 'phone') {
        const response = await apiCall('/api/v1/auth/forgot-password', 'POST', {
          phone: identifier
        });
        
        setResetToken(response.resetToken);
        setMode('FORGOT_VERIFY');
      } else {
        setError('Password reset is currently only supported for phone numbers');
      }
    } catch (error: any) {
      setError(categorizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verifies the OTP code for password reset.
   * Transitions to NEW_PASSWORD mode upon successful verification.
   */
  const handleVerifyOTP = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      setMode('NEW_PASSWORD');
    } catch (error: any) {
      setError(categorizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles OTP form submission when Enter key is pressed.
   * Prevents default form behavior and calls appropriate verification handler.
   * 
   * @param e - Form submit event
   */
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'TWO_FACTOR') {
      handle2FAVerification();
    } else if (mode === 'FORGOT_VERIFY') {
      handleVerifyOTP();
    }
  };

  /**
   * Handles password reset with new password.
   * Validates password match and length before submitting.
   * 
   * @param e - Form submit event
   */
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      const otpCode = otp.join('');
      
      await apiCall('/api/v1/auth/reset-password', 'POST', {
        resetToken: resetToken,
        otpCode: otpCode,
        newPassword: newPassword
      });

      setMode('LOGIN');
      setIdentifier('');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp(['', '', '', '', '', '']);
      setResetToken('');
      
      alert('Password reset successfully! You can now log in with your new password.');
      
    } catch (error: any) {
      setError(categorizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles Google Sign-In authentication.
   * Uses AuthContext to manage the OAuth flow.
   */
  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setIsGoogleLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      const errorMessage = err.message || '';
      
      if (errorMessage.includes('cancelled')) {
        setError('Google sign-in was cancelled. Please try again.');
      } else if (errorMessage.includes('popup')) {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setError(categorizeError(err));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  /**
   * Handles OTP input changes and automatic focus navigation.
   * Uses safe DOM methods with boundary checks to navigate between inputs.
   * 
   * @param element - The input element that changed
   * @param index - The index of the input (0-5)
   */
  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    if (element.value !== "" && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }
  };

  /**
   * Renders the appropriate icon based on the detected identifier type.
   * 
   * @returns Icon component for email, phone, or default
   */
  const renderInputIcon = () => {
    if (identifierType === 'email') return <Mail className="w-5 h-5 text-rose-500" />;
    if (identifierType === 'phone') return <Phone className="w-5 h-5 text-blue-500" />;
    return <Mail className="w-5 h-5 text-gray-400" />;
  };

  /**
   * Renders error message if present.
   * 
   * @returns Error message component or null
   */
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  };

  if (mode === 'LOGIN') {
    return (
      <form onSubmit={handleLogin} className="space-y-5 animate-fade-in pt-10">
        {renderError()}
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
            Email or Phone Number
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-rose-500">
              {renderInputIcon()}
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none dark:text-white font-medium placeholder:font-normal"
              placeholder="name@example.com or +251912345678"
              required
            />
          </div>
          {identifierType && (
            <p className="text-xs text-gray-500 ml-1">
              {identifierType === 'email' ? '📧 Email login' : '📱 Phone login'}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center ml-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <button
              type="button"
              onClick={() => setMode('FORGOT_REQUEST')}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none dark:text-white font-medium"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !identifierType}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Sign In <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <Button
          variant="outline"
          type="button"
          className="w-full border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold transition-all duration-200"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading}
          loading={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Sign in with Google
        </Button>
      </form>
    );
  }

  if (mode === 'FORGOT_REQUEST') {
    return (
      <div className="space-y-6 animate-fade-in">
        <button 
          onClick={() => setMode('LOGIN')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Login
        </button>

        {renderError()}

        <div className="text-center mb-2">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reset Password</h3>
          <p className="text-sm text-gray-500 mt-1">Enter your phone number to receive a reset code.</p>
        </div>

        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-rose-500">
                {renderInputIcon()}
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none dark:text-white font-medium"
                placeholder="Phone Number (+251912345678)"
                required
              />
            </div>
            {identifierType !== 'phone' && identifier && (
              <p className="text-xs text-red-500 ml-1">
                Please enter a valid Ethiopian phone number (+251912345678)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || identifierType !== 'phone'}
            className="w-full bg-rose-600 text-white py-3.5 rounded-xl font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
          </button>
        </form>
      </div>
    );
  }

  if (mode === 'FORGOT_VERIFY') {
    return (
      <div className="space-y-6 animate-fade-in">
        <button 
          onClick={() => setMode('FORGOT_REQUEST')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Change {identifierType}
        </button>

        {renderError()}

        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Code</h3>
          <p className="text-sm text-gray-500 mt-1">
            We sent a code to <span className="font-semibold text-gray-900 dark:text-white">{identifier}</span>
          </p>
        </div>

        <form onSubmit={handleOtpSubmit}>
          <div className="flex justify-center gap-2 mb-6">
              {otp.map((data, index) => (
                  <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      maxLength={1}
                      value={data}
                      onChange={e => handleOtpChange(e.target, index)}
                      onFocus={e => e.target.select()}
                      className="w-10 h-12 text-center text-xl font-bold border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-rose-500 focus:outline-none dark:bg-gray-800 dark:text-white transition-colors"
                  />
              ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join('').length < 6}
            className="w-full bg-rose-600 text-white py-3.5 rounded-xl font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Proceed"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          Didn't receive code? <button 
            onClick={handleSendOTP}
            className="text-rose-600 font-semibold hover:underline"
            disabled={isLoading}
          >
            Resend
          </button>
        </p>
      </div>
    );
  }

  if (mode === 'TWO_FACTOR') {
    const methodText = twoFactorMethod === 'sms' 
      ? 'A 6-digit code will be sent to your phone via SMS'
      : 'Enter the 6-digit code from your authenticator app';
    
    return (
      <div className="space-y-6 animate-fade-in">
        <button 
          onClick={() => {
            setMode('LOGIN');
            setUseBackupCode(false);
            setBackupCodeInput('');
            setOtp(['', '', '', '', '', '']);
          }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Login
        </button>

        {renderError()}

        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500 mt-1">
            {methodText}
          </p>
        </div>

        {!useBackupCode ? (
          <form onSubmit={handleOtpSubmit}>
            <div className="flex justify-center gap-2 mb-6">
                {otp.map((data, index) => (
                    <input
                        key={index}
                        id={`otp-input-${index}`}
                        type="text"
                        maxLength={1}
                        value={data}
                        onChange={e => handleOtpChange(e.target, index)}
                        onFocus={e => e.target.select()}
                        className="w-10 h-12 text-center text-xl font-bold border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:text-white transition-colors"
                    />
                ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join('').length < 6}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handle2FAVerification(); }}>
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-2 block">
                Backup Code (8 characters)
              </label>
              <input
                type="text"
                value={backupCodeInput}
                onChange={(e) => setBackupCodeInput(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                maxLength={9}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none dark:text-white font-mono text-center text-lg tracking-wider"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || backupCodeInput.length < 8}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Backup Code"}
            </button>
          </form>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setError('');
              setOtp(['', '', '', '', '', '']);
              setBackupCodeInput('');
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {useBackupCode ? 'Use verification code instead' : 'Use backup code instead'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'NEW_PASSWORD') {
    return (
      <div className="space-y-6 animate-fade-in">
        {renderError()}
        
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Set New Password</h3>
          <p className="text-sm text-gray-500 mt-1">Password must be at least 8 characters long.</p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
              New Password
            </label>
             <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-4 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none dark:text-white"
              placeholder="Enter new password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
              Confirm Password
            </label>
             <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-4 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none dark:text-white"
              placeholder="Confirm new password"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !newPassword || !confirmPassword}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
          </button>
        </form>
      </div>
    );
  }

  return null;
};

export default LoginForm;
