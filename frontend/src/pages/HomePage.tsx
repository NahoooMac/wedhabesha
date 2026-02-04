import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Store, 
  Calculator, 
  Heart, 
  CheckCircle, 
  ArrowRight, 
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
  Menu,
  X,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  User,
  LogOut,
  Quote,
  Facebook,
  Instagram,
  Linkedin
} from 'lucide-react';


// --- MOCK AUTH HOOK ---
// const useAuth = () => {
//   const [user, setUser] = useState<{email: string, user_type: string} | null>(null);
  
//   const logout = async () => {
//     setUser(null);
//     console.log("Logged out");
//   };

//   return { user, logout };
// };

// --- CUSTOM FONT STYLES & ANIMATIONS ---
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@400;700;900&display=swap');
    
    @font-face {
      font-family: 'Menbere';
      src: local('Menbere'), local('Menbere Bold');
      font-weight: 700;
      font-display: swap;
    }

    .font-menbere {
      font-family: 'Menbere', 'Noto Serif Ethiopic', serif;
    }
    
    .animate-float-slow {
      animation: float 6s ease-in-out infinite;
    }
    
    .animate-bounce-slow {
      animation: bounce-slow 3s infinite;
    }

    .animate-scroll {
      animation: scroll 40s linear infinite;
    }

    .pause-on-hover:hover {
      animation-play-state: paused;
    }
    
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
      100% { transform: translateY(0px); }
    }
    
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(-5%); }
      50% { transform: translateY(5%); }
    }

    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `}</style>
);

// --- TRANSLATIONS ---
const translations = {
  en: {
    nav: {
      vendors: "Vendors",
      pricing: "Pricing",
      tools: "Planning Tools",
      realWeddings: "Real Weddings",
      login: "Log In",
      getStarted: "Get Started"
    },
    hero: {
      badge: "#1 Wedding App in Ethiopia",
      titleLine1: "Plan the",
      titleLine2: "Perfect Union",
      subtitle: "Your dream Habesha wedding starts here. Find top vendors, manage guests, and track your budget—all in one elegant place.",
      guidedEntryTitle: "When is the big day?",
      selectMonth: "Select Month",
      selectYear: "Select Year",
      startPlanning: "Start Planning Free",
      noCard: "No credit card required"
    },
    roadmap: {
      tag: "Step by Step",
      title: "Your Personal Roadmap to \"I Do\"",
      desc: "Wedding planning can be overwhelming. We break it down into bite-sized tasks tailored to Ethiopian traditions, so you never feel lost.",
      btn: "See Your Full Checklist",
      items: [
        { title: "Set your budget", time: "12+ Months", completed: true },
        { title: "Book your venue", time: "10-12 Months", completed: true },
        { title: "Hire photographer", time: "8-10 Months", completed: false },
        { title: "Send invites", time: "6-8 Months", completed: false },
      ]
    },
    features: {
      title: "Everything You Need",
      subtitle: "Powerful tools designed specifically for the complexity of Habesha weddings.",
      cards: [
        { title: "Smart Guest Management", desc: "Effortlessly manage 500+ guests. Send SMS invites in Amharic & English, track RSVPs, and assign seating tables visually.", btn: "Try Guest Tool" },
        { title: "Verified Vendors", desc: "Access Ethiopia's most trusted network of wedding professionals. Rated by couples like you.", btn: "Browse Directory" },
        { title: "Budget Tracker", desc: "Stay on track without the stress. Allocate funds for Melse, Telosh, and the main day.", stats: { total: "Total Budget", spent: "Spent" } }
      ]
    },
    vendors: {
      title: "Vendor Directory",
      subtitle: "The best talent in the industry, at your fingertips.",
      btn: "View all 200+ Vendors",
      cats: [
        { name: "Photography", count: "120+ Pros", img: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=2070&auto=format&fit=crop" },
        { name: "Catering", count: "85+ Caterers", img: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2070&auto=format&fit=crop" },
        { name: "Music & DJ", count: "50+ Artists", img: "./Music&DJ.png" },
        { name: "Decor", count: "90+ Designers", img: "Decor.png" },
        { name: "Transport", count: "40+ Options", img: "./Transport.png" },
        { name: "Makeup", count: "60+ Artists", img: "Makeup.png" }
      ]
    },
    testimonials: {
        title: "Couples Love Us",
        subtitle: "See what happy couples are saying about their planning journey.",
        t1: "The guest list tool saved us. We sent SMS invites in Amharic and tracked RSVPs instantly. It felt like we had a professional planner right in our pocket.",
        t2: "I was stressed about finding a Melse dress. Found a verified designer here who understood exactly what I wanted. The vendor reviews were a lifesaver.",
        t3: "We stayed exactly on budget. The calculator helped us allocate funds for the Telosh and Melse without guessing. Highly recommend for any couple!",
        t4: "WedHabesha made our big day unforgettable! The vendor selection was top-notch, and the budget tools kept us grounded.",
        t5: "A must-have app for any Ethiopian wedding. The checklist feature kept us organized through every step of the process.",
        t6: "Planning from abroad was a nightmare until we found this. Being able to coordinate with local vendors remotely was a game changer."
    },
    cta: {
      badge: "Start for free today",
      title: "Ready to plan the wedding of your dreams?",
      subtitle: "Join thousands of Ethiopian couples who trust WedHabesha  to make their big day perfect.",
      btnPrimary: "Get Started Now",
      btnSecondary: "Explore Vendors"
    },
    footer: {
      company: "Company",
      tools: "Planning Tools",
      vendors: "Vendors",
      rights: "All rights reserved."
    }
  },
  am: {
    nav: {
      vendors: "አቅራቢዎች",
      pricing: "ዋጋ",
      tools: "የእቅድ መሳርያዎች",
      realWeddings: "እውነተኛ ሰርጎች",
      login: "ይግቡ",
      getStarted: "ይጀምሩ"
    },
    hero: {
      badge: "በኢትዮጵያ #1 የሰርግ መተግበሪያ",
      titleLine1: "የህልምዎን ሰርግ",
      titleLine2: "በብቃት ያቅዱ",
      subtitle: "የህልምዎ ሀበሻ ሰርግ እዚህ ይጀምራል። ምርጥ አቅራቢዎችን ያግኙ፣ እንግዶችን ያስተዳድሩ እና በጀትዎን ይቆጣጠሩ።",
      guidedEntryTitle: "ሰርጉ መቼ ነው?",
      selectMonth: "ወር ይምረጡ",
      selectYear: "ዓመት ይምረጡ",
      startPlanning: "በነፃ ማቀድ ይጀምሩ",
      noCard: "ክፍያ አይጠይቅም"
    },
    roadmap: {
      tag: "ደረጃ በደረጃ",
      title: "ወደ ጋብቻ የሚወስድዎ የግል መመሪያ",
      desc: "የሰርግ ዝግጅት አድካሚ ሊሆን ይችላል። እኛ ግን ከሀበሻ ባህል ጋር በተስማማ ዝርዝር እናቀልልልዎታለን።",
      btn: "ሙሉ ዝርዝሩን ይመልከቱ",
      items: [
        { title: "በጀት ይወስኑ", time: "12+ ወራት", completed: true },
        { title: "ቦታ ይያዙ", time: "10-12 ወራት", completed: true },
        { title: "ፎቶግራፍ አንሺ ይቀጥሩ", time: "8-10 ወራት", completed: false },
        { title: "ጥሪ ካርድ ይላኩ", time: "6-8 ወራት", completed: false },
      ]
    },
    features: {
      title: "የሚያስፈልግዎ ሁሉ",
      subtitle: "ለሀበሻ ሰርጎች ውስብስብነት ተብለው የተዘጋጁ ኃይለኛ መሳርያዎች።",
      cards: [
        { title: "ዘመናዊ የእንግዶች አስተዳደር", desc: "ከ500 በላይ እንግዶችን በቀላሉ ያስተዳድሩ። የኤስኤምኤስ ጥሪዎችን በአማርኛ እና እንግሊዝኛ ይላኩ፣ የመቀመጫ ቦታዎችን ይመድቡ።", btn: "የእንግዳ መተግበሪያውን ይሞክሩ" },
        { title: "የተረጋገጡ አቅራቢዎች", desc: "በኢትዮጵያ ውስጥ በጣም የታመኑ የሰርግ ባለሙያዎችን ያግኙ። በእርስዎ ከመሰሉ ጥንዶች ደረጃ የተሰጣቸው።", btn: "ዝርዝሩን ያስሱ" },
        { title: "የበጀት መቆጣጠሪያ", desc: "ያለ ጭንቀት በጀትዎን ይቆጣጠሩ። ለመልስ፣ ለተሎች እና ለዋናው ቀን በጀት ይመድቡ።", stats: { total: "ጠቅላላ በጀት", spent: "ወጪ" } }
      ]
    },
    vendors: {
      title: "የአቅራቢዎች ዝርዝር",
      subtitle: "በዘርፉ ያሉ ምርጥ ባለሙያዎች፣ በእጅዎ መዳፍ ላይ።",
      btn: "ሁሉንም 200+ አቅራቢዎች ይመልከቱ",
      cats: [
        { name: "ፎቶግራፍ", count: "120+ ባለሙያዎች", img: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=2070&auto=format&fit=crop" },
        { name: "ምግብ ዝግጅት", count: "85+ አቅራቢዎች", img: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2070&auto=format&fit=crop" },
        { name: "ሙዚቃ እና ዲጄ", count: "50+ አርቲስቶች", img: "https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=2070&auto=format&fit=crop" },
        { name: "ዲኮር", count: "90+ ጌጣጌጦች", img: "https://images.unsplash.com/photo-1519225421980-715cb0202128?q=80&w=2070&auto=format&fit=crop" },
        { name: "መጓጓዣ", count: "40+ አማራጮች", img: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=2070&auto=format&fit=crop" },
        { name: "ሜካፕ", count: "60+ ባለሙያዎች", img: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=2071&auto=format&fit=crop" }
      ]
    },
    testimonials: {
        title: "ደንበኞቻችን ምን ይላሉ?",
        subtitle: "የሰርግ እቅዳቸውን ከእኛ ጋር ያሳኩ ጥንዶች አስተያየት።",
        t1: "የእንግዳ ዝርዝር መሳሪያው በጣም ጠቅሞናል። የኤስኤምኤስ ጥሪዎችን በአማርኛ ልከን ምላሾችን ወዲያውኑ መከታተል ቻልን። ልክ የራሳችንን ባለሙያ አቀናባሪ የያዝን ያህል ነበር።",
        t2: "የመልስ ልብስ ለማግኘት ተጨንቄ ነበር። እዚህ ያገኘኋት ዲዛይነር ግን ፍላጎቴን በትክክል ተረድታልኝ ሰርታልኛለች።",
        t3: "በትክክለኛው በጀታችን ነው የጨረስነው። ካልኩሌተሩ ለተሎች እና ለመልስ በጀት እንዴት መመደብ እንዳለብን አግዞናል።",
        t4: "WedHabesha ታላቁን ቀናችን የማይረሳ አደረገው! የአቅራቢዎች ምርጫ ምርጥ ነበር፣ እና የበጀት መሳሪያዎች ረድተውናል።",
        t5: "ለማንኛውም የኢትዮጵያ ሰርግ የግድ የሚያስፈልግ መተግበሪያ። የቼክሊስት ባህሪው በእያንዳንዱ ሂደት ውስጥ ተደራጅተን እንድንቆይ አድርጎናል።",
        t6: "ይህንን እስክናገኝ ድረስ ከውጭ ሆኖ ማቀድ በጣም ከባድ ነበር። ከአገር ውስጥ አቅራቢዎች ጋር በርቀት ማቀናጀት መቻላችን ትልቅ ለውጥ አመጣ።"
    },
    cta: {
      badge: "ዛሬ በነጻ ይጀምሩ",
      title: "የህልምዎን ሰርግ ለማቀድ ዝግጁ ነዎት?",
      subtitle: "ትልቁን ቀናቸውን ለማሳመር WedHabeshaን የሚያምኑ በሺዎች የሚቆጠሩ የኢትዮጵያ ጥንዶችን ይቀላቀሉ።",
      btnPrimary: "አሁኑኑ ይጀምሩ",
      btnSecondary: "አቅራቢዎችን ያስሱ"
    },
    footer: {
      company: "ድርጅት",
      tools: "የእቅድ መሳርያዎች",
      vendors: "አቅራቢዎች",
      rights: "መብቱ በህግ የተጠበቀ ነው።"
    }
  }
};

// --- INLINE COMPONENTS FOR PREVIEW ---

// 1. Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'glass';
  size?: 'default' | 'lg' | 'sm';
}
const Button: React.FC<ButtonProps> = ({ 
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
    glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-xl"
  };
  const sizes = {
    sm: "h-9 px-4 text-sm",
    default: "h-12 px-6",
    lg: "h-14 px-8 text-lg",
  };
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props} 
    />
  );
};

// 2. Card Component
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`rounded-2xl border bg-card text-card-foreground shadow-sm ${className}`} {...props} />
);

// 3. Layout Component
interface LayoutProps {
    children: React.ReactNode;
    lang: 'en' | 'am';
    setLang: (lang: 'en' | 'am') => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, lang, setLang, isDarkMode, toggleDarkMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = translations[lang];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLang = () => {
    setLang(lang === 'en' ? 'am' : 'en');
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
               
               <Link to="/templates" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   Templates
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </Link>
               
               <Link to="/pricing" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   {t.nav.pricing}
                   <span className="absolute bottom-0 left-0 w-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
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

      {/* Main Content */}
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
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                The #1 wedding planning platform for Ethiopian couples worldwide. We make your special day effortless.
              </p>
              <div className="flex gap-4">
                {/* Social Icons */}
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-blue-600 hover:text-blue-600 transition-all cursor-pointer shadow-sm group">
                  <Facebook className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-pink-600 hover:text-pink-600 transition-all cursor-pointer shadow-sm group">
                  <Instagram className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-pink-600" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all cursor-pointer shadow-sm group">
                  {/* Custom TikTok SVG since standard set might vary */}
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white"
                  >
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-blue-700 hover:text-blue-700 transition-all cursor-pointer shadow-sm group">
                  <Linkedin className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-700" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.company}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                <li><Link to="/about" className="hover:text-rose-600 transition-colors">About Us</Link></li>
               <li><Link to="/careers" className="hover:text-rose-600 transition-colors">Careers</Link></li>
                               <li><Link to="/press" className="hover:text-rose-600 transition-colors">Press & Media</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.tools}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Wedding Checklist</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Guest List Manager</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Budget Calculator</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Seating Chart</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.vendors}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                <li><Link to="/login" className="hover:text-rose-600 transition-colors">Vendor Login</Link></li>
                <li><Link to="/vendors" className="hover:text-rose-600 transition-colors">List Your Business</Link></li>
                <li><a href="#testimonials" className="hover:text-rose-600 transition-colors">Real Wedding Submissions</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} WedHabesha. {t.footer.rights}</p>
            <div className="flex gap-6">
               <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white">Privacy</Link>
                <Link to="/terms" className="hover:text-gray-900 dark:hover:text-white">Terms</Link>
                <Link to="/sitemap" className="hover:text-gray-900 dark:hover:text-white">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- HOMEPAGE COMPONENT ---
const HomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();

  const t = translations[lang];

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

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

  const testimonials = [
    {
      name: "Meron & Daniel",
      text: t.testimonials.t1,
      location: "Addis Ababa",
      role: "January 2024",
      image: "https://images.unsplash.com/photo-1623910385966-22a454559811?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stars: 5
    },
    {
      name: "Sara & Michael", 
      text: t.testimonials.t2,
      location: "Bahir Dar",
      role: "September 2023",
      image: "https://images.unsplash.com/photo-1549416867-b873a2db7025?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stars: 5
    },
    {
      name: "Hanan & Yonas",
      text: t.testimonials.t3,
      location: "Hawassa",
      role: "December 2023",
      image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stars: 5
    },
    // New testimonials
    {
      name: "Lydia & Petros",
      text: t.testimonials.t4,
      location: "Adama",
      role: "February 2024",
      image: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stars: 5
    },
    {
      name: "Rahel & Thomas",
      text: t.testimonials.t5,
      location: "Gondar",
      role: "March 2024",
      image: "https://images.unsplash.com/photo-1621252179027-94459d27d3ee?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stars: 4
    },
    {
      name: "Bethel & Kaleb",
      text: t.testimonials.t6,
      location: "Washington, DC",
      role: "April 2024",
      image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stars: 5
    }
  ];

  const features = t.features.cards.map((card, index) => {
      const IconList = [Users, Store, Calculator];
      const colors = ["bg-blue-100 dark:bg-blue-900/30 text-blue-600", "bg-white/20", "bg-green-100 dark:bg-green-900/30 text-green-600"];
      return { ...card, Icon: IconList[index], styleColor: colors[index] };
  });

  const vendorCategories = t.vendors.cats.map((cat, index) => {
      const IconList = [Camera, Utensils, Music, Flower2, Car, Palette];
      const colors = [
          "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
          "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
          "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
          "text-pink-600 bg-pink-50 dark:bg-pink-900/20",
          "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
          "text-teal-600 bg-teal-50 dark:bg-teal-900/20"
      ];
      // Using category index to link images from the expanded translation object is one way,
      // but simpler to pass it through if possible. Here I will rely on the mapped t.vendors.cats object which now has images.
      const links = ["photography", "catering", "music", "decor", "transport", "makeup"];
      return { ...cat, Icon: IconList[index], color: colors[index], link: `/vendors?category=${links[index]}` };
  });

  const checklistItems = t.roadmap.items;

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 8000); 
    
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(featureInterval);
    };
  }, []);

  // --- SAFE ICON COMPONENTS ---
  const Feature1Icon = features[0].Icon;
  const Feature2Icon = features[1].Icon;
  const Feature3Icon = features[2].Icon;

  return (
      <Layout lang={lang} setLang={setLang} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}>
        {/* Hero Section */}
        <div className="relative overflow-hidden min-h-[110vh] flex items-center pt-20 bg-white dark:bg-gray-950">
          
          {/* Refined Mesh Gradient Background */}
          <div className="absolute inset-0 w-full h-full bg-white dark:bg-gray-950">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-200/30 dark:bg-rose-900/10 blur-[120px] animate-pulse"></div>
             <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-200/30 dark:bg-purple-900/10 blur-[120px] animate-pulse animation-delay-2000"></div>
             <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-200/30 dark:bg-blue-900/10 blur-[100px]"></div>
          </div>
          
          <div className="relative container mx-auto px-4 pb-20">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column - Content */}
              <div className={`lg:col-span-7 pl-20 space-y-10 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                
                {/* Premium Trust Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-default">
                  <span className="flex text-amber-400 gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                  </span>
                  <div className="w-px h-3 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {t.hero.badge}
                  </span>
                </div>

                {/* Typography */}
                <div className="space-y-6">
                  <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-gray-900 dark:text-white leading-[1.05] tracking-tight font-menbere">
                    {t.hero.titleLine1} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 animate-gradient">
                      {t.hero.titleLine2}
                    </span>
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-xl font-light">
                    {t.hero.subtitle}
                  </p>
                </div>
                
                {/* FLOATING GLASS CARD: GUIDED ENTRY */}
                <div className="group relative bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl p-3 rounded-3xl shadow-2xl shadow-rose-900/5 border border-white/50 dark:border-gray-700 ring-1 ring-gray-900/5 max-w-lg transition-transform hover:-translate-y-1 duration-500">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-20 blur transition duration-500"></div>
                  <div className="relative p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-rose-600" />
                        <label className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">
                          {t.hero.guidedEntryTitle}
                        </label>
                      </div>
                      
                      <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                          <select className="w-full h-14 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 appearance-none focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer font-medium shadow-sm transition-all hover:border-rose-300">
                              <option>{t.hero.selectMonth}</option>
                              <option>January</option>
                              <option>September (Meskerem)</option>
                              <option>January (Tir)</option>
                          </select>
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
                        </div>
                        <div className="relative w-1/3">
                          <select className="w-full h-14 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 appearance-none focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer font-medium shadow-sm transition-all hover:border-rose-300">
                              <option>2024</option>
                              <option>2025</option>
                              <option>2026</option>
                          </select>
                           <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
                        </div>
                      </div>

                      <Link to="/register">
                          <Button size="lg" className="w-full h-14 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white shadow-xl shadow-rose-500/20 text-lg font-bold tracking-wide">
                            {t.hero.startPlanning}
                          </Button>
                      </Link>
                      <div className="text-center mt-3">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> {t.hero.noCard}
                          </p>
                      </div>
                  </div>
                </div>

              </div>

              {/* Right Column - UPDATED Hero Image Composition */}
              <div className={`lg:col-span-5 relative transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                <div className="relative h-[600px] w-full flex items-center justify-center">
                    
                    {/* Abstract Shapes behind */}
                    <div className="absolute top-1/4 right-0 w-64 h-64 bg-rose-300 dark:bg-rose-900/40 rounded-full blur-[80px] -z-10 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-300 dark:bg-indigo-900/40 rounded-full blur-[80px] -z-10 animate-pulse delay-700"></div>

                    {/* Image Grid Composition */}
                    <div className="relative w-full max-w-md aspect-[2/3]">
                        {/* Main Large Image */}
                        <div className="absolute inset-0 rounded-t-[195px] rounded-b-[15px] overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800 z-10 hover:scale-[1.02] transition-transform duration-700">
                            <img 
                                src="./image1.png" 
                                alt="Ethiopian Couple" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                        </div>

                        {/* Secondary Floating Image - Top Right */}
                        <div className="absolute -top-17 -right-10 w-40 h-40 rounded-[30px] overflow-hidden border-0 border-white dark:border-gray-800 z-20 animate-float-slow hidden md:block">
                             <img 
                                src="./ring.png" 
                                alt="Details" 
                                className="w-100 h-100 object-cover"
                            />
                        </div>

                        {/* Floating Interaction Card - Bottom Left */}
                        <div className="absolute -bottom-8 -left-8 bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 z-30 animate-bounce-slow max-w-[200px]">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex -space-x-2">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 overflow-hidden">
                                            <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                    <span className="text-rose-600 block text-sm">2k+</span>
                                    Couples
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full w-fit">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs font-bold text-green-700 dark:text-green-400">Planning now</span>
                            </div>
                        </div>

                        {/* Decorative Badge */}
                        <div className="absolute top-10 -left-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/50 dark:border-gray-700 z-20 rotate-[-6deg]">
                            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                        </div>
                    </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Roadmap Section - "The Journey" */}
        <div className="pl-20 py-24 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900">
          <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-start justify-between gap-16">
                
                <div className="md:w-5/12 sticky top-24">
                    <span className="inline-block py-1 px-3 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold tracking-wide uppercase text-xs mb-4">
                      {t.roadmap.tag}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight font-menbere">
                      {t.roadmap.title}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                      {t.roadmap.desc}
                    </p>
                    <Link to="/register">
                      <Button variant="default" className="shadow-lg shadow-rose-500/20">
                          {t.roadmap.btn} <ArrowRight className="ml-2 w-4 h-4"/>
                      </Button>
                    </Link>
                </div>

                {/* Timeline Visual */}
                <div className="md:w-6/12 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-dashed border-l-2 border-dashed border-gray-200 dark:border-gray-800"></div>

                    <div className="space-y-8">
                      {checklistItems.map((item, idx) => (
                          <div key={idx} className="relative flex items-center gap-6 group">
                            <div className={`relative z-10 shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${item.completed ? 'bg-green-500 text-white rotate-3' : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-700'}`}>
                                {item.completed ? <CheckCircle className="w-8 h-8" /> : <div className="w-6 h-6 rounded-full border-2 border-current" />}
                            </div>
                            <div className="flex-1 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className={`text-lg font-bold font-menbere ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{item.title}</h4>
                                  {item.completed && <span className="text-green-500 text-xs font-bold uppercase tracking-wider">Done</span>}
                                </div>
                                <span className="text-sm font-medium text-rose-500">{item.time}</span>
                            </div>
                          </div>
                      ))}
                    </div>
                </div>
              </div>
          </div>
        </div>

        {/* Bento Grid Features Section */}
        <div className="py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight font-menbere">
                {t.features.title}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-light">
                {t.features.subtitle}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
              {/* Feature 1 - Large */}
              <div className="lg:col-span-2 group relative overflow-hidden rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-500">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                 <div className="p-10 relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${features[0].styleColor}`}>
                        <Feature1Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 font-menbere">{features[0].title}</h3>
                      <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md">
                        {features[0].desc}
                      </p>
                    </div>
                    <Link to="/dashboard" className="mt-8 flex items-center text-blue-600 font-bold group-hover:translate-x-2 transition-transform">
                       {features[0].btn} <ArrowRight className="ml-2 w-5 h-5"/>
                    </Link>
                 </div>
                 {/* Decorative image positioned absolutely */}
                 <img src="/Guest.png" className="absolute bottom-0 right-0 w-1/2 rounded-tl-3xl shadow-2xl border-t-4 border-l-4 border-white dark:border-gray-900 translate-y-10 translate-x-10 group-hover:translate-y-6 group-hover:translate-x-6 transition-transform duration-500" alt="Guest interface" />
              </div>

              {/* Feature 2 - Tall */}
              <div className="lg:row-span-2 group relative overflow-hidden rounded-[2.5rem] bg-gray-900 text-white shadow-xl hover:shadow-2xl transition-all duration-500">
                 <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black opacity-80"></div>
                 <img src="/Vendor.png" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" alt="Vendor directory" />
                 <div className="relative z-10 p-10 h-full flex flex-col">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-auto">
                        <Feature2Icon className="w-7 h-7" />
                    </div>
                    <div className="mt-auto">
                       <h3 className="text-3xl font-bold mb-4 font-menbere">{features[1].title}</h3>
                       <p className="text-gray-300 mb-8 leading-relaxed">
                          {features[1].desc}
                       </p>
                       <Link to="/vendors">
                         <Button variant="glass" className="w-full">
                            {features[1].btn}
                         </Button>
                       </Link>
                    </div>
                 </div>
              </div>

              {/* Feature 3 */}
              <div className="lg:col-span-2 group relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-500">
                 <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
                 <div className="p-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${features[2].styleColor}`}>
                        <Feature3Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 font-menbere">{features[2].title}</h3>
                      <p className="text-lg text-gray-600 dark:text-gray-300">
                        {features[2].desc}
                      </p>
                    </div>
                    <div className="w-full md:w-1/2 relative">
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-500">{t.features.cards[2].stats?.total}</span>
                              <span className="font-bold text-green-600">ETB 850,000</span>
                           </div>
                           <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                              <div className="bg-green-500 h-3 rounded-full w-[65%]"></div>
                           </div>
                           <div className="text-xs text-right text-gray-400">65% {t.features.cards[2].stats?.spent}</div>
                        </div>
                    </div>
                 </div>
              </div>
            </div>

          </div>
        </div>

        {/* Categories Section - Clean & Minimal */}
        <div className="py-24 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
              <div>
                  <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white font-menbere">{t.vendors.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg font-light">{t.vendors.subtitle}</p>
              </div>
              <Link to="/vendors">
                <Button variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                    {t.vendors.btn} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {vendorCategories.map((cat, index) => {
                const Icon = cat.Icon;
                return (
                  <Link to={cat.link} key={index} className="group relative h-64 overflow-hidden rounded-3xl cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-1">
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0">
                      <img src={cat.img} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-center z-10">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 duration-300 bg-white/20 backdrop-blur-md text-white border border-white/30`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white text-base mb-1 font-menbere">
                        {cat.name}
                      </h4>
                      <p className="text-xs font-medium text-gray-300">
                        {cat.count}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* UPDATED TESTIMONIAL SECTION: SCROLLING MARQUEE */}
        <div id="testimonials" className="py-24 bg-white dark:bg-gray-900 relative overflow-hidden">
          {/* Subtle Backgound blobs */}
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-rose-50 dark:bg-rose-900/10 rounded-full blur-[100px] -translate-x-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-[100px] translate-x-1/2"></div>

          <div className="container mx-auto px-4 relative z-10 mb-12">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto">
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 rounded-full text-sm font-bold mb-6">
                 <Heart className="w-3.5 h-3.5 fill-current" />
                 Love Stories
               </div>
               <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 font-menbere">
                 {t.testimonials.title}
               </h2>
               <p className="text-lg text-gray-600 dark:text-gray-400">
                 {t.testimonials.subtitle}
               </p>
            </div>
          </div>

          {/* Infinite Scrolling Track */}
          <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
            <div className="flex items-center justify-center md:justify-start [&_li]:mx-8 [&_img]:max-w-none animate-scroll hover:[animation-play-state:paused]">
                {/* Original Items */}
                {testimonials.map((item, index) => (
                    <div key={index} className="w-[350px] md:w-[450px] flex-shrink-0 mx-4">
                      <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
                        {/* Rating */}
                        <div className="flex gap-1 mb-6 text-amber-400">
                          {[...Array(item.stars)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        {/* Quote */}
                        <div className="relative mb-6 flex-grow">
                          <Quote className="absolute -top-2 -left-2 w-8 h-8 text-rose-100 dark:text-rose-900/30 rotate-180" />
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed relative z-10 font-medium italic text-lg">
                            "{item.text}"
                          </p>
                        </div>
                        {/* Profile */}
                        <div className="flex items-center gap-4 mt-auto pt-6 border-t border-gray-50 dark:border-gray-700/50">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm ring-2 ring-rose-50 dark:ring-rose-900/20">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                              <h5 className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</h5>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                {item.location}
                              </div>
                          </div>
                        </div>
                      </div>
                    </div>
                ))}
                
                {/* Duplicated Items for Seamless Loop */}
                {testimonials.map((item, index) => (
                    <div key={`dup-${index}`} className="w-[350px] md:w-[450px] flex-shrink-0 mx-4">
                      <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
                        <div className="flex gap-1 mb-6 text-amber-400">
                          {[...Array(item.stars)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        <div className="relative mb-6 flex-grow">
                          <Quote className="absolute -top-2 -left-2 w-8 h-8 text-rose-100 dark:text-rose-900/30 rotate-180" />
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed relative z-10 font-medium italic text-lg">
                            "{item.text}"
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-auto pt-6 border-t border-gray-50 dark:border-gray-700/50">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm ring-2 ring-rose-50 dark:ring-rose-900/20">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                              <h5 className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</h5>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                {item.location}
                              </div>
                          </div>
                        </div>
                      </div>
                    </div>
                ))}
            </div>
          </div>

          <div className="container mx-auto px-4 mt-12 text-center relative z-10">
             <Link to="/register">
               <Button variant="ghost" className="text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20">
                 Start your own story <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
             </Link>
          </div>
        </div>

        {/* Final CTA - Immersive */}
        <div className="relative py-32 bg-gray-900 dark:bg-black overflow-hidden">
          <div className="absolute inset-0">
             <img src="/image1.png" className="w-full h-full object-cover opacity-20 blur-sm" alt="Background" />
             <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/90 to-gray-900"></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <span className="inline-block py-1 px-3 rounded-full bg-white/10 text-white border border-white/20 font-bold tracking-wide uppercase text-xs mb-6 backdrop-blur-md">
                {t.cta.badge}
            </span>
            <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight font-menbere">
              {t.cta.title}
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              {t.cta.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link to="/register">
                <Button size="lg" className="h-16 px-12 text-lg font-bold bg-white text-gray-900 hover:bg-rose-50 rounded-2xl shadow-2xl shadow-white/10 hover:scale-105 transition-transform">
                  {t.cta.btnPrimary}
                </Button>
              </Link>
              <Link to="/vendors">
                <Button variant="outline" size="lg" className="h-16 px-12 text-lg font-bold border-2 border-white/30 text-white hover:bg-white/10 rounded-2xl">
                  {t.cta.btnSecondary}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
  );
};

export default HomePage;