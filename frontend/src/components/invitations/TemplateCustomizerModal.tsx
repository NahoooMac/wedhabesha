import React, { useState, useEffect, useRef } from 'react';
import { X, Palette, Type, AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { invitationApi, InvitationCustomization } from '../../lib/api';

// Version: 4.0.0 - Per-Section Styling with Enhanced Controls

interface TemplateCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  weddingId: number;
  templateId: string;
  currentCustomization?: InvitationCustomization;
  onSave: () => void;
}

// Decorative fonts for wedding invitations
const DECORATIVE_FONTS = [
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Elegant Serif' },
  { value: 'Great Vibes', label: 'Great Vibes', category: 'Script' },
  { value: 'Dancing Script', label: 'Dancing Script', category: 'Script' },
  { value: 'Pacifico', label: 'Pacifico', category: 'Handwritten' },
  { value: 'Cinzel', label: 'Cinzel', category: 'Elegant Serif' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'Elegant Serif' },
  { value: 'Satisfy', label: 'Satisfy', category: 'Script' },
  { value: 'Alex Brush', label: 'Alex Brush', category: 'Script' },
  { value: 'Allura', label: 'Allura', category: 'Script' },
  { value: 'Tangerine', label: 'Tangerine', category: 'Script' },
  { value: 'Pinyon Script', label: 'Pinyon Script', category: 'Script' },
  { value: 'Italiana', label: 'Italiana', category: 'Elegant Serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Modern Sans' },
  { value: 'Raleway', label: 'Raleway', category: 'Modern Sans' },
  { value: 'Lato', label: 'Lato', category: 'Modern Sans' }
];

// Color options for text
const colorOptions = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: '#8B4513', label: 'Brown' },
  { value: '#FFD700', label: 'Gold' },
  { value: '#C0C0C0', label: 'Silver' },
  { value: '#4A5568', label: 'Gray' },
  { value: '#2D3748', label: 'Dark Gray' },
  { value: '#E53E3E', label: 'Red' }
];

// Enhanced Text Element with alignment and offset
interface TextElement {
  id: string;
  label: string;
  font: string;
  color: string;
  size: number;
  align: 'left' | 'center' | 'right';
  yOffset: number;
}

// Extended customization with individual text elements
interface ExtendedCustomization extends InvitationCustomization {
  textElements?: {
    title: TextElement;
    guestName: TextElement;
    message: TextElement;
    details: TextElement;
  };
}

