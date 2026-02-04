import React from 'react';

// Shared interfaces (same as before)
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
    wedding_title: string; // Used for Couple Names (Olivia & Oscar)
    ceremony_date: string;
    ceremony_time: string;
    venue_name: string;
    venue_address: string;
    custom_message: string;
    text_y_position: number;
  };
  textElements: {
    title: TextElement;
    guestName: TextElement;
    message: TextElement;
    details: TextElement;
  };
}

export const GoldenFloralTemplate: React.FC<TemplateProps> = ({ 
  backgroundUrl, 
  customization, 
  textElements 
}) => {
  // 1. Define the specific "Theme Color" picked from the image (Bronze/Gold)
  const themeColor = '#8B5E3C'; 

  // Helper for dynamic styles
  const getStyle = (element: TextElement, overrideSize?: number, overrideFont?: string) => ({
    fontFamily: overrideFont ? `"${overrideFont}", serif` : `"${element.font}", serif`,
    color: element.color || themeColor, // Use theme color if user hasn't selected one
    fontSize: overrideSize ? `${overrideSize}px` : `${element.size}px`,
    textAlign: element.align,
    marginTop: `${element.yOffset}px`,
    whiteSpace: 'pre-wrap' as const,
  });

  return (
    <div className="relative w-full h-full bg-gray-50 shadow-2xl overflow-hidden">
      
      {/* --- BACKGROUND LAYER --- */}
      <div className="absolute inset-0 z-0">
        <img 
          src={backgroundUrl} 
          alt="Floral Background" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-10 w-full h-full flex flex-col items-center pt-[20%] px-10">
        
        {/* 1. Header: SAVE THE DATE */}
        <h2 className="text-xl tracking-[0.2em] font-serif font-bold uppercase mb-2" style={{ color: themeColor }}>
          Save The Date
        </h2>

        {/* 2. Decorative Line (CSS Drawing) */}
        <div className="flex items-center justify-center w-full mb-6 opacity-80">
           <div className="h-[2px] w-12 bg-[#8B5E3C] rounded-full"></div>
           <div className="mx-2 text-[#8B5E3C] text-lg">♥</div>
           <div className="h-[2px] w-12 bg-[#8B5E3C] rounded-full"></div>
        </div>

        {/* 3. Sub-header (Static or configurable) */}
        <p className="font-serif text-lg mb-6 text-center" style={{ color: themeColor }}>
          Please Join Us For<br/>The Marriage Of
        </p>

        {/* 4. Couple Names (The "Title" input) */}
        <div className="mb-8 w-full">
           <h1 style={getStyle(textElements.title, 64, 'Great Vibes')}>
             {customization.wedding_title || 'Olivia & Oscar'}
           </h1>
        </div>

        {/* 5. Date & Time Row */}
        <div className="flex items-center gap-4 font-serif text-xl mb-6 font-bold" style={{ color: themeColor }}>
          <span>{customization.ceremony_date || 'August / 08 / 22'}</span>
          <span className="text-sm">•</span>
          <span>{customization.ceremony_time || '3:00 pm'}</span>
        </div>

        {/* 6. Custom Message (Lorem Ipsum area) */}
        <div className="max-w-xs mx-auto">
          <div style={getStyle(textElements.message, 14)}>
            {customization.custom_message || 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet.'}
          </div>
        </div>
        
      </div>
    </div>
  );
};