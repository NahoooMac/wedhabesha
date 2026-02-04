import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TEMPLATE_METADATA, RSVPInvitationData } from './InvitationEngine';
import { weddingApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  currentTemplateId?: string;
}

const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({ isOpen, onClose, onSelectTemplate, currentTemplateId }) => {
  const { user } = useAuth();
  const [weddingData, setWeddingData] = useState<RSVPInvitationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeddingData = async () => {
      if (!isOpen || !user) return;
      
      try {
        setLoading(true);
        const wedding = await weddingApi.getMyWedding();
        
        // Transform wedding data to RSVPInvitationData format
        const invitationData: RSVPInvitationData = {
          bride: "Bride",
          groom: "Groom",
          ceremony_date: wedding.wedding_date || new Date().toISOString().split('T')[0],
          ceremony_time: wedding.customization?.ceremony_time || "4:00 PM",
          venue_name: wedding.venue_name || "Grand Ballroom",
          venue_address: wedding.venue_address || "City Center",
          custom_message: wedding.customization?.custom_message || "Join us in celebrating our special day",
          imageSettings: { x: 0, y: 0, scale: 1 }
        };
        
        setWeddingData(invitationData);
      } catch (error) {
        console.error('Error fetching wedding data:', error);
        // Use default data if fetch fails
        setWeddingData({
          bride: "Bride",
          groom: "Groom",
          ceremony_date: new Date().toISOString().split('T')[0],
          ceremony_time: "4:00 PM",
          venue_name: "Grand Ballroom",
          venue_address: "City Center",
          imageSettings: { x: 0, y: 0, scale: 1 }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeddingData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const displayData = weddingData || {
    bride: "Bride",
    groom: "Groom",
    ceremony_date: new Date().toISOString().split('T')[0],
    ceremony_time: "4:00 PM",
    venue_name: "Grand Ballroom",
    venue_address: "City Center",
    imageSettings: { x: 0, y: 0, scale: 1 }
  };

  // Template preview images mapping
  const templatePreviewImages: Record<string, string> = {
    "traditional2": "./templates/design 13.png",
    "traditional": "./templates/design 12.png",
    "coppergeo": "./templates/design 9.jpg",
    "goldenrings": "./templates/design 14.jpg",
    "classicframe": "./templates/design 11.jpg",
    "elegantgold": "./templates/design 1.png",
    "royal": "./templates/design 6.png",
    "violetpeony": "./templates/design 2.png",
    "purplegold": "./templates/design 3.png",
    "greengeo": "./templates/design 4.png",
    "bluefloral": "./templates/design 5.png",
    "classic": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=600&fit=crop",
    "modern": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=600&fit=crop",
    "rustic": "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=600&fit=crop",
    "botanical": "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=400&h=600&fit=crop"
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-pink-50">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Choose Your Perfect Template</h2>
            <p className="text-sm text-gray-600">Select a design that matches your wedding style</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-3 hover:bg-white rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {TEMPLATE_METADATA.map(template => (
                <div 
                  key={template.id} 
                  onClick={() => onSelectTemplate(template.id)} 
                  className={`cursor-pointer group transform transition-all duration-300 hover:scale-105 ${
                    currentTemplateId === template.id ? 'scale-105' : ''
                  }`}
                >
                  <div 
                    className={`relative overflow-hidden rounded-2xl bg-gray-50 border-4 transition-all shadow-lg hover:shadow-2xl ${
                      currentTemplateId === template.id 
                        ? 'border-rose-500 ring-4 ring-rose-200' 
                        : 'border-gray-200 hover:border-rose-300'
                    }`} 
                    style={{ aspectRatio: template.aspectRatio || '5/7' }}
                  >
                    {/* Use static image instead of rendering template */}
                    <img 
                      src={templatePreviewImages[template.id] || templatePreviewImages['elegantgold']} 
                      alt={template.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {currentTemplateId === template.id && (
                      <div className="absolute top-4 right-4 bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm z-10">
                        Selected
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {template.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {TEMPLATE_METADATA.length} templates available
          </p>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateGalleryModal;