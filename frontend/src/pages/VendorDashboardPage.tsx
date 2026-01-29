import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { performanceMonitor } from '../services/performanceMonitor';
import { errorHandler } from '../services/errorHandler';
import { 
  LayoutDashboard, 
  UserCircle, 
  MessageSquare, 
  BarChart3, 
  Star, 
  Store, 
  Menu, 
  Bell, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter,
  Sun,
  Moon,
  Globe,
  Info,
  Settings
} from 'lucide-react';
import VendorAnalytics from '../components/vendors/VendorAnalytics';
import VendorReviewManagement from '../components/vendors/VendorReviewManagement';
import PhotoUpload from '../components/vendors/PhotoUpload';
import VerificationBadge from '../components/vendors/VerificationBadge';
import VerificationStatus from '../components/vendors/VerificationStatus';
import AddressInput from '../components/vendors/AddressInput';
import WorkingHoursInput from '../components/vendors/WorkingHoursInput';
import UniversalSettings from '../components/shared/UniversalSettings';
import VendorMessaging from '../components/vendors/VendorMessaging';
import { vendorApi } from '../lib/api';

// --- Types & Interfaces ---
interface ServicePackage {
  id: string;
  name: string;
  price: string;
  description: string;
}

interface VendorProfileData {
  id: string;
  businessName: string;
  category: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  streetAddress: string;
  city: string;
  services: ServicePackage[];
  isVerified: boolean;
  phoneVerified: boolean;
  completionPercentage: number;
  businessPhotos: string[];
  portfolioPhotos: string[];
  workingHours: Array<{
    day: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }>;
  additionalInfo: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDate?: string;
  verificationHistory?: Array<{
    status: string;
    date: string;
    reason?: string;
    notes?: string;
  }>;
  latitude?: number;
  longitude?: number;
  mapAddress?: string;
}

interface Lead {
  id: string;
  coupleName: string;
  eventDate: string;
  status: 'New' | 'Contacted' | 'Booked' | 'Lost';
  budget: string;
  message: string;
  dateReceived: string;
}

// --- Mock Data ---
const initialVendorData: VendorProfileData = {
  id: 'v1',
  businessName: '',
  category: 'Photography',
  description: '',
  location: 'Addis Ababa',
  phone: '+251 911 234 567',
  email: 'contact@vendor.com',
  website: '',
  streetAddress: '',
  city: 'Addis Ababa',
  services: [
    { id: '1', name: 'Gold Wedding Package', price: '45,000', description: 'Full day coverage, 2 photographers, photobook.' }
  ],
  isVerified: false,
  phoneVerified: false,
  completionPercentage: 45,
  businessPhotos: [],
  portfolioPhotos: [],
  workingHours: [
    { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '16:00' },
    { day: 'Sunday', isOpen: false, openTime: '09:00', closeTime: '18:00' }
  ],
  additionalInfo: '',
  verificationStatus: 'pending',
  verificationDate: undefined,
  verificationHistory: [],
  latitude: undefined,
  longitude: undefined,
  mapAddress: ''
};

const mockLeads: Lead[] = [
  { id: '1', coupleName: 'Abebe & Sara', eventDate: '2024-04-12', status: 'New', budget: 'ETB 50k - 80k', message: 'We love your style! Are you available for our wedding?', dateReceived: '2h ago' },
  { id: '2', coupleName: 'Dawit & Tigist', eventDate: '2024-05-20', status: 'Contacted', budget: 'ETB 100k+', message: 'Looking for full package details.', dateReceived: '1d ago' },
  { id: '3', coupleName: 'Yonas & Helen', eventDate: '2024-02-14', status: 'Booked', budget: 'ETB 40k', message: 'Confirmed deposit.', dateReceived: '2w ago' },
];

// --- Components ---
// Memoized to prevent unnecessary re-renders
const SidebarItem = memo(({ icon: Icon, label, isActive, onClick }: { icon: any, label: string, isActive: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      isActive 
        ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-medium' 
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
    }`}
  >
    <Icon className={`w-5 h-5 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
    <span>{label}</span>
    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />}
  </button>
));

const ProgressBar = memo(({ percentage }: { percentage: number }) => (
  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
    <div 
      className={`h-2.5 rounded-full transition-all duration-500 ${
        percentage < 50 ? 'bg-amber-500' : percentage < 80 ? 'bg-blue-500' : 'bg-emerald-500'
      }`} 
      style={{ width: `${percentage}%` }}
    ></div>
  </div>
));

