import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Star, 
  Sparkles, 
  Crown, 
  ArrowRight, 
  Users, 
  Zap, 
  Heart, 
  Menu, 
  Globe, 
  Moon, 
  Sun, 
  User, 
  LogOut, 
  ChevronRight, 
  Facebook, 
  Instagram, 
  Linkedin,
  ShieldCheck,
  HelpCircle,
    Map, 
  Home, 
  Briefcase, 
  FileText, 
  Shield, 
  Scale, 
  Compass,
  GitBranch,
  Circle,
  Database,
  Layout as LayoutIcon,
  Server,  
  Store, 
  Calculator, 
  CheckCircle, 
  MapPin,
  PlayCircle,
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
  Quote,
} from 'lucide-react';
import { MemoryRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
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

// --- CUSTOM FONT STYLES ---
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@400;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,800;1,400&display=swap');
    
    @font-face {
      font-family: 'Menbere';
      src: local('Menbere'), local('Menbere Bold');
      font-weight: 700;
      font-display: swap;
    }

    .font-menbere {
      font-family: 'Menbere', 'Noto Serif Ethiopic', serif;
    }

    .font-playfair {
      font-family: 'Playfair Display', serif;
    }
    
    .animate-float {
        animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
    }

    /* Prevent horizontal scrolling */
    html, body {
      overflow-x: hidden;
      max-width: 100vw;
    }

    /* Custom scrollbar for tables */
    .scrollbar-thin {
      scrollbar-width: thin;
    }
    
    .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
      background-color: #d1d5db;
      border-radius: 0.375rem;
    }
    
    .dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
      background-color: #4b5563;
    }
    
    .scrollbar-thin::-webkit-scrollbar {
      height: 6px;
    }
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
      badge: "Beta Version - 100% Free Access",
      title: "Choose Your Perfect ",
      titleHighlight: "Wedding Plan",
      subtitle: "From intimate gatherings to grand multi-day celebrations, discover the plan that fits your dream. All premium features are free during our beta period."
    },
    packages: {
      starter: {
        name: "Starter",
        subtitle: "Perfect for simple weddings",
        desc: "Get started with essential wedding planning tools",
        cta: "Start Free"
      },
      pro: {
        name: "Pro",
        subtitle: "Most popular choice",
        desc: "Everything you need for a stress-free wedding",
        cta: "Plan My Wedding",
        badge: "Most Popular"
      },
      elite: {
        name: "Elite",
        subtitle: "Premium wedding experience",
        desc: "For large, luxury, or multi-day celebrations",
        cta: "Go Elite",
        badge: "Premium"
      },
      freeDuringBeta: "Free during beta"
    },
    comparison: {
      title: "Compare Features",
      subtitle: "Detailed breakdown of what's included in each plan.",
      headers: { feature: "Features", starter: "Starter", pro: "Pro", elite: "Elite" }
    },
    faq: {
      title: "Common Questions",
      items: [
        { q: "Is everything really free during beta?", a: "Yes! All features across all packages are completely free during our beta period. This includes unlimited guests, QR check-in, analytics, and premium support." },
        { q: "How long is the beta period?", a: "The beta period will continue throughout 2025. We'll give all beta users advance notice before any pricing changes, and early adopters will receive special discounts." },
        { q: "Can I switch packages later?", a: "Absolutely! You can upgrade or change your package at any time. During beta, all features are available regardless of your selected package." },
        { q: "What happens to my data?", a: "Your wedding data is safe and will remain accessible. We'll never delete your information, and you'll have full export capabilities." }
      ]
    },
    cta: {
      title: "Start Your Journey Today",
      subtitle: "Join thousands of Ethiopian couples planning their perfect day with WedHabesha. No credit card required.",
      btnPrimary: "Start Planning Free",
      btnSecondary: "Browse Vendors"
    },
    footer: {
      company: "Company",
      tools: "Planning Tools",
      vendorsList: "Vendors",
      rights: "All rights reserved.",
      tagline: "The #1 wedding planning platform for Ethiopian couples worldwide. We make your special day effortless."
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
      badge: "ቤታ ስሪት - 100% ነፃ መዳረሻ",
      title: "ለእርስዎ ትክክለኛውን ",
      titleHighlight: "የሰርግ ዕቅድ ይምረጡ",
      subtitle: "ከቀላል ስብሰባዎች እስከ ትልልቅ ባለብዙ ቀን ክብረ በዓላት፣ ለህልምዎ የሚስማማውን እቅድ ያግኙ። በቤታ ጊዜያችን ሁሉም የፕሪሚየም ባህሪያት ነፃ ናቸው።"
    },
    packages: {
      starter: {
        name: "ጀማሪ",
        subtitle: "ለቀላል ሰርጎች ተስማሚ",
        desc: "በመሰረታዊ የሰርግ እቅድ መሳሪያዎች ይጀምሩ",
        cta: "በነጻ ይጀምሩ"
      },
      pro: {
        name: "ፕሮ",
        subtitle: "በጣም ታዋቂ ምርጫ",
        desc: "ከጭንቀት ነጻ ለሆነ ሰርግ የሚያስፈልግዎ ሁሉ",
        cta: "ሰርጌን አቅድ",
        badge: "በጣም ታዋቂ"
      },
      elite: {
        name: "ኤሊት",
        subtitle: "ፕሪሚየም የሰርግ ተሞክሮ",
        desc: "ለትላልቅ፣ የቅንጦት ወይም ባለብዙ ቀን ክብረ በዓላት",
        cta: "ወደ ኤሊት ሂድ",
        badge: "ፕሪሚየም"
      },
      freeDuringBeta: "በቤታ ጊዜ ነፃ"
    },
    comparison: {
      title: "ባህሪያትን ያወዳድሩ",
      subtitle: "በእያንዳንዱ ጥቅል ውስጥ የተካተተውን ዝርዝር መግለጫ።",
      headers: { feature: "ባህሪያት", starter: "ጀማሪ", pro: "ፕሮ", elite: "ኤሊት" }
    },
    faq: {
      title: "የተለመዱ ጥያቄዎች",
      items: [
        { q: "በቤታ ጊዜ ሁሉም ነገር በእርግጥ ነፃ ነው?", a: "አዎ! በሁሉም ጥቅሎች ውስጥ ያሉ ሁሉም ባህሪያት በቤታ ጊዜያችን ሙሉ በሙሉ ነፃ ናቸው። ይህ ያልተገደቡ እንግዶችን፣ የQR ፍተሻን፣ ትንታኔዎችን እና የፕሪሚየም ድጋፍን ያካትታል።" },
        { q: "የቤታ ጊዜው ምን ያህል ይቆያል?", a: "የቤታ ጊዜው በ2025 በሙሉ ይቀጥላል። ማንኛውም የዋጋ ለውጥ ከመደረጉ በፊት ለሁሉም የቤታ ተጠቃሚዎች የቅድሚያ ማስታወቂያ እንሰጣለን፣ እና ቀድመው ለተቀላቀሉት ልዩ ቅናሾች ይኖራቸዋል።" },
        { q: "ጥቅሎችን በኋላ መቀየር እችላለሁ?", a: "በፍጹም! በማንኛውም ጊዜ ጥቅልዎን ማሻሻል ወይም መቀየር ይችላሉ። በቤታ ጊዜ፣ የመረጡት ጥቅል ምንም ይሁን ምን ሁሉም ባህሪያት ይገኛሉ።" },
        { q: "የእኔ መረጃ ምን ይሆናል?", a: "የሰርግ መረጃዎ ደህንነቱ የተጠበቀ ነው እና ተደራሽ ሆኖ ይቆያል። መረጃዎን በፍጹም አንሰረዝም፣ እና ሙሉ የመላክ ችሎታ ይኖርዎታል።" }
      ]
    },
    cta: {
      title: "ጉዞዎን ዛሬ ይጀምሩ",
      subtitle: "ከWedHabesha ጋር ፍጹም ቀናቸውን እያቀዱ ያሉ በሺዎች የሚቆጠሩ የኢትዮጵያ ጥንዶችን ይቀላቀሉ። ክሬዲት ካርድ አያስፈልግም።",
      btnPrimary: "በነፃ ማቀድ ይጀምሩ",
      btnSecondary: "አቅራቢዎችን ያስሱ"
    },
    footer: {
      company: "ድርጅት",
      tools: "የእቅድ መሳርያዎች",
      vendorsList: "አቅራቢዎች",
      rights: "መብቱ በህግ የተጠበቀ ነው።",
      tagline: "በዓለም ዙሪያ ላሉ ኢትዮጵያውያን ጥንዶች #1 የሰርግ እቅድ መድረክ። ልዩ ቀንዎን ቀላል እናደርጋለን።"
    }
  }
};

// --- SHARED COMPONENTS (Button) ---
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
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200",
  };
  const sizes = {
    sm: "h-9 px-4 text-sm",
    default: "h-12 px-6",
    lg: "h-14 px-8 text-lg",
  };
  return <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
};

// --- LAYOUT COMPONENT ---
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

// --- PRICING PAGE CONTENT ---
const PricingPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];
  const navigate = useNavigate();

  const features = [
    { name: 'Wedding Profile', starter: true, pro: true, elite: true },
    { name: 'Guest Management', starter: 'Up to 100', pro: 'Unlimited', elite: 'Unlimited' },
    { name: 'Digital Invitations', starter: 'Basic', pro: 'Full Library', elite: 'Custom Branded' },
    { name: 'RSVP Tracking', starter: true, pro: true, elite: true },
    { name: 'Vendor Browsing', starter: true, pro: true, elite: true },
    { name: 'Basic Messaging', starter: true, pro: 'Full Messaging', elite: 'Priority Support' },
    { name: 'Mobile Access', starter: true, pro: true, elite: true },
    { name: 'QR Code Check-in', starter: false, pro: true, elite: true },
    { name: 'Staff Dashboard', starter: false, pro: true, elite: true },
    { name: 'Real-time Analytics', starter: false, pro: 'Basic', elite: 'Advanced' },
    { name: 'Budget Planner', starter: false, pro: true, elite: true },
    { name: 'File Sharing', starter: false, pro: true, elite: true },
    { name: 'SMS Invitations', starter: false, pro: true, elite: true },
    { name: 'RSVP Reminders', starter: false, pro: true, elite: true },
    { name: 'Multiple Events', starter: false, pro: false, elite: true },
    { name: 'Seating Management', starter: false, pro: false, elite: true },
    { name: 'Custom Reports', starter: false, pro: false, elite: true },
    { name: 'Dedicated Support', starter: false, pro: false, elite: true },
  ];

  const packages = [
    {
      id: 'starter',
      name: t.packages.starter.name,
      subtitle: t.packages.starter.subtitle,
      price: '0',
      badge: null,
      description: t.packages.starter.desc,
      cta: t.packages.starter.cta,
      ctaStyle: 'bg-white border-2 border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:border-gray-500',
      popular: false,
      icon: Users,
      color: 'gray',
      features: [
        'Create wedding profile',
        'Guest list up to 100',
        'Basic digital invitations',
        'RSVP tracking',
        'Vendor browsing',
        'Basic messaging',
        'Mobile-friendly access'
      ]
    },
    {
      id: 'pro',
      name: t.packages.pro.name,
      subtitle: t.packages.pro.subtitle,
      price: '0',
      badge: t.packages.pro.badge,
      description: t.packages.pro.desc,
      cta: t.packages.pro.cta,
      ctaStyle: 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white shadow-lg shadow-rose-500/30 border-transparent',
      popular: true,
      icon: Star,
      color: 'rose',
      features: [
        'Everything in Starter',
        'Unlimited guests',
        'QR code invitations & check-in',
        'Staff access dashboard',
        'Real-time guest tracking',
        'Budget planner with alerts',
        'Full messaging & file sharing',
        'Wedding day dashboard',
        'Complete template library',
        'SMS invitations',
        'RSVP reminders'
      ]
    },
    {
      id: 'elite',
      name: t.packages.elite.name,
      subtitle: t.packages.elite.subtitle,
      price: '0',
      badge: t.packages.elite.badge,
      description: t.packages.elite.desc,
      cta: t.packages.elite.cta,
      ctaStyle: 'bg-gray-900 hover:bg-gray-800 text-white shadow-lg dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
      popular: false,
      icon: Crown,
      color: 'purple',
      features: [
        'Everything in Pro',
        'Multiple events support',
        'Advanced analytics & reports',
        'Priority vendor support',
        'Custom invitation branding',
        'Seating management tools',
        'Admin-level staff roles',
        'Dedicated support',
        'Exportable reports',
        'Early access to features'
      ]
    }
  ];

  const handleGetStarted = (packageId: string) => {
    navigate('/register', { state: { selectedPackage: packageId } });
  };

  return (
    <Layout lang={lang} setLang={setLang}>
      <div className="bg-white dark:bg-gray-950 min-h-screen pb-16 transition-colors duration-500 overflow-x-hidden">
        
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-rose-50/50 to-transparent dark:from-rose-900/10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-purple-100/30 dark:bg-purple-900/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        {/* Hero Section */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto mb-20 animate-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-8 border border-rose-100 dark:border-rose-800">
              <Sparkles className="w-3.5 h-3.5" />
              {t.hero.badge}
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-8 font-menbere leading-tight">
              {t.hero.title}<br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-purple-600">{t.hero.titleHighlight}</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 font-light leading-relaxed">
              {t.hero.subtitle}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-24 relative z-10">
            {packages.map((pkg, idx) => {
              const Icon = pkg.icon;
              return (
                <div
                  key={pkg.id}
                  className={`group relative bg-white dark:bg-gray-900 rounded-[2rem] p-1 transition-all duration-500 ${
                    pkg.popular 
                      ? 'shadow-2xl shadow-rose-200/50 dark:shadow-rose-900/20 scale-105 z-10' 
                      : 'shadow-xl hover:shadow-2xl border border-gray-100 dark:border-gray-800 hover:-translate-y-1'
                  }`}
                >
                  {/* Popular Gradient Border Effect */}
                  {pkg.popular && (
                    <div className="absolute inset-0 bg-gradient-to-b from-rose-500 to-purple-600 rounded-[2rem] -z-10"></div>
                  )}

                  <div className={`h-full bg-white dark:bg-gray-900 rounded-[1.8rem] p-8 flex flex-col relative overflow-hidden ${pkg.popular ? 'm-[2px]' : ''}`}>
                    
                    {/* Background decoration */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-${pkg.color}-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>

                    {/* Badge */}
                    {pkg.badge && (
                      <div className="absolute top-6 right-6">
                        <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                          <Star className="w-3 h-3 fill-current" /> {pkg.badge}
                        </span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="mb-8 relative">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-md ${
                        pkg.color === 'rose' 
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' 
                          : pkg.color === 'purple'
                          ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-menbere">{pkg.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm h-10">{pkg.subtitle}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">{pkg.price}</span>
                        <span className="text-xl font-medium text-gray-500 dark:text-gray-400">ETB</span>
                      </div>
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-2 uppercase tracking-wide flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {t.packages.freeDuringBeta}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-10 flex-grow">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <Check className={`w-5 h-5 shrink-0 ${pkg.popular ? 'text-rose-500' : 'text-green-500'}`} />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => handleGetStarted(pkg.id)}
                      className={`w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 ${pkg.ctaStyle}`}
                    >
                      {pkg.cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Table Section */}
          <div className="max-w-5xl mx-auto mb-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 font-menbere">{t.comparison.title}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t.comparison.subtitle}</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left p-6 pl-8 font-bold text-gray-900 dark:text-white w-1/3">{t.comparison.headers.feature}</th>
                      <th className="text-center p-6 font-bold text-gray-600 dark:text-gray-300 w-1/5">{t.comparison.headers.starter}</th>
                      <th className="text-center p-6 font-bold text-rose-600 dark:text-rose-400 w-1/5 bg-rose-50/30 dark:bg-rose-900/10">{t.comparison.headers.pro}</th>
                      <th className="text-center p-6 font-bold text-purple-600 dark:text-purple-400 w-1/5">{t.comparison.headers.elite}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {features.map((feature, index) => (
                      <tr key={index} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="p-5 pl-8 font-medium text-gray-700 dark:text-gray-300 text-sm">{feature.name}</td>
                        <td className="p-5 text-center">
                          {typeof feature.starter === 'boolean' ? (
                            feature.starter ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                          ) : (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{feature.starter}</span>
                          )}
                        </td>
                        <td className="p-5 text-center bg-rose-50/10 dark:bg-rose-900/5">
                          {typeof feature.pro === 'boolean' ? (
                            feature.pro ? <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto"><Check className="w-4 h-4 text-green-600 dark:text-green-400" /></div> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{feature.pro}</span>
                          )}
                        </td>
                        <td className="p-5 text-center">
                          {typeof feature.elite === 'boolean' ? (
                            feature.elite ? <Check className="w-5 h-5 text-purple-500 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{feature.elite}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto mb-24">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl mb-4 text-rose-600 dark:text-rose-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 font-menbere">{t.faq.title}</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {t.faq.items.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{item.q}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="relative rounded-[3rem] overflow-hidden bg-gray-900 dark:bg-black text-white text-center py-20 px-6">
            <div className="absolute inset-0 opacity-20">
               <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-500 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
               <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
            </div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 font-menbere">{t.cta.title}</h2>
              <p className="text-xl text-gray-300 mb-10 font-light">
                {t.cta.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleGetStarted('pro')}
                  className="bg-white text-gray-900 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl hover:scale-105"
                >
                  {t.cta.btnPrimary}
                </button>
                <button
                  onClick={() => navigate('/vendors')}
                  className="bg-transparent border-2 border-white/20 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
                >
                  {t.cta.btnSecondary}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};


export default PricingPage;