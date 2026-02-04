import React, { useState, useEffect } from 'react';
import { Palette, Eye, Settings, CheckCircle, X } from 'lucide-react';
import { InvitationEngine, TEMPLATE_METADATA } from '../invitations/InvitationEngine';
import TemplateGalleryModal from '../invitations/TemplateGalleryModal';
import TemplateCustomizerModal from '../invitations/TemplateCustomizerModal';

/**
 * RSVPTemplateSelector Component
 * 
 * Main container component for RSVP template selection and customization.
 * Integrates with TemplateGalleryModal and TemplateCustomizerModal to provide
 * a complete template management interface within the wedding dashboard.
 * 
 * Requirements: 9.1, 9.4, 9.5
 */

// Toast Notification Component
// Requirements: 13.1, 13.2, 13.3, 13.5
interface ToastProps {
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-[100] bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fadeIn">
    <CheckCircle className="w-5 h-5 text-white" />
    <span className="text-sm font-bold">{message}</span>
    <button 
      onClick={onClose} 
      className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
      aria-label="Dismiss notification"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
);

// TypeScript Interfaces

interface TemplateCustomization {
  wedding_title: string;
  ceremony_date: string;
  ceremony_time: string;
  venue_name: string;
  venue_address: string;
  custom_message: string;
  text_y_position?: number;
  qr_position?: 'bottom-left' | 'bottom-center' | 'bottom-right';
  background_overlay?: number;
}

interface RSVPTemplateSelectorProps {
  weddingId: number;
  currentTemplateId?: string;
  currentCustomization?: TemplateCustomization;
  onTemplateChange?: (templateId: string) => void;
}

interface RSVPTemplateSelectorState {
  isGalleryOpen: boolean;
  isCustomizerOpen: boolean;
  selectedTemplateId: string | null;
  customization: TemplateCustomization | null;
  isLoading: boolean;
  error: string | null;
  toastMessage: string | null;
}

/**
 * RSVPTemplateSelector Component
 * 
 * Provides the main interface for template selection and customization
 * within the wedding configuration dashboard.
 */
