import React, { useState, useRef } from 'react';
import { ImageIcon, Move, Heart, Flower2 } from 'lucide-react';

// --- Types ---
export interface ImageSettings {
  x: number;
  y: number;
  scale: number;
}

export interface RSVPInvitationData {
  bride?: string;
  groom?: string;
  partner_1?: string;
  partner_2?: string;
  ceremony_date: string;
  ceremony_time: string;
  venue_name: string;
  venue_address: string;
  custom_message?: string;
  imageUrl?: string | null;
  imageSettings?: ImageSettings;
  qr_code?: string;
  guest_name?: string;
}

export interface InvitationEngineProps {
  templateId: string;
  data: RSVPInvitationData;
  onUpdateImageSettings?: (settings: ImageSettings) => void;
  className?: string;
}

// --- Font & Style Loader ---
export const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@400;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Belleza&family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Great+Vibes&family=Lato:wght@300;400;700&family=Montserrat:wght@200;300;400;500;600&family=Nunito:wght@200;300;400;600;700&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Prata&display=swap');

    .font-menbere { font-family: 'Menbere', 'Noto Serif Ethiopic', serif; }
    .font-smooth { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.02); } }
    .animate-slow-zoom { animation: slowZoom 20s ease-in-out infinite alternate; }
    
    .paper-texture { 
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E"); 
      pointer-events: none; 
    }
    .cursor-move { cursor: move; }
  `}</style>
);

// --- Helpers ---
const formatDateParts = (dateString: string) => {
  const defaultDate = { day: "29", month: "DEC", fullMonth: "DECEMBER", weekday: "SATURDAY", year: "2026" };
  if (!dateString) return defaultDate;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return defaultDate;
  
  return {
    day: date.getDate().toString(),
    month: date.toLocaleString('default', { month: 'short' }).toUpperCase(), 
    fullMonth: date.toLocaleString('default', { month: 'long' }).toUpperCase(),
    weekday: date.toLocaleString('default', { weekday: 'long' }).toUpperCase(),
    year: date.getFullYear().toString()
  };
};

const PaperOverlay = () => (
  <div className="absolute inset-0 z-20 paper-texture mix-blend-multiply opacity-60 pointer-events-none rounded-sm"></div>
);

// --- TEMPLATE COMPONENTS ---

// 1. Traditional Habesha II (Design 13)
const TraditionalHabeshaTwoTemplate: React.FC<{ data: RSVPInvitationData; onUpdateImageSettings?: (s: ImageSettings) => void }> = ({ data, onUpdateImageSettings }) => {
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl;
  const imgSettings = data.imageSettings || { x: 0, y: 0, scale: 1 };

  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive && activeImage) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { 
    if (isDragging && onUpdateImageSettings) { 
      const dx = e.clientX - startPos.current.x; 
      const dy = e.clientY - startPos.current.y; 
      onUpdateImageSettings({ ...imgSettings, x: imgSettings.x + dx, y: imgSettings.y + dy }); 
      startPos.current = { x: e.clientX, y: e.clientY }; 
    }
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { 
    if (isInteractive && activeImage && onUpdateImageSettings) { 
      const delta = e.deltaY * -0.001; 
      const newScale = Math.min(Math.max(0.5, imgSettings.scale + delta), 3); 
      onUpdateImageSettings({ ...imgSettings, scale: newScale }); 
    }
  };

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-[#FFF8E7] ${isInteractive && activeImage ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
      {activeImage && (
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] z-0" style={{ transform: `translate(${imgSettings.x}px, ${imgSettings.y}px) scale(${imgSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
          <img src={activeImage} alt="Couple" className="w-full h-full object-cover rounded-tr-[40%]" draggable={false} />
        </div>
      )}
      {!data.imageUrl && isInteractive && (
         <div className="absolute bottom-[10%] left-[10%] z-0 pointer-events-none opacity-50">
           <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Photo Goes Here</div>
         </div>
      )}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('/templates/templatesBG/design%2013.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col pt-[15%] px-[15%] text-center">
          <p className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] mb-[2cqh] mt-[4cqh]" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.custom_message || "ወደ ሰርጋችን በደስታ እንጠራዎታለን"}</p>
          <div className="mb-[2cqh] w-full flex flex-col items-center justify-center">
             <h2 className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37] leading-tight" style={{ fontSize: 'clamp(2rem, 8cqw, 4rem)' }}>{data.bride || data.partner_1 || "ሳሮን"}</h2>
             <span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] text-xl my-1">እና</span>
             <h2 className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37] leading-tight" style={{ fontSize: 'clamp(2rem, 8cqw, 4rem)' }}>{data.groom || data.partner_2 || "ቤዛው"}</h2>
          </div>
          <div className="w-full text-center mb-[4cqh] mt-[2cqh]"><span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] block mb-1" style={{ fontSize: 'clamp(0.9rem, 2.8cqw, 1.4rem)' }}>ለ: {data.guest_name || "ክቡር/ት ___________________"}</span></div>
          <div className="absolute bottom-[8%] right-[8%] text-right flex flex-col gap-3 z-30">
              <div className="flex items-center justify-end gap-2"><p className="font-['Montserrat'] text-[#5D4037] font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.ceremony_date}</p><p className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>:ቀን</p></div>
              <div className="flex items-center justify-end gap-2"><p className="font-['Montserrat'] text-[#5D4037] font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.ceremony_time}</p><p className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>:ሰዓት</p></div>
              <div className="flex flex-col items-end"><p className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>:ቦታ</p><p className="font-['Noto_Serif_Ethiopic'] text-[#5D4037] font-bold leading-tight" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.venue_name}</p></div>
          </div>
      </div>
      {isInteractive && activeImage && <div className="hide-on-download absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Scroll to Zoom Photo</div>}
    </div>
  );
};

