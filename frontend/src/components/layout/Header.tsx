import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Heart, Sparkles, Moon, Sun, ChevronRight, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// --- CUSTOM FONT STYLES ---
// Ensuring the font is available in the header context
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

// --- INLINE COMPONENTS ---

// 1. Mock useTranslation
const useTranslation = () => {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      'nav.vendors': 'Vendors',
      'nav.dashboard': 'Dashboard',
      'nav.tools': 'Planning Tools',
      'nav.realWeddings': 'Real Weddings',
      'nav.login': 'Log In',
      'nav.getStarted': 'Get Started',
    };
    return translations[key] || key;
  };
  return { t };
};

// 3. Inline Button Component
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

// 4. Inline LanguageSwitcher Component
const LanguageSwitcher: React.FC<{ variant?: 'default' | 'compact' }> = ({ variant = 'default' }) => {
  const [lang, setLang] = useState('en');
  
  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'am' : 'en');
  };

  if (variant === 'compact') {
    return (
      <button 
        onClick={toggleLang}
        className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center gap-2 font-medium transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span>{lang === 'en' ? 'EN' : 'አማ'}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between">
       <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Language / ቋንቋ</span>
       <button 
          onClick={toggleLang}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center gap-2 font-bold text-gray-900 dark:text-white"
        >
          <Globe className="w-4 h-4" />
          <span>{lang === 'en' ? 'English' : 'አማርኛ'}</span>
        </button>
    </div>
  );
};

// --- MAIN COMPONENT ---

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);

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

  const isHomePage = location.pathname === '/';

  // Determine styles based on scroll and page location
  const headerClasses = isScrolled || !isHomePage
    ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-sm'
    : 'bg-transparent border-b border-transparent';

  const textColorClass = (isHomePage && !isScrolled) 
    ? darkMode ? 'text-white' : 'text-gray-900'
    : 'text-gray-900 dark:text-white';

  const navHoverClass = (isHomePage && !isScrolled)
    ? darkMode ? 'hover:text-rose-200' : 'hover:text-rose-600'
    : 'hover:text-rose-600 dark:hover:text-rose-400';

  return (
    <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${headerClasses}`}>
      <FontStyles />
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform duration-300">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className={`font-extrabold text-2xl tracking-tight font-menbere transition-colors duration-300 ${textColorClass}`}>
                Wed<span className="text-rose-600">Habesha</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/vendors"
              className={`relative font-medium text-sm transition-all duration-200 group py-2 ${textColorClass} ${navHoverClass}`}
            >
              {t('nav.vendors')}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <Link
              to="/pricing"
              className={`relative font-medium text-sm transition-all duration-200 group py-2 ${textColorClass} ${navHoverClass}`}
            >
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            
            {user && (
              <Link
                to={getDashboardLink()}
                className={`relative font-medium text-sm transition-all duration-200 group py-2 ${textColorClass} ${navHoverClass}`}
              >
                {t('nav.dashboard')}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
            )}

            <Link
              to="/about"
              className={`relative font-medium text-sm transition-all duration-200 group py-2 ${textColorClass} ${navHoverClass}`}
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </nav>

          {/* Desktop Auth Buttons & Tools */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher variant="compact" />
            
            <div className={`w-px h-6 mx-2 ${isHomePage && !isScrolled ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}></div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 ${
                (isHomePage && !isScrolled)
                  ? darkMode ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={toggleUserMenu}
                  className={`flex items-center space-x-3 pl-3 pr-2 py-1.5 rounded-full transition-all duration-200 hover:scale-105 border ${
                    (isHomePage && !isScrolled)
                      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-rose-200'
                  }`}
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
                  <Button 
                    variant="ghost" 
                    className={`font-bold ${
                      (isHomePage && !isScrolled)
                        ? darkMode ? 'text-white hover:bg-white/10 hover:text-white' : 'text-gray-900 hover:bg-gray-100 hover:text-rose-600'
                        : 'text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-transparent'
                    }`}
                  >
                    Sign In
                  </Button>
                </Link>
                
                {/* Vendor Signup Button */}
                <Link to="/register?type=vendor">
                  <Button 
                    variant="outline"
                    className={`font-bold border-2 hidden xl:inline-flex ${
                      (isHomePage && !isScrolled)
                        ? 'text-white border-white/30 hover:bg-white/10' 
                        : 'text-rose-600 border-rose-100 hover:border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/20'
                    }`}
                  >
                    For Vendors
                  </Button>
                </Link>
                
                <Link to="/register">
                  <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-none border border-transparent font-bold px-6">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className={`lg:hidden p-2 rounded-xl transition-all duration-200 ${
              (isHomePage && !isScrolled)
                ? 'text-white hover:bg-white/10' 
                : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Enhanced Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-xl animate-in slide-in-from-top-5">
            <div className="p-4 space-y-4">
              <nav className="flex flex-col space-y-1">
                <Link
                  to="/vendors"
                  className="flex items-center justify-between px-4 py-3 rounded-xl font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.vendors')}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/pricing"
                  className="flex items-center justify-between px-4 py-3 rounded-xl font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
                
                <Link
                  to="/about"
                  className="flex items-center justify-between px-4 py-3 rounded-xl font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                {user && (
                  <Link
                    to={getDashboardLink()}
                    className="flex items-center justify-between px-4 py-3 rounded-xl font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.dashboard')}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                )}
              </nav>
              
              <div className="h-px bg-gray-100 dark:bg-gray-800"></div>

              <div className="flex items-center justify-between px-4">
                 <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Appearance</span>
                 <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </div>

              <div className="px-4">
                 <LanguageSwitcher />
              </div>
              
              <div className="h-px bg-gray-100 dark:bg-gray-800"></div>

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
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-center border-gray-200 dark:border-gray-700"
                    >
                      Sign In
                    </Button>
                  </Link>
                  
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;