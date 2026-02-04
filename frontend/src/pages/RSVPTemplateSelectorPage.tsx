import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Heart, Eye, Edit3, Sparkles } from 'lucide-react';
import { InvitationEngine } from '../components/invitations/InvitationEngine';
import { useMutation, useQuery } from '@tanstack/react-query';

// Enhanced template definitions with live preview support
const INVITATION_TEMPLATES = [
  { 
    id: 'elegant-gold', 
    name: 'Elegant Gold Script', 
    category: 'Classic',
    description: 'Luxurious gold accents with elegant script fonts',
    colors: ['#FFFFFF', '#C5A059', '#4A4A4A'],
    aspectRatio: '5/7'
  },
  { 
    id: 'violet-peony', 
    name: 'Violet Peony', 
    category: 'Floral',
    description: 'Romantic floral design with purple accents',
    colors: ['#FFF0F5', '#884A5E', '#5D4037'],
    aspectRatio: '5/7'
  },
  { 
    id: 'purple-gold', 
    name: 'Purple Aesthetic', 
    category: 'Modern',
    description: 'Contemporary design with purple and gold',
    colors: ['#FFFFFF', '#6A5ACD', '#D4AF37'],
    aspectRatio: '5/7'
  },
  { 
    id: 'green-geometric', 
    name: 'Green Geometric', 
    category: 'Floral',
    description: 'Nature-inspired with geometric elements',
    colors: ['#FFFFFF', '#374151', '#B8860B'],
    aspectRatio: '5/7'
  },
  { 
    id: 'blue-floral', 
    name: 'Blue Watercolor', 
    category: 'Floral',
    description: 'Soft watercolor florals in blue tones',
    colors: ['#F0F4F8', '#7DA0C4', '#8D6E63'],
    aspectRatio: '5/7'
  },
  { 
    id: 'royal-floral', 
    name: 'Royal Floral', 
    category: 'Classic',
    description: 'Regal design with ornate floral patterns',
    colors: ['#FCFbf7', '#682e33', '#D4AF37'],
    aspectRatio: '1240/1748'
  }
];

// Sample data for preview
const SAMPLE_DATA = {
  guest_name: "John & Jane",
  wedding_title: "Sarah & Michael",
  ceremony_date: "2024-12-29",
  ceremony_time: "4:00 PM",
  venue_name: "Grand Ballroom",
  venue_address: "123 Wedding St, City",
  custom_message: "Join us for our special day"
};

const RSVPTemplateSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('elegant-gold');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch current wedding data for preview
  const { data: weddingData } = useQuery({
    queryKey: ['wedding', 'current'],
    queryFn: async () => {
      const response = await fetch('/api/v1/weddings/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch wedding data');
      return response.json();
    }
  });

  // Mutation to update template
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/invitations/wedding/${weddingData?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          template_id: templateId,
          customization: {}
        })
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  });

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleSaveTemplate = () => {
    updateTemplateMutation.mutate(selectedTemplate);
  };

  const selectedTemplateData = INVITATION_TEMPLATES.find(t => t.id === selectedTemplate);

  // Prepare preview data
  const previewData = weddingData ? {
    guest_name: "Dear Guest",
    wedding_title: weddingData.customization?.wedding_title || "Wedding Invitation",
    ceremony_date: weddingData.customization?.ceremony_date || "2024-12-29",
    ceremony_time: weddingData.customization?.ceremony_time || "4:00 PM",
    venue_name: weddingData.customization?.venue_name || "Venue Name",
    venue_address: weddingData.customization?.venue_address || "Address",
    custom_message: weddingData.customization?.custom_message || "Join us for our special day"
  } : SAMPLE_DATA;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Preview: {selectedTemplateData?.name}</h3>
              <button
                onClick={() => setPreviewMode(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div 
              className="w-full bg-gray-100"
              style={{ aspectRatio: selectedTemplateData?.aspectRatio || '5/7' }}
            >
              <InvitationEngine
                templateId={selectedTemplate}
                data={previewData}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-rose-500 fill-current" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Choose Your Invitation Template
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Select a beautiful template for your wedding invitation
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 animate-in slide-in-from-top duration-300">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Template Updated!
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Your invitation template has been saved successfully.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {INVITATION_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                selectedTemplate === template.id
                  ? 'border-rose-500 shadow-2xl shadow-rose-500/20 scale-105'
                  : 'border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xl'
              }`}
            >
              {/* Live Template Preview */}
              <div 
                className="relative bg-white overflow-hidden"
                style={{ aspectRatio: template.aspectRatio }}
              >
                <InvitationEngine
                  templateId={template.id}
                  data={SAMPLE_DATA}
                />
                
                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template.id);
                        setPreviewMode(true);
                      }}
                      className="bg-white/90 hover:bg-white text-slate-800 p-3 rounded-full shadow-lg transition-all hover:scale-110"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(template.id);
                      }}
                      className="bg-rose-500 hover:bg-rose-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Selected Badge */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-4 right-4 bg-rose-500 text-white rounded-full p-2 shadow-lg animate-in zoom-in duration-200">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div 
                className="p-6 bg-white dark:bg-slate-900 cursor-pointer"
                onClick={() => handleSelectTemplate(template.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {template.category} Collection
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-rose-400" />
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  {template.description}
                </p>

                {/* Color Palette */}
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {template.colors.map((color, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm" 
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button className="text-xs font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                    Customize
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Template Actions */}
        {selectedTemplate && (
          <div className="mt-12 bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-200 dark:border-rose-800 p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center">
                  <Heart className="w-8 h-8 text-rose-500 fill-current" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Currently Selected
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {selectedTemplateData?.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {selectedTemplateData?.description}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewMode(true)}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  Preview
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={updateTemplateMutation.isPending}
                  className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
                >
                  {updateTemplateMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save & Continue
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RSVPTemplateSelectorPage;
