import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Scale, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Menu,
  X,
  Sun,
  Moon,
  Facebook,
  Instagram,
  Linkedin,
  Heart,
  Gavel,
  Users,
  Building,
  CreditCard,
  MessageSquare,
  Lock,
  Globe,
  Map, 
  Home, 
  Briefcase, 
  Compass,
  ArrowRight,
  GitBranch,
  Circle,
  Database,
  Layout as LayoutIcon,
  Server,  
  Store, 
  Calculator, 
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
import { useAuth } from '../contexts/AuthContext';
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
      badge: "Legal",
      title: "Terms & ",
      titleHighlight: "Conditions",
      subtitle: "Welcome to our wedding planning and management platform. By accessing or using the Platform, you agree to be bound by these Terms.",
      effectiveDate: "Effective Date: "
    },
    intro: {
      title: "Agreement to Terms",
      text: "These Terms & Conditions (“Terms”) govern your access to and use of the Platform and its services. If you do not agree, please do not use the Platform. By accessing the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms."
    },
    sections: {
      1: { title: "Definitions", content: [
        { label: "Platform", text: "The wedding planning, vendor marketplace, guest management, and check-in system." },
        { label: "User", text: "Any person accessing the Platform, including Couples, Vendors, Guests, Staff, and Administrators." },
        { label: "Couple", text: "Users creating and managing a wedding." },
        { label: "Vendor", text: "Service providers offering wedding-related services." },
        { label: "Guest", text: "Individuals invited to a wedding through the Platform." },
        { label: "Staff", text: "Authorized wedding-day personnel using check-in tools." },
        { label: "We/Us/Our", text: "The Platform operator." }
      ]},
      2: { title: "Eligibility", content: [
        "You must be at least 18 years old to create an account or use the Platform as a Couple or Vendor.",
        "Guests may use the Platform only through invitations provided by Couples."
      ]},
      3: { title: "Account Registration & Security", content: [
        "You are responsible for maintaining the confidentiality of your login credentials.",
        "You agree to provide accurate and complete information during registration.",
        "You are responsible for all activities conducted through your account.",
        "We reserve the right to suspend or terminate accounts that violate these Terms."
      ]},
      4: { title: "Platform Services", intro: "The Platform provides tools including but not limited to:", list: [
        "Wedding planning and management",
        "Guest invitations and RSVP tracking",
        "QR code–based guest check-in",
        "Vendor discovery, messaging, and bookings",
        "Budget tracking and analytics",
        "Real-time communication and notifications"
      ], footer: "We may modify, suspend, or discontinue any part of the Platform at any time." },
      5: { title: "Wedding & Guest Data", content: [
        "Couples are responsible for the accuracy of guest information they upload.",
        "Guest data is used solely for wedding-related purposes.",
        "QR codes are unique per guest and per wedding and may not be reused.",
        "Unauthorized access to guest or wedding data is strictly prohibited."
      ]},
      6: { title: "Vendor Responsibilities", content: [
        "Provide truthful and accurate business information.",
        "Maintain professional conduct when interacting with couples.",
        "Deliver services as agreed between vendor and couple.",
        "Comply with applicable laws and regulations.",
        "We do not guarantee bookings, leads, or revenue for vendors."
      ]},
      7: { title: "Bookings & Payments", text: "Any agreements, quotes, or payments between Couples and Vendors are made directly between those parties. The Platform is not responsible for disputes, service quality, cancellations, or refunds unless explicitly stated. We may offer payment facilitation tools, but we are not a party to vendor contracts." },
      8: { title: "Reviews & Content", text: "Reviews must be honest and based on genuine experiences. We reserve the right to remove reviews that are abusive, false, or misleading. Users grant us a non-exclusive right to display reviews and platform-generated content." },
      9: { title: "Acceptable Use", text: "You agree not to use the Platform for unlawful purposes, impersonate others, upload malicious or harmful content, scrape, copy, or reverse-engineer the Platform, or interfere with platform security. Violations may result in suspension or termination." },
      10: { title: "Staff Access & Check-In", text: "Staff access is limited to authorized weddings only via access codes provided by the Couple. Staff access is time-limited and event-specific. Any misuse of check-in tools may result in immediate revocation of access." },
      legal: { title: "Legal Provisions", items: [
        { title: "11. Data Privacy", text: "Your use of the Platform is also governed by our Privacy Policy, which explains how we collect, use, and protect personal data." },
        { title: "12. Intellectual Property", text: "All Platform content, design, logos, and software are owned by us or licensed to us. You may not copy, modify, distribute, or exploit any part without permission." },
        { title: "13. Disclaimer of Warranties", text: "The Platform is provided “as is” and “as available.” We do not guarantee error-free operation, vendor performance, or guest attendance." },
        { title: "14. Limitation of Liability", text: "We are not liable for indirect, incidental, or consequential damages. We are not responsible for disputes between Couples, Vendors, Guests, or Staff." },
        { title: "15. Termination", text: "We may suspend or terminate access for violation of these Terms, misuse, abuse, or legal reasons. Users may terminate their account at any time." },
        { title: "16. Changes to These Terms", text: "We may update these Terms from time to time. Changes will be posted with an updated effective date. Continued use means acceptance." },
        { title: "17. Governing Law", text: "These Terms shall be governed by applicable laws where the Platform operates, without regard to conflict of law principles." }
      ]},
      contact: {
        title: "18. Contact Information",
        text: "For questions or concerns about these Terms, please contact us."
      }
    },
    footer: {
      company: "Company",
      tools: "Planning Tools",
      vendorsList: "Vendors",
      rights: "All rights reserved.",
      tagline: "By using our platform, you agree to fair use, honest conduct, and respectful collaboration."
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
      badge: "ህጋዊ",
      title: "የአገልግሎት ",
      titleHighlight: "ውሎች",
      subtitle: "እንኳን ወደ ሰርግ እቅድ እና አስተዳደር መድረካችን በደህና መጡ። መድረኩን በመጠቀም፣ በእነዚህ ውሎች ለመገዛት ተስማምተዋል።",
      effectiveDate: "የሚፀናበት ቀን: "
    },
    intro: {
      title: "የውል ስምምነት",
      text: "እነዚህ የአገልግሎት ውሎች (“ውሎች”) የመድረኩን እና አገልግሎቶቹን አጠቃቀምዎን ይገዛሉ። ካልተስማሙ፣ እባክዎ መድረኩን አይጠቀሙ። መድረኩን በመጠቀም፣ እነዚህን ውሎች አንብበው፣ ተረድተው እና በእነሱ ለመገዛት እንደተስማሙ ያረጋግጣሉ።"
    },
    sections: {
      1: { title: "ትርጓሜዎች", content: [
        { label: "መድረክ", text: "የሰርግ እቅድ፣ የአቅራቢዎች ገበያ፣ የእንግዳ አስተዳደር እና የፍተሻ ስርዓት።" },
        { label: "ተጠቃሚ", text: "መድረኩን የሚጠቀም ማንኛውም ሰው፣ ጥንዶች፣ አቅራቢዎች፣ እንግዶች፣ ሰራተኞች እና አስተዳዳሪዎችን ጨምሮ።" },
        { label: "ጥንዶች", text: "ሰርግ የሚፈጥሩ እና የሚያስተዳድሩ ተጠቃሚዎች።" },
        { label: "አቅራቢ", text: "ከሰርግ ጋር የተያያዙ አገልግሎቶችን የሚሰጡ።" },
        { label: "እንግዳ", text: "በመድረኩ በኩል ለሰርግ የተጋበዙ ግለሰቦች።" },
        { label: "ሰራተኛ", text: "የፍተሻ መሳሪያዎችን የሚጠቀሙ የተፈቀደላቸው የሰርግ ቀን ሰራተኞች።" },
        { label: "እኛ/የእኛ", text: "የመድረክ አቅራቢው።" }
      ]},
      2: { title: "ብቁነት", content: [
        "መለያ ለመፍጠር ወይም እንደ ጥንዶች ወይም አቅራቢ ለመጠቀም ቢያንስ 18 ዓመት ሊኖርዎት ይገባል።",
        "እንግዶች መድረኩን መጠቀም የሚችሉት በጥንዶች በተሰጠ ግብዣ ብቻ ነው።"
      ]},
      3: { title: "የመለያ ምዝገባ እና ደህንነት", content: [
        "የመግቢያ መረጃዎን ሚስጥራዊነት የመጠበቅ ኃላፊነት አለብዎት።",
        "በምዝገባ ወቅት ትክክለኛ እና የተሟላ መረጃ ለመስጠት ተስማምተዋል።",
        "በመለያዎ በኩል ለሚከናወኑ ሁሉም ተግባራት ኃላፊነት ይወስዳሉ።",
        "እነዚህን ውሎች የሚጥሱ መለያዎችን የማገድ ወይም የመሰረዝ መብታችን የተጠበቀ ነው።"
      ]},
      4: { title: "የመድረክ አገልግሎቶች", intro: "መድረኩ የሚከተሉትን ጨምሮ መሳሪያዎችን ያቀርባል:", list: [
        "የሰርግ እቅድ እና አስተዳደር",
        "የእንግዳ ግብዣዎች እና የRSVP ክትትል",
        "በQR ኮድ ላይ የተመሰረተ የእንግዳ ፍተሻ",
        "የአቅራቢዎች ፍለጋ፣ መልእክት መላላክ እና ቅያሪ",
        "የበጀት ክትትል እና ትንታኔ",
        "የእውነተኛ ጊዜ ግንኙነት እና ማሳወቂያዎች"
      ], footer: "ማንኛውንም የመድረኩን ክፍል በማንኛውም ጊዜ ልንቀይር፣ ልናቋርጥ ወይም ልንሰርዝ እንችላለን።" },
      5: { title: "የሰርግ እና የእንግዳ መረጃ", content: [
        "ጥንዶች ለሚጭኑት የእንግዳ መረጃ ትክክለኛነት ኃላፊነት አለባቸው።",
        "የእንግዳ መረጃ ለሰርግ ዓላማዎች ብቻ ጥቅም ላይ ይውላል።",
        "የQR ኮዶች ለእያንዳንዱ እንግዳ እና ሰርግ ልዩ ናቸው እና እንደገና ጥቅም ላይ ሊውሉ አይችሉም።",
        "ያልተፈቀደ የእንግዳ ወይም የሰርግ መረጃ መዳረሻ በጥብቅ የተከለከለ ነው።"
      ]},
      6: { title: "የአቅራቢ ኃላፊነቶች", content: [
        "እውነተኛ እና ትክክለኛ የንግድ መረጃ ማቅረብ።",
        "ከጥንዶች ጋር ሲገናኙ ሙያዊ ሥነ-ምግባርን መጠበቅ።",
        "በአቅራቢው እና በጥንዶች መካከል በተስማማው መሰረት አገልግሎቶችን ማቅረብ።",
        "የሚመለከታቸው ህጎች እና ደንቦችን ማክበር።",
        "ለአቅራቢዎች ቅያሪ፣ ደንበኞች ወይም ገቢ ዋስትና አንሰጥም።"
      ]},
      7: { title: "ቅያሪዎች እና ክፍያዎች", text: "በጥንዶች እና አቅራቢዎች መካከል የሚደረጉ ማናቸውም ስምምነቶች፣ ዋጋዎች ወይም ክፍያዎች በቀጥታ በዚያው ወገኖች መካከል ይከናወናሉ። መድረኩ በግልፅ ካልተገለጸ በስተቀር ለክርክሮች፣ ለአገልግሎት ጥራት፣ ለስረዛዎች ወይም ለተመላሽ ገንዘቦች ኃላፊነት አይወስድም። የክፍያ ማመቻቻ መሳሪያዎችን ልናቀርብ እንችላለን፣ ነገር ግን የአቅራቢ ውሎች አካል አይደለንም።" },
      8: { title: "ግምገማዎች እና ይዘት", text: "ግምገማዎች ታማኝ እና በእውነተኛ ተሞክሮዎች ላይ የተመሰረቱ መሆን አለባቸው። አስጸያፊ፣ ሐሰተኛ ወይም አሳሳች የሆኑ ግምገማዎችን የማስወገድ መብታችን የተጠበቀ ነው። ተጠቃሚዎች ግምገማዎችን እና በመድረኩ የተፈጠሩ ይዘቶችን ለማሳየት ለኛ መብት ይሰጣሉ።" },
      9: { title: "ተቀባይነት ያለው አጠቃቀም", text: "መድረኩን ለህገ-ወጥ ዓላማዎች ላለመጠቀም፣ ሌሎችን ላለመምሰል፣ ተንኮል-አዘል ይዘትን ላለመስቀል፣ ወይም መረጃን ላለመስረቅ ተስማምተዋል። ጥሰቶች እገዳ ወይም ስረዛን ሊያስከትሉ ይችላሉ።" },
      10: { title: "የሰራተኛ መዳረሻ እና ፍተሻ", text: "የሰራተኛ መዳረሻ ለተፈቀደላቸው ሰርጎች ብቻ የተገደበ ነው። ሰራተኞች በጥንዶች የተሰጠ የመዳረሻ ኮድ መጠቀም አለባቸው። የፍተሻ መሳሪያዎችን አላግባብ መጠቀም የመዳረሻ መብትን ወዲያውኑ ሊያስወግድ ይችላል።" },
      legal: { title: "ህጋዊ ድንጋጌዎች", items: [
        { title: "11. የመረጃ ግላዊነት", text: "የመድረኩ አጠቃቀምዎ የግል መረጃን እንዴት እንደምንሰበስብ፣ እንደምንጠቀም እና እንደምንጠብቅ በሚያብራራው የግላዊነት ፖሊሲያችንም ይገዛል።" },
        { title: "12. የአእምሮ ንብረት", text: "ሁሉም የመድረክ ይዘት፣ ዲዛይን፣ አርማዎች እና ሶፍትዌሮች የእኛ ወይም ፈቃድ የተሰጠን ናቸው። ያለፈቃድ ማናቸውንም ክፍል መቅዳት፣ ማሻሻል ወይም ማሰራጨት አይችሉም።" },
        { title: "13. የዋስትና ማስተባበያ", text: "መድረኩ “እንደሆነ” እና “እንደሚገኝ” ነው የቀረበው። ከስህተት ነጻ የሆነ አሰራር፣ የአቅራቢ አፈጻጸም ወይም የእንግዳ መገኘትን ዋስትና አንሰጥም።" },
        { title: "14. የኃላፊነት ገደብ", text: "ለተዘዋዋሪ ጉዳቶች ተጠያቂ አይደለንም። በጥንዶች፣ አቅራቢዎች፣ እንግዶች ወይም ሰራተኞች መካከል ለሚፈጠሩ አለመግባባቶች ኃላፊነት አንወስድም።" },
        { title: "15. ማቋረጥ", text: "እነዚህን ውሎች በመጣስ፣ አላግባብ በመጠቀም ወይም በህጋዊ ምክንያቶች መዳረሻን ልናግድ ወይም ልናቋርጥ እንችላለን። ተጠቃሚዎች በማንኛውም ጊዜ መለያቸውን መሰረዝ ይችላሉ።" },
        { title: "16. የውሎች ለውጥ", text: "እነዚህን ውሎች አልፎ አልፎ ልናሻሽል እንችላለን። ለውጦች ከዘመነ ቀን ጋር ይለጠፋሉ። መቀጠል ማለት ተቀባይነት አለው ማለት ነው።" },
        { title: "17. ገዥ ህግ", text: "እነዚህ ውሎች መድረኩ በሚንቀሳቀስበት ቦታ በሚመለከታቸው ህጎች መሰረት ይተረጎማሉ።" }
      ]},
      contact: {
        title: "18. የመገኛ መረጃ",
        text: "ስለእነዚህ ውሎች ጥያቄዎች ወይም ስጋቶች ካሉዎት እባክዎ ያነጋግሩን።"
      }
    },
    footer: {
      company: "ድርጅት",
      tools: "የእቅድ መሳርያዎች",
      vendorsList: "አቅራቢዎች",
      rights: "መብቱ በህግ የተጠበቀ ነው።",
      tagline: "መድረካችንን በመጠቀም፣ ለፍትሃዊ አጠቃቀም፣ ለታማኝ አሰራር እና ለአክብሮት የተሞላ ትብብር ተስማምተዋል።"
    }
  }
};

