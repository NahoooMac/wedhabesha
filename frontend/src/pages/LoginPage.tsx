import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Star, Heart } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleLoginSuccess = (loggedInUser?: any) => {
    // If there's a specific redirect location, use it
    if (location.state?.from?.pathname) {
      navigate(location.state.from.pathname, { replace: true });
      return;
    }

    // Use the logged-in user data or fall back to context user
    const userToCheck = loggedInUser || user;
    
    // Redirect based on user type
    if (userToCheck) {
      switch (userToCheck.user_type) {
        case 'VENDOR':
          navigate('/vendor/dashboard', { replace: true });
          break;
        case 'ADMIN':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'COUPLE':
        default:
          navigate('/dashboard', { replace: true });
          break;
      }
    } else {
      // Fallback to default dashboard
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      
      {/* Background Animated Blobs (visible on the right side mostly) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-200/40 rounded-full blur-[100px] animate-pulse dark:bg-rose-800/20 mix-blend-multiply" />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] animate-pulse animation-delay-2000 dark:bg-purple-900/20 mix-blend-multiply" />
      </div>

      {/* Left Side - Visual Story */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <img 
            src="/image 2.png"
            alt="Ethiopian Wedding"
            className="w-full h-full object-cover opacity-90 transition-transform duration-[20s] hover:scale-105"
          />
          {/* Gradients for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
          <div className="absolute inset-0 bg-rose-200/20 mix-blend-overlay" />
        </div>

        {/* Floating Testimonial Card */}
        <div className="absolute top-12 right-12 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl max-w-xs shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">S</div>
             <div>
               <p className="text-white text-sm font-bold">Sara & Michael</p>
               <div className="flex text-yellow-400 text-xs">
                 <Star className="w-3 h-3 fill-current" />
                 <Star className="w-3 h-3 fill-current" />
                 <Star className="w-3 h-3 fill-current" />
                 <Star className="w-3 h-3 fill-current" />
                 <Star className="w-3 h-3 fill-current" />
               </div>
             </div>
           </div>
           <p className="text-white/90 text-sm leading-relaxed">
             "Found the perfect Melse outfit vendors in 2 days. This platform is a lifesaver!"
           </p>
        </div>

        {/* Bottom Content */}
        <div className="relative z-10 mt-auto p-16 w-full">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium">
             <Heart className="w-4 h-4 text-rose-400 fill-current animate-pulse" />
             <span>Trusted by 5,000+ Couples</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Plan the wedding <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-200 to-pink-100">you've always dreamed of.</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-lg">
             Manage guests, find vendors, and track your budget—all in one beautiful place.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        {/* Navigation */}
        <div className="absolute top-8 left-8">
           <Link to="/" className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm transition-all shadow-sm hover:shadow-md">
             <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
             <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Back</span>
           </Link>
        </div>

        <div className="w-full max-w-[440px] animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold text-2xl shadow-lg shadow-rose-500/30 mb-6">
              W
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Welcome Back</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Enter your credentials to access your account
            </p>
          </div>

          {/* distinct "Cool Box" Card */}
          <Card className="border border-white/50 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none rounded-3xl overflow-hidden relative group">
            {/* Subtle glow effect on hover */}
            <div className="absolute -inset-px bg-gradient-to-r from-rose-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" />
            
            <CardContent className="p-8 md:p-10 relative z-10">
              <LoginForm onSuccess={handleLoginSuccess} />
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
             <p className="text-gray-500 dark:text-gray-400 mb-4">
               Don't have an account yet?
             </p>
             <Link to="/register">
                <button className="w-full py-3.5 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all duration-300 flex items-center justify-center gap-2 group">
                  <span>Create Free Account</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </button>
             </Link>
             
             <div className="mt-8 flex justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
               <span className="flex items-center gap-1.5 hover:text-rose-500 transition-colors cursor-help">
                 <ShieldCheck className="w-3.5 h-3.5" /> Secure Connection
               </span>
               <span>•</span>
               <Link to="#" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Privacy</Link>
               <span>•</span>
               <Link to="#" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms</Link>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;