import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Star, Users, Briefcase } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [weddingCode, setWeddingCode] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wedding_code: weddingCode,
          staff_pin: staffPin,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Login failed');
      }

      const data = await response.json();

      // Store token and staff info
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('staff_session', JSON.stringify(data.session));
      localStorage.setItem('user_type', 'STAFF');

      // Redirect to staff dashboard
      navigate('/staff/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex w-full font-sans bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-indigo-200/40 rounded-full blur-[100px] animate-pulse mix-blend-multiply dark:bg-indigo-900/20" />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] animate-pulse animation-delay-2000 dark:bg-purple-900/20 mix-blend-multiply" />
      </div>

      {/* Left Side - Visual Story (Fixed) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gray-900 h-full">
        <div className="absolute inset-0">
          <img 
            src="/loginStaff.png"
            alt="Staff Management Dashboard"
            className="w-full h-full object-cover opacity-90 transition-transform duration-[20s] hover:scale-105"
            loading="eager"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
          <div className="absolute inset-0 bg-indigo-900/30 mix-blend-overlay" />
        </div>

        {/* Floating Stat Card */}
        <div className="absolute top-12 right-12 bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl max-w-xs shadow-xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
           <div className="flex items-center gap-3 mb-3">
             <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-indigo-500 to-purple-600">
               <Briefcase className="w-6 h-6" />
             </div>
             <div>
               <p className="text-white text-base font-bold">Staff Portal</p>
               <div className="flex text-yellow-400 text-xs gap-0.5">
                 {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
               </div>
             </div>
           </div>
           <p className="text-white/90 text-sm leading-relaxed">
             Access real-time guest lists, seating charts, and event schedules instantly.
           </p>
        </div>

        {/* Bottom Content */}
        <div className="relative z-10 mt-auto p-16 w-full">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium">
             <Users className="w-4 h-4 text-indigo-400 fill-current animate-pulse" />
             <span>Team Access Only</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Streamline wedding <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">
              day operations.
            </span>
          </h1>
          <p className="text-lg text-gray-300 max-w-lg leading-relaxed">
            Efficiently manage check-ins, coordinate tasks, and ensure a flawless experience for every guest.
          </p>
        </div>
      </div>

      {/* Right Side - Staff Login Form Area */}
      <div className="flex-1 relative h-full">
        
        {/* Fixed Navigation Elements */}
        <div className="absolute top-8 left-8 z-30">
           <Link to="/" className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm transition-all shadow-sm hover:shadow-md">
             <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
             <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Back</span>
           </Link>
        </div>

        {/* Scrollable Form Container */}
        <div className="absolute inset-0 overflow-y-auto flex flex-col items-center p-6">
          <div className="w-full max-w-[440px] my-auto pt-24 pb-8 md:py-12 animate-slide-up relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-2xl shadow-lg mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30">
                S
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Staff Login
              </h2>
              <p className="text-gray-500 dark:text-gray-400 px-4">
                Enter your credentials to access the event dashboard
              </p>
            </div>

            {/* Cool Box Card */}
            <Card className="border border-white/50 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none rounded-3xl overflow-hidden relative group">
              {/* Subtle glow effect */}
              <div className="absolute -inset-px bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" />
              
              <CardContent className="p-8 md:p-10 relative z-10">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                      Wedding ID
                    </label>
                    <Input
                      type="text"
                      value={weddingCode}
                      onChange={(e) => setWeddingCode(e.target.value.toUpperCase())}
                      placeholder="WED2024..."
                      disabled={isLoading}
                      required
                      className="uppercase h-12 bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-indigo-500 focus:border-indigo-500 transition-all rounded-xl text-base"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      Ask the couple for the Wedding ID
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                      Staff PIN
                    </label>
                    <Input
                      type="password"
                      value={staffPin}
                      onChange={(e) => setStaffPin(e.target.value)}
                      placeholder="••••••"
                      disabled={isLoading}
                      required
                      maxLength={6}
                      className="h-12 bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-indigo-500 focus:border-indigo-500 transition-all rounded-xl text-base tracking-widest"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      Enter your 6-digit access PIN
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      'Access Dashboard'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-8 flex justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
               <span className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-gray-300 transition-colors cursor-help">
                 <ShieldCheck className="w-3.5 h-3.5" /> Secure Access
               </span>
               <span>•</span>
               <Link to="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLoginPage;