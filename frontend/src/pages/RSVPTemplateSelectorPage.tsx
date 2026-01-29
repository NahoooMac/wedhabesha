import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';

// Template images from public/templates folder
const templateImages = [
  { id: 1, name: 'Template 1', image: '/templates/Bg T1.jpg' },
  { id: 2, name: 'Template 2', image: '/templates/Bg T2.jpg' },
  { id: 3, name: 'Template 3', image: '/templates/Bg T3.jpg' },
  { id: 4, name: 'Template 4', image: '/templates/Bg T4.jpg' },
  { id: 5, name: 'Template 5', image: '/templates/Bg T5.jpg' },
  { id: 6, name: 'Template 6', image: '/templates/Bg T6.jpg' },
  { id: 7, name: 'Template 7', image: '/templates/Bg T7.jpg' },
  { id: 8, name: 'Template 8', image: '/templates/Bg T8.jpg' },
  { id: 9, name: 'Template 9', image: '/templates/Bg T9.jpg' },
  { id: 10, name: 'Template 10', image: '/templates/Bg T10.jpg' },
];

const RSVPTemplateSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleSelectTemplate = (templateId: number) => {
    setSelectedTemplate(templateId);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
    
    // In real app, save to backend
    console.log('Selected template:', templateId);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
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
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Choose Your RSVP Template
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Select a beautiful template for your wedding invitation
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 animate-in slide-in-from-top duration-300">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Template Selected!
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Your RSVP page has been updated with the new template.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templateImages.map((template) => (
            <div
              key={template.id}
              className={`relative group cursor-pointer rounded-xl overflow-hidden border-4 transition-all duration-300 ${
                selectedTemplate === template.id
                  ? 'border-purple-500 shadow-2xl shadow-purple-500/20 scale-105'
                  : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xl'
              }`}
              onClick={() => handleSelectTemplate(template.id)}
            >
              {/* Template Image */}
              <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900">
                <img
                  src={template.image}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Template Name */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-semibold text-lg">
                  {template.name}
                </h3>
              </div>

              {/* Selected Badge */}
              {selectedTemplate === template.id && (
                <div className="absolute top-4 right-4 bg-purple-500 text-white rounded-full p-2 shadow-lg animate-in zoom-in duration-200">
                  <Check className="w-6 h-6" />
                </div>
              )}

              {/* Hover Effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors duration-300" />
              </div>
            </div>
          ))}
        </div>

        {/* Selected Template Info */}
        {selectedTemplate && (
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border-2 border-purple-200 dark:border-purple-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Currently Selected
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {templateImages.find(t => t.id === selectedTemplate)?.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  // In real app, this would save to backend and navigate
                  console.log('Saving template:', selectedTemplate);
                  navigate(-1);
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
              >
                Save & Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RSVPTemplateSelectorPage;
