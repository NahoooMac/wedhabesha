import React from 'react';

// We re-use your interfaces to ensure type safety
interface TextElement {
  id: string;
  label: string;
  font: string;
  color: string;
  size: number;
  align: 'left' | 'center' | 'right';
  yOffset: number;
}

interface TemplateProps {
  templateId: string;
  backgroundUrl: string;
  customization: {
    wedding_title: string;
    ceremony_date: string;
    ceremony_time: string;
    venue_name: string;
    venue_address: string;
    custom_message: string;
    text_y_position: number; // 10 to 70
    qr_position: string;
  };
  textElements: {
    title: TextElement;
    guestName: TextElement;
    message: TextElement;
    details: TextElement;
  };
}

export const StandardTemplate: React.FC<TemplateProps> = ({ 
  templateId, 
  backgroundUrl, 
  customization, 
  textElements 
}) => {
  // Helper to generate style object for a specific text element
  const getStyle = (element: TextElement) => ({
    fontFamily: `"${element.font}", serif`, // Maps to your loaded Google Fonts
    color: element.color,
    fontSize: `${element.size}px`, // Using pixel size from your slider
    textAlign: element.align,
    marginTop: `${element.yOffset}px`, // Using standard CSS margin for offset
    marginBottom: '16px', // Default spacing
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap' as const, // Handle newlines in messages
  });

  // Calculate the starting vertical position (converted from % to a relative unit)
  // Your canvas used: (text_y_position / 100 * 960)
  const containerStyle = {
    paddingTop: `${customization.text_y_position}%`,
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-white shadow-2xl">
      {/* 1. Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={backgroundUrl} 
          alt="Invitation Background" 
          className="w-full h-full object-cover"
        />
        {/* Optional overlay for better text contrast if needed */}
        <div className="absolute inset-0 bg-black/10" /> 
      </div>

      {/* 2. Content Container (The "Paper") */}
      <div 
        className="relative z-10 w-full h-full px-8 flex flex-col"
        style={containerStyle}
      >
        {/* Wedding Title */}
        <div style={getStyle(textElements.title)}>
          {customization.wedding_title || 'Wedding Title'}
        </div>

        {/* Guest Name */}
        <div style={getStyle(textElements.guestName)}>
          Dear {textElements.guestName.label === 'Guest Name' ? 'Guest Name' : 'Guest'},
        </div>

        {/* Custom Message */}
        <div style={getStyle(textElements.message)}>
          {customization.custom_message || 'Join us for our special day'}
        </div>

        {/* Details Block */}
        <div style={getStyle(textElements.details)}>
          <p>{customization.ceremony_date || 'Date TBA'}</p>
          <p>{customization.ceremony_time || 'Time TBA'}</p>
          <p className="font-bold mt-2">{customization.venue_name || 'Venue Name'}</p>
          <p className="text-sm opacity-90">{customization.venue_address || 'Address'}</p>
        </div>
      </div>

      {/* 3. QR Code (Absolute Positioning) */}
      <div className={`absolute bottom-8 p-2 bg-white rounded shadow-sm ${
        customization.qr_position === 'bottom-left' ? 'left-8' :
        customization.qr_position === 'bottom-right' ? 'right-8' :
        'left-1/2 -translate-x-1/2' // bottom-center
      }`}>
        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
          QR Code
        </div>
      </div>
    </div>
  );
};