const StatCard = memo(({ title, value, trend, icon: Icon, colorClass }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trend.startsWith('+') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
        }`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
  </div>
));

// --- Main Views ---
const VendorProfileView = ({ vendor, setVendor }: { vendor: VendorProfileData, setVendor: (vendor: VendorProfileData) => void }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState<'input' | 'verify' | 'verified'>('input');
  const [otpCode, setOtpCode] = useState('');
  const [verificationPhone, setVerificationPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedVendor, setEditedVendor] = useState<VendorProfileData>(vendor);
  
  // --- AUTH UPDATE START ---
  // Get token from localStorage (AuthContext stores it there)
  const authToken = localStorage.getItem('jwt_token') || localStorage.getItem('access_token') || '';
  // --- AUTH UPDATE END ---

  const handleBusinessPhotosChange = (photos: string[]) => {
    if (isEditing) {
      setEditedVendor(prev => ({ ...prev, businessPhotos: photos }));
    } else {
      setVendor({ ...vendor, businessPhotos: photos });
    }
  };

  const handlePortfolioPhotosChange = (photos: string[]) => {
    if (isEditing) {
      setEditedVendor(prev => ({ ...prev, portfolioPhotos: photos }));
    } else {
      setVendor({ ...vendor, portfolioPhotos: photos });
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Prepare data for API
      const profileData = {
        business_name: editedVendor.businessName,
        category: editedVendor.category as any, // Type assertion for category
        location: editedVendor.location,
        description: editedVendor.description,
        phone: editedVendor.phone,
        website: editedVendor.website,
        street_address: editedVendor.streetAddress,
        city: editedVendor.city,
        business_photos: editedVendor.businessPhotos,
        portfolio_photos: editedVendor.portfolioPhotos
      };

      const result = await vendorApi.updateProfile(profileData);
      
      if (result) {
        setVendor(editedVendor);
        setIsEditing(false);
        console.log('✅ Profile updated successfully');
      }
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedVendor(vendor);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditedVendor({ ...vendor });
    setIsEditing(true);
  };

  const handlePhoneVerification = async () => {
    try {
      setSaving(true);
      const result = await vendorApi.sendPhoneVerificationOTP(verificationPhone);
      if (result.success) {
        setPhoneVerificationStep('verify');
        console.log('OTP sent successfully:', result.message);
      }
    } catch (error) {
      console.error('Failed to send OTP:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOtpVerification = async () => {
    try {
      setSaving(true);
      const result = await vendorApi.verifyPhoneOTP(verificationPhone, otpCode);
      if (result.success && result.verified) {
        setVendor({ ...vendor, phoneVerified: true });
        setPhoneVerificationStep('verified');
        console.log('Phone verified successfully:', result.message);
      }
    } catch (error) {
      console.error('Failed to verify OTP:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: UserCircle },
    { id: 'photos', label: 'Photos', icon: Store },
    { id: 'verification', label: 'Verification', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Business Profile</h2>
          <VerificationBadge isVerified={vendor.isVerified} size="md" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">{vendor.completionPercentage}% Complete</span>
          <div className="w-32">
            <ProgressBar percentage={vendor.completionPercentage} />
          </div>
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
            >
              <UserCircle className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
        {activeTab === 'basic' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Basic Information</h3>
              {isEditing && (
                <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg">
                  ✏️ Editing Mode
                </div>
              )}
            </div>
            
            {/* Business Name and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Business Name *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="businessName"
                    value={editedVendor.businessName || ''}
                    onChange={(e) => setEditedVendor(prev => ({ ...prev, businessName: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500 dark:focus:ring-rose-400"
                    placeholder="Enter your business name"
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                    {vendor.businessName || 'Not set'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Phone Number *
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={editedVendor.phone || ''}
                    onChange={(e) => setEditedVendor(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500 dark:focus:ring-rose-400"
                    placeholder="+251 9XX XXX XXX"
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                    {vendor.phone || 'Not set'}
                  </div>
                )}
              </div>
            </div>

            {/* Business Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Business Description *
              </label>
              {isEditing ? (
                <textarea
                  name="description"
                  value={editedVendor.description || ''}
                  onChange={(e) => setEditedVendor(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500 dark:focus:ring-rose-400"
                  placeholder="Describe your business and services..."
                />
              ) : (
                <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[100px]">
                  {vendor.description || 'Not set'}
                </div>
              )}
            </div>

            {/* Address with Map Integration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Business Address *
              </label>
              {isEditing ? (
                <AddressInput
                  value={editedVendor.streetAddress || ''}
                  onChange={(address, coordinates) => {
                    setEditedVendor(prev => ({ 
                      ...prev, 
                      streetAddress: address,
                      mapAddress: address,
                      latitude: coordinates?.lat,
                      longitude: coordinates?.lng
                    }));
                  }}
                  placeholder="Enter your exact business location"
                />
              ) : (
                <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  {vendor.streetAddress || 'Not set'}
                </div>
              )}
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Website or Social Media Link
                <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">(Optional)</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="url"
                    name="website"
                    value={editedVendor.website || ''}
                    onChange={(e) => setEditedVendor(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500 dark:focus:ring-rose-400"
                    placeholder="https://yourwebsite.com or social media profile"
                  />
                </div>
              ) : (
                <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  {vendor.website ? (
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-rose-600 dark:text-rose-400 hover:underline">
                      {vendor.website}
                    </a>
                  ) : (
                    'Not set'
                  )}
                </div>
              )}
            </div>

            {/* Working Hours */}
            <div>
              {isEditing ? (
                <WorkingHoursInput
                  value={editedVendor.workingHours}
                  onChange={(hours) => setEditedVendor(prev => ({ ...prev, workingHours: hours }))}
                />
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Business Hours</h4>
                  </div>
                  <div className="space-y-2">
                    {vendor.workingHours.map((hour, index) => (
                      <div key={hour.day} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-900 dark:text-white">{hour.day}</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {hour.isOpen ? `${hour.openTime} - ${hour.closeTime}` : 'Closed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Additional Information
                <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">(Optional)</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <Info className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <textarea
                    name="additionalInfo"
                    value={editedVendor.additionalInfo || ''}
                    onChange={(e) => setEditedVendor(prev => ({ ...prev, additionalInfo: e.target.value }))}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500 dark:focus:ring-rose-400"
                    placeholder="e.g., Appointment only, Free parking available, Wheelchair accessible..."
                  />
                </div>
              ) : (
                <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[80px]">
                  {vendor.additionalInfo || 'Not set'}
                </div>
              )}
              {isEditing && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Add any extra notes that might be helpful for customers (parking info, appointment requirements, etc.)
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-8">
            <PhotoUpload
              // --- AUTH FIX: Passing the token ---
              token={authToken}
              photos={isEditing ? editedVendor.businessPhotos : vendor.businessPhotos}
              onPhotosChange={handleBusinessPhotosChange}
              maxPhotos={5}
              title="Business Photos"
              description="Upload photos of your business location, team, and setup. These help couples understand your business better."
            />
            
            <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
              <PhotoUpload
                // --- AUTH FIX: Passing the token ---
                token={authToken}
                photos={isEditing ? editedVendor.portfolioPhotos : vendor.portfolioPhotos}
                onPhotosChange={handlePortfolioPhotosChange}
                maxPhotos={20}
                title="Portfolio Photos"
                description="Showcase your best work! Upload high-quality photos of weddings and events you've worked on."
              />
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Account Verification</h3>
            
            {/* Phone Verification */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    vendor.phoneVerified ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    {vendor.phoneVerified ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Phone Verification</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {vendor.phoneVerified ? 'Your phone number is verified' : 'Verify your phone number to build trust'}
                    </p>
                  </div>
                </div>
                <VerificationBadge isVerified={vendor.phoneVerified} size="lg" />
              </div>

              {!vendor.phoneVerified && (
                <div className="space-y-4">
                  {phoneVerificationStep === 'input' && (
                    <div className="flex gap-3">
                      <input
                        type="tel"
                        value={verificationPhone}
                        onChange={(e) => setVerificationPhone(e.target.value)}
                        placeholder="Enter phone number to verify"
                        className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                      <button
                        onClick={handlePhoneVerification}
                        disabled={!verificationPhone || saving}
                        className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Sending...' : 'Send OTP'}
                      </button>
                    </div>
                  )}

                  {phoneVerificationStep === 'verify' && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        We sent a verification code to {verificationPhone}
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={handleOtpVerification}
                          disabled={!otpCode || otpCode.length !== 6 || saving}
                          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {saving ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Verification Status */}
            <VerificationStatus
              status={vendor.verificationStatus}
              verificationDate={vendor.verificationDate}
              verificationHistory={vendor.verificationHistory}
            />
          </div>
        )}
      </div>

      {/* Save Button - Only show in editing mode */}
      {isEditing && (
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCancelEdit}
            className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

const DashboardHome = ({ vendor, setView }: { vendor: VendorProfileData, setView: (view: string) => void }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome & Profile Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Good Morning, {vendor.businessName || 'Partner'}! 👋</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening with your wedding business today.</p>
          </div>

          {vendor.completionPercentage < 100 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-900/50 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 dark:bg-amber-900/20 rounded-full -mr-16 -mt-16 opacity-50" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Your profile is incomplete</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 mb-4">
                    Complete your business profile to verify your account and start receiving leads from couples.
                  </p>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{vendor.completionPercentage}% Complete</span>
                    <div className="flex-1 max-w-xs">
                      <ProgressBar percentage={vendor.completionPercentage} />
                    </div>
                  </div>
                  <button 
                    onClick={() => setView('profile')}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Leads" value="24" trend="+12%" icon={UserCircle} colorClass="bg-blue-500 text-blue-600" />
            <StatCard title="Avg. Response" value="2h" trend="-30m" icon={Clock} colorClass="bg-purple-500 text-purple-600" />
            <StatCard title="Rating" value="4.8" icon={Star} colorClass="bg-amber-500 text-amber-600" />
          </div>

          {/* Messaging Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Messages</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Stay connected with couples</p>
                </div>
              </div>
              <button
                onClick={() => setView('messages')}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unread</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active Chats</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">-</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Response</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Tips */}
        <div className="lg:col-span-1">
          <div className="bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-6 h-full">
            <h3 className="font-semibold text-rose-900 dark:text-rose-300 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4" /> Tips for a Great Profile
            </h3>
            <ul className="space-y-4">
              {[
                "Upload at least 5 high-quality portfolio photos",
                "Add a detailed pricing package to qualify leads",
                "List your full business address for map visibility",
                "Respond to reviews to boost trust"
              ].map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-rose-800/80 dark:text-rose-300/80">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Leads Preview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 dark:text-white">Recent Inquiries</h3>
          <button onClick={() => setView('leads')} className="text-sm text-rose-600 dark:text-rose-400 font-medium hover:text-rose-700 dark:hover:text-rose-300 transition-colors">
            View All
          </button>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {mockLeads.slice(0, 3).map((lead) => (
            <div key={lead.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm">
                {lead.coupleName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{lead.coupleName}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.message}</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  lead.status === 'New' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {lead.status}
                </span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{lead.dateReceived}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LeadsView = ({ leads }: { leads: Lead[] }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Leads & Inquiries</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl text-sm focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500 dark:focus:ring-rose-400 w-48" 
            />
          </div>
          <button className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Couple</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold">
                      {lead.coupleName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{lead.coupleName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lead.dateReceived}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="text-sm text-slate-900 dark:text-white">{lead.eventDate}</div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      lead.status === 'New' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 
                      lead.status === 'Booked' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900 dark:text-white font-medium">{lead.budget}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">{lead.message}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium text-sm transition-colors">Reply</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- App Shell ---
const VendorDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendorData, setVendorData] = useState<VendorProfileData>(initialVendorData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.startMeasure('VendorDashboard-Initial-Load');
    return () => {
      performanceMonitor.endMeasure('VendorDashboard-Initial-Load', 'render');
    };
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Redirect if not a vendor
  if (!user || user.user_type !== 'VENDOR') {
    return <Navigate to="/login" replace />;
  }

  // Load vendor profile data with error handling
  useEffect(() => {
    const loadVendorProfile = async () => {
      try {
        performanceMonitor.startMeasure('VendorProfile-API-Load');
        setLoading(true);
        setError(null);
        
        const profile = await vendorApi.getMyProfile();
        
        performanceMonitor.endMeasure('VendorProfile-API-Load', 'api', {
          success: !!profile,
        });
        
        if (profile) {
          // Map API response to component state
          const mappedProfile: VendorProfileData = {
            id: profile.id?.toString() || 'v1',
            businessName: profile.business_name || '',
            category: profile.category || 'Photography',
            description: profile.description || '',
            location: profile.location || 'Addis Ababa',
            phone: profile.phone || '',
            email: profile.email || user?.email || '',
            website: profile.website || '',
            streetAddress: profile.street_address || '',
            city: profile.city || 'Addis Ababa',
            services: (profile.service_packages || []).map(pkg => ({
              id: pkg.id?.toString() || '',
              name: pkg.name,
              price: pkg.price?.toString() || '',
              description: pkg.description
            })),
            isVerified: profile.is_verified || false,
            phoneVerified: false, // Not in API response yet
            completionPercentage: 0, // Will be calculated below
            businessPhotos: profile.business_photos || [],
            portfolioPhotos: profile.portfolio_photos || [],
            workingHours: [
              { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
              { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
              { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
              { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
              { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
              { day: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '16:00' },
              { day: 'Sunday', isOpen: false, openTime: '09:00', closeTime: '18:00' }
            ],
            additionalInfo: '',
            verificationStatus: 'pending',
            verificationDate: undefined,
            verificationHistory: [],
            latitude: undefined,
            longitude: undefined,
            mapAddress: ''
          };

          setVendorData(mappedProfile);
        }
      } catch (error) {
        console.error('Failed to load vendor profile:', error);
        const errorDetails = errorHandler.handleError(error, {
          component: 'VendorDashboardPage',
          action: 'loadVendorProfile',
        });
        setError(errorDetails.userMessage);
        performanceMonitor.endMeasure('VendorProfile-API-Load', 'api', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setLoading(false);
      }
    };

    loadVendorProfile();
  }, [user]);

  // Update completion percentage based on data - memoized to prevent unnecessary recalculations
  useEffect(() => {
    let score = 0;
    if (vendorData.businessName) score += 20;
    if (vendorData.description) score += 20;
    if (vendorData.streetAddress) score += 20;
    if (vendorData.services.length > 0) score += 20;
    if (vendorData.phone) score += 20;
    setVendorData(prev => ({ ...prev, completionPercentage: score }));
  }, [vendorData.businessName, vendorData.description, vendorData.streetAddress, vendorData.services.length, vendorData.phone]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    setSidebarOpen(false);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleDarkModeToggle = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Dashboard Error</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
          >
            Reload Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-200">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-rose-200 dark:border-rose-900 border-t-rose-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white flex transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo Area */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">WedHabesha</h1>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Vendor Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" isActive={activeView === 'dashboard'} onClick={() => handleViewChange('dashboard')} />
          <SidebarItem icon={Store} label="Business Profile" isActive={activeView === 'profile'} onClick={() => handleViewChange('profile')} />
          <SidebarItem icon={MessageSquare} label="Messages" isActive={activeView === 'messages'} onClick={() => handleViewChange('messages')} />
          <SidebarItem icon={UserCircle} label="Leads & Inquiries" isActive={activeView === 'leads'} onClick={() => handleViewChange('leads')} />
          <SidebarItem icon={BarChart3} label="Analytics" isActive={activeView === 'analytics'} onClick={() => handleViewChange('analytics')} />
          <SidebarItem icon={Star} label="Reviews" isActive={activeView === 'reviews'} onClick={() => handleViewChange('reviews')} />
          <SidebarItem icon={Settings} label="Settings" isActive={activeView === 'settings'} onClick={() => handleViewChange('settings')} />
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          {/* Preferences Header */}
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Preferences
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={handleDarkModeToggle}
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dark Mode</span>
            <div className="flex items-center space-x-2">
              {darkMode ? (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              ) : (
                <Sun className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              )}
              <div className={`w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-rose-600' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform m-0.5 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </button>

          {/* User Profile Card */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-rose-500/30">
              {user?.email?.substring(0, 2).toUpperCase() || 'V'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.email || 'Vendor'}</p>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">VENDOR</span>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSidebarToggle}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white capitalize hidden sm:block">
              {activeView === 'dashboard' ? 'Vendor Dashboard' : activeView.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">
              <span>Help</span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeView === 'dashboard' && <DashboardHome vendor={vendorData} setView={setActiveView} />}
          {activeView === 'profile' && <VendorProfileView vendor={vendorData} setVendor={setVendorData} />}
          {activeView === 'leads' && <LeadsView leads={mockLeads} />}
          {activeView === 'messages' && <VendorMessaging vendorId={vendorData.id} userId={user?.id?.toString() || ''} />}
          {activeView === 'analytics' && <VendorAnalytics />}
          {activeView === 'reviews' && <VendorReviewManagement />}
          {activeView === 'settings' && <UniversalSettings userType="VENDOR" darkMode={darkMode} setDarkMode={setDarkMode} />}
        </div>
      </main>
    </div>
  );
};

export default VendorDashboardPage;