import React, { useState } from 'react';
import { Check, Eye, Sparkles } from 'lucide-react';

export type TemplateId = 'classic-elegant' | 'romantic-floral' | 'modern-minimal' | 'traditional-ethiopian' | 'luxury-gold';

export interface RSVPTemplate {
  id: TemplateId;
  name: string;
  description: string;
  category: string;
  icon: string;
  previewImage: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

const templates: RSVPTemplate[] = [
  {
    id: 'classic-elegant',
    name: 'Classic Elegant',
    description: 'Timeless sophistication with clean lines and elegant typography',
    category: '💍 Classic',
    icon: '💍',
    previewImage: 'https://via.placeholder.com/400x600/f8f9fa/6c757d?text=Classic+Elegant',
    colors: {
      primary: '#2c3e50',
      secondary: '#ecf0f1',
      accent: '#3498db',
      background: '#ffffff'
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Lato'
    }
  },
  {
    id: 'romantic-floral',
    name: 'Romantic Floral',
    description: 'Soft pastels and delicate floral patterns for a dreamy atmosphere',
    category: '🌹 Romantic',
    icon: '🌹',
    previewImage: 'https://via.placeholder.com/400x600/fff5f7/e91e63?text=Romantic+Floral',
    colors: {
      primary: '#e91e63',
      secondary: '#fce4ec',
      accent: '#f06292',
      background: '#fff5f7'
    },
    fonts: {
      heading: 'Dancing Script',
      body: 'Quicksand'
    }
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Contemporary design with bold typography and clean aesthetics',
    category: '🎉 Modern',
    icon: '🎉',
    previewImage: 'https://via.placeholder.com/400x600/f5f5f5/212121?text=Modern+Minimal',
    colors: {
      primary: '#212121',
      secondary: '#f5f5f5',
      accent: '#ff6b6b',
      background: '#ffffff'
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Inter'
    }
  },
  {
    id: 'traditional-ethiopian',
    name: 'Traditional Ethiopian',
    description: 'Rich cultural patterns and warm Ethiopian color palette',
    category: '🕌 Traditional',
    icon: '🕌',
    previewImage: 'https://via.placeholder.com/400x600/fef5e7/d35400?text=Traditional+Ethiopian',
    colors: {
      primary: '#d35400',
      secondary: '#fef5e7',
      accent: '#e74c3c',
      background: '#fffbf0'
    },
    fonts: {
      heading: 'Merriweather',
      body: 'Open Sans'
    }
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    description: 'Opulent gold accents with sophisticated dark backgrounds',
    category: '✨ Luxury',
    icon: '✨',
    previewImage: 'https://via.placeholder.com/400x600/1a1a1a/d4af37?text=Luxury+Gold',
    colors: {
      primary: '#d4af37',
      secondary: '#1a1a1a',
      accent: '#ffd700',
      background: '#0f0f0f'
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Raleway'
    }
  }
];

interface TemplateGalleryProps {
  activeTemplate?: TemplateId;
  onSelectTemplate: (templateId: TemplateId) => void;
  onPreviewTemplate: (templateId: TemplateId) => void;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  activeTemplate,
  onSelectTemplate,
  onPreviewTemplate
}) => {
  const [hoveredTemplate, setHoveredTemplate] = useState<TemplateId | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Choose Your RSVP Template
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Select a beautiful template for your wedding RSVP page. Each template includes the same structure with different styling to match your wedding theme.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {templates.map((template) => {
          const isActive = activeTemplate === template.id;
          const isHovered = hoveredTemplate === template.id;

          return (
            <div
              key={template.id}
              className={`group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden transition-all duration-300 ${
                isActive
                  ? 'ring-4 ring-rose-500 shadow-2xl shadow-rose-500/20 scale-105'
                  : 'border-2 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-xl'
              }`}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              {/* Active Badge */}
              {isActive && (
                <div className="absolute top-4 right-4 z-10 bg-rose-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                  <Check className="w-3.5 h-3.5" />
                  Active
                </div>
              )}

              {/* Template Preview Image */}
              <div className="relative aspect-[2/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={template.previewImage}
                  alt={template.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    isHovered ? 'scale-110' : 'scale-100'
                  }`}
                />
                
                {/* Overlay on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                    <button
                      onClick={() => onPreviewTemplate(template.id)}
                      className="w-full bg-white/90 hover:bg-white text-slate-900 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    {!isActive && (
                      <button
                        onClick={() => onSelectTemplate(template.id)}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Use Template
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{template.icon}</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                      {template.name}
                    </h3>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {template.description}
                </p>

                {/* Color Palette Preview */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Colors:</span>
                  <div className="flex gap-1.5">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                      style={{ backgroundColor: template.colors.primary }}
                      title="Primary"
                    />
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                      style={{ backgroundColor: template.colors.accent }}
                      title="Accent"
                    />
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                      style={{ backgroundColor: template.colors.secondary }}
                      title="Secondary"
                    />
                  </div>
                </div>

                {/* Action Buttons (Mobile) */}
                <div className="flex gap-2 sm:hidden">
                  <button
                    onClick={() => onPreviewTemplate(template.id)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  {!isActive && (
                    <button
                      onClick={() => onSelectTemplate(template.id)}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      Use
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-2">
              All Templates Include:
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-purple-800 dark:text-purple-200">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Hero section with couple names & date
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Event details with venue & map
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                RSVP form with phone number
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Confirmation & WhatsApp integration
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateGallery;
export { templates };