// 2. Traditional Habesha (Design 10)
const TraditionalHabeshaTemplate: React.FC<{ data: RSVPInvitationData; onUpdateImageSettings?: (s: ImageSettings) => void }> = ({ data, onUpdateImageSettings }) => {
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl;
  const imgSettings = data.imageSettings || { x: 0, y: 0, scale: 1 };
  
  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive && activeImage) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...imgSettings, x: imgSettings.x + dx, y: imgSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && activeImage && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, imgSettings.scale + delta), 3); onUpdateImageSettings({ ...imgSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-[#FFF8E7] ${isInteractive && activeImage ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        {activeImage && (<div className="absolute top-0 left-0 w-full h-full z-0" style={{ transform: `translate(${imgSettings.x}px, ${imgSettings.y}px) scale(${imgSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}><img src={activeImage} alt="Couple" className="w-full h-full object-cover" draggable={false} /></div>)}
        {!data.imageUrl && isInteractive && (<div className="absolute bottom-[15%] right-[10%] z-0 pointer-events-none opacity-50"><div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Add Photo Here</div></div>)}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('/templates/templatesBG/design%2012.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center pt-[22%] px-[12%] text-center">
            <div className="mb-[3cqh] w-full mt-[5cqh]"><h2 className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] leading-relaxed" style={{ fontSize: 'clamp(1.0rem, 5cqw, 2.0rem)' }}>አቶ {data.groom || "ቤዛው ተስፋ"}</h2><p className="font-['Noto_Serif_Ethiopic'] text-[#5D4037] my-1" style={{ fontSize: 'clamp(1rem, 4cqw, 1.5rem)' }}>እና</p><h2 className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] leading-relaxed" style={{ fontSize: 'clamp(1.2rem, 5cqw, 2.5rem)' }}>ወ/ሮ {data.bride || "ሳሮን ተስፋ"}</h2></div>
            <div className="w-full text-left mb-[2cqh] mt-[2cqh] pl-4"><span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] text-xl">ለ: {data.guest_name || "ክቡር/ት ___________________"}</span></div>
            <div className="mb-[5cqh] text-left"><p className="font-['Noto_Serif_Ethiopic'] text-[#5D4037] leading-relaxed" style={{ fontSize: 'clamp(0.7rem, 2.5cqw, 1rem)' }}>{data.custom_message || "የልጆቻችንን ጋብቻ ምክንያት በማድረግ እግዚአብሔርን ለማመስገንና ደስታችንን ለመካፈል..."}</p></div>
            <div className="absolute bottom-[18%] left-[12%] text-left flex flex-col gap-1"><div className="flex items-center gap-2"><span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>ቀን:</span><span className="font-['Noto_Serif_Ethiopic'] text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>{data.ceremony_date}</span></div><div className="flex items-center gap-2"><span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>ሰዓት:</span><span className="font-['Noto_Serif_Ethiopic'] text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>{data.ceremony_time}</span></div><div className="flex flex-col"><span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>ቦታ:</span><span className="font-['Noto_Serif_Ethiopic'] text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>{data.venue_name}</span></div></div>
        </div>
        {isInteractive && activeImage && <div className="hide-on-download absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Zoom</div>}
    </div>
  );
};

// 3. Copper Geometric (Design 9)
const CopperGeometricTemplate: React.FC<{ data: RSVPInvitationData; onUpdateImageSettings?: (s: ImageSettings) => void }> = ({ data, onUpdateImageSettings }) => {
  const { day, month, year } = formatDateParts(data.ceremony_date);
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl || "https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop";
  const imgSettings = data.imageSettings || { x: 0, y: 0, scale: 1 };
  
  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...imgSettings, x: imgSettings.x + dx, y: imgSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, imgSettings.scale + delta), 3); onUpdateImageSettings({ ...imgSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-white ${isInteractive ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="absolute top-0 left-0 w-full h-[60%] z-0" style={{ transform: `translate(${imgSettings.x}px, ${imgSettings.y}px) scale(${imgSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}><img src={activeImage} alt="Couple" className="w-full h-full object-cover" draggable={false} /></div>
        {!data.imageUrl && <div className="absolute top-[20%] left-0 w-full flex justify-center z-0 pointer-events-none"><div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Photo</div></div>}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('/templates/templatesBG/design%209.png')`, backgroundSize: '100% 100%' }}></div>
        <PaperOverlay />
        <div className="absolute top-[55%] left-0 w-full h-[50%] z-20 pointer-events-none flex flex-col items-center justify-center text-center px-6">
            <div className="font-['Great_Vibes'] text-[#D4A373]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>Save the date</div>
            <div className="font-['Montserrat'] text-gray-500 tracking-[0.2em] uppercase mt-2 mb-4" style={{ fontSize: 'clamp(0.5rem, 1.5cqw, 0.7rem)' }}>For the wedding of</div>
            <div className="mb-4 w-full"><h1 className="font-['Cinzel'] font-bold text-[#5D5D5D] leading-none uppercase" style={{ fontSize: 'clamp(2.5rem, 10cqw, 4.5rem)' }}>{data.bride} <span className="text-[#D4A373] font-['Great_Vibes'] text-[0.8em] align-middle mx-1">&</span> {data.groom}</h1></div>
            <div className="flex items-center justify-center gap-3 text-[#5D5D5D] mb-4 font-['Cinzel'] tracking-widest" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.2rem)' }}><span>{month}</span><span className="text-gray-300 mx-1">|</span><span className="text-2xl font-bold">{day}</span><span className="text-gray-300 mx-1">|</span><span>{year}</span></div>
            <div className="font-['Cinzel'] text-gray-500 text-[10px] tracking-widest uppercase mb-4">{data.ceremony_time || "5 O'CLOCK"}</div>
            <div className="font-['Cinzel'] text-gray-400 text-[10px] uppercase tracking-widest mb-4">To: {data.guest_name || "Guest Name"}</div>
            <div className="font-['Cinzel'] text-gray-500 text-[10px] uppercase leading-relaxed max-w-[80%]">{data.venue_address}</div>
        </div>
        {isInteractive && <div className="hide-on-download absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Zoom</div>}
    </div>
  );
};

// 4. Golden Rings Template (Design 8)
const GoldenRingsTemplate: React.FC<{ data: RSVPInvitationData; onUpdateImageSettings?: (s: ImageSettings) => void }> = ({ data, onUpdateImageSettings }) => {
  const { day, fullMonth, year } = formatDateParts(data.ceremony_date);
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl || "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
  const imgSettings = data.imageSettings || { x: 0, y: 0, scale: 1 };
  
  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...imgSettings, x: imgSettings.x + dx, y: imgSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, imgSettings.scale + delta), 3); onUpdateImageSettings({ ...imgSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-white ${isInteractive ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="absolute top-0 left-0 w-full h-[55%] z-0" style={{ transform: `translate(${imgSettings.x}px, ${imgSettings.y}px) scale(${imgSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}><img src={activeImage} alt="Couple" className="w-full h-full object-cover" draggable={false} /></div>
        {!data.imageUrl && <div className="absolute top-[20%] left-0 w-full flex justify-center z-0 pointer-events-none"><div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Photo</div></div>}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('/templates/templatesBG/design%208.png')`, backgroundSize: '100% 100%' }}></div>
        <PaperOverlay />
        <div className="absolute top-[47%] left-0 w-full h-[52%] z-20 pointer-events-none flex flex-col items-center justify-center text-center px-8">
            <p className="font-['Montserrat'] text-[#5D4037] text-[10px] tracking-[0.2em] uppercase mb-4 font-bold" style={{ fontSize: 'clamp(0.5rem, 1.5cqw, 0.8rem)' }}>You are invited to the wedding of</p>
            <div className="mb-0 w-full "><h1 className="font-['Great_Vibes'] text-[#D4AF37] leading-none pt-5px" style={{ fontSize: 'clamp(3rem, 12cqw, 5rem)' }}>{data.bride} <span className="text-[#D4AF37] mx-2">&</span> {data.groom}</h1></div>
            <div className="w-[80%] h-[1px] bg-[#D4AF37] mb-6 opacity-50"></div>
            <div className="flex flex-col items-center gap-1 text-[#D4AF37] font-bold"><div className="flex items-center gap-2" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}><span>{day}th</span><span>•</span><span>{fullMonth}</span><span>•</span><span>{year}</span></div><div className="text-2xl" style={{ fontSize: 'clamp(1.5rem, 4cqw, 2.5rem)' }}>{data.ceremony_time}</div></div>
            <div className="w-[40%] h-[1px] bg-[#D4AF37] my-6 opacity-50 absolute top-[30%]"></div>
            <div className="font-['Montserrat'] text-[#D4AF37] text-xs font-bold uppercase tracking-wide mt-2 mb-4">To: {data.guest_name || "Guest Name"}</div>
            <div className="font-['Montserrat'] text-[#D4AF37] text-xs font-bold uppercase tracking-wide" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{data.venue_address}</div>
            <p className="font-['Montserrat'] text-[#5D4037] text-[10px] font-bold mt-2" style={{ fontSize: 'clamp(0.5rem, 1.5cqw, 0.8rem)' }}>Reception to follow</p>
        </div>
        {isInteractive && <div className="hide-on-download absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Zoom</div>}
    </div>
  );
};

// 5. Classic Photo Frame Template (Design 7)
const ClassicPhotoFrameTemplate: React.FC<{ data: RSVPInvitationData; onUpdateImageSettings?: (s: ImageSettings) => void }> = ({ data, onUpdateImageSettings }) => {
  const { day, month, year } = formatDateParts(data.ceremony_date);
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl || "https://images.unsplash.com/photo-1583939003579-730e3918a45a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
  const imgSettings = data.imageSettings || { x: 0, y: 0, scale: 1 };
  
  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...imgSettings, x: imgSettings.x + dx, y: imgSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, imgSettings.scale + delta), 3); onUpdateImageSettings({ ...imgSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-white ${isInteractive ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="absolute top-0 left-0 w-full h-[65%] z-0" style={{ transform: `translate(${imgSettings.x}px, ${imgSettings.y}px) scale(${imgSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}><img src={activeImage} alt="Couple" className="w-full h-full object-cover" draggable={false} /></div>
        {!data.imageUrl && <div className="absolute top-[30%] left-0 w-full flex justify-center z-0 pointer-events-none"><div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Photo</div></div>}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('/templates/templatesBG/design%207.png')`, backgroundSize: '100% 100%' }}></div>
        <PaperOverlay />
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-end pb-[8%] text-center">
            <div className="mb-[2cqh]"><p className="font-['Great_Vibes'] text-[#374151] text-2xl" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>You are invited to</p><p className="font-['Great_Vibes'] text-[#374151] text-xl -mt-2" style={{ fontSize: 'clamp(1.2rem, 4cqw, 2rem)' }}>the wedding of</p></div>
            <div className="mb-[3cqh]"><h1 className="font-['Cinzel'] font-bold text-[#E6A65D] tracking-wide leading-none uppercase" style={{ fontSize: 'clamp(1.8rem, 7cqw, 3.5rem)' }}>{data.bride} <span className="text-slate-400 mx-1">&</span> {data.groom}</h1></div>
            <div className="flex items-center justify-center gap-3 text-[#374151] mb-[1cqh]"><span className="font-['Great_Vibes'] text-2xl" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>{month}</span><div className="h-6 w-[1px] bg-[#E6A65D]"></div><span className="font-['Cinzel'] font-bold text-xl" style={{ fontSize: 'clamp(1.2rem, 4cqw, 2rem)' }}>{day}</span><div className="h-6 w-[1px] bg-[#E6A65D]"></div><span className="font-['Great_Vibes'] text-2xl" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>{year}</span></div>
            <div className="font-['Cinzel'] text-[#374151] text-xs font-bold uppercase mb-1">To: {data.guest_name || "Guest Name"}</div>
            <div className="font-['Great_Vibes'] text-[#374151]" style={{ fontSize: 'clamp(1.2rem, 4cqw, 2rem)' }}>at {data.ceremony_time || "seven o'clock"}</div>
        </div>
        {isInteractive && <div className="hide-on-download absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Zoom</div>}
    </div>
  );
};

// 6. Elegant Gold Script (Design 1)
const ElegantGoldTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => {
  const { day, fullMonth, weekday, year } = formatDateParts(data.ceremony_date);
  return (
    <div className="w-full h-full relative overflow-hidden font-smooth bg-white">
       <div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('/templates/templatesBG/design%201.png')`, backgroundSize: '100% 100%' }}></div>
       <PaperOverlay />
       <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-[10%]"><div className="absolute top-[18%] w-full"><p className="font-['Belleza'] uppercase tracking-[0.2em] text-[#4A4A4A]" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{data.guest_name ? `Dear ${data.guest_name}` : "Together with their families"}</p></div><div className="absolute top-[28%] w-full flex flex-col items-center"><h1 className="font-['Pinyon_Script'] text-[#C5A059] leading-none" style={{ fontSize: 'clamp(3.5rem, 13cqw, 6.5rem)' }}>{data.bride}</h1><span className="font-['Prata'] text-[#4A4A4A] my-[1cqh]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>&</span><h1 className="font-['Pinyon_Script'] text-[#C5A059] leading-none" style={{ fontSize: 'clamp(3.5rem, 13cqw, 6.5rem)' }}>{data.groom}</h1></div><div className="absolute top-[60%] w-full flex flex-col items-center text-[#4A4A4A]"><p className="font-['Belleza'] uppercase tracking-[0.15em] mb-[3cqh] opacity-80" style={{ fontSize: 'clamp(0.5rem, 1.8cqw, 0.8rem)' }}>{data.custom_message || "Request the honor of your presence"}</p><div className="flex items-center justify-center gap-4 mb-[2cqh] w-full"><span className="font-['Prata'] uppercase tracking-widest" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{fullMonth}</span><span className="h-[2.5cqh] w-[1px] bg-[#C5A059]"></span><span className="font-['Prata'] font-medium" style={{ fontSize: 'clamp(2rem, 5cqw, 3rem)' }}>{day}</span><span className="h-[2.5cqh] w-[1px] bg-[#C5A059]"></span><span className="font-['Prata']" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{year}</span></div><p className="font-['Belleza'] uppercase tracking-[0.1em]" style={{ fontSize: 'clamp(0.7rem, 2.2cqw, 1rem)' }}>{weekday} at {data.ceremony_time}</p><div className="mt-[4cqh] w-full"><p className="font-['Prata'] uppercase tracking-widest mb-1 text-[#333]" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.venue_name}</p><p className="font-['Belleza'] text-xs uppercase tracking-wide opacity-70" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>{data.venue_address}</p></div></div><div className="absolute bottom-[8%] w-full"><p className="font-['Pinyon_Script'] text-[#C5A059]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>Reception to follow</p></div></div>
    </div>
  );
};

// 7. Violet Peony (Design 2)
const VioletPeonyTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => {
  const { day, month, weekday, year } = formatDateParts(data.ceremony_date);
  return (
    <div className="w-full h-full relative overflow-hidden font-smooth bg-[#FFF0F5]">
       <div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('/templates/templatesBG/design%202.png')`, backgroundSize: '100% 100%' }}></div>
       <PaperOverlay />
       <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-[10%]"><div className="absolute top-[18%] w-full"><p className="font-['Montserrat'] uppercase tracking-[0.15em] text-[#5D4037] font-medium" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{data.guest_name ? `Dear ${data.guest_name}` : "Together with their families"}</p></div><div className="absolute top-[30%] w-full flex flex-col items-center"><h1 className="font-['Great_Vibes'] text-[#884A5E] leading-none transform -rotate-2" style={{ fontSize: 'clamp(3rem, 12cqw, 6rem)' }}>{data.bride}</h1><span className="font-['Cormorant_Garamond'] italic text-[#884A5E] my-[0.5cqh]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>&</span><h1 className="font-['Great_Vibes'] text-[#884A5E] leading-none transform -rotate-2" style={{ fontSize: 'clamp(3rem, 12cqw, 6rem)' }}>{data.groom}</h1></div><div className="absolute top-[55%] w-full"><p className="font-['Montserrat'] uppercase tracking-[0.15em] text-[#5D4037] font-medium" style={{ fontSize: 'clamp(0.5rem, 1.8cqw, 0.8rem)' }}>{data.custom_message || "Invite you to join their wedding"}</p></div><div className="absolute top-[65%] w-full flex items-center justify-center gap-4 text-[#6D4C41]"><span className="font-['Montserrat'] uppercase tracking-widest font-bold w-[30%] text-right" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{weekday}</span><div className="h-[6cqh] w-[1px] bg-[#884A5E]"></div><div className="flex flex-col items-center leading-none text-[#5D4037]"><span className="font-['Cormorant_Garamond'] uppercase tracking-widest font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1rem)' }}>{month}</span><span className="font-['Cormorant_Garamond'] font-bold my-[0.5cqh]" style={{ fontSize: 'clamp(2.5rem, 8cqw, 4rem)' }}>{day}</span><span className="font-['Cormorant_Garamond'] font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1rem)' }}>{year}</span></div><div className="h-[6cqh] w-[1px] bg-[#884A5E]"></div><span className="font-['Montserrat'] uppercase tracking-widest font-bold w-[30%] text-left whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>AT {data.ceremony_time}</span></div><div className="absolute bottom-[10%] w-full"><p className="font-['Montserrat'] uppercase tracking-[0.1em] text-[#5D4037] mb-[2cqh]" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>{data.venue_address}</p><p className="font-['Great_Vibes'] text-[#884A5E]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 3rem)' }}>Reception to follow</p></div></div>
    </div>
  );
};

// 8. Purple Gold Aesthetic (Design 3)
const PurpleGoldTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => {
  const { day, fullMonth, weekday, year } = formatDateParts(data.ceremony_date);
  return (
    <div className="w-full h-full relative overflow-hidden font-smooth bg-white">
       <div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('/templates/templatesBG/design%203.png')`, backgroundSize: '100% 100%' }}></div>
       <PaperOverlay />
       <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-[10%]"><div className="absolute top-[15%] w-full"><p className="font-['Nunito'] font-semibold text-[#4A3B52] tracking-wide" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{data.guest_name ? `Dear ${data.guest_name}` : "Please join us to celebrate the wedding of:"}</p></div><div className="absolute top-[32%] w-full flex flex-col items-center"><h1 className="font-['Great_Vibes'] text-[#4A3B52] leading-none" style={{ fontSize: 'clamp(2.5rem, 9cqw, 4.5rem)' }}>{data.bride}</h1><span className="font-['Great_Vibes'] text-[#4A3B52] my-[0.5cqh]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>&</span><h1 className="font-['Great_Vibes'] text-[#4A3B52] leading-none" style={{ fontSize: 'clamp(2.5rem, 9cqw, 4.5rem)' }}>{data.groom}</h1></div><div className="absolute top-[60%] w-full flex flex-col items-center"><div className="font-['Nunito'] font-bold text-[#4A3B52] uppercase tracking-[0.2em] mb-[1cqh]" style={{ fontSize: 'clamp(0.7rem, 2.5cqw, 1rem)' }}>{fullMonth}</div><div className="flex items-center justify-center gap-3 w-full max-w-[90%] mb-[1cqh]"><div className="flex-1 border-t-2 border-[#D4AF37] opacity-60"></div><div className="bg-[#D4AF37]/10 px-2 py-1 rounded"><span className="font-['Nunito'] font-bold text-[#4A3B52] uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>{weekday}</span></div><span className="font-['Nunito'] font-bold text-[#6A5ACD] leading-none mx-2" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)' }}>{day}</span><div className="bg-[#D4AF37]/10 px-2 py-1 rounded"><span className="font-['Nunito'] font-bold text-[#4A3B52] uppercase tracking-widest whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>AT {data.ceremony_time}</span></div><div className="flex-1 border-t-2 border-[#D4AF37] opacity-60"></div></div><div className="font-['Nunito'] font-bold text-[#4A3B52] tracking-[0.2em] mb-[4cqh]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.2rem)' }}>{year}</div><div className="font-['Nunito'] font-bold text-[#4A3B52] mb-[2cqh]" style={{ fontSize: 'clamp(0.7rem, 2.5cqw, 1rem)' }}>To: Guest Name<br/>Liceria Grand Ballroom<br/><span className="font-normal text-[#666]">{data.venue_address}</span></div></div></div>
    </div>
  );
};

// 9. Green Geometric Floral (Design 4)
const GreenGeometricTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => {
  const { day, fullMonth, weekday, year } = formatDateParts(data.ceremony_date);
  return (
    <div className="w-full h-full relative overflow-hidden font-smooth bg-white">
       <div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('/templates/templatesBG/design%204.png')`, backgroundSize: '100% 100%' }}></div>
       <PaperOverlay />
       <div className="absolute top-[8%] w-full text-center z-10 px-8"><p className="font-['Montserrat'] uppercase tracking-[0.2em] text-[#374151]" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)', lineHeight: '1.6' }}>{data.guest_name ? `Dear ${data.guest_name}` : "Together with their families"}</p></div><div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full text-center flex flex-col items-center justify-center"><h1 className="font-['Alex_Brush'] text-[#B8860B] leading-none" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)' }}>{data.bride}</h1><span className="font-['Montserrat'] text-[#B8860B] my-[0.5cqh]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>&</span><h1 className="font-['Alex_Brush'] text-[#B8860B] leading-none" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)' }}>{data.groom}</h1></div><div className="absolute top-[78%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full px-4 flex flex-col items-center justify-center text-center"><p className="font-['Montserrat'] uppercase tracking-[0.15em] text-[#374151] mb-[3cqh]" style={{ fontSize: 'clamp(0.5rem, 1.8cqw, 0.75rem)' }}>{data.custom_message || "Invite you to join their wedding celebration on"}</p><div className="flex flex-col items-center w-full text-[#374151]"><span className="font-['Montserrat'] uppercase tracking-[0.2em] mb-[1cqh] font-medium" style={{ fontSize: 'clamp(0.7rem, 2.2cqw, 1rem)' }}>{fullMonth}</span><div className="flex items-center justify-center w-full max-w-[90%] gap-3 mb-[1cqh]"><div className="h-[1px] bg-[#374151] flex-1 opacity-40"></div><span className="font-['Montserrat'] uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{weekday}</span><span className="font-['Montserrat'] font-medium mx-2" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)', lineHeight: 1 }}>{day}</span><span className="font-['Montserrat'] uppercase tracking-widest whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>AT {data.ceremony_time}</span><div className="h-[1px] bg-[#374151] flex-1 opacity-40"></div></div><span className="font-['Montserrat'] tracking-[0.2em] font-medium" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.1rem)' }}>{year}</span></div><div className="font-['Montserrat'] uppercase tracking-[0.1em] text-[#374151] mt-[3cqh] mb-[3cqh]" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>To: Guest Name<br/>{data.venue_address}</div><p className="font-['Alex_Brush'] text-[#5D4037]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>Reception to follow</p></div>
    </div>
  );
};

