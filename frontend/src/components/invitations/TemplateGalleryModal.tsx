import React, { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';

// Version: 3.0.0 - Direct template images without API

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  currentTemplateId?: string;
}

// Template images from public/templates folder
const templateImages = [
  { id: 'template-1', name: 'Template 1', image: '/templates/Bg T1.jpg', description: 'Elegant wedding invitation design' },
  { id: 'template-2', name: 'Template 2', image: '/templates/Bg T2.jpg', description: 'Beautiful floral pattern' },
  { id: 'template-3', name: 'Template 3', image: '/templates/Bg T3.jpg', description: 'Classic and timeless' },
  { id: 'template-4', name: 'Template 4', image: '/templates/Bg T4.jpg', description: 'Modern minimalist style' },
  { id: 'template-5', name: 'Template 5', image: '/templates/Bg T5.jpg', description: 'Romantic and dreamy' },
  { id: 'template-6', name: 'Template 6', image: '/templates/Bg T6.jpg', description: 'Sophisticated design' },
  { id: 'template-7', name: 'Template 7', image: '/templates/Bg T7.jpg', description: 'Vintage inspired' },
  { id: 'template-8', name: 'Template 8', image: '/templates/Bg T8.jpg', description: 'Contemporary elegance' },
  { id: 'template-9', name: 'Template 9', image: '/templates/Bg T9.jpg', description: 'Artistic and unique' },
  { id: 'template-10', name: 'Template 10', image: '/templates/Bg T10.jpg', description: 'Graceful and refined' },
];

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentTemplateId
}) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(currentTemplateId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (templateId: string) => {
    setSelectedId(templateId);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelectTemplate(selectedId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-50 w-12 h-12 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full flex items-center justify-center transition-all hover:scale-110"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Header */}
      <div className="relative z-10 pt-12 pb-8 px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-purple-300" />
            <span className="text-purple-200 text-sm font-medium">Choose Your Perfect Template</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Invitation Templates
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Select a beautiful template for your wedding invitations. Each design is fully customizable.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 pb-32 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {templateImages.map((template) => {
              const isSelected = selectedId === template.id;
              const isHovered = hoveredId === template.id;
              const isCurrent = currentTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  onClick={() => handleSelect(template.id)}
                  onMouseEnter={() => setHoveredId(template.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group relative cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'scale-105'
                      : isHovered
                      ? 'scale-102'
                      : 'scale-100'
                  }`}
                >
                  {/* Card */}
                  <div
                    className={`relative bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300 ${
                      isSelected
                        ? 'ring-4 ring-purple-500 shadow-2xl shadow-purple-500/50'
                        : 'ring-2 ring-white/20 hover:ring-white/40'
                    }`}
                  >
                    {/* Current Badge */}
                    {isCurrent && (
                      <div className="absolute top-3 left-3 z-10 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <Check className="w-3 h-3" />
                        Current
                      </div>
                    )}

                    {/* Selected Badge */}
                    {isSelected && !isCurrent && (
                      <div className="absolute top-3 right-3 z-10 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <Check className="w-3 h-3" />
                        Selected
                      </div>
                    )}

                    {/* Template Preview */}
                    <div className="aspect-[9/16] bg-slate-800 relative overflow-hidden">
                      <img
                        src={template.image}
                        alt={template.name}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          isHovered ? 'scale-110' : 'scale-100'
                        }`}
                      />

                      {/* Hover Overlay */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
                          isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(template.id);
                            }}
                            className="w-full bg-white/90 hover:bg-white text-slate-900 py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            {isSelected ? 'Selected' : 'Select Template'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-white text-lg mb-1 truncate">
                        {template.name}
                      </h3>
                      <p className="text-sm text-slate-300 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/80 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="text-white">
            <p className="text-sm text-slate-400">
              {selectedId ? (
                <>
                  Selected: <span className="font-semibold text-white">{templateImages.find(t => t.id === selectedId)?.name}</span>
                </>
              ) : (
                'Select a template to continue'
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-white hover:text-slate-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedId}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/50 disabled:shadow-none flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Use This Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateGalleryModal;