// --- MOCK UI COMPONENTS ---
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

// --- TERMS PAGE CONTENT ---
const TermsPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout lang={lang} setLang={setLang}>
      <div className="bg-white dark:bg-gray-950 min-h-screen">
        
        {/* Header Section */}
        <div className="relative bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-20 overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-green-100 dark:bg-green-900/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-100 dark:bg-emerald-900/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
           
           <div className="container mx-auto px-4 relative z-10 text-center">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-1.5 mb-6 shadow-sm">
                 <Scale className="w-4 h-4 text-green-600" />
                 <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t.hero.badge}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 font-menbere">
                {t.hero.title}<span className="text-green-600">{t.hero.titleHighlight}</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                {t.hero.subtitle}
              </p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">{t.hero.effectiveDate} {today}</p>
           </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            
            {/* Intro Card */}
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-2xl p-8 mb-12">
               <div className="flex items-start gap-4">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm text-green-600">
                     <Gavel className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                     <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-menbere">{t.intro.title}</h3>
                     <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                       {t.intro.text}
                     </p>
                  </div>
               </div>
            </div>

            {/* Terms Sections */}
            <div className="space-y-16 text-gray-800 dark:text-gray-200">
              
              {/* Section 1: Definitions */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 font-menbere">
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">1</span>
                  {t.sections[1].title}
                </h2>
                <div className="pl-11 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    {(t.sections[1].content as Array<{label: string, text: string}>).map((item, idx) => (
                        <li key={idx} className="flex gap-3"><span className="font-bold min-w-[100px] text-gray-900 dark:text-white">{item.label}:</span> {item.text}</li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Section 2 & 3: Eligibility & Account */}
              <div className="grid md:grid-cols-2 gap-12">
                <section>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3 font-menbere">
                    <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">2</span>
                    {t.sections[2].title}
                  </h2>
                  <div className="pl-11 text-sm text-gray-600 dark:text-gray-400 space-y-3">
                    {(t.sections[2].content as string[]).map((item, idx) => <p key={idx}>{item}</p>)}
                  </div>
                </section>
                <section>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3 font-menbere">
                    <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">3</span>
                    {t.sections[3].title}
                  </h2>
                  <div className="pl-11 text-sm text-gray-600 dark:text-gray-400 space-y-3">
                    {(t.sections[3].content as string[]).map((item, idx) => <p key={idx}>{item}</p>)}
                  </div>
                </section>
              </div>

              {/* Section 4: Platform Services */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 font-menbere">
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">4</span>
                  {t.sections[4].title}
                </h2>
                <div className="pl-11">
                  <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="mb-4 text-sm font-bold text-gray-700 dark:text-gray-300">{(t.sections[4] as any).intro}</p>
                    <ul className="grid md:grid-cols-2 gap-3 text-sm">
                      {(t.sections[4] as any).list.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs text-gray-500 italic">{(t.sections[4] as any).footer}</p>
                  </div>
                </div>
              </section>

              {/* Section 5 & 6: Data & Vendors */}
              <section className="grid md:grid-cols-2 gap-8">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-900 transition-colors">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2 font-menbere">
                      <span className="text-gray-400 text-sm mr-2">5</span>
                      <Users className="w-5 h-5 text-rose-500" /> {t.sections[5].title}
                    </h3>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5 marker:text-rose-300">
                      {(t.sections[5].content as string[]).map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                 </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-900 transition-colors">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2 font-menbere">
                      <span className="text-gray-400 text-sm mr-2">6</span>
                      <Building className="w-5 h-5 text-blue-500" /> {t.sections[6].title}
                    </h3>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5 marker:text-blue-300">
                      {(t.sections[6].content as string[]).map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                 </div>
              </section>

              {/* Section 7, 8, 9, 10: Usage & Content */}
              <section className="space-y-8 pl-11 border-l-2 border-gray-100 dark:border-gray-800 ml-4">
                
                <div className="relative">
                  <div className="absolute -left-[53px] top-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">7</div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-400" /> {t.sections[7].title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {(t.sections[7] as any).text}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[53px] top-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">8</div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-400" /> {t.sections[8].title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {(t.sections[8] as any).text}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[53px] top-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">9</div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" /> {t.sections[9].title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {(t.sections[9] as any).text}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[53px] top-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">10</div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" /> {t.sections[10].title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {(t.sections[10] as any).text}
                  </p>
                </div>
              </section>

              {/* Section 11-17 Summarized */}
              <section className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.sections.legal.title}</h2>
                <div className="grid md:grid-cols-2 gap-8 text-sm text-gray-600 dark:text-gray-400">
                   <div>
                      {(t.sections.legal.items as Array<{title: string, text: string}>).slice(0, 4).map((item, idx) => (
                          <div className="mb-6" key={idx}>
                            <strong className="block text-gray-900 dark:text-white mb-1">{item.title}</strong>
                            <p>{item.text}</p>
                          </div>
                      ))}
                   </div>
                   <div>
                      {(t.sections.legal.items as Array<{title: string, text: string}>).slice(4).map((item, idx) => (
                          <div className="mb-6" key={idx}>
                            <strong className="block text-gray-900 dark:text-white mb-1">{item.title}</strong>
                            <p>{item.text}</p>
                          </div>
                      ))}
                   </div>
                </div>
              </section>

              {/* Section 18: Contact */}
              <section className="text-center pt-8 border-t border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 font-menbere">{t.sections.contact.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t.sections.contact.text}
                </p>
                <div className="inline-block text-left bg-white dark:bg-gray-800 px-8 py-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                   <p className="text-sm font-bold text-gray-900 dark:text-white">Email: <span className="font-normal text-green-600">legal@wedhabesha.com</span></p>
                   <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">Company: <span className="font-normal">WedHabesha Inc.</span></p>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// --- ROUTER WRAPPER FOR PREVIEW ---


export default TermsPage;