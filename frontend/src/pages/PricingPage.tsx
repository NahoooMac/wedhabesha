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
  HelpCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// --- MOCK AUTH HOOK ---
const useAuth = () => {
  const [user, setUser] = useState<{email: string, user_type: string} | null>(null);
  
  const logout = async () => {
    setUser(null);
    console.log("Logged out");
  };

  return { user, logout };
};

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
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth(); // Mock auth

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
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

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-white dark:bg-gray-950 dark:text-white transition-colors duration-300 selection:bg-rose-100 selection:text-rose-900 overflow-x-hidden">
      <FontStyles />
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 transition-all duration-300">
         <div className="container mx-auto px-4 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform duration-300">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white font-menbere">
                Wed<span className="text-rose-600">Habesha</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
               <Link to="/vendors" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   Vendors
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </Link>
               <Link to="/dashboard" className="relative text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group py-2">
                   Planning Tools
                   <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
               </Link>
               <Link to="/pricing" className="relative text-rose-600 dark:text-rose-400 font-bold transition-colors group py-2">
                   Pricing
                   <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500"></span>
               </Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={toggleDarkMode} 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
              {user ? (
                 <Button size="sm" onClick={() => logout()}>Sign Out</Button>
              ) : (
                <>
                  <Link to="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
                  <Link to="/register"><Button size="sm" className="shadow-rose-500/20">Get Started</Button></Link>
                </>
              )}
            </div>
            
            <button className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
         </div>
         {isMenuOpen && (
           <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 shadow-xl">
             <Link to="/vendors" className="font-medium text-gray-700 dark:text-gray-200 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">Vendors</Link>
             <Link to="/dashboard" className="font-medium text-gray-700 dark:text-gray-200 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">Tools</Link>
             <Link to="/pricing" className="font-bold text-rose-600 p-2 bg-rose-50 dark:bg-rose-900/10 rounded-lg">Pricing</Link>
             <Link to="/login" className="font-medium text-gray-700 dark:text-gray-200 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">Log In</Link>
           </div>
         )}
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-20 pb-10 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-16">
            <div className="space-y-6">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white fill-current" />
                </div>
                <span className="font-bold text-xl font-menbere">WedHabesha</span>
              </Link>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                The #1 wedding planning platform for Ethiopian couples worldwide. We make your special day effortless.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-blue-600 hover:text-blue-600 transition-all cursor-pointer shadow-sm group">
                  <Facebook className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 transition-colors" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-pink-600 hover:text-pink-600 transition-all cursor-pointer shadow-sm group">
                  <Instagram className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-pink-600 transition-colors" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all cursor-pointer shadow-sm group">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:border-blue-700 hover:text-blue-700 transition-all cursor-pointer shadow-sm group">
                  <Linkedin className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-700 transition-colors" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">Company</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-sm">
                <li><Link to="/about" className="hover:text-rose-600 transition-colors">About Us</Link></li>
                <li><a href="#" className="hover:text-rose-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-rose-600 transition-colors">Press & Media</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">Planning Tools</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-sm">
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Wedding Checklist</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Guest List Manager</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Budget Calculator</Link></li>
                <li><Link to="/dashboard" className="hover:text-rose-600 transition-colors">Seating Chart</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-menbere">Vendors</h4>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-sm">
                <li><Link to="/login" className="hover:text-rose-600 transition-colors">Vendor Login</Link></li>
                <li><Link to="/vendors" className="hover:text-rose-600 transition-colors">List Your Business</Link></li>
                <li><a href="#testimonials" className="hover:text-rose-600 transition-colors">Real Wedding Submissions</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <p>© {new Date().getFullYear()} WedHabesha. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- PRICING PAGE COMPONENT ---
const PricingPage: React.FC = () => {
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
      name: 'Starter',
      subtitle: 'Perfect for simple weddings',
      price: '0',
      badge: null,
      description: 'Get started with essential wedding planning tools',
      cta: 'Start Free',
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
      name: 'Pro',
      subtitle: 'Most popular choice',
      price: '0',
      badge: 'Most Popular',
      description: 'Everything you need for a stress-free wedding',
      cta: 'Plan My Wedding',
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
      name: 'Elite',
      subtitle: 'Premium wedding experience',
      price: '0',
      badge: 'Premium',
      description: 'For large, luxury, or multi-day celebrations',
      cta: 'Go Elite',
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
    <Layout>
      <div className="bg-white dark:bg-gray-950 min-h-screen pb-16 transition-colors duration-500 overflow-x-hidden">
        
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-rose-50/50 to-transparent dark:from-rose-900/10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100/30 dark:bg-purple-900/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none overflow-hidden"></div>

        {/* Hero Section */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 overflow-x-hidden">
          <div className="text-center max-w-3xl mx-auto mb-20 animate-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-8 border border-rose-100 dark:border-rose-800">
              <Sparkles className="w-3.5 h-3.5" />
              Beta Version - 100% Free Access
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-8 font-menbere leading-tight">
              Choose Your Perfect <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-purple-600">Wedding Plan</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 font-light leading-relaxed">
              From intimate gatherings to grand multi-day celebrations, discover the plan that fits your dream. 
              <strong className="text-gray-900 dark:text-white font-medium block mt-2">All premium features are free during our beta period.</strong>
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-24 relative z-10 max-w-full">
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
                        <Zap className="w-3 h-3" /> Free during beta
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
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 font-menbere">Compare Features</h2>
              <p className="text-gray-600 dark:text-gray-400">Detailed breakdown of what's included in each plan.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left p-6 pl-8 font-bold text-gray-900 dark:text-white w-1/3">Features</th>
                      <th className="text-center p-6 font-bold text-gray-600 dark:text-gray-300 w-1/5">Starter</th>
                      <th className="text-center p-6 font-bold text-rose-600 dark:text-rose-400 w-1/5 bg-rose-50/30 dark:bg-rose-900/10">Pro</th>
                      <th className="text-center p-6 font-bold text-purple-600 dark:text-purple-400 w-1/5">Elite</th>
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
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 font-menbere">Common Questions</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-full">
              {[
                { q: "Is everything really free during beta?", a: "Yes! All features across all packages are completely free during our beta period. This includes unlimited guests, QR check-in, analytics, and premium support." },
                { q: "How long is the beta period?", a: "The beta period will continue throughout 2025. We'll give all beta users advance notice before any pricing changes, and early adopters will receive special discounts." },
                { q: "Can I switch packages later?", a: "Absolutely! You can upgrade or change your package at any time. During beta, all features are available regardless of your selected package." },
                { q: "What happens to my data?", a: "Your wedding data is safe and will remain accessible. We'll never delete your information, and you'll have full export capabilities." }
              ].map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{item.q}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="relative rounded-[3rem] overflow-hidden bg-gray-900 dark:bg-black text-white text-center py-16 md:py-20 px-4 md:px-6 mx-4 md:mx-0">
            <div className="absolute inset-0 opacity-20 overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500 rounded-full blur-[120px] -translate-y-1/2"></div>
               <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full blur-[120px] translate-y-1/2"></div>
            </div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 font-menbere">Start Your Journey Today</h2>
              <p className="text-xl text-gray-300 mb-10 font-light">
                Join thousands of Ethiopian couples planning their perfect day with WedHabesha. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-full">
                <button
                  onClick={() => handleGetStarted('pro')}
                  className="bg-white text-gray-900 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl hover:scale-105"
                >
                  Start Planning Free
                </button>
                <button
                  onClick={() => navigate('/vendors')}
                  className="bg-transparent border-2 border-white/20 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
                >
                  Browse Vendors
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