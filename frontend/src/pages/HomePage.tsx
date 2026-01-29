import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Palette
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

const HomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const testimonials = [
    {
      name: "Meron & Daniel",
      text: "WedHabesha made our wedding planning so much easier. The guest management system was perfect!",
      location: "Addis Ababa",
      role: "Newlyweds"
    },
    {
      name: "Sara & Michael", 
      text: "Found amazing vendors through the platform. Our photographer was incredible and understood our traditions.",
      location: "Bahir Dar",
      role: "Happy Couple"
    },
    {
      name: "Hanan & Yonas",
      text: "The budget tracking helped us stay on track with our finances without stress. Highly recommend!",
      location: "Hawassa",
      role: "Planned in 3 months"
    }
  ];

  const features = [
    {
      title: "Smart Guest Management",
      description: "Effortlessly manage your guest list with QR codes, real-time check-in, and SMS invitations in Amharic and English.",
      icon: <Users className="w-8 h-8" />,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
      stats: "500+ Guests Managed Daily",
      image: "/Guest.png"
    },
    {
      title: "Verified Vendor Network", 
      description: "Connect with verified wedding vendors across Ethiopia. From traditional Melse dress makers to modern photographers.",
      icon: <Store className="w-8 h-8" />,
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
      stats: "200+ Verified Vendors",
      image: "/Vendor.png"
    },
    {
      title: "Smart Budget Tracking",
      description: "Track expenses with comprehensive budget planning tools in Ethiopian Birr. Get alerts and insights.",
      icon: <Calculator className="w-8 h-8" />,
      color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400", 
      stats: "Average 30% Cost Savings",
      image: "/image1.png"
    }
  ];

  const vendorCategories = [
    { name: "Photography", icon: <Camera className="w-6 h-6" />, color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400", link: "/vendors?category=photography" },
    { name: "Catering", icon: <Utensils className="w-6 h-6" />, color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400", link: "/vendors?category=catering" },
    { name: "Music & DJ", icon: <Music className="w-6 h-6" />, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400", link: "/vendors?category=music" },
    { name: "Decor", icon: <Flower2 className="w-6 h-6" />, color: "text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400", link: "/vendors?category=decor" },
    { name: "Transport", icon: <Car className="w-6 h-6" />, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400", link: "/vendors?category=transport" },
    { name: "Makeup", icon: <Palette className="w-6 h-6" />, color: "text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400", link: "/vendors?category=makeup" },
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 6000); // Slower interval for better reading time
    
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    
    return () => {
      clearInterval(interval);
      clearInterval(featureInterval);
    };
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen flex items-center pt-16 md:pt-0">
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-rose-200/40 to-purple-200/40 blur-3xl opacity-60 animate-pulse dark:from-rose-900/20 dark:to-purple-900/20" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-200/40 to-teal-200/40 blur-3xl opacity-60 animate-pulse animation-delay-2000 dark:from-blue-900/20 dark:to-teal-900/20" />
        </div>
        
        <div className="relative container mx-auto px-4 py-12 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Left Column - Content */}
            <div className={`space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-white/10 backdrop-blur-md border border-rose-200/50 dark:border-white/10 rounded-full shadow-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <span className="text-sm font-medium text-rose-600 dark:text-rose-300">#1 Wedding Platform in Ethiopia</span>
              </div>

              {/* Heading */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
                Plan Your Perfect <br />
                <span className="bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                  Habesha Wedding
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg">
                The all-in-one platform for Ethiopian couples. Manage guests, discover verified vendors, and track your budget in one place.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-500/30 text-lg font-semibold transition-all hover:-translate-y-1">
                    Start Planning Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 border-2 border-gray-200 dark:border-gray-700 hover:border-rose-500 hover:text-rose-600 bg-transparent text-gray-700 dark:text-gray-200 rounded-xl text-lg font-semibold transition-all">
                   Sign In
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-6">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-gray-600">
                        {i === 4 ? '500+' : ''}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex text-yellow-400 gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">Trusted by 500+ couples</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image Composition */}
            <div className={`relative transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
               <div className="relative z-10">
                 {/* Main Image Frame */}
                 <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white dark:border-gray-800">
                   <img 
                     src="/image1.png"
                     alt="Ethiopian Wedding Couple"
                     className="w-full h-[550px] object-cover scale-105 hover:scale-110 transition-transform duration-700"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                   
                   {/* Floating Feature Card */}
                   <div className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-4 rounded-2xl shadow-lg flex items-center gap-4 animate-slide-up">
                     <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                       <CheckCircle className="w-6 h-6 text-green-600" />
                     </div>
                     <div>
                       <p className="font-bold text-gray-900 dark:text-white">Wedding Checklist</p>
                       <p className="text-sm text-gray-500">85% Completed</p>
                     </div>
                     <div className="ml-auto font-bold text-green-600">On Track</div>
                   </div>
                 </div>

                 {/* Decorative Flag Accents */}
                 <div className="absolute -z-10 -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full opacity-20 blur-xl"></div>
                 <div className="absolute -z-10 top-1/2 -right-12 w-32 h-32 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full opacity-20 blur-xl"></div>
                 <div className="absolute -z-10 -bottom-6 -left-6 w-40 h-40 bg-gradient-to-br from-red-500 to-red-600 rounded-full opacity-20 blur-xl"></div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Showcase */}
      <div className="pb-12 pt-12 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need to Say "I Do"
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Powerful tools designed specifically for Ethiopian wedding traditions and modern planning needs.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className={`group relative border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
                  currentFeature === index 
                    ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-[1.02]' 
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
                onClick={() => setCurrentFeature(index)}
              >
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <div className="flex items-center text-sm font-semibold text-rose-600 group-hover:translate-x-2 transition-transform">
                    Learn more <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
                
                {/* Active Indicator Bar */}
                {currentFeature === index && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-purple-500"></div>
                )}
              </Card>
            ))}
          </div>

          {/* Interactive Feature Demo */}
          <div className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
            <div className="grid md:grid-cols-2 items-center">
              <div className="p-12">
                <div className="inline-flex items-center gap-2 text-rose-400 font-semibold mb-4">
                  <Sparkles className="w-5 h-5" /> Feature Spotlight
                </div>
                <h3 className="text-3xl font-bold text-white mb-6">
                  {features[currentFeature].title}
                </h3>
                <p className="text-gray-300 text-lg mb-8">
                  Experience the power of our {features[currentFeature].title.toLowerCase()} tool. 
                  Designed to handle the complexity of large Ethiopian weddings with ease.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span>Mobile-first design for easy access</span>
                  </div>
                  <div className="flex items-center gap-3 text-white">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span>Real-time updates & notifications</span>
                  </div>
                  <div className="flex items-center gap-3 text-white">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span>Amharic & English language support</span>
                  </div>
                </div>
              </div>
              <div className="relative h-[400px] bg-gray-800">
                <img 
                  src={features[currentFeature].image}
                  alt="Feature Demo"
                  className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity duration-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                    <PlayCircle className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Vendor Categories Section */}
      <div className="pb-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 md:p-12">
            <div className="text-center mb-10">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">Find Top Wedding Vendors</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Browse by category to find your perfect match</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {vendorCategories.map((cat, index) => (
                <Link to={cat.link} key={index} className="group">
                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300 cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 ${cat.color} bg-white dark:bg-gray-800 shadow-sm`}>
                      {cat.icon}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {cat.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="py-24 bg-rose-50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Real Weddings, Real Stories</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Join the community of happy couples</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="relative bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl p-8 md:p-12">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 fill-current" />
                </div>
              </div>

              <div className="text-center mt-6">
                <div className="flex justify-center gap-1 mb-6">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />)}
                </div>
                
                <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 dark:text-white mb-8 leading-relaxed">
                  "{testimonials[currentSlide].text}"
                </blockquote>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mb-3 overflow-hidden">
                    {/* Placeholder avatar logic */}
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-200 to-purple-200 text-2xl">
                       👩‍❤️‍👨
                    </div>
                  </div>
                  <div className="font-bold text-lg text-gray-900 dark:text-white">
                    {testimonials[currentSlide].name}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mt-1">
                    <MapPin className="w-4 h-4" />
                    {testimonials[currentSlide].location} • {testimonials[currentSlide].role}
                  </div>
                </div>

                {/* Dots Navigation */}
                <div className="flex justify-center gap-2 mt-8">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentSlide === index ? 'w-8 bg-rose-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative py-24 bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-rose-600 to-purple-600"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Ready to Plan Your Big Day?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join thousands of Ethiopian couples who have simplified their wedding planning with WedHabesha.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link to="/register">
              <Button size="lg" className="h-16 px-10 text-lg font-bold bg-white text-gray-900 hover:bg-gray-100 rounded-xl shadow-xl transition-transform hover:scale-105">
                Get Started for Free
              </Button>
            </Link>
            <Link to="/vendors">
              <Button variant="outline" size="lg" className="h-16 px-10 text-lg font-bold border-2 border-gray-600 text-white hover:bg-gray-800 hover:border-gray-500 rounded-xl">
                Browse Vendors
              </Button>
            </Link>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-800 flex flex-wrap justify-center gap-8 md:gap-16 text-center">
             <div className="flex flex-col items-center">
                <ShieldCheck className="w-8 h-8 text-rose-500 mb-2" />
                <span className="text-gray-400 text-sm">Secure Platform</span>
             </div>
             <div className="flex flex-col items-center">
                <Users className="w-8 h-8 text-blue-500 mb-2" />
                <span className="text-gray-400 text-sm">Community Support</span>
             </div>
             <div className="flex flex-col items-center">
                <Store className="w-8 h-8 text-purple-500 mb-2" />
                <span className="text-gray-400 text-sm">Verified Pros</span>
             </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;