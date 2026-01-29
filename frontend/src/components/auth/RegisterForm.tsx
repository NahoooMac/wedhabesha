import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { vendorApi } from '../../lib/api';

// Couple registration schema
const coupleRegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  partner1_name: z.string().min(2, 'Partner 1 name is required'),
  partner2_name: z.string().min(2, 'Partner 2 name is required'),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Vendor registration schema
const vendorRegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  business_name: z.string().min(2, 'Business name is required'),
  business_type: z.string().min(1, 'Please select a business type'),
  phone: z.string().min(10, 'Phone number is required'),
  location: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CoupleRegisterFormData = z.infer<typeof coupleRegisterSchema>;
type VendorRegisterFormData = z.infer<typeof vendorRegisterSchema>;

interface VendorCategory {
  value: string;
  label: string;
}

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  // Get user type from URL params or localStorage
  const userType = searchParams.get('type') || localStorage.getItem('registerUserType') || 'couple';
  const isVendor = userType === 'vendor';

  // Update localStorage when URL changes
  useEffect(() => {
    localStorage.setItem('registerUserType', userType);
  }, [userType]);

  // Load vendor categories when component mounts and user is vendor
  useEffect(() => {
    if (isVendor) {
      loadVendorCategories();
    }
  }, [isVendor]);

  const loadVendorCategories = async () => {
    try {
      setCategoriesLoading(true);
      const categories = await vendorApi.getCategories();
      setVendorCategories(categories || []);
    } catch (error) {
      console.error('Failed to load vendor categories:', error);
      // Fallback categories if API fails
      setVendorCategories([
        { value: 'photography', label: 'Photography' },
        { value: 'videography', label: 'Videography' },
        { value: 'venue', label: 'Venue' },
        { value: 'catering', label: 'Catering' },
        { value: 'music', label: 'Music & DJ' },
        { value: 'flowers', label: 'Flowers & Decoration' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'makeup', label: 'Makeup & Beauty' },
        { value: 'dress', label: 'Wedding Dress' },
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'invitations', label: 'Invitations' },
        { value: 'other', label: 'Other Services' }
      ]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CoupleRegisterFormData | VendorRegisterFormData>({
    resolver: zodResolver(isVendor ? vendorRegisterSchema : coupleRegisterSchema),
  });

  const onSubmit = async (data: any) => {
    try {
      setError('');
      setFieldErrors({});
      setIsLoading(true);
      
      const { confirmPassword, ...userData } = data;
      await signUpWithEmail(data.email, data.password, {
        ...userData,
        user_type: isVendor ? 'VENDOR' : 'COUPLE'
      });
      onSuccess?.();
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle validation errors from API
      if (err.details && Array.isArray(err.details)) {
        const newFieldErrors: Record<string, string> = {};
        err.details.forEach((detail: any) => {
          if (detail.path && detail.msg) {
            newFieldErrors[detail.path] = detail.msg;
          }
        });
        setFieldErrors(newFieldErrors);
        setError('Please fix the errors below and try again.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setIsLoading(true);
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled. Please try again or use the registration form above.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site or use the registration form above.');
      } else {
        setError('Google sign-in failed. Please try using the registration form above.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {isVendor ? (
          <>
            {/* Vendor Form Fields */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Name
              </label>
              <Input
                placeholder="Enter your business name"
                {...register('business_name')}
                error={(errors as any).business_name?.message || fieldErrors.business_name}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-gray-50/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Type
              </label>
              <div className="relative">
                <select
                  {...register('business_type')}
                  disabled={isLoading || categoriesLoading}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-gray-50/50 appearance-none cursor-pointer"
                >
                  <option value="">
                    {categoriesLoading ? 'Loading categories...' : 'Select your business type'}
                  </option>
                  {vendorCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {((errors as any).business_type?.message || fieldErrors.business_type) && (
                <p className="mt-1 text-sm text-red-600">
                  {(errors as any).business_type?.message || fieldErrors.business_type}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                {...register('phone')}
                error={(errors as any).phone?.message || fieldErrors.phone}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-gray-50/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location (Optional)
              </label>
              <Input
                placeholder="Enter your location"
                {...register('location')}
                error={(errors as any).location?.message || fieldErrors.location}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-gray-50/50"
              />
            </div>
          </>
        ) : (
          <>
            {/* Couple Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Partner 1 Name
                </label>
                <Input
                  placeholder="First partner's name"
                  {...register('partner1_name')}
                  error={(errors as any).partner1_name?.message || fieldErrors.partner1_name}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Partner 2 Name
                </label>
                <Input
                  placeholder="Second partner's name"
                  {...register('partner2_name')}
                  error={(errors as any).partner2_name?.message || fieldErrors.partner2_name}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-gray-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone (Optional)
              </label>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                {...register('phone')}
                error={(errors as any).phone?.message || fieldErrors.phone}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-gray-50/50"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address
          </label>
          <Input
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            error={(errors as any).email?.message || fieldErrors.email}
            disabled={isLoading}
            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 ${
              isVendor 
                ? 'focus:ring-purple-500 focus:border-purple-500' 
                : 'focus:ring-rose-500 focus:border-rose-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Password
          </label>
          <Input
            type="password"
            placeholder="Create a password"
            {...register('password')}
            error={(errors as any).password?.message || fieldErrors.password}
            disabled={isLoading}
            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 ${
              isVendor 
                ? 'focus:ring-purple-500 focus:border-purple-500' 
                : 'focus:ring-rose-500 focus:border-rose-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Confirm Password
          </label>
          <Input
            type="password"
            placeholder="Confirm your password"
            {...register('confirmPassword')}
            error={(errors as any).confirmPassword?.message || fieldErrors.confirmPassword}
            disabled={isLoading}
            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 ${
              isVendor 
                ? 'focus:ring-purple-500 focus:border-purple-500' 
                : 'focus:ring-rose-500 focus:border-rose-500'
            }`}
          />
        </div>

        <Button
          type="submit"
          className={`w-full text-white py-3 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 ${
            isVendor 
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' 
              : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700'
          }`}
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-6 rounded-xl font-semibold text-lg transition-all duration-200"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        loading={isLoading}
      >
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
        Sign up with Google
      </Button>
    </div>
  );
};

export default RegisterForm;