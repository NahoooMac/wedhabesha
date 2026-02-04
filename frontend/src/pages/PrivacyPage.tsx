import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Heart, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Lock, 
  Eye, 
  FileText, 
  UserCheck,
  Globe,
  Map, 
  Home, 
  Users, 
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
import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
      badge: "Privacy Policy",
      title: "Your Privacy ",
      titleHighlight: "Matters",
      subtitle: "We're committed to protecting your personal information and being transparent about how we collect, use, and share your data.",
      effectiveDate: "Effective Date: "
    },
    intro: {
      title: "Our Commitment to You",
      text: "At WedHabesha, we understand that planning your wedding involves sharing personal and intimate details. We take the responsibility of protecting your information seriously and are committed to maintaining your trust through transparent privacy practices. By accessing or using the Platform, you agree to the practices described in this Privacy Policy."
    },
    sections: {
      1: { title: "Information We Collect", intro: "We collect information to provide and improve our services for couples, vendors, guests, staff, and administrators.", items: [
        { label: "Account Information", text: "Name, email address, phone number, password (encrypted), and user role (couple, vendor, staff, admin)." },
        { label: "Wedding Information (Couples)", text: "Wedding date, venue, guest lists, invitation details, RSVP responses, budget data, and event preferences." },
        { label: "Vendor Information", text: "Business name, contact details, service categories, pricing, portfolio content, verification documents, and payment details." },
        { label: "Guest Information", text: "Name, phone number, RSVP status, dietary preferences, plus-one details, and QR check-in status." },
        { label: "Communications", text: "Messages exchanged on the Platform, files shared, and support requests." },
        { label: "Automatically Collected", text: "Device/browser info, IP address, usage data, and log data for security." }
      ]},
      2: { title: "How We Use Your Information", list: [
        "Provide and operate the Platform",
        "Create and manage weddings, vendors, and guest experiences",
        "Enable messaging, RSVPs, QR check-ins, and analytics",
        "Process invitations and notifications (email/SMS)",
        "Improve performance, usability, and features",
        "Prevent fraud, abuse, and unauthorized access",
        "Comply with legal obligations"
      ], footer: "We do not sell personal data." },
      3: { title: "QR Codes & Check-In Data", content: [
        "QR data is used only to identify guests for check-in purposes.",
        "Check-in status is visible only to authorized wedding staff and the couple.",
        "Duplicate or cross-wedding scans are automatically blocked.",
        "QR data is never reused across weddings."
      ]},
      4: { title: "Sharing of Information", items: [
        { title: "4.1 With Other Users", text: "Couples can view guest and vendor data related to their wedding. Vendors can view inquiries and messages from couples. Staff can access limited guest data for check-in purposes only." },
        { title: "4.2 With Service Providers", text: "We share data with trusted providers (Hosting, Email/SMS, Analytics) who help us operate the Platform. They are required to protect your data." },
        { title: "4.3 Legal Requirements", text: "We may disclose information if required by law, court order, or to protect the safety and rights of users or the Platform." }
      ]},
      5: { title: "Data Security", text: "We take security seriously and use industry-standard measures, including Encrypted data transmission (HTTPS), Secure password hashing, Access control and role-based permissions, Audit logs for sensitive actions, and Regular monitoring. While no system is 100% secure, we continuously work to protect your data." },
      6: { title: "Data Retention", text: "We retain personal data only as long as necessary to provide services, meet legal obligations, resolve disputes, and enforce agreements. Wedding and guest data may be anonymized or deleted after a reasonable period following the wedding date." },
      7: { title: "Your Rights & Choices", list: [
        "Access and update your personal information",
        "Request deletion of your account and data",
        "Opt out of non-essential communications",
        "Control notification preferences"
      ], footer: "Guests may update or withdraw RSVP information at any time before the wedding. Requests can be made through your account settings or by contacting support." },
      other: { 
        cookies: { title: "8. Cookies & Tracking", text: "We use cookies to keep you logged in, improve performance, and understand platform usage. You can control cookies through your browser settings." },
        children: { title: "9. Children’s Privacy", text: "The Platform is not intended for use by children under the age of 16. We do not knowingly collect personal data from children." },
        links: { title: "10. Third-Party Links", text: "The Platform may contain links to third-party websites. We are not responsible for the privacy practices of those sites." },
        changes: { title: "11. Changes to This Policy", text: "We may update this Privacy Policy from time to time. We will notify users where appropriate. Continued use means you accept the updated policy." }
      },
      contact: {
        title: "12. Contact Us",
        text: "If you have questions, concerns, or requests regarding privacy or data protection, please contact us at:"
      }
    },
    footer: {
      company: "Company",
      tools: "Planning Tools",
      vendorsList: "Vendors",
      rights: "All rights reserved.",
      tagline: "Your privacy matters. We collect only what we need, protect it carefully, and never sell your data."
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
      badge: "የግላዊነት ፖሊሲ",
      title: "የእርስዎ ግላዊነት ",
      titleHighlight: "ወሳኝ ነው",
      subtitle: "የግል መረጃዎን ለመጠበቅ እና መረጃዎን እንዴት እንደምንሰበስብ፣ እንደምንጠቀም እና እንደምናጋራ ግልጽ ለመሆን ቆርጠን ተነስተናል።",
      effectiveDate: "የሚፀናበት ቀን: "
    },
    intro: {
      title: "ለእርስዎ ያለን ቃል",
      text: "በWedHabesha፣ ሰርግዎን ማቀድ ግላዊ እና ሚስጥራዊ ዝርዝሮችን ማጋራትን እንደሚያካትት እንረዳለን። መረጃዎን የመጠበቅ ኃላፊነቱን በቁም ነገር እንመለከተዋለን እና ግልጽ በሆነ የግላዊነት አሰራር እምነትዎን ለመጠበቅ ቆርጠን ተነስተናል። መድረኩን በመጠቀም፣ በዚህ የግላዊነት ፖሊሲ ውስጥ የተገለጹትን ልምዶች ይቀበላሉ።"
    },
    sections: {
      1: { title: "የምንሰበስበው መረጃ", intro: "ለጥንዶች፣ አቅራቢዎች፣ እንግዶች፣ ሰራተኞች እና አስተዳዳሪዎች አገልግሎታችንን ለማቅረብ እና ለማሻሻል መረጃ እንሰበስባለን።", items: [
        { label: "የመለያ መረጃ", text: "ስም፣ ኢሜይል አድራሻ፣ ስልክ ቁጥር፣ የይለፍ ቃል (የተመሰጠረ) እና የተጠቃሚ ሚና።" },
        { label: "የሰርግ መረጃ (ጥንዶች)", text: "የሰርግ ቀን፣ ቦታ፣ የእንግዳ ዝርዝሮች፣ የግብዣ ዝርዝሮች፣ የRSVP ምላሾች፣ የበጀት መረጃ እና የምርጫዎች።" },
        { label: "የአቅራቢ መረጃ", text: "የንግድ ስም፣ የመገኛ አድራሻ፣ የአገልግሎት ዘርፎች፣ ዋጋ፣ ፖርትፎሊዮ፣ ማረጋገጫ ሰነዶች እና የክፍያ ዝርዝሮች።" },
        { label: "የእንግዳ መረጃ", text: "ስም፣ ስልክ ቁጥር፣ የRSVP ሁኔታ፣ የምግብ ምርጫዎች፣ እና የQR ፍተሻ ሁኔታ።" },
        { label: "ግንኙነቶች", text: "በመድረኩ ላይ የተለዋወጡ መልዕክቶች፣ የተጋሩ ፋይሎች እና የድጋፍ ጥያቄዎች።" },
        { label: "በራስ-ሰር የተሰበሰበ", text: "የመሳሪያ/አሳሽ መረጃ፣ አይፒ አድራሻ፣ የአጠቃቀም መረጃ እና ለደህንነት የሚሆን የሎግ መረጃ።" }
      ]},
      2: { title: "መረጃዎን እንዴት እንደምንጠቀምበት", list: [
        "መድረኩን ለማቅረብ እና ለማስኬድ",
        "ሰርጎችን፣ አቅራቢዎችን እና የእንግዳ ተሞክሮዎችን ለመፍጠር እና ለማስተዳደር",
        "መልእክት መላላክ፣ RSVP፣ የQR ፍተሻ እና ትንታኔዎችን ለማስቻል",
        "ግብዣዎችን እና ማሳወቂያዎችን (ኢሜይል/ኤስኤምኤስ) ለማስኬድ",
        "አፈጻጸምን፣ አጠቃቀምን እና ባህሪያትን ለማሻሻል",
        "ማጭበርበርን እና ያልተፈቀደ መዳረሻን ለመከላከል",
        "ህጋዊ ግዴታዎችን ለማክበር"
      ], footer: "የግል መረጃን አንሸጥም።" },
      3: { title: "QR ኮዶች እና የፍተሻ መረጃ", content: [
        "የQR መረጃ እንግዶችን ለፍተሻ ዓላማ ለመለየት ብቻ ጥቅም ላይ ይውላል።",
        "የፍተሻ ሁኔታ ለተፈቀደላቸው የሰርግ ሰራተኞች እና ለጥንዶቹ ብቻ ይታያል።",
        "ተደጋጋሚ ወይም የሌላ ሰርግ ፍተሻዎች በራስ-ሰር ይታገዳሉ።",
        "የQR መረጃ ለሌላ ሰርግ በፍጹም እንደገና ጥቅም ላይ አይውልም።"
      ]},
      4: { title: "መረጃን ማጋራት", items: [
        { title: "4.1 ከሌሎች ተጠቃሚዎች ጋር", text: "ጥንዶች ከሰርጋቸው ጋር የተያያዙ የእንግዳ እና የአቅራቢ መረጃዎችን ማየት ይችላሉ። አቅራቢዎች ከጥንዶች የሚላኩ ጥያቄዎችን እና መልዕክቶችን ማየት ይችላሉ። ሰራተኞች ለፍተሻ ዓላማ ብቻ የተወሰነ የእንግዳ መረጃ ማግኘት ይችላሉ።" },
        { title: "4.2 ከአገልግሎት አቅራቢዎች ጋር", text: "መድረኩን ለማስኬድ ከሚረዱን ታማኝ አቅራቢዎች (ማስተናገጃ፣ ኢሜይል/ኤስኤምኤስ፣ ትንታኔ) ጋር መረጃ ልናጋራ እንችላለን። መረጃዎን የመጠበቅ ግዴታ አለባቸው።" },
        { title: "4.3 ህጋዊ መስፈርቶች", text: "በህግ፣ በፍርድ ቤት ትእዛዝ ከተጠየቀ ወይም የተጠቃሚዎችን ወይም የመድረኩን ደህንነት እና መብቶች ለመጠበቅ መረጃን ልንገልጽ እንችላለን።" }
      ]},
      5: { title: "የመረጃ ደህንነት", text: "ደህንነትን በቁም ነገር እንመለከተዋለን እና የኢንዱስትሪ ደረጃ እርምጃዎችን እንጠቀማለን። የተመሰጠረ መረጃ ማስተላለፍ (HTTPS)፣ ደህንነቱ የተጠበቀ የይለፍ ቃል፣ የመዳረሻ ቁጥጥር እና መደበኛ ክትትልን ጨምሮ። የትኛውም ስርዓት 100% ደህንነቱ የተጠበቀ ባይሆንም፣ መረጃዎን ለመጠበቅ ያለማቋረጥ እንሰራለን።" },
      6: { title: "የመረጃ ማቆየት", text: "የግል መረጃን አገልግሎቶችን ለማቅረብ፣ ህጋዊ ግዴታዎችን ለማሟላት እና አለመግባባቶችን ለመፍታት እስከተፈለገ ድረስ ብቻ እናቆያለን። የሰርግ እና የእንግዳ መረጃ ከሰርጉ ቀን በኋላ በተወሰነ ጊዜ ውስጥ ስማቸው ሊጠፋ ወይም ሊሰረዝ ይችላል።" },
      7: { title: "መብቶችዎ እና ምርጫዎችዎ", list: [
        "የግል መረጃዎን ማግኘት እና ማዘመን",
        "የመለያዎን እና የመረጃዎን ስረዛ መጠየቅ",
        "ከአስፈላጊ ያልሆኑ ግንኙነቶች መውጣት",
        "የማሳወቂያ ምርጫዎችን መቆጣጠር"
      ], footer: "እንግዶች ከሰርጉ በፊት በማንኛውም ጊዜ የRSVP መረጃቸውን ማዘመን ወይም መሰረዝ ይችላሉ። ጥያቄዎች በመለያ ቅንብሮችዎ ወይም ድጋፍን በማነጋገር ሊቀርቡ ይችላሉ።" },
      other: { 
        cookies: { title: "8. ኩኪዎች እና ክትትል", text: "እርስዎን በመለያ ለማቆየት፣ አፈጻጸምን ለማሻሻል እና የመድረክ አጠቃቀምን ለመረዳት ኩኪዎችን እንጠቀማለን። ኩኪዎችን በአሳሽዎ ቅንብሮች በኩል መቆጣጠር ይችላሉ።" },
        children: { title: "9. የህፃናት ግላዊነት", text: "መድረኩ ከ16 ዓመት በታች ለሆኑ ህጻናት የታሰበ አይደለም። ከህጻናት የግል መረጃን ሆን ብለን አንሰበስብም።" },
        links: { title: "10. የሶስተኛ ወገን አገናኞች", text: "መድረኩ ወደ ሶስተኛ ወገን ድረ-ገጾች አገናኞችን ሊይዝ ይችላል። ለእነዚያ ድረ-ገጾች የግላዊነት ልምዶች ተጠያቂ አይደለንም።" },
        changes: { title: "11. የዚህ ፖሊሲ ለውጦች", text: "ይህንን የግላዊነት ፖሊሲ አልፎ አልፎ ልናሻሽል እንችላለን። ስናደርግ ተጠቃሚዎችን እናሳውቃለን። ለውጦች ከተደረጉ በኋላ መድረኩን መቀጠል ማለት የተሻሻለውን ፖሊሲ ተቀብለዋል ማለት ነው።" }
      },
      contact: {
        title: "12. ያነጋግሩን",
        text: "ስለ ግላዊነት ወይም የመረጃ ጥበቃ ጥያቄዎች፣ ስጋቶች ወይም ጥያቄዎች ካሉዎት እባክዎ ያነጋግሩን።"
      }
    },
    footer: {
      company: "ድርጅት",
      tools: "የእቅድ መሳርያዎች",
      vendorsList: "አቅራቢዎች",
      rights: "መብቱ በህግ የተጠበቀ ነው።",
      tagline: "ግላዊነትዎ ወሳኝ ነው። የምንሰበስበው አስፈላጊውን ብቻ ነው፣ በጥንቃቄ እንጠብቀዋለን፣ እና መረጃዎን በፍጹም አንሸጥም።"
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

// --- PRIVACY PAGE CONTENT ---
const PrivacyPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout lang={lang} setLang={setLang}>
      <div className="bg-white dark:bg-gray-950 min-h-screen">
        
        {/* Header Section */}
        <div className="relative bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-20 overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100 dark:bg-rose-900/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 dark:bg-blue-900/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
           
           <div className="container mx-auto px-4 relative z-10 text-center">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-1.5 mb-6 shadow-sm">
                 <Shield className="w-4 h-4 text-rose-600" />
                 <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t.hero.badge}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 font-menbere">
                {t.hero.title}<span className="text-rose-600">{t.hero.titleHighlight}</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                {t.hero.subtitle}
              </p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">{t.hero.effectiveDate} {today}</p>
           </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            
            {/* Introduction Card */}
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-8 mb-12">
               <div className="flex items-start gap-4">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm text-rose-600">
                     <Heart className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                     <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-menbere">{t.intro.title}</h3>
                     <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                       {t.intro.text}
                     </p>
                  </div>
               </div>
            </div>

            {/* Policy Sections */}
            <div className="space-y-12 text-gray-800 dark:text-gray-200">
              
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 font-menbere">
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">1</span>
                  {t.sections[1].title}
                </h2>
                <div className="pl-11 space-y-6">
                  <p className="leading-relaxed text-gray-600 dark:text-gray-300">{(t.sections[1] as any).intro}</p>
                  
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                      {((t.sections[1] as any).items as Array<{label: string, text: string}>).map((item, idx) => (
                        <li key={idx} className="flex gap-3"><span className="font-bold min-w-[140px] text-gray-900 dark:text-white">{item.label}:</span> {item.text}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 font-menbere">
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">2</span>
                  {t.sections[2].title}
                </h2>
                <div className="pl-11">
                  <ul className="grid md:grid-cols-2 gap-4">
                    {((t.sections[2] as any).list as string[]).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-500" />
                    {(t.sections[2] as any).footer}
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 font-menbere">
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">3</span>
                  {t.sections[3].title}
                </h2>
                <div className="pl-11 bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl text-sm leading-relaxed text-gray-700 dark:text-gray-300 border border-blue-100 dark:border-blue-900/30">
                  <ul className="list-disc pl-5 space-y-1 marker:text-blue-500">
                    {(t.sections[3].content as string[]).map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 font-menbere">
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">4</span>
                  {t.sections[4].title}
                </h2>
                <div className="pl-11 space-y-6">
                  {((t.sections[4] as any).items as Array<{title: string, text: string}>).map((item, idx) => (
                    <div key={idx}>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 5, 6, 7 */}
              <section className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl">
                 <div className="grid md:grid-cols-2 gap-8">
                    <div>
                       <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                         <Shield className="w-5 h-5 text-rose-500" /> {t.sections[5].title}
                       </h3>
                       <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                         {(t.sections[5] as any).text}
                       </p>
                    </div>
                    <div>
                       <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                         <FileText className="w-5 h-5 text-rose-500" /> {t.sections[6].title}
                       </h3>
                       <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                         {(t.sections[6] as any).text}
                       </p>
                    </div>
                 </div>
                 <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">{t.sections[7].title}</h3>
                    <ul className="grid md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                       {((t.sections[7] as any).list as string[]).map((item, idx) => (
                         <li key={idx} className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div> {item}</li>
                       ))}
                    </ul>
                    <p className="text-sm text-gray-500 mt-2 italic">{(t.sections[7] as any).footer}</p>
                 </div>
              </section>

              {/* Section 8, 9, 10, 11 */}
              <section className="space-y-6 pl-11 border-l-2 border-gray-100 dark:border-gray-800 ml-4">
                 <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{(t.sections as any).other.cookies.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{(t.sections as any).other.cookies.text}</p>
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{(t.sections as any).other.children.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{(t.sections as any).other.children.text}</p>
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{(t.sections as any).other.links.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{(t.sections as any).other.links.text}</p>
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{(t.sections as any).other.changes.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{(t.sections as any).other.changes.text}</p>
                 </div>
              </section>

              {/* Contact Section */}
              <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 font-menbere">{t.sections.contact.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t.sections.contact.text}
                </p>
                <div className="inline-block text-left bg-gray-50 dark:bg-gray-900 px-8 py-4 rounded-xl">
                   <p className="text-sm font-bold text-gray-900 dark:text-white">Email: <span className="font-normal text-rose-600">privacy@wedhabesha.com</span></p>
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


export default PrivacyPage;