// 10. Blue Floral (Design 5)
const BlueFloralTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => {
  return (
    <div className="w-full h-full relative overflow-hidden font-smooth bg-[#F0F4F8]">
       <div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('/templates/templatesBG/design%205.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
       <PaperOverlay />
       <div className="absolute inset-[8%] z-10 bg-white/90 backdrop-blur-[1px] rounded-t-[50%] rounded-b-lg shadow-sm flex flex-col items-center justify-center text-center p-6 border border-white/50">
            <div className="mb-[3cqh]"><Flower2 className="w-6 h-6 text-[#7DA0C4] mx-auto mb-2 opacity-80" strokeWidth={1} /><p className="font-['Montserrat'] uppercase tracking-[0.2em] text-[#546E7A] font-medium" style={{ fontSize: 'clamp(0.5rem, 1.8cqw, 0.75rem)' }}>{data.guest_name ? `Dear ${data.guest_name}` : "You are invited to the engagement of"}</p></div><div className="mb-[2cqh] w-full flex flex-col items-center gap-0"><h1 className="font-['Alex_Brush'] text-[#8D6E63] transform -rotate-3" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)', lineHeight: '0.8' }}>{data.bride}</h1><span className="font-['Alex_Brush'] text-[#7DA0C4] my-1" style={{ fontSize: 'clamp(1.5rem, 4cqw, 2rem)' }}>and</span><h1 className="font-['Alex_Brush'] text-[#8D6E63] transform -rotate-3" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)', lineHeight: '0.8' }}>{data.groom}</h1></div><div className="mb-[4cqh] mt-2"><p className="font-['Montserrat'] uppercase tracking-[0.2em] text-[#546E7A] mb-2" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>Date</p><div className="font-['Cinzel'] text-[#455A64] tracking-widest font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.ceremony_date}</div></div><div className="font-['Montserrat'] text-[#546E7A] space-y-1" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)', letterSpacing: '0.1em' }}><p>{data.ceremony_time} - END</p><p className="max-w-[80%] mx-auto mt-2 leading-relaxed uppercase">{data.venue_address}</p></div>
       </div>
    </div>
  );
};

