import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Users, 
  Target, 
  Award, 
  Globe, 
  Shield, 
  Sparkles,
  ArrowRight,
  Star,
  CheckCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

// --- CUSTOM FONT STYLES ---
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
  `}</style>
);

// --- TRANSLATIONS ---
const translations = {
  en: {
    nav: {
      vendors: "Vendors",
      tools: "Planning Tools",
      realWeddings: "Real Weddings",
      login: "Log In",
      getStarted: "Get Started"
    },
    hero: {
      badge: "About WedHabesha",
      titleLine1: "Celebrating Love,",
      titleLine2: "Honoring Tradition",
      subtitle: "We're on a mission to make Ethiopian wedding planning effortless while preserving the rich cultural traditions that make each celebration unique and meaningful.",
      btnPrimary: "Start Your Journey",
      btnSecondary: "Meet Our Vendors"
    },
    stats: {
      couples: "Happy Couples",
      vendors: "Verified Vendors",
      cities: "Cities Covered",
      success: "Success Rate"
    },
    story: {
      title: "Our Story",
      p1: "WedHabesha was born from a simple observation: Ethiopian weddings are incredibly beautiful and complex, but planning them shouldn't be overwhelming.",
      p2: "As Ethiopian-Americans living abroad, our founders experienced firsthand the challenges of planning a traditional wedding while maintaining cultural authenticity. From finding vendors who understand Melse and Telosh ceremonies to managing guest lists that span continents, the process was both exciting and exhausting.",
      p3: "That's when we realized technology could bridge this gap. WedHabesha combines the efficiency of modern wedding planning tools with deep respect for Ethiopian traditions, creating a platform that serves our community's unique needs.",
      p4: "Today, we're proud to be the leading wedding platform for Ethiopian couples worldwide, helping preserve our beautiful traditions while making the planning process joyful and stress-free."
    },
    values: {
      title: "Our Values",
      subtitle: "These core principles guide everything we do and every decision we make.",
      cards: [
        { title: "Cultural Heritage", desc: "We celebrate and preserve Ethiopian wedding traditions while embracing modern convenience." },
        { title: "Trust & Security", desc: "Your personal information and wedding details are protected with enterprise-grade security." },
        { title: "Community First", desc: "We're built by Ethiopians, for Ethiopians, understanding the unique needs of our community." },
        { title: "Excellence", desc: "We strive for perfection in every detail, just like your special day deserves." }
      ]
    },
    journey: {
      title: "Our Journey",
      subtitle: "From a simple idea to serving thousands of couples worldwide.",
      milestones: [
        { year: "2022", title: "The Beginning", desc: "WedHabesha was founded with a vision to modernize Ethiopian wedding planning." },
        { year: "2023", title: "First 1,000 Couples", desc: "Reached our first major milestone helping couples across Ethiopia and the diaspora." },
        { year: "2024", title: "Vendor Network Launch", desc: "Launched our verified vendor network with 500+ trusted wedding professionals." },
        { year: "2025", title: "Global Expansion", desc: "Expanding to serve Ethiopian communities in North America and Europe." }
      ]
    },
    team: {
      title: "Meet Our Team",
      subtitle: "Passionate individuals dedicated to making your wedding dreams come true."
    },
    contact: {
      title: "Get In Touch",
      subtitle: "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
      email: "Email Us",
      call: "Call Us",
      visit: "Visit Us"
    },
    cta: {
      title: "Ready to Start Planning?",
      subtitle: "Join thousands of Ethiopian couples who trust WedHabesha to make their special day perfect.",
      btnPrimary: "Get Started Free",
      btnSecondary: "Browse Vendors"
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
      tools: "የእቅድ መሳርያዎች",
      realWeddings: "እውነተኛ ሰርጎች",
      login: "ይግቡ",
      getStarted: "ይጀምሩ"
    },
    hero: {
      badge: "ስለ WedHabesha",
      titleLine1: "ፍቅርን እናከብራለን",
      titleLine2: "ባህልን እንጠብቃለን",
      subtitle: "የኢትዮጵያዊያንን የሰርግ ባህል ሳንለቅ ዘመናዊ እና ቀላል የሰርግ ዝግጅት ስርዓትን መፍጠር የእኛ ተልዕኮ ነው።",
      btnPrimary: "ጉዞዎን ይጀምሩ",
      btnSecondary: "አቅራቢዎቻችንን ይወቁ"
    },
    stats: {
      couples: "ደስተኛ ጥንዶች",
      vendors: "የተረጋገጡ አቅራቢዎች",
      cities: "የምንሸፍናቸው ከተሞች",
      success: "ስኬት"
    },
    story: {
      title: "የእኛ ታሪክ",
      p1: "WedHabesha የተወለደው ከቀላል እውነታ ነው፡ የኢትዮጵያ ሰርጎች እጅግ ውብ እና ውስብስብ ናቸው፣ ነገር ግን ዝግጅቱ አስጨናቂ መሆን የለበትም።",
      p2: "እንደ ውጭ ሀገር ነዋሪ ኢትዮጵያውያን፣ መስራቾቻችን ባህላዊ ሰርግን ከባህል ጋር ጠብቆ ማዘጋጀት ያለውን ፈተና በራሳቸው አይተዋል። ለመልስ እና ለተሎች የሚሆኑ አቅራቢዎችን ከማግኘት ጀምሮ እንግዶችን እስከ ማስተዳደር ድረስ ሂደቱ አድካሚ ነበር።",
      p3: "ቴክኖሎጂ ይህንን ክፍተት እንደሚሞላ ተገነዘብን። WedHabesha ዘመናዊ የሰርግ ማቀጃ መሳሪያዎችን ከኢትዮጵያ ባህል ጋር በማዋሃድ ለማህበረሰባችን የሚመጥን መድረክ ፈጠረ።",
      p4: "ዛሬ፣ በመላው አለም ለሚገኙ ኢትዮጵያውያን ጥንዶች ቀዳሚ የሰርግ መድረክ በመሆናችን እናኮራለን። ውብ ባህላችንን እየጠበቅን የዝግጅት ሂደቱን ቀላል እናደርጋለን።"
    },
    values: {
      title: "እሴቶቻችን",
      subtitle: "እነዚህ መርሆች እያንዳንዱን ውሳኔያችንን ይመራሉ።",
      cards: [
        { title: "ባህላዊ ቅርስ", desc: "ዘመናዊነትን እየተጠቀምን የኢትዮጵያ የሰርግ ወጎችን እናከብራለን እና እንጠብቃለን።" },
        { title: "ታማኝነት እና ደህንነት", desc: "የግል መረጃዎ እና የሰርግ ዝርዝሮችዎ በከፍተኛ ደህንነት የተጠበቁ ናቸው።" },
        { title: "ማህበረሰብ ቅድሚያ", desc: "በኢትዮጵያውያን ለኢትዮጵያውያን የተሰራ፣ የማህበረሰባችንን ልዩ ፍላጎት የሚረዳ።" },
        { title: "ጥራት", desc: "ልክ እንደ ልዩ ቀንዎ፣ በእያንዳንዱ ዝርዝር ውስጥ ፍጹምነትን እንሻለን።" }
      ]
    },
    journey: {
      title: "የእኛ ጉዞ",
      subtitle: "ከቀላል ሀሳብ ተነስተን በሺዎች የሚቆጠሩ ጥንዶችን እስከ ማገልገል ድረስ።",
      milestones: [
        { year: "2022", title: "ጅማሮ", desc: "WedHabesha የኢትዮጵያ ሰርግ አዘገጃጀትን ለማዘመን ታስቦ ተመሰረተ።" },
        { year: "2023", title: "የመጀመሪያዎቹ 1,000 ጥንዶች", desc: "በሀገር ውስጥ እና በዲያስፖራ የሚገኙ ጥንዶችን በመርዳት የመጀመሪያውን ምዕራፍ ተሻገርን።" },
        { year: "2024", title: "የአቅራቢዎች መረብ", desc: "ከ500 በላይ የታመኑ የሰርግ ባለሙያዎችን ያካተተ የተረጋገጠ የአቅራቢዎች መረብ ተጀመረ።" },
        { year: "2025", title: "አለምአቀፍ መስፋፋት", desc: "በሰሜን አሜሪካ እና በአውሮፓ ለሚገኙ ኢትዮጵያውያን አገልግሎታችንን እያሰፋን ነው።" }
      ]
    },
    team: {
      title: "ቡድናችንን ይወቁ",
      subtitle: "የሰርግ ህልምዎን እውን ለማድረግ የሚተጉ ባለሙያዎች።"
    },
    contact: {
      title: "ያግኙን",
      subtitle: "ጥያቄ አለዎት? ከእርስዎ መስማት እንፈልጋለን። መልእክት ይላኩልን፣ በፍጥነት እንመልሳለን።",
      email: "ኢሜይል ያድርጉልን",
      call: "ይደውሉልን",
      visit: "ይጎብኙን"
    },
    cta: {
      title: "ለማቀድ ዝግጁ ነዎት?",
      subtitle: "ልዩ ቀናቸውን ለማሳመር WedHabeshaን የሚያምኑ በሺዎች የሚቆጠሩ ጥንዶችን ይቀላቀሉ።",
      btnPrimary: "በነጻ ይጀምሩ",
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

// --- INLINE COMPONENTS ---

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

// 3. Layout Component (with Language Toggle)
interface LayoutProps {
    children: React.ReactNode;
    lang: 'en' | 'am';
    setLang: (lang: 'en' | 'am') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, lang, setLang }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLang = () => {
    setLang(lang === 'en' ? 'am' : 'en');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-white dark:bg-gray-950 dark:text-white transition-colors duration-300 selection:bg-rose-100 selection:text-rose-900">
      <FontStyles />
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-sm' : 'bg-transparent border-transparent'}`}>
         <div className="container mx-auto px-4 h-20 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform duration-300">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white font-menbere">
                Wed<span className="text-rose-600">Habesha</span>
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
               <a href="#" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   {t.nav.vendors}
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </a>
               <a href="#" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   {t.nav.tools}
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </a>
               <a href="#" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
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
                <span>{lang === 'en' ? 'EN' : 'አማ'}</span>
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
              <Button variant="ghost" size="sm" className="font-bold hover:text-rose-600">{t.nav.login}</Button>
              <Button size="sm" className="rounded-full px-6 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-none border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                {t.nav.getStarted}
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
         </div>

         {/* Mobile Menu Dropdown */}
         {isMenuOpen && (
           <div className="md:hidden absolute top-20 left-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-5">
              <a href="#" className="py-3 px-4 hover:bg-rose-50 dark:hover:bg-gray-800 rounded-xl font-medium text-lg flex justify-between items-center">
                {t.nav.vendors} <ChevronRight className="w-5 h-5 text-gray-400"/>
              </a>
              <a href="#" className="py-3 px-4 hover:bg-rose-50 dark:hover:bg-gray-800 rounded-xl font-medium text-lg flex justify-between items-center">
                {t.nav.tools} <ChevronRight className="w-5 h-5 text-gray-400"/>
              </a>
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
              <div className="h-px bg-gray-100 dark:bg-gray-800 my-2"></div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="w-full justify-center">{t.nav.login}</Button>
                <Button className="w-full justify-center">{t.nav.getStarted}</Button>
              </div>
           </div>
         )}
      </nav>

      <main className="flex-grow">{children}</main>

      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-20 pb-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white fill-current" />
                </div>
                <span className="font-bold text-xl font-menbere">WedHabesha</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                #1 wedding planning platform for Ethiopian couples worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.company}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-rose-600 transition-colors">About Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.tools}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-rose-600 transition-colors">Tools</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">{t.footer.vendors}</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-rose-600 transition-colors">Vendors</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} WedHabesha. {t.footer.rights}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- MAIN COMPONENT ---

const AboutPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const [isVisible, setIsVisible] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    setIsVisible(true);
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) document.documentElement.classList.add('dark');
    
    // Load saved language preference
    const savedLang = localStorage.getItem('language') as 'en' | 'am' | null;
    if (savedLang) setLang(savedLang);
  }, []);

  // Save language preference when it changes
  useEffect(() => {
    localStorage.setItem('language', lang);
  }, [lang]);

  const stats = [
    { number: "10,000+", label: t.stats.couples, icon: <Heart className="w-6 h-6" /> },
    { number: "500+", label: t.stats.vendors, icon: <Award className="w-6 h-6" /> },
    { number: "50+", label: t.stats.cities, icon: <MapPin className="w-6 h-6" /> },
    { number: "99%", label: t.stats.success, icon: <Star className="w-6 h-6" /> }
  ];

  const values = t.values.cards.map((val, index) => {
      const icons = [<Heart className="w-8 h-8" />, <Shield className="w-8 h-8" />, <Users className="w-8 h-8" />, <Sparkles className="w-8 h-8" />];
      const colors = [
          "bg-rose-100 dark:bg-rose-900/20 text-rose-600",
          "bg-blue-100 dark:bg-blue-900/20 text-blue-600",
          "bg-green-100 dark:bg-green-900/20 text-green-600",
          "bg-purple-100 dark:bg-purple-900/20 text-purple-600"
      ];
      return { ...val, icon: icons[index], color: colors[index] };
  });

  const team = [
    {
      name: "Meron Tadesse",
      role: "Founder & CEO",
      bio: "Former tech executive with 10+ years experience. Passionate about Ethiopian culture and technology.",
      social: { linkedin: "#", twitter: "#" }
    },
    {
      name: "Daniel Bekele",
      role: "CTO",
      bio: "Software architect specializing in scalable wedding platforms. Built systems for 100k+ users.",
      social: { linkedin: "#", twitter: "#" }
    },
    {
      name: "Sara Alemayehu",
      role: "Head of Vendor Relations",
      bio: "Wedding industry veteran with deep connections across Ethiopia's vendor ecosystem.",
      social: { linkedin: "#", instagram: "#" }
    },
    {
      name: "Yonas Haile",
      role: "Head of Product",
      bio: "UX expert focused on creating intuitive experiences for Ethiopian couples worldwide.",
      social: { linkedin: "#", twitter: "#" }
    }
  ];

  const milestones = t.journey.milestones;

  return (
    <Layout lang={lang} setLang={setLang}>
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-950 pt-20">
          {/* Background Elements */}
          <div className="absolute inset-0 w-full h-full">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-200/30 dark:bg-rose-900/10 blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-200/30 dark:bg-purple-900/10 blur-[120px] animate-pulse animation-delay-2000"></div>
          </div>

          <div className="relative container mx-auto px-4 py-24">
            <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full shadow-sm mb-8 hover:shadow-md transition-all cursor-default">
                <Heart className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t.hero.badge}
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white leading-[1.1] tracking-tight font-menbere mb-8">
                {t.hero.titleLine1} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 animate-gradient">
                  {t.hero.titleLine2}
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed mb-12 max-w-3xl mx-auto font-light">
                {t.hero.subtitle}
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/register">
                  <Button size="lg" className="px-8 shadow-xl shadow-rose-500/20 hover:scale-105 transition-transform">
                    {t.hero.btnPrimary} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/vendors">
                  <Button variant="outline" size="lg" className="px-8">
                    {t.hero.btnSecondary}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white font-menbere mb-2">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Our Story Section */}
        <div className="py-24 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white font-menbere mb-8">
                  {t.story.title}
                </h2>
                <div className="space-y-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                  <p>{t.story.p1}</p>
                  <p>{t.story.p2}</p>
                  <p>{t.story.p3}</p>
                  <p>{t.story.p4}</p>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-gray-50 dark:border-gray-800 rotate-2 hover:rotate-0 transition-all duration-700">
                  <img 
                    src="/image1.png" 
                    alt="Ethiopian Wedding Celebration"
                    className="w-full h-full object-cover scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-rose-600 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                  <Heart className="w-16 h-16 text-white fill-current" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="py-24 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white font-menbere mb-6">
                {t.values.title}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light">
                {t.values.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="p-8 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 rounded-[2rem]">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${value.color}`}>
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-menbere mb-4">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {value.desc}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="py-24 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white font-menbere mb-6">
                {t.journey.title}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light">
                {t.journey.subtitle}
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-rose-200 dark:bg-rose-800/50"></div>
                
                <div className="space-y-12">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="relative flex items-start group">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 z-10 border-4 border-white dark:border-gray-950">
                        {milestone.year.slice(-2)}
                      </div>
                      <div className="ml-8 flex-1">
                        <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-shadow duration-300">
                          <div className="text-sm text-rose-600 font-bold mb-2 uppercase tracking-wide">{milestone.year}</div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white font-menbere mb-3">
                            {milestone.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {milestone.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="py-24 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white font-menbere mb-6">
                {t.team.title}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light">
                {t.team.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, index) => (
                <Card key={index} className="p-6 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 rounded-[2rem]">
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-rose-100 to-purple-100 dark:from-rose-900/20 dark:to-purple-900/20 mb-6 flex items-center justify-center overflow-hidden relative group">
                    <div className="w-24 h-24 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-rose-600 text-3xl font-bold shadow-lg border border-white/50">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-menbere mb-1">
                    {member.name}
                  </h3>
                  <div className="text-rose-500 font-semibold text-sm mb-4 uppercase tracking-wide">{member.role}</div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6 font-light">
                    {member.bio}
                  </p>
                  <div className="flex gap-3">
                    {member.social.linkedin && (
                      <a href={member.social.linkedin} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {member.social.twitter && (
                      <a href={member.social.twitter} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors">
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {member.social.instagram && (
                      <a href={member.social.instagram} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="py-24 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white font-menbere mb-8">
                {t.contact.title}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 font-light">
                {t.contact.subtitle}
              </p>

              <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="text-center group">
                  <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Mail className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 font-menbere">{t.contact.email}</h3>
                  <p className="text-gray-600 dark:text-gray-400">hello@wedhabesha.com</p>
                </div>
                <div className="text-center group">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Phone className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 font-menbere">{t.contact.call}</h3>
                  <p className="text-gray-600 dark:text-gray-400">+1 (555) 123-4567</p>
                </div>
                <div className="text-center group">
                  <div className="w-20 h-20 bg-green-50 dark:bg-green-900/10 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 font-menbere">{t.contact.visit}</h3>
                  <p className="text-gray-600 dark:text-gray-400">Addis Ababa, Ethiopia</p>
                </div>
              </div>

              <div className="flex justify-center gap-6">
                <a href="#" className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all shadow-sm hover:shadow-lg hover:-translate-y-1">
                  <Facebook className="w-6 h-6" />
                </a>
                <a href="#" className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all shadow-sm hover:shadow-lg hover:-translate-y-1">
                  <Twitter className="w-6 h-6" />
                </a>
                <a href="#" className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all shadow-sm hover:shadow-lg hover:-translate-y-1">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="#" className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all shadow-sm hover:shadow-lg hover:-translate-y-1">
                  <Linkedin className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative py-32 bg-gray-900 dark:bg-black overflow-hidden">
          <div className="absolute inset-0">
            <img src="/image1.png" className="w-full h-full object-cover opacity-20 blur-sm" alt="Background" />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/90 to-gray-900"></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-8 tracking-tight font-menbere leading-tight">
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

export default AboutPage;