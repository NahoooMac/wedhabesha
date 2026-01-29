import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Heart, Sparkles, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

const Header: React.FC = () => {
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

  return (
    <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${
      isScrolled || !isHomePage 
        ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Enhanced Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <Heart className="w-5 h-5 text-white" fill="currentColor" />
              </div>
              <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className={`text-2xl font-bold ${
                (location.pathname === '/' && !isScrolled)
                  ? darkMode ? 'text-white' : 'text-gray-900'
                  : 'text-gray-900 dark:text-white'
              }`}>
                WedHabesha
              </span>
              <span className={`text-xs font-medium ${
                (location.pathname === '/' && !isScrolled) 
                  ? darkMode ? 'text-white/80' : 'text-gray-700' 
                  : 'text-gray-700 dark:text-gray-400'
              }`}>
                Ethiopian Weddings
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/vendors"
              className={`relative font-medium transition-all duration-200 hover:scale-105 ${
                (location.pathname === '/' && !isScrolled)
                  ? darkMode ? 'text-white hover:text-rose-200' : 'text-gray-900 hover:text-rose-600'
                  : 'text-gray-900 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400'
              } group`}
            >
              Vendors
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            
            {user && (
              <Link
                to={getDashboardLink()}
                className={`relative font-medium transition-all duration-200 hover:scale-105 ${
                  (location.pathname === '/' && !isScrolled)
                    ? darkMode ? 'text-white hover:text-rose-200' : 'text-gray-900 hover:text-rose-600'
                    : 'text-gray-900 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400'
                } group`}
              >
                Dashboard
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
            )}

            <Link
              to="/about"
              className={`relative font-medium transition-all duration-200 hover:scale-105 ${
                (location.pathname === '/' && !isScrolled)
                  ? darkMode ? 'text-white hover:text-rose-200' : 'text-gray-900 hover:text-rose-600'
                  : 'text-gray-900 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400'
              } group`}
            >
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </nav>

          {/* Desktop Auth Buttons & Dark Mode */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 ${
                (location.pathname === '/' && !isScrolled)
                  ? darkMode ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100'
                  : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={toggleUserMenu}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 ${
                    (location.pathname === '/' && !isScrolled)
                      ? darkMode ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100'
                      : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{user.email?.split('@')[0]}</p>
                    <p className="text-xs opacity-75">{user.user_type}</p>
                  </div>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl py-2 z-50 border border-gray-200 dark:border-gray-700">
                    <Link
                      to={getDashboardLink()}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3 text-gray-400" />
                      Dashboard
                    </Link>
                    <hr className="my-1 dark:border-gray-700" />
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
                    className={`font-medium ${
                      (location.pathname === '/' && !isScrolled)
                        ? darkMode ? 'text-white hover:bg-white/10 border-white/20' : 'text-gray-900 hover:bg-gray-100'
                        : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Sign In
                  </Button>
                </Link>
                
                {/* Vendor Signup Button */}
                <Link to="/register?type=vendor">
                  <Button 
                    variant="outline"
                    className={`font-medium border-2 ${
                      (location.pathname === '/' && !isScrolled)
                        ? darkMode ? 'text-white border-white/30 hover:bg-white/10' : 'text-purple-600 border-purple-300 hover:bg-purple-50'
                        : 'text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    Vendor Signup
                  </Button>
                </Link>
                
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
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
              (location.pathname === '/' && !isScrolled)
                ? 'text-white hover:bg-white/10' 
                : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Enhanced Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200/20 dark:border-gray-700/20">
            <nav className="flex flex-col space-y-2">
              <Link
                to="/vendors"
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  (location.pathname === '/' && !isScrolled)
                    ? 'text-white hover:bg-white/10' 
                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Vendors
              </Link>
              
              {user && (
                <Link
                  to={getDashboardLink()}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    (location.pathname === '/' && !isScrolled)
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}

              <Link
                to="/about"
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  (location.pathname === '/' && !isScrolled)
                    ? 'text-white hover:bg-white/10' 
                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              
              {/* Dark Mode Toggle Mobile */}
              <button
                onClick={toggleDarkMode}
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center ${
                  (location.pathname === '/' && !isScrolled)
                    ? 'text-white hover:bg-white/10' 
                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {darkMode ? <Sun className="h-5 w-5 mr-2" /> : <Moon className="h-5 w-5 mr-2" />}
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              
              {user ? (
                <div className="pt-4 border-t border-gray-200/20 dark:border-gray-700/20 mt-4">
                  <div className="flex items-center px-4 py-2 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${(location.pathname === '/' && !isScrolled) ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {user.email}
                      </p>
                      <p className={`text-xs ${(location.pathname === '/' && !isScrolled) ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                        {user.user_type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200/20 dark:border-gray-700/20 mt-4">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start ${
                        (location.pathname === '/' && !isScrolled)
                          ? 'text-white hover:bg-white/10' 
                          : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Sign In
                    </Button>
                  </Link>
                  
                  <Link to="/register?type=vendor" onClick={() => setIsMenuOpen(false)}>
                    <Button 
                      variant="outline"
                      className={`w-full justify-start border-2 ${
                        (location.pathname === '/' && !isScrolled)
                          ? 'text-white border-white/30 hover:bg-white/10' 
                          : 'text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                      }`}
                    >
                      Vendor Signup
                    </Button>
                  </Link>
                  
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;