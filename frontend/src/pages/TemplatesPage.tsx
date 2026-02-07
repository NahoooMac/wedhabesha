import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout as LayoutIcon, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Facebook, 
  Instagram, 
  Linkedin,
  Heart,
  Globe,
  User,
  LogOut,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Download,
  Share2,
  Image as ImageIcon,
  Check,
  Search,
  Filter,
  SlidersHorizontal,
  ArrowRight,
  Eye,
  Edit3,
  Copy,
  CheckCircle,
  Flower2,
  CalendarCheck,
  Move,
  ZoomIn
} from 'lucide-react';
import { MemoryRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// --- 1. CUSTOM FONT STYLES ---
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@400;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Belleza&family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Great+Vibes&family=Lato:wght@300;400;700&family=Montserrat:wght@200;300;400;500;600&family=Nunito:wght@200;300;400;600;700&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Prata&display=swap');

    body { font-family: 'Inter', sans-serif; }
    .font-menbere { font-family: 'Menbere', 'Noto Serif Ethiopic', serif; }
    .font-smooth { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.02); } }
    .animate-slow-zoom { animation: slowZoom 20s ease-in-out infinite alternate; }
    .paper-texture { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E"); pointer-events: none; }
  `}</style>
);

// --- 2. DATA & HELPERS ---
const translations = {
  en: {
    nav: { vendors: "Vendors", tools: "Planning Tools", templates: "Templates", pricing: "Pricing", login: "Log In", getStarted: "Get Started" },
    hero: { badge: "Wedding Templates", title: "Beautifully Designed ", titleHighlight: "Templates", subtitle: "Kickstart your wedding planning with our collection of professionally designed templates." },
    footer: { company: "Company", tools: "Planning Tools", vendorsList: "Vendors", rights: "All rights reserved.", tagline: "The #1 wedding planning platform for Ethiopian couples worldwide." }
  },
  am: {
    nav: { vendors: "አቅራቢዎች", tools: "የእቅድ መሳርያዎች", templates: "ረቂቆች", pricing: "ዋጋ", login: "ይግቡ", getStarted: "ይጀምሩ" },
    hero: { badge: "የሰርግ ረቂቆች", title: "በሚያምር ሁኔታ የተነደፉ ", titleHighlight: "ረቂቆች", subtitle: "ለግብዣዎች በባለሙያዎች በተዘጋጁ ረቂቆች የሰርግ እቅድዎን ይጀምሩ።" },
    footer: { company: "ድርጅት", tools: "የእቅድ መሳርያዎች", vendorsList: "አቅራቢዎች", rights: "መብቱ በህግ የተጠበቀ ነው።", tagline: "በዓለም ዙሪያ ላሉ ኢትዮጵያውያን ጥንዶች #1 የሰርግ እቅድ መድረክ።" }
  }
};

const DEFAULT_DATA = {
  bride: "Alice",
  groom: "Ross",
  date: "2019-11-10",
  time: "5 O'CLOCK",
  location: "At Oask Pioneer Church Spokane St, Portland, OR",
  message: "Save the date",
  imageUrl: null,
  imageSettings: { x: 0, y: 0, scale: 1 } 
};

const formatDateParts = (dateString: string) => {
  const defaultDate = { day: "10", month: "NOV", fullMonth: "NOVEMBER", weekday: "SUNDAY", year: "2019" };
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

// --- 3. BASE UI COMPONENTS ---
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost', size?: 'sm' | 'default' | 'lg' | 'icon' }> = ({ 
  className = "", variant = "default", size = "default", ...props 
}) => {
  const variants = {
    default: "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/40",
    outline: "border-2 border-gray-200 bg-transparent hover:border-rose-200 hover:bg-rose-50 text-gray-900 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200",
  };
  const sizes = { sm: "h-9 px-4 text-sm", default: "h-12 px-6", lg: "h-14 px-8 text-lg", icon: "h-10 w-10 p-0" };
  return <button className={`inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 active:scale-95 ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
};

const FormInput = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <div className="mb-5 animate-fadeIn group">
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 transition-colors group-focus-within:text-rose-600">{label}</label>
    {type === "textarea" ? (
      <textarea value={value} onChange={onChange} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white transition-all text-sm shadow-sm" placeholder={placeholder} />
    ) : (
      <input type={type} value={value} onChange={onChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white transition-all text-sm shadow-sm" placeholder={placeholder} />
    )}
  </div>
);

const Toast = ({ message, onClose }: any) => (
  <div className="fixed bottom-6 right-6 z-[100] bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fadeIn">
    <CheckCircle className="w-5 h-5 text-white" />
    <span className="text-sm font-bold">{message}</span>
    <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1"><X className="w-3 h-3" /></button>
  </div>
);

const StepIndicator = ({ currentStep, totalSteps }: any) => (
  <div className="flex items-center justify-between mb-8 px-2 select-none relative">
    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-100 -z-0 -translate-y-1/2">
      <div className="h-full bg-rose-600 transition-all duration-500 ease-out" style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }} />
    </div>
    {[...Array(totalSteps)].map((_, i) => {
      const stepNum = i + 1;
      const isActive = stepNum === currentStep;
      const isCompleted = stepNum < currentStep;
      return (
        <div key={stepNum} className="flex flex-col items-center relative z-10 bg-white px-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${isActive ? 'bg-rose-600 text-white border-rose-600 scale-110 shadow-lg' : isCompleted ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-200'}`}>
            {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
          </div>
          <span className={`absolute -bottom-6 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-rose-600' : 'text-gray-300'}`}>
            {stepNum === 1 ? 'Design' : stepNum === 2 ? 'Basics' : stepNum === 3 ? 'Details' : stepNum === 4 ? 'Photo' : 'Review'}
          </span>
        </div>
      );
    })}
  </div>
);

// --- 4. TEMPLATE COMPONENTS ---

// Traditional Habesha II (Design 13) - UPDATED
const TraditionalHabeshaTwoTemplate = ({ data, onUpdateImageSettings }: { data: typeof DEFAULT_DATA, onUpdateImageSettings?: (settings: any) => void }) => {
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl;

  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive && activeImage) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...data.imageSettings, x: data.imageSettings.x + dx, y: data.imageSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && activeImage && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, data.imageSettings.scale + delta), 3); onUpdateImageSettings({ ...data.imageSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-[#FFF8E7] ${isInteractive && activeImage ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        {activeImage && (
          <div 
            className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] z-0"
            style={{
              transform: `translate(${data.imageSettings.x}px, ${data.imageSettings.y}px) scale(${data.imageSettings.scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <img src={activeImage} alt="Couple" className="w-full h-full object-cover rounded-tr-[40%]" draggable={false} />
          </div>
        )}
        {!data.imageUrl && isInteractive && (
           <div className="absolute bottom-[10%] left-[10%] z-0 pointer-events-none opacity-50">
             <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Photo Goes Here</div>
           </div>
        )}

        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('https://reflectionplc.com/design%2013.png')`, backgroundSize: '100% 100%' }}></div>
        
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col pt-[28%] px-[15%] text-center">
            {/* Header: "ሰርግ" removed */}
            
            {/* Subheader - Translated & Centered */}
            <p className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] mb-[2cqh] mt-[2cqh]" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>
               ወደ ሰርጋችን በደስታ እንጠራዎታለን
            </p>

            {/* Names - Centered */}
            <div className="mb-[2cqh] w-full flex flex-col items-center justify-center">
               <h2 className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37] leading-tight" style={{ fontSize: 'clamp(2rem, 8cqw, 4rem)' }}>
                 {data.bride || "ሳሮን"}
               </h2>
               <span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] text-xl my-1">እና</span>
               <h2 className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37] leading-tight" style={{ fontSize: 'clamp(2rem, 8cqw, 4rem)' }}>
                 {data.groom || "ቤዛው"}
               </h2>
            </div>
            
            {/* To: Guest Name Placeholder */}
            <div className="w-full text-center mb-[4cqh] mt-[2cqh]">
               <span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] block mb-1" style={{ fontSize: 'clamp(0.9rem, 2.8cqw, 1.4rem)' }}>ለ: ክቡር/ት ___________________</span>
            </div>
              <div className="mb-[4cqh] text-left ">
               <p className="font-['Noto_Serif_Ethiopic'] text-[#5D4037] leading-relaxed" style={{ fontSize: 'clamp(0.7rem, 2.5cqw, 1rem)' }}>{data.message || "የልጆቻችንን ጋብቻ ምክንያት በማድረግ እግዚአብሔርን ለማመስገንና ደስታችንን ለመካፈል..."}</p>
            </div>
            {/* Details - Bottom Right */}
            <div className="absolute bottom-[8%] right-[17%] text-right flex flex-col gap-3 z-30">
                <div className="flex items-center justify-end gap-2">
                   <p className="font-['Montserrat'] text-[#5D4037] font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.date}</p>
                   <p className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>:ቀን</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                   <p className="font-['Montserrat'] text-[#5D4037] font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.time}</p>
                   <p className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>:ሰዓት</p>
                </div>
                <div className="flex flex-col items-end">
                   <p className="font-['Noto_Serif_Ethiopic'] font-bold text-[#D4AF37]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>:ቦታ</p>
                   <p className="font-['Noto_Serif_Ethiopic'] text-[#5D4037] font-bold leading-tight" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.location}</p>
                </div>
            </div>
        </div>
        
        {isInteractive && activeImage && (
          <div className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
             <Move className="w-3 h-3" /> Drag & Scroll to Zoom Photo
          </div>
        )}
    </div>
  );
};