const RSVPTemplateSelector: React.FC<RSVPTemplateSelectorProps> = ({
  weddingId,
  currentTemplateId,
  currentCustomization,
  onTemplateChange
}) => {
  // Component State
  const [state, setState] = useState<RSVPTemplateSelectorState>({
    isGalleryOpen: false,
    isCustomizerOpen: false,
    selectedTemplateId: currentTemplateId || null,
    customization: currentCustomization || null,
    isLoading: false,
    error: null,
    toastMessage: null
  });

  // Get template metadata for the selected template
  const getTemplateMetadata = (templateId: string | null) => {
    if (!templateId) return null;
    return TEMPLATE_METADATA.find(t => t.id === templateId) || null;
  };

  const templateMetadata = getTemplateMetadata(state.selectedTemplateId);

  // Show toast notification with auto-dismiss after 3 seconds
  // Requirements: 13.1, 13.3, 13.5
  const showToast = (message: string) => {
    setState(prev => ({ ...prev, toastMessage: message }));
  };

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (state.toastMessage) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, toastMessage: null }));
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [state.toastMessage]);

  // Handle template selection from gallery
  const handleTemplateSelect = async (templateId: string) => {
    // Update local state immediately
    setState(prev => ({ 
      ...prev, 
      selectedTemplateId: templateId,
      isLoading: true,
      error: null 
    }));

    try {
      // Get auth token
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      
      // Make API call to save template selection
      const response = await fetch(`/api/v1/weddings/${weddingId}/template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ template_id: templateId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save template selection');
      }

      await response.json(); // Consume response

      // Update state with successful save
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isGalleryOpen: false,
        error: null 
      }));

      // Call optional callback
      if (onTemplateChange) {
        onTemplateChange(templateId);
      }

      // Show success notification
      // Requirements: 13.1, 13.2, 13.4
      showToast('Template selected successfully!');

    } catch (error) {
      // Handle error - preserve selection in UI but show error
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to save template selection'
      }));
      console.error('Error saving template:', error);
    }
  };

  // Handle customization save
  const handleSaveCustomization = async (customization: TemplateCustomization) => {
    // Update local state immediately
    setState(prev => ({ 
      ...prev, 
      customization,
      isLoading: true,
      error: null 
    }));

    try {
      // Get auth token
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      
      // Make API call to save customization
      const response = await fetch(`/api/v1/weddings/${weddingId}/template/customization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ customization }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save customization');
      }

      await response.json(); // Consume response

      // Update state with successful save
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isCustomizerOpen: false,
        error: null 
      }));

      // Show success notification
      // Requirements: 13.1, 13.2, 13.4
      showToast('Customization saved successfully!');

    } catch (error) {
      // Handle error - preserve customization in UI but show error
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to save customization'
      }));
      console.error('Error saving customization:', error);
    }
  };

  // Generate preview data for InvitationEngine
  const getPreviewData = () => {
    return {
      guest_name: 'John & Jane',
      wedding_title: state.customization?.wedding_title || 'Wedding Invitation',
      ceremony_date: state.customization?.ceremony_date || '2025-06-15',
      ceremony_time: state.customization?.ceremony_time || '4:00 PM',
      venue_name: state.customization?.venue_name || 'Grand Ballroom',
      venue_address: state.customization?.venue_address || '123 Main Street',
      custom_message: state.customization?.custom_message || 'Join us for our special day',
    };
  };

  // Placeholder UI - Basic component render
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Success Toast Notification */}
      {/* Requirements: 13.1, 13.2, 13.3, 13.5 */}
      {state.toastMessage && (
        <Toast 
          message={state.toastMessage} 
          onClose={() => setState(prev => ({ ...prev, toastMessage: null }))} 
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          RSVP Invitation Template
        </h2>
        <p className="text-gray-600">
          Choose and customize your wedding invitation template
        </p>
      </div>

      {/* Current Template Display */}
      <div className="border-2 border-gray-200 rounded-lg p-6 mb-6">
        {state.selectedTemplateId ? (
          <div className="space-y-4">
            {/* Template Preview using InvitationEngine */}
            <div className="bg-gray-50 rounded-lg overflow-hidden max-w-xs mx-auto shadow-sm">
              <div 
                className="w-full"
                style={{ 
                  aspectRatio: templateMetadata?.aspectRatio || '5/7',
                  maxHeight: '400px'
                }}
              >
                <InvitationEngine
                  templateId={state.selectedTemplateId}
                  data={getPreviewData()}
                  customization={state.customization || undefined}
                />
              </div>
            </div>

            {/* Template Info */}
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold text-gray-900">
                {templateMetadata?.name || state.selectedTemplateId}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Category:</span> {templateMetadata?.category || 'Unknown'}
              </p>
              {templateMetadata?.description && (
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  {templateMetadata.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Palette className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">No template selected</p>
            <p className="text-sm text-gray-400">
              Choose a template to get started
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setState(prev => ({ ...prev, isGalleryOpen: true }))}
          disabled={state.isLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
        >
          <Eye className="w-5 h-5" />
          {state.selectedTemplateId ? 'Change Template' : 'Choose Template'}
        </button>

        <button
          onClick={() => setState(prev => ({ ...prev, isCustomizerOpen: true }))}
          disabled={state.isLoading || !state.selectedTemplateId}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
        >
          <Settings className="w-5 h-5" />
          Customize Design
        </button>
      </div>

      {/* Loading State */}
      {state.isLoading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading...</span>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{state.error}</p>
        </div>
      )}

      {/* Template Gallery Modal */}
      <TemplateGalleryModal
        isOpen={state.isGalleryOpen}
        onClose={() => setState(prev => ({ ...prev, isGalleryOpen: false }))}
        onSelectTemplate={handleTemplateSelect}
        currentTemplateId={state.selectedTemplateId || undefined}
      />

      {/* Template Customizer Modal */}
      <TemplateCustomizerModal
        isOpen={state.isCustomizerOpen}
        onClose={() => setState(prev => ({ ...prev, isCustomizerOpen: false }))}
        templateId={state.selectedTemplateId || 'elegant-gold'}
        weddingId={weddingId}
        initialData={getPreviewData()}
        currentCustomization={state.customization || undefined}
        onSave={handleSaveCustomization}
      />
    </div>
  );
};

export default RSVPTemplateSelector;
export type { RSVPTemplateSelectorProps, TemplateCustomization };
