import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import TwoFactorSetup from '../auth/TwoFactorSetup';
import { apiClient } from '../../lib/api';

interface TwoFactorStatus {
  enabled: boolean;
  method: 'sms' | 'authenticator';
  hasSecret: boolean;
  backupCodes: {
    total: number;
    unused: number;
  };
}

interface ProfileData {
  partner1_name?: string;
  partner2_name?: string;
  phone?: string;
  email?: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    partner1_name: '',
    partner2_name: '',
    phone: '',
    email: user?.email || '',
  });
  
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get 2FA status
  const { data: twoFactorStatus, refetch: refetch2FAStatus } = useQuery<TwoFactorStatus>({
    queryKey: ['2fa-status'],
    queryFn: () => apiClient.get('/api/v1/auth/2fa/status'),
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsEditingProfile(false);
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      setErrors({ profile: error.message });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordData) => {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          current_password: data.currentPassword,
          new_password: data.newPassword,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
    },
    onError: (error: any) => {
      setErrors({ password: error.message });
    },
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; token: string }) => {
      return apiClient.post('/api/v1/auth/2fa/disable', data);
    },
    onSuccess: () => {
      refetch2FAStatus();
      setErrors({});
    },
    onError: (error: any) => {
      setErrors({ twoFactor: error.message || 'Failed to disable 2FA' });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!profileData.email?.trim()) {
      newErrors.email = 'Email is required';
    }

    if (user?.user_type === 'COUPLE') {
      if (!profileData.partner1_name?.trim()) {
        newErrors.partner1_name = 'Partner 1 name is required';
      }
      if (!profileData.partner2_name?.trim()) {
        newErrors.partner2_name = 'Partner 2 name is required';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      updateProfileMutation.mutate(profileData);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      changePasswordMutation.mutate(passwordData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Appearance
          </CardTitle>
          <CardDescription>
            Customize your dashboard appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Switch between light and dark themes
              </p>
            </div>
            <Button
              onClick={toggleTheme}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isDark ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light Mode
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark Mode
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </div>
            {!isEditingProfile && (
              <Button
                onClick={() => setIsEditingProfile(true)}
                variant="outline"
                className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-600 dark:text-rose-400 dark:hover:bg-rose-900/20"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className={errors.email ? 'border-red-300' : ''}
                />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
              </div>

              {user?.user_type === 'COUPLE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Partner 1 Name
                    </label>
                    <Input
                      type="text"
                      value={profileData.partner1_name}
                      onChange={(e) => setProfileData({ ...profileData, partner1_name: e.target.value })}
                      className={errors.partner1_name ? 'border-red-300' : ''}
                    />
                    {errors.partner1_name && <p className="text-sm text-red-600 mt-1">{errors.partner1_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Partner 2 Name
                    </label>
                    <Input
                      type="text"
                      value={profileData.partner2_name}
                      onChange={(e) => setProfileData({ ...profileData, partner2_name: e.target.value })}
                      className={errors.partner2_name ? 'border-red-300' : ''}
                    />
                    {errors.partner2_name && <p className="text-sm text-red-600 mt-1">{errors.partner2_name}</p>}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>

              {errors.profile && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.profile}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setErrors({});
                  }}
                  disabled={updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-gray-900 dark:text-white">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Type</p>
                <p className="text-gray-900 dark:text-white">{user?.user_type}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Password & Security
              </CardTitle>
              <CardDescription>
                Change your account password
              </CardDescription>
            </div>
            {!isChangingPassword && (
              <Button
                onClick={() => setIsChangingPassword(true)}
                variant="outline"
                className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-600 dark:text-rose-400 dark:hover:bg-rose-900/20"
              >
                Change Password
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isChangingPassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className={errors.currentPassword ? 'border-red-300' : ''}
                />
                {errors.currentPassword && <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className={errors.newPassword ? 'border-red-300' : ''}
                />
                {errors.newPassword && <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className={errors.confirmPassword ? 'border-red-300' : ''}
                />
                {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
              </div>

              {errors.password && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white"
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setErrors({});
                  }}
                  disabled={changePasswordMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Password</p>
                <p className="text-gray-900 dark:text-white">••••••••</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last changed: Never
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {twoFactorStatus?.enabled ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enabled
                </div>
                <Button
                  onClick={() => {
                    // For now, we'll show a simple alert. In a full implementation, 
                    // you'd want a proper disable 2FA modal with password confirmation
                    const currentPassword = prompt('Enter your current password to disable 2FA:');
                    const token = prompt('Enter your 2FA code:');
                    if (currentPassword && token) {
                      disable2FAMutation.mutate({ currentPassword, token });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                  disabled={disable2FAMutation.isPending}
                >
                  {disable2FAMutation.isPending ? 'Disabling...' : 'Disable'}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowTwoFactorSetup(true)}
                variant="outline"
                className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-600 dark:text-rose-400 dark:hover:bg-rose-900/20"
              >
                Enable 2FA
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {twoFactorStatus?.enabled ? (
              <>
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                      2FA is Active
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your account is protected with {twoFactorStatus.method === 'sms' ? 'SMS' : 'Authenticator App'} two-factor authentication.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Method</p>
                    <p className="text-gray-900 dark:text-white">
                      {twoFactorStatus.method === 'sms' ? 'SMS Text Message' : 'Authenticator App'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Backup Codes</p>
                    <p className="text-gray-900 dark:text-white">
                      {twoFactorStatus.backupCodes.unused} of {twoFactorStatus.backupCodes.total} unused
                    </p>
                  </div>
                </div>

                {twoFactorStatus.backupCodes.unused < 3 && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                        Low Backup Codes
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        You have {twoFactorStatus.backupCodes.unused} backup codes remaining. Consider regenerating new ones.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Enhance Your Security
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Two-factor authentication adds an extra layer of security to your account by requiring a second form of verification when signing in.
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Choose between SMS or Authenticator App</li>
                    <li>• Get backup codes for account recovery</li>
                    <li>• Protect against unauthorized access</li>
                  </ul>
                </div>
              </div>
            )}

            {errors.twoFactor && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.twoFactor}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Setup Modal */}
      <TwoFactorSetup
        isOpen={showTwoFactorSetup}
        onClose={() => setShowTwoFactorSetup(false)}
        onSuccess={() => {
          refetch2FAStatus();
          setShowTwoFactorSetup(false);
        }}
      />
    </div>
  );
};

export default ProfileSettings;