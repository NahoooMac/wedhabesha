import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Star, Heart, Store, Users } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userType = searchParams.get('type') || 'couple';
  const isVendorSignup = userType === 'vendor';

  useEffect(() => {
    // Set user type in localStorage for RegisterForm to access
    localStorage.setItem('registerUserType', userType);
  }, [userType]);

  const handleRegisterSuccess = () => {
    // Redirect to appropriate dashboard based on user type
    const dashboardRoute = isVendorSignup ? '/vendor/dashboard' : '/dashboard';
    navigate(dashboardRoute, { replace: true });
  };

  return (
    // H-screen ensures fixed layout, image stays put
    <div className="h-screen flex w-full font-sans bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-[100px] animate-pulse mix-blend-multiply ${
          isVendorSignup ? 'bg-purple-200/40 dark:bg-purple-100/20' : 'bg-rose-200/40 dark:bg-rose-100/20'
        }`} />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[100px] animate-pulse animation-delay-2000 dark:bg-blue-900/20 mix-blend-multiply" />
      </div>

      {/* Left Side - Visual Story (Fixed) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gray-900 h-full">
        <div className="absolute inset-0">
          <img 
            src="/image 2.png"
            alt="Ethiopian Wedding Celebration"
            className="w-full h-full object-cover opacity-90 transition-transform duration-[20s] hover:scale-105"
            loading="eager"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
          <div className={`absolute inset-0 mix-blend-overlay ${
            isVendorSignup ? 'bg-purple-100/30' : 'bg-rose-200/30'
          }`} />
        </div>

        {/* Floating Stat Card */}
        <div className="absolute top-12 right-12 bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl max-w-xs shadow-xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
           <div className="flex items-center gap-3 mb-3">
             <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl ${
               isVendorSignup ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-rose-500 to-pink-600'
             }`}>
               {isVendorSignup ? '200+' : '5k+'}
             </div>
             <div>
               <p className="text-white text-base font-bold">
                 {isVendorSignup ? 'Active Vendors' : 'Happy Couples'}
               </p>
               <div className="flex text-yellow-400 text-xs gap-0.5">
                 {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
               </div>
             </div>
           </div>
           <p className="text-white/90 text-sm leading-relaxed">
             {isVendorSignup 
               ? "Join the fastest growing network of premium wedding professionals in Ethiopia."
               : "Start your journey to the perfect wedding with Ethiopia's #1 planning platform."
             }
           </p>
        </div>

        {/* Bottom Content */}
        <div className="relative z-10 mt-auto p-16 w-full">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium">
             {isVendorSignup ? (
               <Store className="w-4 h-4 text-purple-400 fill-current animate-pulse" />
             ) : (
               <Heart className="w-4 h-4 text-rose-400 fill-current animate-pulse" />
             )}
             <span>{isVendorSignup ? 'Grow Your Business' : 'Plan Your Dream Wedding'}</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            {isVendorSignup ? 'Connect with ' : 'Begin your '}
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
              isVendorSignup ? 'from-purple-200 to-indigo-200' : 'from-rose-200 to-pink-100'
            }`}>
              {isVendorSignup ? 'future clients.' : 'forever journey.'}
            </span>
          </h1>
          <p className="text-lg text-gray-300 max-w-lg leading-relaxed">
            {isVendorSignup 
              ? 'Showcase your services, manage bookings, and grow your wedding business with our powerful vendor tools.'
              : 'Join thousands of Ethiopian couples who trust WedHabesha to make their special day absolutely perfect.'
            }
          </p>
        </div>
      </div>

      {/* Right Side - Register Form Area */}
      <div className="flex-1 relative h-full">
        
        {/* Fixed Navigation Elements */}
        <div className="absolute top-8 left-8 z-30">
           <Link to="/" className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm transition-all shadow-sm hover:shadow-md">
             <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
             <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Back</span>
           </Link>
        </div>

        <div className="absolute top-8 right-8 hidden md:block z-30">
           <Link to={isVendorSignup ? "/register" : "/register?type=vendor"}>
             <button className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all duration-300 ${
               isVendorSignup 
                 ? 'border-rose-200 hover:bg-rose-50 text-rose-700 dark:border-rose-900 dark:text-rose-400' 
                 : 'border-purple-200 hover:bg-purple-50 text-purple-700 dark:border-purple-900 dark:text-purple-400'
             }`}>
               {isVendorSignup ? <Users className="w-4 h-4" /> : <Store className="w-4 h-4" />}
               <span className="text-sm font-semibold">
                 {isVendorSignup ? 'Not a vendor? Join as Couple' : 'Are you a vendor?'}
               </span>
             </button>
           </Link>
        </div>

        {/* Scrollable Form Container */}
        <div className="absolute inset-0 overflow-y-auto flex flex-col items-center p-6">
          <div className="w-full max-w-[440px] my-auto pt-24 pb-8 md:py-12 animate-slide-up relative z-10">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-2xl shadow-lg mb-6 bg-gradient-to-br ${
                isVendorSignup 
                  ? 'from-purple-500 to-indigo-600 shadow-purple-500/30' 
                  : 'from-rose-500 to-pink-600 shadow-rose-500/30'
              }`}>
                {isVendorSignup ? 'V' : 'W'}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {isVendorSignup ? 'Vendor Registration' : 'Create Account'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 px-4">
                {isVendorSignup 
                  ? 'Fill in your business details to get verified' 
                  : 'Enter your details to start planning your wedding'}
              </p>
            </div>

            {/* Cool Box Card */}
            <Card className="border border-white/50 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none rounded-3xl overflow-hidden relative group">
              {/* Subtle glow effect */}
              <div className={`absolute -inset-px bg-gradient-to-r rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none ${
                isVendorSignup ? 'from-purple-500 to-indigo-500' : 'from-rose-500 to-pink-500'
              }`} />
              
              <CardContent className="p-8 md:p-10 relative z-10">
                <RegisterForm onSuccess={handleRegisterSuccess} />
              </CardContent>
            </Card>

            {/* Mobile Toggle Link */}
            <div className="md:hidden mt-6 text-center">
              <Link to={isVendorSignup ? "/register" : "/register?type=vendor"} className="text-sm font-medium text-gray-600 dark:text-gray-300 underline decoration-dotted underline-offset-4">
                 {isVendorSignup ? 'Not a vendor? Join as Couple' : 'Are you a vendor? Register here'}
              </Link>
            </div>

            <div className="mt-8 text-center pb-8">
               <p className="text-gray-500 dark:text-gray-400 mb-4">
                 Already have an account?
               </p>
               <Link to="/login">
                  <button className={`w-full py-3.5 px-4 rounded-xl border-2 border-dashed font-semibold hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group ${
                    isVendorSignup
                      ? 'border-gray-300 text-gray-600 hover:bg-purple-600 hover:border-purple-600 dark:border-gray-700 dark:text-gray-300'
                      : 'border-gray-300 text-gray-600 hover:bg-rose-600 hover:border-rose-600 dark:border-gray-700 dark:text-gray-300'
                  }`}>
                    <span>Sign In to Dashboard</span>
                    <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </button>
               </Link>
               
               <div className="mt-8 flex justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
                 <span className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-gray-300 transition-colors cursor-help">
                   <ShieldCheck className="w-3.5 h-3.5" /> Secure & Encrypted
                 </span>
                 <span>•</span>
                 <Link to="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Privacy</Link>
                 <span>•</span>
                 <Link to="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Terms</Link>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;