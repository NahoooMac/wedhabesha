import React, { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {  useNavigate, useLocation } from 'react-router-dom';
import { 
  Map, 
  Home, 
  Users, 
  Briefcase, 
  FileText, 
  Shield, 
  Scale, 
  Heart, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Facebook, 
  Instagram, 
  Linkedin,
  Globe,
  Compass,
  ArrowRight,
  GitBranch,
  Circle,
  Database,
  Layout as LayoutIcon,
  Server,  
  Store, 
  Calculator, 
  CheckCircle, 
  Star, 
  MapPin,
  PlayCircle,
  Sparkles,
  ShieldCheck,
  Camera,
  Utensils,
  Music,
  Flower2,
  Car,
  Palette,
  Calendar,
  CheckSquare,
  Search,
  Clock,
  ChevronRight,
  User,
  LogOut,
  Quote,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

// --- MOCK AUTH HOOK ---
// const useAuth = () => {
//   const [user, setUser] = useState<{email: string, user_type: string} | null>(null);
  
//   const logout = async () => {
//     setUser(null);
//     console.log("Logged out");
//   };

//   return { user, logout };
// };

// --- CUSTOM STYLES & ANIMATIONS ---
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@400;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,800;1,400&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
    }

    .font-menbere {
      font-family: 'Menbere', 'Noto Serif Ethiopic', serif;
    }

    /* --- SEQUENCED ENTRANCE ANIMATIONS --- */

    /* 1. Nodes Scale In */
    @keyframes scale-fade-in {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-node-enter {
      opacity: 0; /* Start hidden */
      animation: scale-fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* 2. Vertical Line Draw (Top to Bottom) */
    @keyframes draw-line-v {
      from { height: 0; opacity: 0.5; }
      to { height: 100%; opacity: 1; }
    }
    .animate-line-v {
      height: 0; /* Start hidden */
      animation: draw-line-v 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    /* 3. Horizontal Line Draw (Center to Edges) */
    @keyframes draw-line-h {
      from { transform: scaleX(0); opacity: 0.5; }
      to { transform: scaleX(1); opacity: 1; }
    }
    .animate-line-h {
      transform: scaleX(0); /* Start hidden */
      animation: draw-line-h 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    /* --- ACTIVE SYSTEM PULSE (THE GLOW) --- */

    /* Pulse travelling down vertical lines */
    @keyframes flow-vertical {
      0% { top: -50%; opacity: 0; }
      20% { opacity: 1; }
      50% { opacity: 0; }
      100% { top: 150%; opacity: 0; }
    }
    .flow-v {
      position: absolute;
      left: 0; 
      right: 0;
      height: 60px;
      background: linear-gradient(to bottom, transparent, var(--glow-color, rgba(59, 130, 246, 0.5)), transparent);
      opacity: 0;
      animation: flow-vertical 4s ease-in-out infinite;
    }

    /* Pulse travelling across horizontal lines */
    @keyframes flow-horizontal {
      0% { left: 0%; opacity: 0; transform: translateX(-100%); }
      20% { opacity: 1; }
      80% { opacity: 0; }
      100% { left: 100%; opacity: 0; transform: translateX(0); }
    }
    /* We use distinct animations for left and right branches */
    @keyframes flow-horizontal-right {
      0% { left: 50%; opacity: 0; width: 0; }
      20% { opacity: 1; width: 100px; }
      100% { left: 100%; opacity: 0; width: 20px; }
    }
    
    .flow-h {
      position: absolute;
      top: 0; bottom: 0;
      width: 100px;
      background: linear-gradient(to right, transparent, var(--glow-color, rgba(59, 130, 246, 0.5)), transparent);
      opacity: 0;
      animation: flow-horizontal 5s ease-in-out infinite;
    }

    /* --- DELAY UTILITIES --- */
    .delay-0 { animation-delay: 0s; }
    .delay-100 { animation-delay: 0.1s; }
    .delay-200 { animation-delay: 0.2s; }
    .delay-300 { animation-delay: 0.3s; }
    .delay-400 { animation-delay: 0.4s; }
    .delay-500 { animation-delay: 0.5s; }
    .delay-700 { animation-delay: 0.7s; }
    .delay-1000 { animation-delay: 1s; }
    .delay-1200 { animation-delay: 1.2s; }
    .delay-1500 { animation-delay: 1.5s; }
    .delay-2000 { animation-delay: 2s; } /* Flow starts after drawing */

  `}</style>
);

// --- TRANSLATIONS ---
const translations = {
  en: {
    nav: {
      vendors: "Vendors",
      tools: "Planning Tools",
      pricing: "Pricing",
      login: "Log In",
      getStarted: "Get Started",
      signout: "Sign Out",
      realWeddings: "Real Weddings"
    },
    hero: {
      badge: "System Map",
      title: "Platform ",
      titleHighlight: "Architecture",
      subtitle: "A living visualization of the WedHabesha ecosystem. Explore our interconnected services and resources."
    },
    sections: {
      main: "Core Experience",
      user: "User Portal",
      company: "Organization",
      legal: "Compliance"
    },
    links: {
      home: "Platform Home",
      about: "About Mission",
      vendors: "Vendor Directory",
      pricing: "Subscription Plans",
      login: "Authentication",
      register: "Account Creation",
      dashboard: "User Dashboard",
      vendorDashboard: "Vendor Portal",
      careers: "Join the Team",
      press: "Media Kit",
      privacy: "Data Privacy",
      terms: "Terms of Use"
    },
    footer: {
      company: "Company",
      tools: "Planning Tools",
      vendorsList: "Vendors",
      rights: "All rights reserved.",
      tagline: "Intelligently connecting couples with their perfect wedding."
    }
  },
  am: {
    nav: {
      vendors: "አቅራቢዎች",
      tools: "የእቅድ መሳርያዎች",
      pricing: "ዋጋ",
      login: "ይግቡ",
      getStarted: "ይጀምሩ",
      signout: "ውጣ",
      realWeddings: "እውነተኛ ሰርጎች"
    },
    hero: {
      badge: "የስርዓት ካርታ",
      title: "የመድረክ ",
      titleHighlight: "መዋቅር",
      subtitle: "የWedHabesha ሥነ-ምህዳር ሕያው እይታ። እርስ በርስ የተያያዙ አገልግሎቶቻችንን እና ግብዓቶቻችንን ያስሱ።"
    },
    sections: {
      main: "ዋና ተሞክሮ",
      user: "የተጠቃሚ መግቢያ",
      company: "ድርጅት",
      legal: "ህጋዊነት"
    },
    links: {
      home: "የመድረክ መነሻ",
      about: "ስለ ተልዕኮ",
      vendors: "የአቅራቢዎች ዝርዝር",
      pricing: "የደንበኝነት ምዝገባ",
      login: "ማረጋገጫ",
      register: "መለያ መፍጠር",
      dashboard: "የተጠቃሚ ዳሽቦርድ",
      vendorDashboard: "የአቅራቢ መግቢያ",
      careers: "ቡድኑን ይቀላቀሉ",
      press: "ሚዲያ ኪት",
      privacy: "የውሂብ ግላዊነት",
      terms: "የአጠቃቀም ውል"
    },
    footer: {
      company: "ድርጅት",
      tools: "የእቅድ መሳርያዎች",
      vendorsList: "አቅራቢዎች",
      rights: "መብቱ በህግ የተጠበቀ ነው።",
      tagline: "ጥንዶችን ከፍጹም ሰርጋቸው ጋር በብልህነት ማገናኘት።"
    }
  }
};

// --- UI COMPONENTS ---
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost', size?: 'sm' | 'default' | 'lg' }> = ({ 
  className = "", 
  variant = "default", 
  size = "default", 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  const variants = {
    default: "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/40",
    outline: "border-2 border-gray-200 bg-transparent hover:border-rose-200 hover:bg-rose-50 text-gray-900 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300",
  };
  const sizes = {
    sm: "h-9 px-4 text-sm",
    default: "h-12 px-6",
    lg: "h-14 px-8 text-lg",
  };
  return <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
};

// --- LAYOUT ---
interface LayoutProps {
    children: React.ReactNode;
    lang: 'en' | 'am';
    setLang: (lang: 'en' | 'am') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, lang, setLang }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const t = translations[lang];

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const toggleLang = () => {
    setLang(lang === 'en' ? 'am' : 'en');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    return user.user_type?.toLowerCase() === 'vendor' ? '/vendor/dashboard' : '/dashboard';
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-white dark:bg-gray-950 dark:text-white transition-colors duration-300 selection:bg-rose-100 selection:text-rose-900">
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
                   {t.nav.realWeddings}
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
                <span>{lang === 'en' ? 'አማ' :'EN'  }</span>
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

      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
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
                  <li><Link to="/careers" className="hover:text-rose-600 transition-colors">Careers</Link></li>
                                <li><Link to="/press" className="hover:text-rose-600 transition-colors">Press & Media</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.tools}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-sm">
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
             <Link to="/sitemap" className="hover:text-gray-900 dark:hover:text-white">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- SITEMAP VISUALIZER COMPONENT ---
const SitemapPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];

  // Structure definitions with specific colors for the "lights"
  const siteStructure = [
    {
      title: t.sections.main,
      icon: Home,
      color: "blue",
      glowColor: "#3b82f6", // Blue
      links: [
        { name: t.links.home, path: "/" },
        { name: t.links.about, path: "/about" },
        { name: t.links.vendors, path: "/vendors" },
        { name: t.links.pricing, path: "/pricing" }
      ]
    },
    {
      title: t.sections.user,
      icon: Users,
      color: "rose",
      glowColor: "#e11d48", // Rose
      links: [
        { name: t.links.login, path: "/login" },
        { name: t.links.register, path: "/register" },
        { name: t.links.dashboard, path: "/dashboard" },
        { name: t.links.vendorDashboard, path: "/vendor/dashboard" }
      ]
    },
    {
      title: t.sections.company,
      icon: Briefcase,
      color: "purple",
      glowColor: "#9333ea", // Purple
      links: [
        { name: t.links.careers, path: "/careers" },
        { name: t.links.press, path: "/press" }
      ]
    },
    {
      title: t.sections.legal,
      icon: Scale,
      color: "emerald",
      glowColor: "#10b981", // Emerald
      links: [
        { name: t.links.privacy, path: "/privacy" },
        { name: t.links.terms, path: "/terms" }
      ]
    }
  ];

  return (
    <Layout lang={lang} setLang={setLang}>
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        
        {/* Header Section */}
        <section className="relative py-20 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div className="container mx-auto px-4 relative z-10 text-center animate-node-enter delay-0">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 mb-6 shadow-sm">
              <Compass className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t.hero.badge}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 font-menbere">
              {t.hero.title}<span className="text-rose-600">{t.hero.titleHighlight}</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-2xl mx-auto">
              {t.hero.subtitle}
            </p>
          </div>
        </section>
        
        {/* VISUALIZATION AREA */}
        <div className="py-20 relative overflow-hidden">
           
           <div className="container mx-auto px-4">
              
              {/* STEP 1: ROOT NODE */}
              <div className="flex justify-center mb-16 relative z-20">
                 {/* The Box */}
                 <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-4 md:px-8 md:py-5 flex items-center gap-4 animate-node-enter delay-200 relative z-20">
                    <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600">
                       <GitBranch className="w-6 h-6" />
                    </div>
                    <div>
                       <h2 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">WedHabesha Platform</h2>
                       <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Root System</p>
                    </div>
                    {/* Bottom Connector */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white dark:bg-gray-900 border border-slate-300 dark:border-slate-700 rounded-full flex items-center justify-center z-10">
                        <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                    </div>
                 </div>
                 
                 {/* Vertical Connector (Step 2) */}
                 <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-16 -z-10">
                    <div className="w-full h-full bg-slate-300 dark:bg-slate-700 animate-line-v delay-500 origin-top"></div>
                    <div className="flow-v delay-2000" style={{'--glow-color': '#e11d48'} as any}></div>
                 </div>
              </div>

              {/* STEP 3: HORIZONTAL BUS (Desktop Only) */}
              <div className="hidden md:block relative h-px w-full max-w-6xl mx-auto -mt-16 mb-16 z-10">
                 {/* The horizontal bar connecting columns */}
                 <div className="absolute top-0 left-0 w-full h-px bg-slate-300 dark:bg-slate-700 animate-line-h delay-700 origin-center"></div>
                 {/* Glow Flow */}
                 <div className="flow-h delay-2000" style={{'--glow-color': '#e11d48'} as any}></div>
              </div>

              {/* BRANCHES GRID */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                 {siteStructure.map((section, idx) => {
                    // Stagger timings
                    const colDelay = 1000 + (idx * 200); // 1s, 1.2s, 1.4s...
                    
                    return (
                    <div key={idx} className="relative group">
                       
                       {/* Vertical Line from Bus to Category Node (Desktop) */}
                       <div className="hidden md:block absolute -top-16 left-1/2 -translate-x-1/2 w-px h-16 -z-10">
                          <div className={`w-full h-full bg-slate-300 dark:bg-slate-700 animate-line-v`} style={{animationDelay: `${colDelay}ms`}}></div>
                          <div className="flow-v" style={{'--glow-color': section.glowColor, animationDelay: `${colDelay + 1500}ms`} as any}></div>
                       </div>

                       {/* Mobile Horizontal Connector (Left to Line) */}
                       {/* Simple fake line for mobile to look connected */}
                       <div className="md:hidden absolute top-8 -left-4 w-4 h-px bg-slate-300 dark:bg-slate-700"></div>

                       {/* Category Node */}
                       <div className={`bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm mb-6 relative transition-transform hover:-translate-y-1 duration-300 animate-node-enter`} style={{animationDelay: `${colDelay + 200}ms`, opacity: 0}}>
                          {/* Top Connector Point (Desktop) */}
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-300 dark:bg-slate-700 rounded-full hidden md:block ring-4 ring-slate-50 dark:ring-slate-950"></div>
                          
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 flex md:flex-col items-center gap-4 text-left md:text-center border border-slate-100 dark:border-slate-700/50">
                             <div className={`w-12 h-12 bg-${section.color}-100 dark:bg-${section.color}-900/30 text-${section.color}-600 rounded-full flex items-center justify-center shrink-0`}>
                                <section.icon className="w-6 h-6" />
                             </div>
                             <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">{section.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 md:mt-1">{section.links.length} Active Nodes</p>
                             </div>
                          </div>

                          {/* Line to Children */}
                          <div className="absolute bottom-0 left-8 md:left-1/2 md:-translate-x-1/2 w-px h-6 bg-slate-300 dark:bg-slate-700 translate-y-full -z-10"></div>
                       </div>

                       {/* Leaf Nodes (Pages) */}
                       <div className="space-y-3 pl-8 md:pl-0 relative pt-6">
                          {/* Vertical Spine Line for Children */}
                          <div className="absolute left-8 md:left-1/2 top-0 bottom-6 w-px -z-20 md:-translate-x-1/2">
                             <div className={`w-full h-full bg-slate-200 dark:bg-slate-800 animate-line-v`} style={{animationDelay: `${colDelay + 400}ms`, transformOrigin: 'top'}}></div>
                          </div>

                          {section.links.map((link, lIdx) => {
                             const itemDelay = colDelay + 600 + (lIdx * 100);
                             return (
                             <div key={lIdx} className="relative flex items-center md:justify-center group/link animate-node-enter" style={{animationDelay: `${itemDelay}ms`, opacity: 0}}>
                                {/* Horizontal Branch Line (Mobile) */}
                                <div className="md:hidden absolute -left-4 top-1/2 w-4 h-px bg-slate-200 dark:bg-slate-800"></div>
                                
                                <Link to={link.path} className="w-full md:w-auto min-w-[180px] bg-white dark:bg-gray-900 hover:border-slate-400 dark:hover:border-slate-500 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 flex items-center gap-3 transition-all shadow-sm relative overflow-hidden group-hover/link:shadow-md">
                                   <Circle className={`w-2 h-2 text-${section.color}-500 fill-current`} />
                                   <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{link.name}</span>
                                   
                                   {/* Hover Light Effect */}
                                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full group-hover/link:translate-x-full transition-transform duration-700 ease-in-out"></div>
                                </Link>
                             </div>
                          )})}
                       </div>
                    </div>
                 )})}
              </div>
           </div>
        </div>
        
      </div>
    </Layout>
  );
};

// --- ROUTER WRAPPER FOR PREVIEW ---

export default SitemapPage;