// 11. Royal Floral (Design 6)
const RoyalFloralTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => {
  const { day, fullMonth, weekday } = formatDateParts(data.ceremony_date);
  return (
    <div className="w-full h-full relative overflow-hidden font-smooth bg-[#FCFbf7]">
       <div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('http://reflectionplc.com/design%206.png')`, backgroundSize: '100% 100%' }}></div>
       <PaperOverlay />
       <div className="absolute top-[52%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full px-[8%] flex flex-col items-center justify-center text-center"><div className="mb-[2cqh]"><p className="font-['Alex_Brush'] text-[#8B5E3C] leading-none mb-1" style={{ fontSize: 'clamp(1rem, 3.5cqw, 2rem)' }}>{data.guest_name ? `Dear ${data.guest_name}` : "Together with"}</p><p className="font-['Alex_Brush'] text-[#8B5E3C] leading-none" style={{ fontSize: 'clamp(1rem, 3.5cqw, 2rem)' }}>their families</p></div><div className="mb-[2.5cqh] w-full flex flex-col items-center"><h1 className="font-['Parisienne'] text-[#6D4246] leading-none drop-shadow-sm" style={{ fontSize: 'clamp(3rem, 10cqw, 6rem)' }}>{data.bride}</h1><span className="font-['Parisienne'] text-[#C5A059] my-[0.5cqh]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>&</span><h1 className="font-['Parisienne'] text-[#6D4246] leading-none drop-shadow-sm" style={{ fontSize: 'clamp(3rem, 10cqw, 6rem)' }}>{data.groom}</h1></div><div className="mb-[4cqh] max-w-[85%] mx-auto"><p className="font-['Cormorant_Garamond'] text-[#4A4A4A] italic leading-relaxed" style={{ fontSize: 'clamp(0.8rem, 2.8cqw, 1.4rem)' }}>{data.custom_message || "Request the pleasure of your company"}</p></div><div className="w-full flex flex-col items-center mb-[4cqh] text-[#6D4246]"><div className="flex items-center justify-center w-full gap-2 md:gap-4 px-1"><div className="h-[1px] bg-[#C5A059] w-[12%]"></div><span className="font-['Nunito'] font-bold tracking-widest uppercase text-[#8B5E3C] text-right whitespace-nowrap" style={{ fontSize: 'clamp(0.55rem, 1.8cqw, 0.9rem)' }}>{weekday}</span><span className="font-['Playfair_Display'] text-[#6D4246] leading-none mx-2 font-normal" style={{ fontSize: 'clamp(2.5rem, 9cqw, 5rem)' }}>{day}</span><span className="font-['Nunito'] font-bold tracking-widest uppercase text-[#8B5E3C] text-left whitespace-nowrap" style={{ fontSize: 'clamp(0.55rem, 1.8cqw, 0.9rem)' }}>AT {data.ceremony_time}</span><div className="h-[1px] bg-[#C5A059] w-[12%]"></div></div><div className="font-['Nunito'] tracking-[0.3em] uppercase text-[#4A4A4A] mt-1 font-bold" style={{ fontSize: 'clamp(0.6rem, 2.2cqw, 1.1rem)' }}>{fullMonth}</div></div><div className="mb-[3cqh]"><p className="font-['Cormorant_Garamond'] text-[#4A4A4A]" style={{ fontSize: 'clamp(0.8rem, 2.8cqw, 1.4rem)' }}>{data.venue_address}</p></div><p className="font-['Alex_Brush'] text-[#8B5E3C]" style={{ fontSize: 'clamp(1.2rem, 4.5cqw, 2.5rem)' }}>Reception to follow</p></div>
    </div>
  );
};

// 12. Classic Template
const ClassicTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => (
  <div className="w-full h-full bg-[#FFF8F0] text-[#5D4037] flex flex-col items-center justify-center p-8 border-[clamp(6px,2vw,12px)] border-double border-[#D7C0AE] font-smooth relative overflow-hidden transition-all duration-500">
    <PaperOverlay />
    <div className="absolute top-4 left-4 w-[10%] h-[10%] border-t-2 border-l-2 border-[#8B5E3C] opacity-50"></div>
    <div className="absolute top-4 right-4 w-[10%] h-[10%] border-t-2 border-r-2 border-[#8B5E3C] opacity-50"></div>
    <div className="absolute bottom-4 left-4 w-[10%] h-[10%] border-b-2 border-l-2 border-[#8B5E3C] opacity-50"></div>
    <div className="absolute bottom-4 right-4 w-[10%] h-[10%] border-b-2 border-r-2 border-[#8B5E3C] opacity-50"></div>
    <p className="uppercase tracking-[0.2em] mb-8 text-[#8B5E3C] font-['Lato']" style={{ fontSize: 'clamp(0.6rem, 1.5cqw, 0.8rem)' }}>
      {data.guest_name ? `Dear ${data.guest_name}` : 'The Wedding Of'}
    </p>
    <div className="font-['Playfair_Display'] text-center leading-[1.1]" style={{ fontSize: 'clamp(2rem, 6cqw, 3.5rem)' }}>
      <span className="block">{data.bride || "Bride"}</span>
      <span className="italic text-[#D4A373] my-2 block" style={{ fontSize: '0.6em' }}>&</span>
      <span className="block">{data.groom || "Groom"}</span>
    </div>
    <div className="w-12 h-[1px] bg-[#8B5E3C] my-[4cqh] opacity-40"></div>
    <p className="font-['Lato'] tracking-widest uppercase mb-2" style={{ fontSize: 'clamp(0.7rem, 2cqw, 0.9rem)' }}>
      {data.ceremony_date} • {data.ceremony_time}
    </p>
    <p className="font-['Playfair_Display'] italic mb-[4cqh]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.25rem)' }}>{data.venue_address}</p>
    <p className="font-['Lato'] text-center max-w-[80%] leading-relaxed opacity-80 tracking-wide mx-auto" style={{ fontSize: 'clamp(0.6rem, 1.8cqw, 0.8rem)' }}>
      {data.custom_message}
    </p>
  </div>
);

// 13. Modern Template
const ModernTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => (
  <div className="w-full h-full bg-white text-black flex flex-col relative font-smooth transition-all duration-500 border border-gray-100">
    <PaperOverlay />
    <div className="h-2/3 flex flex-col justify-between p-[5%] z-10">
      <div className="font-['Montserrat'] font-light tracking-[0.3em] uppercase" style={{ fontSize: 'clamp(0.6rem, 1.5cqw, 0.8rem)' }}>
        {data.guest_name ? `Dear ${data.guest_name}` : 'Save The Date'}
      </div>
      <div className="font-['Montserrat'] font-bold leading-[0.9] -ml-1 break-words" style={{ fontSize: 'clamp(2.5rem, 8cqw, 4.5rem)' }}>
        <div className="uppercase">{data.bride || "Bride"}</div>
        <div className="w-16 h-2 bg-black my-4"></div>
        <div className="uppercase">{data.groom || "Groom"}</div>
      </div>
    </div>
    <div className="bg-black text-white p-[5%] flex flex-col md:flex-row md:items-center justify-between z-20 h-1/3">
       <div>
          <p className="font-['Montserrat'] font-light mb-1" style={{ fontSize: 'clamp(1.2rem, 3.5cqw, 1.8rem)' }}>{data.ceremony_date}</p>
          <p className="font-['Montserrat'] font-medium text-neutral-400" style={{ fontSize: 'clamp(0.8rem, 2cqw, 1rem)' }}>{data.ceremony_time}</p>
          <p className="font-['Montserrat'] font-medium text-neutral-400 text-sm">{data.venue_name}</p>
       </div>
    </div>
  </div>
);

// 14. Rustic Template
const RusticTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => (
  <div className="w-full h-full bg-[#Fdfdfd] text-[#4A4A4A] flex flex-col items-center justify-center p-[4%] font-smooth border-[clamp(4px,1vw,8px)] border-[#E8E8E8] transition-all duration-500">
    <PaperOverlay />
    <div className="border border-[#4A4A4A] p-2 w-full h-full flex flex-col items-center justify-center relative">
       <p className="font-['Montserrat'] uppercase tracking-[0.2em] mb-4 text-[#6D4C41]" style={{ fontSize: 'clamp(0.6rem, 1.5cqw, 0.8rem)' }}>
         {data.guest_name ? `Dear ${data.guest_name}` : 'You are invited'}
       </p>
       <h2 className="font-['Great_Vibes'] mb-2 text-[#6D4C41] transform -rotate-2 text-center" style={{ fontSize: 'clamp(2.5rem, 8cqw, 4.5rem)' }}>
         {data.bride || "Bride"} & {data.groom || "Groom"}
       </h2>
       <div className="my-[4cqh] flex items-center gap-4">
         <div className="h-[1px] w-12 bg-[#9E9E9E]"></div>
         <Heart className="w-4 h-4 text-[#FF7043] fill-current" />
         <div className="h-[1px] w-12 bg-[#9E9E9E]"></div>
       </div>
       <div className="font-['Cinzel'] font-semibold tracking-[0.15em] mb-1" style={{ fontSize: 'clamp(1rem, 3cqw, 1.25rem)' }}>
         {data.ceremony_date} • {data.ceremony_time}
       </div>
       <p className="font-['Montserrat'] text-center text-sm text-[#6D4C41] mb-4">
         {data.venue_address}
       </p>
    </div>
  </div>
);

// 15. Botanical Template
const BotanicalTemplate: React.FC<{ data: RSVPInvitationData }> = ({ data }) => (
  <div className="w-full h-full bg-white text-[#2E4F2F] flex flex-col relative font-smooth overflow-hidden transition-all duration-500 border border-green-50">
    <PaperOverlay />
    <div className="absolute top-0 left-0 w-[30%] aspect-square bg-[#E8F5E9] rounded-br-[100%] opacity-40"></div>
    <div className="absolute bottom-0 right-0 w-[35%] aspect-square bg-[#C8E6C9] rounded-tl-[100%] opacity-40"></div>
    <div className="z-10 flex flex-col h-full p-[5%] items-center justify-center text-center">
        <p className="font-['Montserrat'] uppercase tracking-[0.3em] mb-6 text-[#558B2F]" style={{ fontSize: 'clamp(0.6rem, 1.5cqw, 0.8rem)' }}>
          {data.guest_name ? `Dear ${data.guest_name}` : 'The Wedding Of'}
        </p>
        <div className="relative">
          <h1 className="font-['Cinzel'] text-[#1B5E20] mb-8" style={{ fontSize: 'clamp(2rem, 6cqw, 3.5rem)' }}>
             {data.bride || "Bride"}
             <span className="block font-['Great_Vibes'] text-[#81C784] my-2 text-3xl">&</span>
             {data.groom || "Groom"}
          </h1>
        </div>
        <div className="mb-6">
          <p className="font-['Montserrat'] text-[#2E4F2F] mb-2" style={{ fontSize: 'clamp(0.8rem, 2cqw, 1rem)' }}>
            {data.ceremony_date} • {data.ceremony_time}
          </p>
          <p className="font-['Montserrat'] text-[#558B2F]" style={{ fontSize: 'clamp(0.7rem, 1.8cqw, 0.9rem)' }}>
            {data.venue_address}
          </p>
        </div>
    </div>
  </div>
);

// Template registry
const TEMPLATES = {
  'traditional2': TraditionalHabeshaTwoTemplate,
  'traditional': TraditionalHabeshaTemplate,
  'coppergeo': CopperGeometricTemplate,
  'goldenrings': GoldenRingsTemplate,
  'classicframe': ClassicPhotoFrameTemplate,
  'elegantgold': ElegantGoldTemplate,
  'royal': RoyalFloralTemplate,
  'violetpeony': VioletPeonyTemplate,
  'purplegold': PurpleGoldTemplate,
  'greengeo': GreenGeometricTemplate,
  'bluefloral': BlueFloralTemplate,
  'classic': ClassicTemplate,
  'modern': ModernTemplate,
  'rustic': RusticTemplate,
  'botanical': BotanicalTemplate,
  // Default fallback
  'default': ElegantGoldTemplate
};

export const TEMPLATE_METADATA = [
  { id: "traditional2", name: "Traditional Habesha II", category: "Vintage", description: "Beautiful traditional Ethiopian wedding invitation with photo placement", component: TraditionalHabeshaTwoTemplate, colors: ["#FFF8E7", "#5D4037", "#8B4513"], font: "Noto Serif Ethiopic", aspectRatio: "5/7", isPhotoTemplate: true },
  { id: "traditional", name: "Traditional Habesha", category: "Vintage", description: "Classic Ethiopian wedding design with elegant typography", component: TraditionalHabeshaTemplate, colors: ["#FFF8E7", "#5D4037", "#8B4513"], font: "Noto Serif Ethiopic", aspectRatio: "5/7", isPhotoTemplate: true },
  { id: "coppergeo", name: "Copper Geometric", category: "Modern", description: "Modern geometric design with copper accents and photo", component: CopperGeometricTemplate, colors: ["#FFFFFF", "#D4A373", "#5D5D5D"], font: "Great Vibes", aspectRatio: "5/7", isPhotoTemplate: true },
  { id: "goldenrings", name: "Golden Rings & Roses", category: "Floral", description: "Romantic design featuring golden rings and rose details", component: GoldenRingsTemplate, colors: ["#FFFFFF", "#D4AF37", "#5D4037"], font: "Great Vibes", aspectRatio: "1240/1748", isPhotoTemplate: true },
  { id: "classicframe", name: "Classic Frame Photo", category: "Modern", description: "Elegant photo frame design with classic styling", component: ClassicPhotoFrameTemplate, colors: ["#FFFFFF", "#E6A65D", "#374151"], font: "Great Vibes", aspectRatio: "1240/1748", isPhotoTemplate: true },
  { id: "elegantgold", name: "Elegant Gold Script", category: "Classic", description: "Timeless elegance with gold accents and script typography", component: ElegantGoldTemplate, colors: ["#FFFFFF", "#C5A059", "#4A4A4A"], font: "Pinyon Script", aspectRatio: "5/7" },
  { id: "royal", name: "Royal Floral", category: "Classic", description: "Regal design with ornate floral patterns", component: RoyalFloralTemplate, colors: ["#FCFbf7", "#682e33", "#D4AF37"], font: "Parisienne", aspectRatio: "1240/1748" },
  { id: "violetpeony", name: "Violet Peony", category: "Floral", description: "Soft and romantic with violet peony accents", component: VioletPeonyTemplate, colors: ["#FFF0F5", "#884A5E", "#5D4037"], font: "Great Vibes", aspectRatio: "5/7" },
  { id: "purplegold", name: "Purple Aesthetic", category: "Modern", description: "Contemporary purple and gold color palette", component: PurpleGoldTemplate, colors: ["#FFFFFF", "#6A5ACD", "#D4AF37"], font: "Great Vibes", aspectRatio: "5/7" },
  { id: "greengeo", name: "Green Geometric", category: "Floral", description: "Fresh geometric design with botanical elements", component: GreenGeometricTemplate, colors: ["#FFFFFF", "#374151", "#B8860B"], font: "Montserrat", aspectRatio: "5/7" },
  { id: "bluefloral", name: "Blue Watercolor", category: "Floral", description: "Dreamy watercolor florals in soft blue tones", component: BlueFloralTemplate, colors: ["#F0F4F8", "#7DA0C4", "#8D6E63"], font: "Alex Brush", aspectRatio: "5/7" },
  { id: "classic", name: "Classic Elegance", category: "Classic", description: "Traditional elegance with refined details", component: ClassicTemplate, colors: ["#FFF8F0", "#8B5E3C", "#D7C0AE", "#000000"], font: "Playfair", aspectRatio: "4/6" },
  { id: "modern", name: "Modern Minimal", category: "Modern", description: "Clean and minimalist contemporary design", component: ModernTemplate, colors: ["#ffffff", "#000000", "#9CA3AF"], font: "Montserrat", aspectRatio: "4/6" },
  { id: "rustic", name: "Rustic Charm", category: "Rustic", description: "Warm and inviting rustic style", component: RusticTemplate, colors: ["#Fdfdfd", "#6D4C41", "#FF7043", "#E8E8E8"], font: "Great Vibes", aspectRatio: "4/6" },
  { id: "botanical", name: "Botanical Garden", category: "Floral", description: "Natural botanical elements with green palette", component: BotanicalTemplate, colors: ["#F1F8E9", "#2E4F2F", "#81C784"], font: "Cinzel", aspectRatio: "4/6" }
];

export const InvitationEngine: React.FC<InvitationEngineProps> = ({ templateId, data, onUpdateImageSettings, className }) => {
  const template = TEMPLATE_METADATA.find(t => t.id === templateId);
  // Default to ElegantGoldTemplate if template not found or component missing
  const TemplateComponent = template?.component || ElegantGoldTemplate;

  return (
    <div className={`w-full h-full relative ${className || ''}`}>
      <FontLoader />
      {/* We cast to any here because some older templates might not strictly adhere 
         to InvitationEngineProps but work at runtime. 
      */}
      {/* @ts-ignore */}
      <TemplateComponent data={data} onUpdateImageSettings={onUpdateImageSettings} />
    </div>
  );
};

export default InvitationEngine;