export const TemplateCustomizerModal: React.FC<TemplateCustomizerModalProps> = ({
  isOpen,
  onClose,
  weddingId,
  templateId: templateIdProp,
  currentCustomization,
  onSave
}) => {
  const templateId = templateIdProp || 'template-1';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize text elements with defaults
  const [textElements, setTextElements] = useState<ExtendedCustomization['textElements']>({
    title: { id: 'title', label: 'Wedding Title', font: 'Playfair Display', color: '#FFFFFF', size: 32, align: 'center', yOffset: 0 },
    guestName: { id: 'guestName', label: 'Guest Name', font: 'Lato', color: '#FFFFFF', size: 22, align: 'center', yOffset: 0 },
    message: { id: 'message', label: 'Custom Message', font: 'Lato', color: '#FFFFFF', size: 22, align: 'center', yOffset: 0 },
    details: { id: 'details', label: 'Event Details', font: 'Lato', color: '#FFFFFF', size: 16, align: 'center', yOffset: 0 }
  });
  
  const [customization, setCustomization] = useState<InvitationCustomization>({
    wedding_title: '',
    ceremony_date: '',
    ceremony_time: '',
    venue_name: '',
    venue_address: '',
    custom_message: 'Join us for our special day',
    text_color: '#FFFFFF',
    font_size: 'medium',
    text_position: 'center',
    text_y_position: 40,
    qr_position: 'bottom-center'
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [activeSection, setActiveSection] = useState<string>('title');
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load Google Fonts
  useEffect(() => {
    if (!isOpen) return;
    
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${DECORATIVE_FONTS.map(f => f.value.replace(/ /g, '+')).join('&family=')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    link.onload = () => {
      setFontsLoaded(true);
    };
    
    return () => {
      document.head.removeChild(link);
    };
  }, [isOpen]);

  useEffect(() => {
    if (currentCustomization) {
      setCustomization(currentCustomization);
      if ((currentCustomization as ExtendedCustomization).textElements) {
        setTextElements((currentCustomization as ExtendedCustomization).textElements!);
      }
    }
  }, [currentCustomization]);

  // Load background image
  useEffect(() => {
    if (!isOpen) return;
    
    const templateImageMap: Record<string, string> = {
      'template-1': '/templates/Bg T1.jpg',
      'template-2': '/templates/Bg T2.jpg',
      'template-3': '/templates/Bg T3.jpg',
      'template-4': '/templates/Bg T4.jpg',
      'template-5': '/templates/Bg T5.jpg',
      'template-6': '/templates/Bg T6.jpg',
      'template-7': '/templates/Bg T7.jpg',
      'template-8': '/templates/Bg T8.jpg',
      'template-9': '/templates/Bg T9.jpg',
      'template-10': '/templates/Bg T10.jpg',
    };
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = templateImageMap[templateId] || templateImageMap['template-1'];
    
    img.onload = () => {
      setBackgroundImage(img);
    };
    
    img.onerror = (e) => {
      console.error('Failed to load background image:', e);
    };
  }, [templateId, isOpen]);

  // Draw preview canvas
  useEffect(() => {
    if (!canvasRef.current || !backgroundImage || !isOpen || !fontsLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = 540;
    canvas.height = 960;
    
    ctx.clearRect(0, 0, 540, 960);
    ctx.drawImage(backgroundImage, 0, 0, 540, 960);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, 540, 960);
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    const baseY = (customization.text_y_position || 40) / 100 * 960;
    let y = baseY;
    
    // Title
    const titleElement = textElements?.title;
    if (titleElement) {
      ctx.fillStyle = titleElement.color;
      ctx.font = `bold ${titleElement.size}px "${titleElement.font}", serif`;
      ctx.textAlign = titleElement.align;
      const x = titleElement.align === 'left' ? 50 : titleElement.align === 'right' ? 490 : 270;
      ctx.fillText(customization.wedding_title || 'Wedding Title', x, y + titleElement.yOffset);
      y += titleElement.size + 20 + titleElement.yOffset;
    }
    
    // Guest name
    const guestNameElement = textElements?.guestName;
    if (guestNameElement) {
      ctx.fillStyle = guestNameElement.color;
      ctx.font = `${guestNameElement.size}px "${guestNameElement.font}", serif`;
      ctx.textAlign = guestNameElement.align;
      const x = guestNameElement.align === 'left' ? 50 : guestNameElement.align === 'right' ? 490 : 270;
      ctx.fillText('Dear Guest Name,', x, y + guestNameElement.yOffset);
      y += guestNameElement.size + 20 + guestNameElement.yOffset;
    }
    
    // Custom message
    const messageElement = textElements?.message;
    if (messageElement) {
      ctx.fillStyle = messageElement.color;
      ctx.font = `${messageElement.size}px "${messageElement.font}", serif`;
      ctx.textAlign = messageElement.align;
      const x = messageElement.align === 'left' ? 50 : messageElement.align === 'right' ? 490 : 270;
      const message = customization.custom_message || 'Join us for our special day';
      const messageLines = message.split('\n');
      messageLines.forEach(line => {
        ctx.fillText(line, x, y + messageElement.yOffset);
        y += messageElement.size + 10;
      });
      y += 20 + messageElement.yOffset;
    }
    
    // Details
    const detailsElement = textElements?.details;
    if (detailsElement) {
      ctx.fillStyle = detailsElement.color;
      ctx.font = `${detailsElement.size}px "${detailsElement.font}", sans-serif`;
      ctx.textAlign = detailsElement.align;
      const x = detailsElement.align === 'left' ? 50 : detailsElement.align === 'right' ? 490 : 270;
      const details = [
        `Date: ${customization.ceremony_date || 'TBA'}`,
        `Time: ${customization.ceremony_time || 'TBA'}`,
        `Venue: ${customization.venue_name || 'TBA'}`,
      ];
      
      details.forEach(detail => {
        ctx.fillText(detail, x, y + detailsElement.yOffset);
        y += detailsElement.size + 10;
      });
    }
    
    // QR Code placeholder
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    const qrSize = 80;
    let qrX = 270 - qrSize / 2;
    const qrY = 960 - qrSize - 20;
    
    if (customization.qr_position === 'bottom-left') {
      qrX = 20;
    } else if (customization.qr_position === 'bottom-right') {
      qrX = 540 - qrSize - 20;
    }
    
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = textElements?.details?.color || '#FFFFFF';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', qrX + qrSize / 2, qrY + qrSize / 2);
    
  }, [
    customization,
    textElements,
    backgroundImage,
    isOpen,
    fontsLoaded
  ]);

  const handleChange = (field: keyof InvitationCustomization, value: string | number) => {
    setCustomization(prev => ({ ...prev, [field]: value }));
  };

  const handleTextElementChange = (elementId: string, field: keyof TextElement, value: string | number) => {
    setTextElements(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [elementId]: {
          ...prev[elementId as keyof typeof prev],
          [field]: value
        }
      };
    });
  };

  const handleSave = async () => {
    if (!customization.wedding_title.trim()) {
      setError('Wedding title is required');
      return;
    }
    if (!customization.ceremony_date.trim()) {
      setError('Ceremony date is required');
      return;
    }
    if (!customization.ceremony_time.trim()) {
      setError('Ceremony time is required');
      return;
    }
    if (!customization.venue_name.trim()) {
      setError('Venue name is required');
      return;
    }
    if (!customization.venue_address.trim()) {
      setError('Venue address is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const extendedCustomization: ExtendedCustomization = {
        ...customization,
        textElements
      };
      
      console.log('Saving customization:', {
        template_id: templateId,
        customization: extendedCustomization
      });
      
      const response = await invitationApi.updateWeddingSettings(weddingId, {
        template_id: templateId,
        customization: extendedCustomization
      });
      
      console.log('Save response:', response);
      
      alert('Template customization saved successfully!');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Failed to save customization:', err);
      
      // Extract detailed error message
      let errorMessage = 'Failed to save customization. Please try again.';
      
      if (err.details && Array.isArray(err.details)) {
        errorMessage = `Validation errors:\n${err.details.join('\n')}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const activeElement = textElements?.[activeSection as keyof typeof textElements];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-900">Customize Invitation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Split view */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Preview */}
          <div className="w-1/2 p-6 bg-gray-50 border-r overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
            {!backgroundImage ? (
              <div className="bg-white rounded-lg shadow-lg p-4 flex items-center justify-center" style={{ width: 540, height: 960 }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading template...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-4 inline-block">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-200 rounded"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Wedding Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Wedding Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wedding Title *
                    </label>
                    <input
                      type="text"
                      value={customization.wedding_title}
                      onChange={(e) => handleChange('wedding_title', e.target.value)}
                      placeholder="e.g., Sarah & John"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ceremony Date *
                      </label>
                      <input
                        type="text"
                        value={customization.ceremony_date}
                        onChange={(e) => handleChange('ceremony_date', e.target.value)}
                        placeholder="e.g., June 15, 2024"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ceremony Time *
                      </label>
                      <input
                        type="text"
                        value={customization.ceremony_time}
                        onChange={(e) => handleChange('ceremony_time', e.target.value)}
                        placeholder="e.g., 4:00 PM"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      value={customization.venue_name}
                      onChange={(e) => handleChange('venue_name', e.target.value)}
                      placeholder="e.g., Grand Hotel"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Venue Address *
                    </label>
                    <textarea
                      value={customization.venue_address}
                      onChange={(e) => handleChange('venue_address', e.target.value)}
                      placeholder="e.g., 123 Main St, City"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Message
                    </label>
                    <textarea
                      value={customization.custom_message}
                      onChange={(e) => handleChange('custom_message', e.target.value)}
                      placeholder="e.g., Join us for our special day"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Section Tabs */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Per-Section Styling
                </h3>
                
                <div className="flex gap-2 mb-4">
                  {['title', 'guestName', 'message', 'details'].map((section) => (
                    <button
                      key={section}
                      onClick={() => setActiveSection(section)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === section
                          ? 'bg-rose-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {textElements?.[section as keyof typeof textElements]?.label}
                    </button>
                  ))}
                </div>

                {activeElement && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    {/* Font Family */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Family
                      </label>
                      <select
                        value={activeElement.font}
                        onChange={(e) => handleTextElementChange(activeSection, 'font', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      >
                        {DECORATIVE_FONTS.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.label} ({font.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Color
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => handleTextElementChange(activeSection, 'color', color.value)}
                            className={`w-10 h-10 rounded-lg border-2 transition-all ${
                              activeElement.color === color.value
                                ? 'border-rose-600 scale-110'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.label}
                          />
                        ))}
                        <input
                          type="color"
                          value={activeElement.color}
                          onChange={(e) => handleTextElementChange(activeSection, 'color', e.target.value)}
                          className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Size: {activeElement.size}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="48"
                        value={activeElement.size}
                        onChange={(e) => handleTextElementChange(activeSection, 'size', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                      />
                    </div>

                    {/* Alignment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Alignment
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'left', icon: AlignLeft, label: 'Left' },
                          { value: 'center', icon: AlignCenter, label: 'Center' },
                          { value: 'right', icon: AlignRight, label: 'Right' }
                        ].map(({ value, icon: Icon, label }) => (
                          <button
                            key={value}
                            onClick={() => handleTextElementChange(activeSection, 'align', value)}
                            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                              activeElement.align === value
                                ? 'border-rose-600 bg-rose-50 text-rose-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Vertical Offset */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vertical Spacing: {activeElement.yOffset}px
                      </label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={activeElement.yOffset}
                        onChange={(e) => handleTextElementChange(activeSection, 'yOffset', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Up</span>
                        <span>Default</span>
                        <span>Down</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Global Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overall Vertical Position: {customization.text_y_position || 40}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="70"
                      value={customization.text_y_position || 40}
                      onChange={(e) => handleChange('text_y_position', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Top</span>
                      <span>Center</span>
                      <span>Bottom</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR Code Position
                    </label>
                    <div className="flex gap-3">
                      {[
                        { value: 'bottom-left', label: 'Bottom Left' },
                        { value: 'bottom-center', label: 'Bottom Center' },
                        { value: 'bottom-right', label: 'Bottom Right' }
                      ].map((position) => (
                        <button
                          key={position.value}
                          onClick={() => handleChange('qr_position', position.value)}
                          className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                            customization.qr_position === position.value
                              ? 'border-rose-600 bg-rose-50 text-rose-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {position.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Customization'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateCustomizerModal;