// Traditional Habesha Template (Design 10)
const TraditionalHabeshaTemplate = ({ data, onUpdateImageSettings }: { data: typeof DEFAULT_DATA, onUpdateImageSettings?: (settings: any) => void }) => {
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl;

  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive && activeImage) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...data.imageSettings, x: data.imageSettings.x + dx, y: data.imageSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && activeImage && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, data.imageSettings.scale + delta), 3); onUpdateImageSettings({ ...data.imageSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-[#FFF8E7] ${isInteractive && activeImage ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        {activeImage && (<div className="absolute top-0 left-0 w-full h-full z-0" style={{ transform: `translate(${data.imageSettings.x}px, ${data.imageSettings.y}px) scale(${data.imageSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}><img src={activeImage} alt="Couple" className="w-full h-full object-cover" draggable={false} /></div>)}
        {!data.imageUrl && isInteractive && (<div className="absolute bottom-[15%] right-[10%] z-0 pointer-events-none opacity-50"><div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Add Photo Here</div></div>)}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('https://reflectionplc.com/design%2012.png')`, backgroundSize: '100% 100%' }}></div>
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center pt-[24%] px-[12%] text-center">
            <div className="mb-[3cqh] w-full mt-[5cqh]">
               <h2 className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] leading-relaxed" style={{ fontSize: 'clamp(1.2rem, 5cqw, 2.5rem)' }}>አቶ {data.groom || "ቤዛው ተስፋ"}</h2>
               <p className="font-['Noto_Serif_Ethiopic'] text-[#5D4037] my-1" style={{ fontSize: 'clamp(1rem, 4cqw, 1.5rem)' }}>እና</p>
               <h2 className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] leading-relaxed" style={{ fontSize: 'clamp(1.2rem, 5cqw, 2.5rem)' }}>ወ/ሮ {data.bride || "ሳሮን ተስፋ"}</h2>
            </div>
            <div className="w-full text-left mb-[2cqh] mt-[2cqh] pl-4">
              <span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037] text-2xl">ለ: ክቡር/ት ________________</span>
            </div>
            <div className="mb-[5cqh] text-left">
               <p className="font-['Noto_Serif_Ethiopic'] text-[#5D4037] leading-relaxed" style={{ fontSize: 'clamp(0.7rem, 2.5cqw, 1rem)' }}>{data.message || "የልጆቻችንን ጋብቻ ምክንያት በማድረግ እግዚአብሔርን ለማመስገንና ደስታችንን ለመካፈል..."}</p>
            </div>
            <div className="absolute bottom-[18%] left-[12%] text-left flex flex-col gap-1">
               <div className="flex items-center gap-2">
                 <span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>ቀን:</span>
                 <span className="font-['Noto_Serif_Ethiopic'] text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>{data.date}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>ሰዓት:</span>
                 <span className="font-['Noto_Serif_Ethiopic'] text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>{data.time}</span>
               </div>
               <div className="flex flex-col">
                 <span className="font-['Noto_Serif_Ethiopic'] font-bold text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>ቦታ:</span>
                 <span className="font-['Noto_Serif_Ethiopic'] text-[#5D4037]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.5rem)' }}>{data.location ? data.location.split(',')[0] : "ምኒልክ አዳራሽ"}</span>
               </div>
            </div>
        </div>
        {isInteractive && activeImage && <div className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Zoom</div>}
    </div>
  );
};

const CopperGeometricTemplate = ({ data, onUpdateImageSettings }: any) => {
  const { day, month, year } = formatDateParts(data.date);
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl || "https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop";
  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...data.imageSettings, x: data.imageSettings.x + dx, y: data.imageSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, data.imageSettings.scale + delta), 3); onUpdateImageSettings({ ...data.imageSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-white ${isInteractive ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="absolute top-0 left-0 w-full h-[60%] z-0" style={{ transform: `translate(${data.imageSettings.x}px, ${data.imageSettings.y}px) scale(${data.imageSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}><img src={activeImage} alt="Couple" className="w-full h-full object-cover" draggable={false} /></div>
        {!data.imageUrl && <div className="absolute top-[20%] left-0 w-full flex justify-center z-0 pointer-events-none"><div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Photo</div></div>}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('https://reflectionplc.com/design%209.png')`, backgroundSize: '100% 100%' }}></div>
        <PaperOverlay />
        <div className="absolute top-[50%] left-0 w-full h-[50%] z-20 pointer-events-none flex flex-col items-center justify-center text-center px-6">
            <div className="font-['Great_Vibes'] text-[#D4A373]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>Save the date</div>
            <div className="font-['Montserrat'] text-gray-500 tracking-[0.2em] uppercase mt-2 mb-4" style={{ fontSize: 'clamp(0.5rem, 1.5cqw, 0.7rem)' }}>For the wedding of</div>
            <div className="mb-4 w-full"><h1 className="font-['Cinzel'] font-bold text-[#5D5D5D] leading-none uppercase" style={{ fontSize: 'clamp(2.5rem, 10cqw, 4.5rem)' }}>{data.bride} <span className="text-[#D4A373] font-['Great_Vibes'] text-[0.8em] align-middle mx-1">&</span> {data.groom}</h1></div>
            <div className="flex items-center justify-center gap-3 text-[#5D5D5D] mb-4 font-['Cinzel'] tracking-widest" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.2rem)' }}><span>{month}</span><span className="text-gray-300 mx-1">|</span><span className="text-2xl font-bold">{day}</span><span className="text-gray-300 mx-1">|</span><span>{year}</span></div>
            <div className="font-['Cinzel'] text-gray-500 text-[10px] tracking-widest uppercase mb-4">{data.time || "5 O'CLOCK"}</div>
            <div className="font-['Cinzel'] text-gray-400 text-[10px] uppercase tracking-widest mb-4">To: Guest Name</div>
            <div className="font-['Cinzel'] text-gray-500 text-[10px] uppercase leading-relaxed max-w-[80%]">{data.location}</div>
        </div>
        {isInteractive && <div className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Zoom</div>}
    </div>
  );
};

const GoldenRingsTemplate = ({ data, onUpdateImageSettings }: any) => {
  const { day, fullMonth, year } = formatDateParts(data.date);
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl || "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...data.imageSettings, x: data.imageSettings.x + dx, y: data.imageSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, data.imageSettings.scale + delta), 3); onUpdateImageSettings({ ...data.imageSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-white ${isInteractive ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="absolute top-0 left-0 w-full h-[55%] z-0" style={{ transform: `translate(${data.imageSettings.x}px, ${data.imageSettings.y}px) scale(${data.imageSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}><img src={activeImage} alt="Couple" className="w-full h-full object-cover" draggable={false} /></div>
        {!data.imageUrl && <div className="absolute top-[20%] left-0 w-full flex justify-center z-0 pointer-events-none"><div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Photo</div></div>}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('https://reflectionplc.com/design%208.png')`, backgroundSize: '100% 100%' }}></div>
        <PaperOverlay />
        <div className="absolute top-[48%] left-0 w-full h-[52%] z-20 pointer-events-none flex flex-col items-center justify-center text-center px-8">
            <p className="font-['Montserrat'] text-[#5D4037] text-[10px] tracking-[0.2em] uppercase mb-4 font-bold" style={{ fontSize: 'clamp(0.5rem, 1.5cqw, 0.8rem)' }}>You are invited to the wedding of</p>
            <div className="mb-6 w-full"><h1 className="font-['Great_Vibes'] text-[#D4AF37] leading-none" style={{ fontSize: 'clamp(3rem, 12cqw, 5rem)' }}>{data.bride} <span className="text-[#D4AF37] mx-2">&</span> {data.groom}</h1></div>
            <div className="w-[80%] h-[1px] bg-[#D4AF37] mb-6 opacity-50"></div>
            <div className="flex flex-col items-center gap-1 text-[#D4AF37] font-bold"><div className="flex items-center gap-2" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}><span>{day}th</span><span>•</span><span>{fullMonth}</span><span>•</span><span>{year}</span></div><div className="text-2xl" style={{ fontSize: 'clamp(1.5rem, 4cqw, 2.5rem)' }}>{data.time}</div></div>
            <div className="w-[40%] h-[1px] bg-[#D4AF37] my-6 opacity-50"></div>
            <div className="font-['Montserrat'] text-[#D4AF37] text-xs font-bold uppercase tracking-wide mb-2">To: Guest Name</div>
            <div className="font-['Montserrat'] text-[#D4AF37] text-xs font-bold uppercase tracking-wide" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{data.location}</div>
            <p className="font-['Montserrat'] text-[#5D4037] text-[10px] font-bold mt-2" style={{ fontSize: 'clamp(0.5rem, 1.5cqw, 0.8rem)' }}>Reception to follow</p>
        </div>
        {isInteractive && <div className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Zoom</div>}
    </div>
  );
};

const ClassicPhotoFrameTemplate = ({ data, onUpdateImageSettings }: any) => {
  const { day, month, year } = formatDateParts(data.date);
  const isInteractive = !!onUpdateImageSettings;
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const activeImage = data.imageUrl || "https://images.unsplash.com/photo-1583939003579-730e3918a45a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

  const handleMouseDown = (e: React.MouseEvent) => { if (isInteractive) { setIsDragging(true); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && onUpdateImageSettings) { const dx = e.clientX - startPos.current.x; const dy = e.clientY - startPos.current.y; onUpdateImageSettings({ ...data.imageSettings, x: data.imageSettings.x + dx, y: data.imageSettings.y + dy }); startPos.current = { x: e.clientX, y: e.clientY }; }};
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => { if (isInteractive && onUpdateImageSettings) { const delta = e.deltaY * -0.001; const newScale = Math.min(Math.max(0.5, data.imageSettings.scale + delta), 3); onUpdateImageSettings({ ...data.imageSettings, scale: newScale }); }};

  return (
    <div className={`w-full h-full relative overflow-hidden font-smooth bg-white ${isInteractive ? 'cursor-move' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="absolute top-0 left-0 w-full h-[65%] z-0" style={{ transform: `translate(${data.imageSettings.x}px, ${data.imageSettings.y}px) scale(${data.imageSettings.scale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}><img src={activeImage} alt="Couple" className="w-full h-full object-cover" draggable={false} /></div>
        {!data.imageUrl && <div className="absolute top-[30%] left-0 w-full flex justify-center z-0 pointer-events-none"><div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Photo</div></div>}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundImage: `url('https://reflectionplc.com/design%207.png')`, backgroundSize: '100% 100%' }}></div>
        <PaperOverlay />
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-end pb-[8%] text-center">
            <div className="mb-[2cqh]"><p className="font-['Great_Vibes'] text-[#374151] text-2xl" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>You are invited to</p><p className="font-['Great_Vibes'] text-[#374151] text-xl -mt-2" style={{ fontSize: 'clamp(1.2rem, 4cqw, 2rem)' }}>the wedding of</p></div>
            <div className="mb-[3cqh]"><h1 className="font-['Cinzel'] font-bold text-[#E6A65D] tracking-wide leading-none uppercase" style={{ fontSize: 'clamp(1.8rem, 7cqw, 3.5rem)' }}>{data.bride} <span className="text-slate-400 mx-1">&</span> {data.groom}</h1></div>
            <div className="flex items-center justify-center gap-3 text-[#374151] mb-[1cqh]"><span className="font-['Great_Vibes'] text-2xl" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>{month}</span><div className="h-6 w-[1px] bg-[#E6A65D]"></div><span className="font-['Cinzel'] font-bold text-xl" style={{ fontSize: 'clamp(1.2rem, 4cqw, 2rem)' }}>{day}</span><div className="h-6 w-[1px] bg-[#E6A65D]"></div><span className="font-['Great_Vibes'] text-2xl" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>{year}</span></div>
            <div className="font-['Cinzel'] text-[#374151] text-xs font-bold uppercase mb-1">To: Guest Name</div>
            <div className="font-['Great_Vibes'] text-[#374151]" style={{ fontSize: 'clamp(1.2rem, 4cqw, 2rem)' }}>at seven o'clock</div>
        </div>
        {isInteractive && <div className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"><Move className="w-3 h-3" /> Drag & Zoom</div>}
    </div>
  );
};

const ElegantGoldTemplate = ({ data }: any) => { const { day, fullMonth, weekday, year } = formatDateParts(data.date); return (<div className="w-full h-full relative overflow-hidden font-smooth bg-white"><div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('https://reflectionplc.com/design%201.png')`, backgroundSize: '100% 100%' }}></div><PaperOverlay /><div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-[10%]"><div className="absolute top-[18%] w-full"><p className="font-['Belleza'] uppercase tracking-[0.2em] text-[#4A4A4A]" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>Together with their families</p></div><div className="absolute top-[28%] w-full flex flex-col items-center"><h1 className="font-['Pinyon_Script'] text-[#C5A059] leading-none" style={{ fontSize: 'clamp(3.5rem, 13cqw, 6.5rem)' }}>{data.bride}</h1><span className="font-['Prata'] text-[#4A4A4A] my-[1cqh]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>&</span><h1 className="font-['Pinyon_Script'] text-[#C5A059] leading-none" style={{ fontSize: 'clamp(3.5rem, 13cqw, 6.5rem)' }}>{data.groom}</h1></div><div className="absolute top-[60%] w-full flex flex-col items-center text-[#4A4A4A]"><p className="font-['Belleza'] uppercase tracking-[0.15em] mb-[3cqh] opacity-80" style={{ fontSize: 'clamp(0.5rem, 1.8cqw, 0.8rem)' }}>Request the honor of your presence</p><div className="flex items-center justify-center gap-4 mb-[2cqh] w-full"><span className="font-['Prata'] uppercase tracking-widest" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{fullMonth}</span><span className="h-[2.5cqh] w-[1px] bg-[#C5A059]"></span><span className="font-['Prata'] font-medium" style={{ fontSize: 'clamp(2rem, 5cqw, 3rem)' }}>{day}</span><span className="h-[2.5cqh] w-[1px] bg-[#C5A059]"></span><span className="font-['Prata']" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{year}</span></div><p className="font-['Belleza'] uppercase tracking-[0.1em]" style={{ fontSize: 'clamp(0.7rem, 2.2cqw, 1rem)' }}>{weekday} at {data.time}</p><div className="mt-[4cqh] w-full"><p className="font-['Belleza'] text-xs uppercase tracking-wide opacity-80 mb-1">To: Guest Name</p><p className="font-['Prata'] uppercase tracking-widest mb-1 text-[#333]" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.location.split(',')[0] || "Grand Ballroom"}</p><p className="font-['Belleza'] text-xs uppercase tracking-wide opacity-70" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>{data.location.split(',').slice(1).join(',') || "City, State"}</p></div></div><div className="absolute bottom-[8%] w-full"><p className="font-['Pinyon_Script'] text-[#C5A059]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>Reception to follow</p></div></div></div>); };
const VioletPeonyTemplate = ({ data }: any) => { const { day, month, weekday, year } = formatDateParts(data.date); return (<div className="w-full h-full relative overflow-hidden font-smooth bg-[#FFF0F5]"><div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('https://reflectionplc.com/design%202.png')`, backgroundSize: '100% 100%' }}></div><PaperOverlay /><div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-[10%]"><div className="absolute top-[18%] w-full"><p className="font-['Montserrat'] uppercase tracking-[0.15em] text-[#5D4037] font-medium" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>Together with their families</p></div><div className="absolute top-[30%] w-full flex flex-col items-center"><h1 className="font-['Great_Vibes'] text-[#884A5E] leading-none transform -rotate-2" style={{ fontSize: 'clamp(3rem, 12cqw, 6rem)' }}>{data.bride}</h1><span className="font-['Cormorant_Garamond'] italic text-[#884A5E] my-[0.5cqh]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>&</span><h1 className="font-['Great_Vibes'] text-[#884A5E] leading-none transform -rotate-2" style={{ fontSize: 'clamp(3rem, 12cqw, 6rem)' }}>{data.groom}</h1></div><div className="absolute top-[55%] w-full"><p className="font-['Montserrat'] uppercase tracking-[0.15em] text-[#5D4037] font-medium" style={{ fontSize: 'clamp(0.5rem, 1.8cqw, 0.8rem)' }}>Invite you to join their wedding</p></div><div className="absolute top-[65%] w-full flex items-center justify-center gap-4 text-[#6D4C41]"><span className="font-['Montserrat'] uppercase tracking-widest font-bold w-[30%] text-right" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{weekday}</span><div className="h-[6cqh] w-[1px] bg-[#884A5E]"></div><div className="flex flex-col items-center leading-none text-[#5D4037]"><span className="font-['Cormorant_Garamond'] uppercase tracking-widest font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1rem)' }}>{month}</span><span className="font-['Cormorant_Garamond'] font-bold my-[0.5cqh]" style={{ fontSize: 'clamp(2.5rem, 8cqw, 4rem)' }}>{day}</span><span className="font-['Cormorant_Garamond'] font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1rem)' }}>{year}</span></div><div className="h-[6cqh] w-[1px] bg-[#884A5E]"></div><span className="font-['Montserrat'] uppercase tracking-widest font-bold w-[30%] text-left whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>AT {data.time}</span></div><div className="absolute bottom-[10%] w-full"><div className="font-['Montserrat'] uppercase tracking-[0.1em] text-[#5D4037] mb-2 text-xs">To: Guest Name</div><p className="font-['Montserrat'] uppercase tracking-[0.1em] text-[#5D4037] mb-[2cqh]" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>{data.location}</p><p className="font-['Great_Vibes'] text-[#884A5E]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 3rem)' }}>Reception to follow</p></div></div></div>); };
const PurpleGoldTemplate = ({ data }: any) => { const { day, fullMonth, weekday, year } = formatDateParts(data.date); return (<div className="w-full h-full relative overflow-hidden font-smooth bg-white"><div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('https://reflectionplc.com/design%203.png')`, backgroundSize: '100% 100%' }}></div><PaperOverlay /><div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-[10%]"><div className="absolute top-[15%] w-full"><p className="font-['Nunito'] font-semibold text-[#4A3B52] tracking-wide" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>Please join us to celebrate the<br/>wedding of:</p></div><div className="absolute top-[32%] w-full flex flex-col items-center"><h1 className="font-['Great_Vibes'] text-[#4A3B52] leading-none" style={{ fontSize: 'clamp(2.5rem, 9cqw, 4.5rem)' }}>{data.bride}</h1><span className="font-['Great_Vibes'] text-[#4A3B52] my-[0.5cqh]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>&</span><h1 className="font-['Great_Vibes'] text-[#4A3B52] leading-none" style={{ fontSize: 'clamp(2.5rem, 9cqw, 4.5rem)' }}>{data.groom}</h1></div><div className="absolute top-[60%] w-full flex flex-col items-center"><div className="font-['Nunito'] font-bold text-[#4A3B52] uppercase tracking-[0.2em] mb-[1cqh]" style={{ fontSize: 'clamp(0.7rem, 2.5cqw, 1rem)' }}>{fullMonth}</div><div className="flex items-center justify-center gap-3 w-full max-w-[90%] mb-[1cqh]"><div className="flex-1 border-t-2 border-[#D4AF37] opacity-60"></div><div className="bg-[#D4AF37]/10 px-2 py-1 rounded"><span className="font-['Nunito'] font-bold text-[#4A3B52] uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>{weekday}</span></div><span className="font-['Nunito'] font-bold text-[#6A5ACD] leading-none mx-2" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)' }}>{day}</span><div className="bg-[#D4AF37]/10 px-2 py-1 rounded"><span className="font-['Nunito'] font-bold text-[#4A3B52] uppercase tracking-widest whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>AT {data.time}</span></div><div className="flex-1 border-t-2 border-[#D4AF37] opacity-60"></div></div><div className="font-['Nunito'] font-bold text-[#4A3B52] tracking-[0.2em] mb-[4cqh]" style={{ fontSize: 'clamp(0.8rem, 3cqw, 1.2rem)' }}>{year}</div><div className="font-['Nunito'] font-bold text-[#4A3B52] mb-[2cqh]" style={{ fontSize: 'clamp(0.7rem, 2.5cqw, 1rem)' }}>To: Guest Name<br/>Liceria Grand Ballroom<br/><span className="font-normal text-[#666]">{data.location}</span></div></div></div></div>); };
const GreenGeometricTemplate = ({ data }: any) => { const { day, fullMonth, weekday, year } = formatDateParts(data.date); return (<div className="w-full h-full relative overflow-hidden font-smooth bg-white"><div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('https://reflectionplc.com/design%204.png')`, backgroundSize: '100% 100%' }}></div><PaperOverlay /><div className="absolute top-[8%] w-full text-center z-10 px-8"><p className="font-['Montserrat'] uppercase tracking-[0.2em] text-[#374151]" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)', lineHeight: '1.6' }}>Together<br/>with their families</p></div><div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full text-center flex flex-col items-center justify-center"><h1 className="font-['Alex_Brush'] text-[#B8860B] leading-none" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)' }}>{data.bride}</h1><span className="font-['Montserrat'] text-[#B8860B] my-[0.5cqh]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.5rem)' }}>&</span><h1 className="font-['Alex_Brush'] text-[#B8860B] leading-none" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)' }}>{data.groom}</h1></div><div className="absolute top-[78%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full px-4 flex flex-col items-center justify-center text-center"><p className="font-['Montserrat'] uppercase tracking-[0.15em] text-[#374151] mb-[3cqh]" style={{ fontSize: 'clamp(0.5rem, 1.8cqw, 0.75rem)' }}>Invite you to join their<br/>wedding celebration on</p><div className="flex flex-col items-center w-full text-[#374151]"><span className="font-['Montserrat'] uppercase tracking-[0.2em] mb-[1cqh] font-medium" style={{ fontSize: 'clamp(0.7rem, 2.2cqw, 1rem)' }}>{fullMonth}</span><div className="flex items-center justify-center w-full max-w-[90%] gap-3 mb-[1cqh]"><div className="h-[1px] bg-[#374151] flex-1 opacity-40"></div><span className="font-['Montserrat'] uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>{weekday}</span><span className="font-['Montserrat'] font-medium mx-2" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)', lineHeight: 1 }}>{day}</span><span className="font-['Montserrat'] uppercase tracking-widest whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.9rem)' }}>AT {data.time}</span><div className="h-[1px] bg-[#374151] flex-1 opacity-40"></div></div><span className="font-['Montserrat'] tracking-[0.2em] font-medium" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.1rem)' }}>{year}</span></div><div className="font-['Montserrat'] uppercase tracking-[0.1em] text-[#374151] mt-[3cqh] mb-[3cqh]" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>To: Guest Name<br/>{data.location}</div><p className="font-['Alex_Brush'] text-[#5D4037]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>Reception to follow</p></div></div>); };
const BlueFloralTemplate = ({ data }: any) => { return (<div className="w-full h-full relative overflow-hidden font-smooth bg-[#F0F4F8]"><div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('https://reflectionplc.com/design%205.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div><PaperOverlay /><div className="absolute inset-[8%] z-10 bg-white/90 backdrop-blur-[1px] rounded-t-[50%] rounded-b-lg shadow-sm flex flex-col items-center justify-center text-center p-6 border border-white/50"><div className="mb-[3cqh]"><Flower2 className="w-6 h-6 text-[#7DA0C4] mx-auto mb-2 opacity-80" strokeWidth={1} /><p className="font-['Montserrat'] uppercase tracking-[0.2em] text-[#546E7A] font-medium" style={{ fontSize: 'clamp(0.5rem, 1.8cqw, 0.75rem)' }}>You are invited to<br/>the engagement of</p></div><div className="mb-[2cqh] w-full flex flex-col items-center gap-0"><h1 className="font-['Alex_Brush'] text-[#8D6E63] transform -rotate-3" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)', lineHeight: '0.8' }}>{data.bride}</h1><span className="font-['Alex_Brush'] text-[#7DA0C4] my-1" style={{ fontSize: 'clamp(1.5rem, 4cqw, 2rem)' }}>and</span><h1 className="font-['Alex_Brush'] text-[#8D6E63] transform -rotate-3" style={{ fontSize: 'clamp(3rem, 10cqw, 5rem)', lineHeight: '0.8' }}>{data.groom}</h1></div><div className="mb-[4cqh] mt-2"><p className="font-['Montserrat'] uppercase tracking-[0.2em] text-[#546E7A] mb-2" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)' }}>Date</p><div className="font-['Cinzel'] text-[#455A64] tracking-widest font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5cqw, 1.2rem)' }}>{data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase() : "FEBRUARY 14, 2025"}</div></div><div className="font-['Montserrat'] text-[#546E7A] space-y-1" style={{ fontSize: 'clamp(0.6rem, 2cqw, 0.8rem)', letterSpacing: '0.1em' }}><p>{data.time ? data.time.toUpperCase() : "19.30"} - END</p><p className="max-w-[80%] mx-auto mt-2 leading-relaxed uppercase">To: Guest Name<br/>{data.location || "123 Any Where St., Any City"}</p></div></div></div>); };
const RoyalFloralTemplate = ({ data }: any) => { const { day, fullMonth, weekday } = formatDateParts(data.date); return (<div className="w-full h-full relative overflow-hidden font-smooth bg-[#FCFbf7]"><div className="absolute inset-0 z-0 bg-no-repeat bg-center" style={{ backgroundImage: `url('http://reflectionplc.com/design%206.png')`, backgroundSize: '100% 100%' }}></div><PaperOverlay /><div className="absolute top-[52%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full px-[8%] flex flex-col items-center justify-center text-center"><div className="mb-[2cqh]"><p className="font-['Alex_Brush'] text-[#8B5E3C] leading-none mb-1" style={{ fontSize: 'clamp(1rem, 3.5cqw, 2rem)' }}>Together with</p><p className="font-['Alex_Brush'] text-[#8B5E3C] leading-none" style={{ fontSize: 'clamp(1rem, 3.5cqw, 2rem)' }}>their families</p></div><div className="mb-[2.5cqh] w-full flex flex-col items-center"><h1 className="font-['Parisienne'] text-[#6D4246] leading-none drop-shadow-sm" style={{ fontSize: 'clamp(3rem, 10cqw, 6rem)' }}>{data.bride}</h1><span className="font-['Parisienne'] text-[#C5A059] my-[0.5cqh]" style={{ fontSize: 'clamp(1.5rem, 5cqw, 2.5rem)' }}>&</span><h1 className="font-['Parisienne'] text-[#6D4246] leading-none drop-shadow-sm" style={{ fontSize: 'clamp(3rem, 10cqw, 6rem)' }}>{data.groom}</h1></div><div className="mb-[4cqh] max-w-[85%] mx-auto"><p className="font-['Cormorant_Garamond'] text-[#4A4A4A] italic leading-relaxed" style={{ fontSize: 'clamp(0.8rem, 2.8cqw, 1.4rem)' }}>{data.message}</p></div><div className="w-full flex flex-col items-center mb-[4cqh] text-[#6D4246]"><div className="flex items-center justify-center w-full gap-2 md:gap-4 px-1"><div className="h-[1px] bg-[#C5A059] w-[12%]"></div><span className="font-['Nunito'] font-bold tracking-widest uppercase text-[#8B5E3C] text-right whitespace-nowrap" style={{ fontSize: 'clamp(0.55rem, 1.8cqw, 0.9rem)' }}>{weekday}</span><span className="font-['Playfair_Display'] text-[#6D4246] leading-none mx-2 font-normal" style={{ fontSize: 'clamp(2.5rem, 9cqw, 5rem)' }}>{day}</span><span className="font-['Nunito'] font-bold tracking-widest uppercase text-[#8B5E3C] text-left whitespace-nowrap" style={{ fontSize: 'clamp(0.55rem, 1.8cqw, 0.9rem)' }}>AT {data.time}</span><div className="h-[1px] bg-[#C5A059] w-[12%]"></div></div><div className="font-['Nunito'] tracking-[0.3em] uppercase text-[#4A4A4A] mt-1 font-bold" style={{ fontSize: 'clamp(0.6rem, 2.2cqw, 1.1rem)' }}>{fullMonth}</div></div><div className="mb-[3cqh]"><p className="font-['Cormorant_Garamond'] text-[#4A4A4A]" style={{ fontSize: 'clamp(0.8rem, 2.8cqw, 1.4rem)' }}>To: Guest Name<br/>{data.location}</p></div><p className="font-['Alex_Brush'] text-[#8B5E3C]" style={{ fontSize: 'clamp(1.2rem, 4.5cqw, 2.5rem)' }}>Reception to follow</p></div></div>); };
const ClassicTemplate = ({ data }: any) => { return (<div className="w-full h-full bg-[#FFF8F0] text-[#5D4037] flex flex-col items-center justify-center p-8 border-[clamp(6px,2vw,12px)] border-double border-[#D7C0AE] font-smooth relative overflow-hidden transition-all duration-500"><PaperOverlay /><div className="absolute top-4 left-4 w-[10%] h-[10%] border-t-2 border-l-2 border-[#8B5E3C] opacity-50"></div><div className="absolute top-4 right-4 w-[10%] h-[10%] border-t-2 border-r-2 border-[#8B5E3C] opacity-50"></div><div className="absolute bottom-4 left-4 w-[10%] h-[10%] border-b-2 border-l-2 border-[#8B5E3C] opacity-50"></div><div className="absolute bottom-4 right-4 w-[10%] h-[10%] border-b-2 border-r-2 border-[#8B5E3C] opacity-50"></div><p className="uppercase tracking-[0.2em] mb-8 text-[#8B5E3C] font-['Lato']" style={{ fontSize: 'clamp(0.6rem, 1.5cqw, 0.8rem)' }}>The Wedding Of</p><div className="font-['Playfair_Display'] text-center leading-[1.1]" style={{ fontSize: 'clamp(2rem, 6cqw, 3.5rem)' }}><span className="block">{data.bride || "Bride"}</span><span className="italic text-[#D4A373] my-2 block" style={{ fontSize: '0.6em' }}>&</span><span className="block">{data.groom || "Groom"}</span></div><div className="w-12 h-[1px] bg-[#8B5E3C] my-[4cqh] opacity-40"></div><p className="font-['Lato'] tracking-widest uppercase mb-2" style={{ fontSize: 'clamp(0.7rem, 2cqw, 0.9rem)' }}>{data.date || "Date"} • {data.time || "Time"}</p><p className="font-['Playfair_Display'] italic mb-[4cqh]" style={{ fontSize: 'clamp(1rem, 3cqw, 1.25rem)' }}>{data.location || "Location"}</p><p className="font-['Lato'] text-center max-w-[80%] leading-relaxed opacity-80 tracking-wide mx-auto" style={{ fontSize: 'clamp(0.6rem, 1.8cqw, 0.8rem)' }}>To: Guest Name<br/>{data.message}</p></div>); };
const ModernTemplate = ({ data }: any) => { return (<div className="w-full h-full bg-white text-black flex flex-col relative font-smooth transition-all duration-500 border border-gray-100"><PaperOverlay /><div className="h-2/3 flex flex-col justify-between p-[5%] z-10"><div className="font-['Montserrat'] font-light tracking-[0.3em] uppercase" style={{ fontSize: 'clamp(0.6rem, 1.5cqw, 0.8rem)' }}>Save The Date</div><div className="font-['Montserrat'] font-bold leading-[0.9] -ml-1 break-words" style={{ fontSize: 'clamp(2.5rem, 8cqw, 4.5rem)' }}><div className="uppercase">{data.bride || "Bride"}</div><div className="w-16 h-2 bg-black my-4"></div><div className="uppercase">{data.groom || "Groom"}</div></div></div><div className="absolute top-0 right-0 w-1/2 h-full bg-neutral-100 overflow-hidden hidden md:block">{data.imageUrl ? (<img src={data.imageUrl} alt="Couple" className="w-full h-full object-cover grayscale contrast-125" />) : (<div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-700"><span className="rotate-90 font-black opacity-10 tracking-tighter" style={{ fontSize: 'clamp(4rem, 12cqw, 8rem)' }}>LOVE</span></div>)}</div><div className="bg-black text-white p-[5%] flex flex-col md:flex-row md:items-center justify-between z-20 h-1/3"><div><p className="font-['Montserrat'] font-light mb-1" style={{ fontSize: 'clamp(1.2rem, 3.5cqw, 1.8rem)' }}>{data.date || "Date"}</p><p className="font-['Montserrat'] font-medium text-neutral-400" style={{ fontSize: 'clamp(0.8rem, 2cqw, 1rem)' }}>To: Guest Name<br/>{data.time}</p></div></div></div>); };
const RusticTemplate = ({ data }: any) => { return (<div className="w-full h-full bg-[#Fdfdfd] text-[#4A4A4A] flex flex-col items-center justify-center p-[4%] font-smooth border-[clamp(4px,1vw,8px)] border-[#E8E8E8] transition-all duration-500"><PaperOverlay /><div className="border border-[#4A4A4A] p-2 w-full h-full flex flex-col items-center justify-center relative"><div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[length:20px_20px]"></div><h2 className="font-['Great_Vibes'] mb-2 text-[#6D4C41] transform -rotate-2 text-center" style={{ fontSize: 'clamp(2.5rem, 8cqw, 4.5rem)' }}>{data.bride || "Bride"} & {data.groom || "Groom"}</h2><div className="my-[4cqh] flex items-center gap-4"><div className="h-[1px] w-12 bg-[#9E9E9E]"></div><Heart className="w-4 h-4 text-[#FF7043] fill-current" /><div className="h-[1px] w-12 bg-[#9E9E9E]"></div></div><div className="font-['Cinzel'] font-semibold tracking-[0.15em] mb-1" style={{ fontSize: 'clamp(1rem, 3cqw, 1.25rem)' }}>{data.date || "Date"}</div>{data.imageUrl && (<div className="w-[40%] aspect-[3/4] my-[4cqh] bg-white p-2 shadow-lg transform rotate-2 mx-auto"><img src={data.imageUrl} alt="Couple" className="w-full h-full object-cover sepia-[.3]" /></div>)}<div className="mt-4 font-['Cinzel'] text-center">To: Guest Name</div></div></div>); };
const BotanicalTemplate = ({ data }: any) => { return (<div className="w-full h-full bg-white text-[#2E4F2F] flex flex-col relative font-smooth overflow-hidden transition-all duration-500 border border-green-50"><PaperOverlay /><div className="absolute top-0 left-0 w-[30%] aspect-square bg-[#E8F5E9] rounded-br-[100%] opacity-60"></div><div className="absolute bottom-0 right-0 w-[35%] aspect-square bg-[#C8E6C9] rounded-tl-[100%] opacity-40"></div><div className="z-10 flex flex-col h-full p-[5%] items-center justify-center text-center"><p className="font-['Montserrat'] uppercase tracking-[0.3em] mb-6 text-[#558B2F]" style={{ fontSize: 'clamp(0.6rem, 1.5cqw, 0.8rem)' }}>The Wedding Of</p><div className="relative"><h1 className="font-['Cinzel'] text-[#1B5E20] mb-1" style={{ fontSize: 'clamp(2rem, 6cqw, 3.5rem)' }}>{data.bride || "Bride"}</h1><div className="font-['Great_Vibes'] text-[#81C784] my-2" style={{ fontSize: 'clamp(1.5rem, 4cqw, 2.5rem)' }}>&</div><h1 className="font-['Cinzel'] text-[#1B5E20] mb-8" style={{ fontSize: 'clamp(2rem, 6cqw, 3.5rem)' }}>{data.groom || "Groom"}</h1></div>{data.imageUrl && (<div className="w-[30%] aspect-square rounded-full border-4 border-[#A5D6A7] p-1 mb-8 shadow-sm mx-auto"><div className="w-full h-full rounded-full overflow-hidden"><img src={data.imageUrl} alt="Couple" className="w-full h-full object-cover" /></div></div>)}<div className="mt-4 font-['Montserrat'] text-xs font-bold uppercase tracking-wide">To: Guest Name</div></div></div>); };

const TEMPLATES = [
  { id: "traditional2", name: "Traditional Habesha II", category: "Vintage", component: TraditionalHabeshaTwoTemplate, colors: ["#FFF8E7", "#5D4037", "#8B4513"], font: "Noto Serif Ethiopic", aspectRatio: "5/7", isPhotoTemplate: true },
  { id: "traditional", name: "Traditional Habesha", category: "Vintage", component: TraditionalHabeshaTemplate, colors: ["#FFF8E7", "#5D4037", "#8B4513"], font: "Noto Serif Ethiopic", aspectRatio: "5/7", isPhotoTemplate: true },
  { id: "coppergeo", name: "Copper Geometric", category: "Modern", component: CopperGeometricTemplate, colors: ["#FFFFFF", "#D4A373", "#5D5D5D"], font: "Great Vibes", aspectRatio: "5/7", isPhotoTemplate: true },
  { id: "goldenrings", name: "Golden Rings & Roses", category: "Floral", component: GoldenRingsTemplate, colors: ["#FFFFFF", "#D4AF37", "#5D4037"], font: "Great Vibes", aspectRatio: "1240/1748", isPhotoTemplate: true },
  { id: "classicframe", name: "Classic Frame Photo", category: "Modern", component: ClassicPhotoFrameTemplate, colors: ["#FFFFFF", "#E6A65D", "#374151"], font: "Great Vibes", aspectRatio: "1240/1748", isPhotoTemplate: true },
  { id: "elegantgold", name: "Elegant Gold Script", category: "Classic", component: ElegantGoldTemplate, colors: ["#FFFFFF", "#C5A059", "#4A4A4A"], font: "Pinyon Script", aspectRatio: "5/7" },
  { id: "royal", name: "Royal Floral", category: "Classic", component: RoyalFloralTemplate, colors: ["#FCFbf7", "#682e33", "#D4AF37"], font: "Parisienne", aspectRatio: "1240/1748" },
  { id: "violetpeony", name: "Violet Peony", category: "Floral", component: VioletPeonyTemplate, colors: ["#FFF0F5", "#884A5E", "#5D4037"], font: "Great Vibes", aspectRatio: "5/7" },
  { id: "purplegold", name: "Purple Aesthetic", category: "Modern", component: PurpleGoldTemplate, colors: ["#FFFFFF", "#6A5ACD", "#D4AF37"], font: "Great Vibes", aspectRatio: "5/7" },
  { id: "greengeo", name: "Green Geometric", category: "Floral", component: GreenGeometricTemplate, colors: ["#FFFFFF", "#374151", "#B8860B"], font: "Montserrat", aspectRatio: "5/7" },
  { id: "bluefloral", name: "Blue Watercolor", category: "Floral", component: BlueFloralTemplate, colors: ["#F0F4F8", "#7DA0C4", "#8D6E63"], font: "Alex Brush", aspectRatio: "5/7" },
  { id: "classic", name: "Classic Elegance", category: "Classic", component: ClassicTemplate, colors: ["#FFF8F0", "#8B5E3C", "#D7C0AE", "#000000"], font: "Playfair", aspectRatio: "4/6" },
  { id: "modern", name: "Modern Minimal", category: "Modern", component: ModernTemplate, colors: ["#ffffff", "#000000", "#9CA3AF"], font: "Montserrat", aspectRatio: "4/6" },
  { id: "rustic", name: "Rustic Charm", category: "Rustic", component: RusticTemplate, colors: ["#Fdfdfd", "#6D4C41", "#FF7043", "#E8E8E8"], font: "Great Vibes", aspectRatio: "4/6" },
  { id: "botanical", name: "Botanical Garden", category: "Floral", component: BotanicalTemplate, colors: ["#F1F8E9", "#2E4F2F", "#81C784"], font: "Cinzel", aspectRatio: "4/6" }
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: null },
  { id: 'floral', label: 'Floral', icon: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=100' },
  { id: 'rustic', label: 'Rustic', icon: 'https://images.unsplash.com/photo-1505932794465-147d1f1b2c97?auto=format&fit=crop&q=80&w=100' },
  { id: 'simple', label: 'Simple', icon: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=100' },
  { id: 'classic', label: 'Classic', icon: 'https://images.unsplash.com/photo-1519225421980-715cb0202128?auto=format&fit=crop&q=80&w=100' },
  { id: 'vintage', label: 'Vintage', icon: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&q=80&w=100' },
  { id: 'modern', label: 'Modern', icon: 'https://images.unsplash.com/photo-1606103836293-c811d0d97746?auto=format&fit=crop&q=80&w=100' },
];

const ProductCard = ({ template, onSelect }: any) => {
  const Component = template.component;
  const dummyData = { bride: "Alice", groom: "James", date: "DEC 29", time: "4PM", location: "Grand Hall", message: "Join Us", imageUrl: null, imageSettings: {x:0, y:0, scale:1} };
  return (
    <div className="group flex flex-col cursor-pointer" onClick={() => onSelect(template.id)}>
      <div className="relative bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 mb-3" style={{ aspectRatio: template.aspectRatio || '5/7' }}>
        <div className="absolute top-3 right-3 z-20 bg-white/80 p-2 rounded-full hover:bg-white transition-colors cursor-pointer backdrop-blur-sm">
          <Heart className="w-4 h-4 text-gray-400 hover:text-rose-500 hover:fill-current transition-colors" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-white" style={{ containerType: 'size' }}>
           <div className="w-full h-full transform scale-85 origin-center">
             <Component data={dummyData} />
           </div>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10" />
      </div>
      <div className="px-1">
        <h3 className="font-bold text-gray-900 text-sm truncate">{template.name}</h3>
        <p className="text-xs text-gray-500 mb-2">{template.category} Collection</p>
        <div className="flex items-center justify-between">
           <div className="flex -space-x-1">
             {template.colors.slice(0, 4).map((c: string, i: number) => (
               <div key={i} className="w-4 h-4 rounded-full border border-white ring-1 ring-gray-100 shadow-sm" style={{ backgroundColor: c }} />
             ))}
           </div>
           <button className="text-xs font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block hover:underline">Customize</button>
        </div>
      </div>
    </div>
  );
};

// --- LAYOUT COMPONENT ---
interface LayoutProps {
    children: React.ReactNode;
    lang: 'en' | 'am';
    setLang: (lang: 'en' | 'am') => void;
    user: any;
    logout: any;
}

const Layout: React.FC<LayoutProps> = ({ children, lang, setLang, user, logout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const t = translations[lang];

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLang = () => {
    setLang(lang === 'en' ? 'am' : 'en');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    
    switch (user.user_type) {
      case 'COUPLE':
        return '/dashboard';
      case 'VENDOR':
        return '/Vendor/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-white dark:bg-gray-950 dark:text-white transition-colors duration-300 selection:bg-rose-100 selection:text-rose-900 overflow-x-hidden">
      <FontStyles />
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-sm' : 'bg-transparent border-transparent'}`}>
         <div className="container mx-auto px-4 h-20 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform duration-300">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white font-menbere">
                Wed<span className="text-rose-600">Habesha</span>
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
               <Link to="/vendors" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   {t.nav.vendors}
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </Link>
               
               <Link to="/templates" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   Templates
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </Link>
               
               <Link to="/pricing" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   {t.nav.pricing}
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </Link>
               
               {user && (
                 <Link to={getDashboardLink()} className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                     {t.nav.tools}
                     <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
                 </Link>
               )}
               
               <a href="#testimonials" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   Real Weddings
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </a>
            </div>

            {/* Auth Buttons & Lang Toggle */}
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={toggleLang}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center gap-2 font-medium"
              >
                <Globe className="w-4 h-4" />
                <span>{lang === 'en' ? 'አማ' : 'EN'}</span>
              </button>
              
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-3 pl-3 pr-2 py-1.5 rounded-full transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-rose-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center shadow-md">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left hidden xl:block mr-2">
                      <p className="text-xs font-bold">{user.email?.split('@')[0]}</p>
                    </div>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-3 w-60 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl py-2 z-50 border border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{user.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.user_type?.toLowerCase()}</p>
                      </div>
                      <Link
                        to={getDashboardLink()}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3 text-gray-400 group-hover:text-rose-500 transition-colors" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="font-bold hover:text-rose-600">{t.nav.login}</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="rounded-full px-6 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-none border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                      {t.nav.getStarted}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
         </div>

         {/* Mobile Menu Dropdown */}
         {isMenuOpen && (
           <div className="md:hidden absolute top-20 left-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-5">
              <Link to="/vendors" className="py-3 px-4 hover:bg-rose-50 dark:hover:bg-gray-800 rounded-xl font-medium text-lg flex justify-between items-center" onClick={() => setIsMenuOpen(false)}>
                {t.nav.vendors} <ChevronRight className="w-5 h-5 text-gray-400"/>
              </Link>
              
              <Link to="/templates" className="py-3 px-4 hover:bg-rose-50 dark:hover:bg-gray-800 rounded-xl font-medium text-lg flex justify-between items-center" onClick={() => setIsMenuOpen(false)}>
                Templates <ChevronRight className="w-5 h-5 text-gray-400"/>
              </Link>
              
              <Link to="/pricing" className="py-3 px-4 hover:bg-rose-50 dark:hover:bg-gray-800 rounded-xl font-medium text-lg flex justify-between items-center" onClick={() => setIsMenuOpen(false)}>
                {t.nav.pricing} <ChevronRight className="w-5 h-5 text-gray-400"/>
              </Link>
              
              {user && (
                <Link to={getDashboardLink()} className="py-3 px-4 hover:bg-rose-50 dark:hover:bg-gray-800 rounded-xl font-medium text-lg flex justify-between items-center" onClick={() => setIsMenuOpen(false)}>
                  {t.nav.tools} <ChevronRight className="w-5 h-5 text-gray-400"/>
                </Link>
              )}
              
              <div className="py-2 px-4 flex justify-between items-center">
                 <span className="text-gray-600 dark:text-gray-300">Language / ቋንቋ</span>
                 <button 
                    onClick={toggleLang}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center gap-2 font-bold"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{lang === 'en' ? 'English' : 'አማርኛ'}</span>
                  </button>
              </div>
              <div className="py-2 px-4 flex justify-between items-center">
                 <span className="text-gray-600 dark:text-gray-300">Theme / ገጽታ</span>
                 <button 
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center gap-2 font-bold"
                    aria-label="Toggle dark mode"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>{isDarkMode ? (lang === 'en' ? 'Light' : 'ብሩህ') : (lang === 'en' ? 'Dark' : 'ጨለማ')}</span>
                  </button>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800 my-2"></div>
              
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center px-4 py-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center mr-3 shadow-md">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user.user_type?.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">{t.nav.login}</Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full justify-center">{t.nav.getStarted}</Button>
                  </Link>
                </div>
              )}
           </div>
         )}
      </nav>

      <main className="flex-grow">{children}</main>

      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-20 pb-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white fill-current" />
                </div>
                <span className="font-bold text-xl font-menbere">WedHabesha</span>
              </Link>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                {t.footer.tagline}
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-blue-600 hover:text-blue-600 transition-all cursor-pointer shadow-sm group">
                  <Facebook className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 transition-colors" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-pink-600 hover:text-pink-600 transition-all cursor-pointer shadow-sm group">
                  <Instagram className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-pink-600 transition-colors" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all cursor-pointer shadow-sm group">
                  <Linkedin className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-700 transition-colors" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.company}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-sm">
                <li><Link to="/about" className="hover:text-rose-600 transition-colors">About Us</Link></li>
                <li><a href="#" className="hover:text-rose-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-rose-600 transition-colors">Press & Media</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.tools}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-sm">
                <li><Link to="/templates" className="hover:text-rose-600 transition-colors">Templates</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Wedding Checklist</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Guest List Manager</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Budget Calculator</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.vendorsList}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-sm">
                <li><Link to="/login" className="hover:text-rose-600 transition-colors">Vendor Login</Link></li>
                <li><Link to="/vendors" className="hover:text-rose-600 transition-colors">List Your Business</Link></li>
                <li><a href="#testimonials" className="hover:text-rose-600 transition-colors">Real Wedding Submissions</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <p>© {new Date().getFullYear()} WedHabesha. {t.footer.rights}</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</Link>
              <Link to="/sitemap" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- INVITATION BUILDER COMPONENT ---
const InvitationBuilder: React.FC = () => {
  const [activeTemplateId, setActiveTemplateId] = useState("traditional2");
  const [formData, setFormData] = useState(DEFAULT_DATA);
  const [currentStep, setCurrentStep] = useState(1);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const totalSteps = 5;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleInputChange('imageUrl', reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handler for image positioning updates
  const handleUpdateImageSettings = (newSettings: any) => {
    handleInputChange('imageSettings', newSettings);
  };

  const nextStep = () => { if (currentStep < totalSteps) setCurrentStep(curr => curr + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(curr => curr - 1); };
  const handleTemplateSelect = (id: string) => { setActiveTemplateId(id); nextStep(); };
  const handleSave = () => showToast("Design saved to your library!");

  const activeTemplate = TEMPLATES.find(t => t.id === activeTemplateId);
  
  // Dynamic Component Selection
  let ActiveComponent: any = ElegantGoldTemplate;
  if (activeTemplate?.component) {
    ActiveComponent = activeTemplate.component;
  }

  // Render Marketplace Mode
  if (currentStep === 1) {
    return (
      <div className="w-full">
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
        
        {/* Marketplace Sub-Header (Categories) */}
        <div className="border-b border-gray-100 bg-white sticky top-20 z-40 shadow-sm">
           <div className="container mx-auto px-4 overflow-x-auto no-scrollbar py-4">
              <div className="flex gap-6 md:gap-8 min-w-max justify-start">
                <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setSelectedCategory('all')}>
                   <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold transition-all ${selectedCategory === 'all' ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-500 ring-offset-2 scale-105' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>New</div>
                   <span className={`text-xs font-medium ${selectedCategory === 'all' ? 'text-black' : 'text-gray-500'}`}>New Collection</span>
                </div>
                {CATEGORIES.slice(1).map(cat => (
                   <div key={cat.id} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setSelectedCategory(cat.id)}>
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${selectedCategory === cat.id ? 'border-rose-500 ring-2 ring-rose-500 ring-offset-2 scale-105' : 'border-transparent group-hover:border-gray-300'}`}>
                         {cat.icon && <img src={cat.icon} alt={cat.label} className="w-full h-full object-cover transition-transform group-hover:scale-110" />}
                      </div>
                      <span className={`text-xs font-medium ${selectedCategory === cat.id ? 'text-black' : 'text-gray-500'}`}>{cat.label}</span>
                   </div>
                ))}
              </div>
           </div>
        </div>

        <div className="container mx-auto px-4 py-8 flex gap-8">
            <aside className="w-64 hidden lg:block shrink-0 space-y-8 sticky top-48 h-fit">
               <div>
                  <h3 className="font-bold text-sm mb-4 flex items-center justify-between text-slate-900">Format <ChevronLeft className="w-4 h-4 rotate-90" /></h3>
                  <div className="space-y-3">
                     <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer hover:text-black group">
                        <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-600 w-4 h-4" />
                        <span className="group-hover:translate-x-1 transition-transform">Standard</span>
                     </label>
                     <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer hover:text-black group">
                        <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-600 w-4 h-4" />
                        <span className="group-hover:translate-x-1 transition-transform">All-in-One</span>
                     </label>
                  </div>
               </div>
            </aside>

            <div className="flex-1">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <h2 className="text-xl md:text-2xl font-bold font-serif text-gray-900">Wedding Invitations <span className="text-gray-400 font-sans font-normal text-sm ml-2 align-middle">{TEMPLATES.length} designs</span></h2>
                  <button className="flex items-center gap-2 text-sm font-bold border border-gray-300 px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center text-gray-700">
                    Sort: Featured <ChevronLeft className="w-4 h-4 -rotate-90" />
                  </button>
               </div>
               <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                  {TEMPLATES.filter(t => selectedCategory === 'all' || t.category.toLowerCase().includes(selectedCategory.toLowerCase()) || (selectedCategory === 'floral' && t.category === 'Floral')).map(t => (
                    <ProductCard key={t.id} template={t} onSelect={handleTemplateSelect} />
                  ))}
               </div>
            </div>
        </div>
      </div>
    );
  }

  // Render Wizard Mode (Fullscreen)
  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col font-sans text-slate-800 overflow-hidden z-[100]">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row justify-between items-center z-50 shadow-sm shrink-0 gap-3 md:gap-0">
        {/* Top Row on Mobile: Back Button + Edit/Preview Toggle */}
        <div className="w-full md:w-auto flex justify-between items-center md:justify-start">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setCurrentStep(1)}>
            <ChevronLeft className="w-5 h-5 text-gray-500" />
            <span className="font-bold text-gray-700 text-sm md:text-base">Back</span>
          </div>
          
          {/* Edit/Preview Toggle - Prominent on Mobile */}
          <div className="flex bg-gray-100 rounded-lg p-1 md:hidden">
            <button 
              onClick={() => setIsMobilePreviewOpen(false)} 
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!isMobilePreviewOpen ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Edit3 className="w-3.5 h-3.5 inline-block mr-1" />
              Edit
            </button>
            <button 
              onClick={() => setIsMobilePreviewOpen(true)} 
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${isMobilePreviewOpen ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Eye className="w-3.5 h-3.5 inline-block mr-1" />
              Preview
            </button>
          </div>
        </div>

        {/* Center: Template Name (Hidden on Mobile) */}
        <div className="text-sm font-medium text-gray-500 hidden md:block">
           Customizing: <span className="text-rose-600 font-bold ml-1">{activeTemplate?.name}</span>
        </div>
        
        {/* Right: Action Buttons */}
        <div className="w-full md:w-auto flex gap-2 md:gap-3">
             <button className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block" onClick={() => setCurrentStep(1)}>Cancel</button>
             <button onClick={handleSave} className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-full text-xs font-bold tracking-wider whitespace-nowrap shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
               <Download className="w-3.5 h-3.5 inline-block mr-1.5" />
               Save Design
             </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <aside className={`w-full md:w-[480px] bg-white border-r border-gray-200 flex flex-col z-20 shadow-2xl md:shadow-none absolute inset-0 md:relative transition-transform duration-300 ease-in-out ${isMobilePreviewOpen ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
          <div className="px-6 md:px-8 pt-8 pb-6">
             <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          </div>

          <div className="flex-1 px-6 md:px-8 overflow-y-auto">
            {currentStep === 2 && (
              <div className="animate-fadeIn pb-24 md:pb-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 font-serif">The Happy Couple</h3>
                <p className="text-sm text-gray-500 mb-8">Who is tying the knot? This will appear prominently.</p>
                <div className="grid grid-cols-1 gap-6">
                  <FormInput label="Bride Name" value={formData.bride} onChange={(e: any) => handleInputChange('bride', e.target.value)} placeholder="e.g. Sara" />
                  <FormInput label="Groom Name" value={formData.groom} onChange={(e: any) => handleInputChange('groom', e.target.value)} placeholder="e.g. Nahom" />
                </div>
                <div className="mt-8 border-t border-gray-100 pt-8">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Date & Time</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <FormInput type="date" label="Date" value={formData.date} onChange={(e: any) => handleInputChange('date', e.target.value)} />
                     <FormInput type="text" label="Time" value={formData.time} onChange={(e: any) => handleInputChange('time', e.target.value)} placeholder="e.g. 10:00 AM" />
                   </div>
                </div>
              </div>
            )}
            {currentStep === 3 && (
              <div className="animate-fadeIn pb-24 md:pb-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 font-serif">Venue & Details</h3>
                <p className="text-sm text-gray-500 mb-8">Let your guests know where the magic happens.</p>
                <FormInput label="Venue / Location" value={formData.location} onChange={(e: any) => handleInputChange('location', e.target.value)} placeholder="e.g. Skylight Hotel, Addis Ababa" />
                <FormInput type="textarea" label="Welcome Message" value={formData.message} onChange={(e: any) => handleInputChange('message', e.target.value)} placeholder="Request the pleasure of your company..." />
              </div>
            )}
            {currentStep === 4 && (
              <div className="animate-fadeIn pb-24 md:pb-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 font-serif">Add a Photo</h3>
                <p className="text-sm text-gray-500 mb-8">Personalize it with a beautiful shot.</p>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-rose-50 hover:border-rose-300 transition-all text-center group cursor-pointer relative">
                   <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleImageUpload} />
                   {formData.imageUrl ? (
                     <div className="relative w-full">
                        <img src={formData.imageUrl} alt="Preview" className="w-40 h-40 object-cover rounded-xl mx-auto shadow-lg mb-4 transform group-hover:scale-105 transition-transform" />
                        <span className="text-rose-600 text-sm font-bold bg-white px-3 py-1 rounded-full shadow-sm">Click to Change</span>
                     </div>
                   ) : (
                     <>
                        <div className="w-16 h-16 bg-white text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform"><ImageIcon className="w-8 h-8" /></div>
                        <span className="text-gray-900 font-bold text-lg">Click to upload</span>
                        <span className="text-xs text-gray-400 mt-2">JPG, PNG up to 5MB</span>
                     </>
                   )}
                </div>
                {/* Helper text for drag templates */}
                {(activeTemplate?.id === 'classicframe' || activeTemplate?.id === 'goldenrings' || activeTemplate?.id === 'coppergeo' || activeTemplate?.id === 'traditional2') && (
                  <p className="text-xs text-rose-600 mt-4 text-center font-medium bg-rose-50 py-2 rounded-lg">
                    <Move className="w-3 h-3 inline-block mr-1" />
                    You can drag and resize your photo in the preview!
                  </p>
                )}
              </div>
            )}
            {currentStep === 5 && (
              <div className="animate-fadeIn text-center py-10 pb-24 md:pb-0">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-pulse"><Check className="w-12 h-12" /></div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3 font-serif">Almost There!</h3>
                <p className="text-gray-500 mb-10 max-w-xs mx-auto">Sign up to download your high-resolution invitation or create a matching RSVP website.</p>
                <div className="space-y-4 max-w-xs mx-auto">
                  <button onClick={() => showToast("Redirecting to Sign Up...")} className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                    <Download className="w-5 h-5" /> Sign Up to Download
                  </button>
                  <button onClick={() => showToast("Creating RSVP Site...")} className="w-full py-4 bg-white border-2 border-rose-100 text-rose-600 rounded-xl font-bold hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center justify-center gap-3">
                    <CalendarCheck className="w-5 h-5" /> Create RSVP Website
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center absolute bottom-0 w-full md:relative z-20">
            <button onClick={prevStep} disabled={currentStep === 1} className={`flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-full transition-colors ${currentStep === 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}>
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {currentStep < totalSteps && (
              <button onClick={nextStep} className="flex items-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>

        <section className={`flex-1 bg-gray-100/50 relative flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-y-auto absolute inset-0 md:relative transition-transform duration-300 ease-in-out ${isMobilePreviewOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          <div className="flex flex-col items-center justify-center w-full h-full pb-24 md:pb-0">
            <div className="relative w-full min-w-[280px] max-w-[85vw] sm:max-w-[360px] md:max-w-[400px] lg:max-w-[450px] xl:max-w-[500px] bg-white shadow-2xl shadow-slate-400/20 rounded-sm overflow-hidden transition-all duration-300" style={{ aspectRatio: activeTemplate?.aspectRatio || '5/7', containerType: 'size' }}>
              <ActiveComponent data={formData} onUpdateImageSettings={activeTemplate?.isPhotoTemplate ? handleUpdateImageSettings : undefined} />
            </div>
            <p className="mt-4 md:mt-6 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Live Preview</p>
          </div>
        </section>
      </main>
    </div>
  );
};

// --- MAIN TEMPLATES PAGE CONTENT ---
const TemplatesPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];

  return (
    <Layout lang={lang} setLang={setLang} user={null} logout={() => {}}>
      <div className="bg-slate-50 dark:bg-gray-950 min-h-screen pb-20">
        
        {/* Hero */}
        <section className="relative bg-white dark:bg-gray-900 pt-20 pb-20 border-b border-gray-200 dark:border-gray-800">
           {/* Subtle Background Elements */}
           <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-rose-100/40 dark:bg-rose-900/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-amber-100/40 dark:bg-amber-900/10 rounded-full blur-[100px] translate-y-1/4 -translate-x-1/4 pointer-events-none"></div>
           
           <div className="container mx-auto px-4 text-center max-w-4xl relative z-10">
              <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-6 border border-rose-100 dark:border-rose-800">
                <LayoutIcon className="w-3.5 h-3.5" /> {t.hero.badge}
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 font-menbere leading-tight">
                {t.hero.title}<span className="text-rose-600">{t.hero.titleHighlight}</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto font-light">
                {t.hero.subtitle}
              </p>
           </div>
        </section>

        <InvitationBuilder />
      </div>
    </Layout>
  );
};

// --- ROUTER WRAPPER ---


export default TemplatesPage;