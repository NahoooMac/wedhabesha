import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { InvitationEngine, TEMPLATE_METADATA, RSVPInvitationData } from './InvitationEngine';
import { weddingApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onTemplateSelect: (templateId: string) => void;
  previewData?: RSVPInvitationData;
  className?: string;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onTemplateSelect,
  previewData,
  className = ""
}) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [weddingData, setWeddingData] = useState<RSVPInvitationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeddingData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
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
      } finally {
        setLoading(false);
      }
    };

    fetchWeddingData();
  }, [user]);
  
  // Default preview data
  const defaultPreviewData: RSVPInvitationData = {
    bride: "Bride",
    groom: "Groom",
    ceremony_date: new Date().toISOString().split('T')[0],
    ceremony_time: "4:00 PM",
    venue_name: "Grand Ballroom",
    venue_address: "City Center",
    custom_message: "Join us in celebrating our special day",
    imageSettings: { x: 0, y: 0, scale: 1 }
  };

  // Use priority: previewData > weddingData > defaultPreviewData
  const displayData = previewData || weddingData || defaultPreviewData;
  const categories = ['all', 'classic', 'floral', 'modern', 'rustic', 'vintage'];

  const filteredTemplates = TEMPLATE_METADATA.filter(template => 
    selectedCategory === 'all' || template.category.toLowerCase() === selectedCategory
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === category ? 'bg-rose-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={`group relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${selectedTemplateId === template.id ? 'border-rose-500 ring-4 ring-rose-100' : 'border-gray-200 hover:border-gray-300'}`}
            onClick={() => onTemplateSelect(template.id)}
          >
            <div 
              className="relative overflow-hidden rounded-t-2xl bg-gray-50" 
              style={{ aspectRatio: template.aspectRatio || '5/7', containerType: 'size' }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <InvitationEngine templateId={template.id} data={displayData} />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
              {selectedTemplateId === template.id && (
                <div className="absolute top-3 right-3 bg-rose-500 text-white p-2 rounded-full shadow-lg z-10"><Check className="w-4 h-4" /></div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{template.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;