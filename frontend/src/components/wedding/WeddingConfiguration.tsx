import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { weddingApi, Wedding } from '../../lib/api';
import WeddingDetailsSection from './WeddingDetailsSection';
import TemplateSelector from '../invitations/TemplateSelector';
import { InvitationEngine, RSVPInvitationData } from '../invitations/InvitationEngine';
import RSVPTemplateSelector from './RSVPTemplateSelector';
import { Palette, Eye, Save, Sparkles } from 'lucide-react';

interface WeddingConfigurationProps {
  wedding: Wedding;
  staffPin?: string; // Only available immediately after creation
}

const WeddingConfiguration: React.FC<WeddingConfigurationProps> = ({ wedding, staffPin }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'template' | 'preview' | 'invitation-design'>('details');
  const [selectedTemplateId, setSelectedTemplateId] = useState(wedding.template_id || 'elegant-gold');
  const [customization, setCustomization] = useState(wedding.customization || {});

  const updatePinMutation = useMutation({
    mutationFn: (pin: string) => weddingApi.updateStaffPin(wedding.id, pin),
    onSuccess: () => {
      alert('Staff PIN updated successfully! All active staff sessions have been logged out.');
    },
    onError: (error: any) => {
      console.error('Failed to update staff PIN:', error);
      alert('Failed to update PIN. Please try again.');
    },
  });

  const refreshCodeMutation = useMutation({
    mutationFn: () => weddingApi.refreshWeddingCode(wedding.id),
    onSuccess: (data) => {
      queryClient.setQueryData(['wedding', 'current'], data.wedding);
      alert('Wedding code refreshed successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to refresh wedding code:', error);
      alert('Failed to refresh wedding code. Please try again.');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: { templateId: string; customization: any }) => 
      weddingApi.updateWeddingTemplate(wedding.id, data.templateId, data.customization),
    onSuccess: (data) => {
      queryClient.setQueryData(['wedding', 'current'], data.wedding);
      alert('Template updated successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to update template:', error);
      alert('Failed to update template. Please try again.');
    },
  });

  const handleUpdatePin = async (newPin: string) => {
    if (confirm('Are you sure you want to update the staff PIN? All active staff sessions will be logged out.')) {
      await updatePinMutation.mutateAsync(newPin);
    }
  };

  const handleRefreshCode = async () => {
    if (confirm('Are you sure you want to refresh the wedding code? Staff will need the new code to log in.')) {
      await refreshCodeMutation.mutateAsync();
    }
  };

  const handleSaveTemplate = async () => {
    await updateTemplateMutation.mutateAsync({
      templateId: selectedTemplateId,
      customization: customization
    });
  };

  // Prepare preview data for invitation engine
  const previewData: RSVPInvitationData = {
    guest_name: "John & Jane Smith",
    wedding_title: customization.wedding_title || wedding.wedding_title || "Wedding Invitation",
    ceremony_date: customization.ceremony_date || wedding.wedding_date || "2024-12-25",
    ceremony_time: customization.ceremony_time || "4:00 PM",
    venue_name: customization.venue_name || wedding.venue_name || "Grand Ballroom",
    venue_address: customization.venue_address || wedding.venue_address || "123 Wedding St, City",
    custom_message: customization.custom_message || "Join us for our special day",
    qr_code: undefined // QR codes are generated per guest
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            Wedding Details
          </button>
          <button
            onClick={() => setActiveTab('invitation-design')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'invitation-design'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Invitation Design
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'template'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <Palette className="w-4 h-4" />
            Invitation Template
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <WeddingDetailsSection
          wedding={{
            ...wedding,
            staff_pin: staffPin // Pass the staff PIN if available
          }}
          onUpdatePin={handleUpdatePin}
          onRefreshCode={handleRefreshCode}
        />
      )}

      {activeTab === 'invitation-design' && (
        <RSVPTemplateSelector
          weddingId={wedding.id}
          currentTemplateId={wedding.template_id}
          currentCustomization={wedding.template_customization}
          onTemplateChange={(templateId) => {
            // Update local state and invalidate query to refetch wedding data
            setSelectedTemplateId(templateId);
            queryClient.invalidateQueries({ queryKey: ['wedding', 'current'] });
          }}
        />
      )}

      {activeTab === 'template' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Choose Invitation Template</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Select a template design for your wedding invitations</p>
              </div>
              <button
                onClick={handleSaveTemplate}
                disabled={updateTemplateMutation.isPending}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-400 dark:disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {updateTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
              </button>
            </div>

            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={setSelectedTemplateId}
              previewData={previewData}
            />
          </div>

          {/* Customization Options */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customize Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Wedding Title
                </label>
                <input
                  type="text"
                  value={customization.wedding_title || ''}
                  onChange={(e) => setCustomization(prev => ({ ...prev, wedding_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="e.g., John & Jane's Wedding"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Ceremony Date
                </label>
                <input
                  type="date"
                  value={customization.ceremony_date || ''}
                  onChange={(e) => setCustomization(prev => ({ ...prev, ceremony_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Ceremony Time
                </label>
                <input
                  type="time"
                  value={customization.ceremony_time || ''}
                  onChange={(e) => setCustomization(prev => ({ ...prev, ceremony_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Venue Name
                </label>
                <input
                  type="text"
                  value={customization.venue_name || ''}
                  onChange={(e) => setCustomization(prev => ({ ...prev, venue_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="e.g., Grand Ballroom"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Venue Address
                </label>
                <input
                  type="text"
                  value={customization.venue_address || ''}
                  onChange={(e) => setCustomization(prev => ({ ...prev, venue_address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="e.g., 123 Wedding Street, City, State"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Custom Message
                </label>
                <textarea
                  value={customization.custom_message || ''}
                  onChange={(e) => setCustomization(prev => ({ ...prev, custom_message: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="e.g., Join us for our special day as we celebrate our love"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Invitation Preview</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">This is how your invitations will look to guests</p>
          </div>

          <div className="flex justify-center">
            <div 
              className="bg-gray-50 dark:bg-slate-900 rounded-lg overflow-hidden shadow-lg"
              style={{ 
                width: '400px',
                aspectRatio: '5/7'
              }}
            >
              <InvitationEngine
                templateId={selectedTemplateId}
                data={previewData}
                customization={customization}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleSaveTemplate}
              disabled={updateTemplateMutation.isPending}
              className="bg-rose-500 hover:bg-rose-600 disabled:bg-gray-400 dark:disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeddingConfiguration;