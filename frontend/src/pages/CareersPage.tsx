import React, { useState, useEffect } from 'react';

import { 
  Heart, 
  Users, 
  Globe, 
  Zap, 
  MapPin, 
  Clock, 
  DollarSign,
  ChevronRight,
  Mail,
  Briefcase,
  Code,
  Palette,
  BarChart3,
  HeadphonesIcon,
  Menu,
  X,
  Sun,
  Moon,
  Facebook,
  Instagram,
  Linkedin,
  Store, 
  Calculator, 
  CheckCircle, 
  ArrowRight, 
  Star, 
  PlayCircle,
  Sparkles,
  ShieldCheck,
  Camera,
  Utensils,
  Music,
  Flower2,
  Car,
  Calendar,
  CheckSquare,
  Search,
  User,
  LogOut,
  Quote,
  Ghost
 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';

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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
    }

    .font-menbere {
      font-family: 'Menbere', 'Noto Serif Ethiopic', serif;
    }

    .font-playfair {
      font-family: 'Playfair Display', serif;
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
      badge: "Careers at WedHabesha",
      title: "Join Our ",
      titleHighlight: "Mission",
      subtitle: "Help us revolutionize wedding planning for Ethiopian couples worldwide. Build technology that brings love stories to life.",
      ctaPrimary: "View Open Positions",
      ctaSecondary: "Our Culture"
    },
    culture: {
      title: "Why Work With Us?",
      subtitle: "We're building something special - a platform that celebrates Ethiopian culture while making wedding planning effortless.",
      benefits: [
        { title: "Health & Wellness", desc: "Comprehensive health insurance and wellness programs" },
        { title: "Remote Work", desc: "Flexible remote work options with modern equipment" },
        { title: "Team Culture", desc: "Collaborative, inclusive environment with amazing colleagues" },
        { title: "Growth", desc: "Professional development opportunities and career advancement" }
      ],
      valuesTitle: "Our Values",
      values: [
        { title: "Love First", desc: "We believe love should be celebrated and every couple deserves their perfect day." },
        { title: "Cultural Pride", desc: "We honor Ethiopian traditions while embracing modern wedding planning." },
        { title: "Excellence", desc: "We strive for excellence in everything we do, from code to customer service." },
        { title: "Community", desc: "We build strong relationships with couples, vendors, and each other." }
      ]
    },
    openings: {
      title: "Open Positions",
      subtitle: "Join our growing team and help shape the future of wedding planning in Ethiopia.",
      apply: "Apply Now",
      requirements: "Key Requirements:",
      jobs: [
        { title: "Senior Full Stack Developer", dept: "Engineering", loc: "Remote / Addis Ababa", type: "Full-time", salary: "$60k - $80k", desc: "Build the future of wedding tech." },
        { title: "UX/UI Designer", dept: "Design", loc: "Remote / Addis Ababa", type: "Full-time", salary: "$45k - $65k", desc: "Create intuitive experiences for couples." },
        { title: "Marketing Manager", dept: "Marketing", loc: "Addis Ababa", type: "Full-time", salary: "$40k - $55k", desc: "Drive growth in the Ethiopian market." },
        { title: "Customer Success Specialist", dept: "Support", loc: "Remote", type: "Full-time", salary: "$35k - $45k", desc: "Help couples succeed on our platform." }
      ]
    },
    noMatch: {
      title: "Don't See a Perfect Match?",
      text: "We're always looking for talented individuals who share our passion. Send us your resume.",
      cta: "Send Your Resume"
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
      badge: "በWedHabesha መስራት",
      title: "ተልዕኳችንን ",
      titleHighlight: "ይቀላቀሉ",
      subtitle: "ለኢትዮጵያውያን ጥንዶች የሰርግ እቅድን እንድንለውጥ ይርዱን። የፍቅር ታሪኮችን ህያው የሚያደርግ ቴክኖሎጂ ይገንቡ።",
      ctaPrimary: "ክፍት የስራ ቦታዎችን ይመልከቱ",
      ctaSecondary: "የእኛ ባህል"
    },
    culture: {
      title: "ለምን ከእኛ ጋር ይሰራሉ?",
      subtitle: "ልዩ ነገር እየገነባን ነው - የኢትዮጵያን ባህል እያከበረ የሰርግ እቅድን ቀላል የሚያደርግ መድረክ።",
      benefits: [
        { title: "ጤና እና ደህንነት", desc: "አጠቃላይ የጤና ዋስትና እና የደህንነት ፕሮግራሞች" },
        { title: "የርቀት ስራ", desc: "ዘመናዊ መሳሪያዎች ያሉት ተለዋዋጭ የርቀት ስራ አማራጮች" },
        { title: "የቡድን ባህል", desc: "ከምርጥ ባልደረቦች ጋር የትብብር እና አካታች አካባቢ" },
        { title: "ዕድገት", desc: "የሙያ ማሻሻያ እድሎች እና የስራ ዕድገት" }
      ],
      valuesTitle: "እሴቶቻችን",
      values: [
        { title: "ፍቅር ቅድሚያ", desc: "ፍቅር መከበር እንዳለበት እና እያንዳንዱ ጥንዶች ፍጹም ቀናቸውን እንደሚያገኙ እናምናለን።" },
        { title: "የባህል ኩራት", desc: "ዘመናዊ የሰርግ እቅድን እየተቀበልን የኢትዮጵያን ወጎች እናከብራለን።" },
        { title: "የላቀ ጥራት", desc: "ከኮድ እስከ ደንበኛ አገልግሎት በምናደርገው ነገር ሁሉ ለላቀ ውጤት እንተጋለን።" },
        { title: "ማህበረሰብ", desc: "ከጥንዶች፣ አቅራቢዎች እና እርስ በርስ ጠንካራ ግንኙነቶችን እንገነባለን።" }
      ]
    },
    openings: {
      title: "ክፍት የስራ ቦታዎች",
      subtitle: "እያደገ የመጣውን ቡድናችንን ይቀላቀሉ እና በኢትዮጵያ የሰርግ እቅድ የወደፊት እጣ ፈንታን ይቅረጹ።",
      apply: "አሁኑኑ ያመልክቱ",
      requirements: "ቁልፍ መስፈርቶች:",
      jobs: [
        { title: "ከፍተኛ ሙሉ ስቴክ ገንቢ", dept: "ኢንጂነሪንግ", loc: "ርቀት / አዲስ አበባ", type: "ሙሉ ጊዜ", salary: "$60k - $80k", desc: "የሰርግ ቴክኖሎጂ የወደፊት እጣ ፈንታን ይገንቡ።" },
        { title: "UX/UI ዲዛይነር", dept: "ዲዛይን", loc: "ርቀት / አዲስ አበባ", type: "ሙሉ ጊዜ", salary: "$45k - $65k", desc: "ለጥንዶች የሚታወቅ ልምዶችን ይፍጠሩ።" },
        { title: "የማርኬቲንግ ስራ አስኪያጅ", dept: "ማርኬቲንግ", loc: "አዲስ አበባ", type: "ሙሉ ጊዜ", salary: "$40k - $55k", desc: "በኢትዮጵያ ገበያ እድገትን ያምጡ።" },
        { title: "የደንበኛ ስኬት ባለሙያ", dept: "ድጋፍ", loc: "ርቀት", type: "ሙሉ ጊዜ", salary: "$35k - $45k", desc: "ጥንዶች በመድረካችን እንዲሳካላቸው እርዱ።" }
      ]
    },
    noMatch: {
      title: "ፍጹም ተስማሚ አላገኙም?",
      text: "የእኛን ፍላጎት የሚጋሩ ችሎታ ያላቸውን ግለሰቦች ሁልጊዜ እንፈልጋለን። የእርስዎን CV ይላኩልን።",
      cta: "CVዎን ይላኩ"
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
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline', size?: 'sm' | 'default' | 'lg' }> = ({ 
  className = "", 
  variant = "default", 
  size = "default", 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  const variants = {
    default: "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/40",
    outline: "border-2 border-gray-200 bg-transparent hover:border-rose-200 hover:bg-rose-50 text-gray-900 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800",
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
               
               <a href="home/#testimonials" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
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
                    <Button variant="outline" size="sm" className="font-bold hover:text-rose-600">{t.nav.login}</Button>
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


// --- CAREERS PAGE CONTENT ---
const CareersPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];

  // Map icon strings to components for dynamic rendering
  const getIcon = (type: string) => {
    switch (type) {
      case 'Code': return Code;
      case 'Palette': return Palette;
      case 'BarChart3': return BarChart3;
      case 'HeadphonesIcon': return HeadphonesIcon;
      default: return Briefcase;
    }
  };

  const getBenefitIcon = (index: number) => {
    switch (index) {
      case 0: return Heart;
      case 1: return Globe;
      case 2: return Users;
      case 3: return Zap;
      default: return Heart;
    }
  };

  // Job data structure aligned with translations
  const jobList = t.openings.jobs.map((job, index) => ({
    id: index + 1,
    ...job,
    icon: [Code, Palette, BarChart3, HeadphonesIcon][index] || Briefcase,
    requirements: ["5+ years exp", "React/Node.js", "Wedding industry knowledge"] // Simplified for mock
  }));

  return (
    <Layout lang={lang} setLang={setLang}>
      <div className="bg-white dark:bg-gray-950 min-h-screen">
        
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 py-20 border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in">
                <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold font-menbere text-rose-600">{t.hero.badge}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 font-menbere leading-tight">
                {t.hero.title}<span className="text-rose-600">{t.hero.titleHighlight}</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
                {t.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="#openings" 
                  className="bg-rose-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30"
                >
                  {t.hero.ctaPrimary}
                  <ChevronRight className="w-5 h-5" />
                </a>
                <a 
                  href="#culture" 
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t.hero.ctaSecondary}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Culture Section */}
        <section id="culture" className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 font-menbere">
                {t.culture.title}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                {t.culture.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {t.culture.benefits.map((benefit, index) => {
                const Icon = getBenefitIcon(index);
                return (
                  <div key={index} className="text-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {benefit.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Values */}
            <div className="bg-rose-50 dark:bg-gray-900/50 rounded-3xl p-8 md:p-12 border border-rose-100 dark:border-gray-800">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center font-menbere">
                {t.culture.valuesTitle}
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                {t.culture.values.map((value, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-2 h-2 bg-rose-600 rounded-full mt-2.5 flex-shrink-0"></div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {value.title}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {value.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Job Openings */}
        <section id="openings" className="py-20 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 font-menbere">
                {t.openings.title}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t.openings.subtitle}
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {jobList.map((job) => (
                <div key={job.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-rose-200 dark:hover:border-rose-900 transition-all duration-300 group">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/20 rounded-xl flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform duration-300">
                          <job.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-rose-600 transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <Briefcase className="w-3.5 h-3.5" /> {job.dept}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        {job.desc}
                      </p>
                      
                      <div className="flex flex-wrap gap-3 mb-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <MapPin className="w-3.5 h-3.5" /> {job.loc}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <Clock className="w-3.5 h-3.5" /> {job.type}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-sm font-medium text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30">
                          <DollarSign className="w-3.5 h-3.5" /> {job.salary}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 pt-2">
                      <a 
                        href={`mailto:careers@wedhabesha.com?subject=Application for ${job.title}`}
                        className="inline-flex w-full md:w-auto justify-center items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-rose-600 dark:hover:bg-rose-500 dark:hover:text-white transition-all shadow-md hover:shadow-lg"
                      >
                        <Mail className="w-4 h-4" />
                        {t.openings.apply}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No Perfect Match */}
            <div className="max-w-2xl mx-auto text-center mt-16 bg-white dark:bg-gray-800 rounded-3xl p-10 border border-dashed border-gray-300 dark:border-gray-600">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-500 dark:text-gray-400">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t.noMatch.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                {t.noMatch.text}
              </p>
              <a 
                href="mailto:careers@wedhabesha.com?subject=General Application"
                className="inline-flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold hover:underline"
              >
                <Mail className="w-4 h-4" />
                {t.noMatch.cta}
              </a>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
};



export default CareersPage;