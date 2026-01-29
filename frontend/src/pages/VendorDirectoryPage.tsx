import React from 'react';
import { Search, MapPin, Filter, Star, ShieldCheck } from 'lucide-react';
import Layout from '../components/layout/Layout';
import VendorDirectory from '../components/vendors/VendorDirectory';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const VendorDirectoryPage: React.FC = () => {
  return (
    <Layout>
      {/* Hero Section */}
      {/* Increased padding-top (pt-32 md:pt-40 lg:pt-48) to account for fixed navbar */}
      <div className="relative bg-gray-900 text-white overflow-hidden pb-16 pt-32 md:pt-40 lg:pt-48">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-500/20 rounded-full blur-[100px] animate-pulse mix-blend-screen" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse animation-delay-2000 mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-rose-300 text-sm font-medium mb-8">
               <Star className="w-4 h-4 fill-current" />
               <span>Ethiopia's Top Wedding Professionals</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
              Find the perfect team for your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-purple-300">
                Special Day
              </span>
            </h1>
            
            <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Browse through our curated list of verified photographers, caterers, decorators, and more. 
              Book trusted professionals for your Ethiopian wedding.
            </p>

            {/* Enhanced Search Bar */}
            <div className="bg-white p-2 rounded-2xl shadow-xl max-w-2xl mx-auto flex flex-col sm:flex-row gap-2 relative z-20">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input 
                  type="text" 
                  placeholder="Search vendors (e.g., 'Melse Dress', 'Photographer')" 
                  className="w-full pl-10 border-0 bg-transparent focus:ring-0 text-gray-900 placeholder:text-gray-500 h-12"
                />
              </div>
              <div className="h-px sm:h-auto sm:w-px bg-gray-200 mx-2" />
              <div className="relative flex-1 sm:max-w-[200px]">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select className="w-full pl-10 pr-4 h-12 bg-transparent border-0 text-gray-700 focus:ring-0 cursor-pointer appearance-none">
                  <option value="">All Locations</option>
                  <option value="Addis Ababa">Addis Ababa</option>
                  <option value="Bahir Dar">Bahir Dar</option>
                  <option value="Hawassa">Hawassa</option>
                  <option value="Mekelle">Mekelle</option>
                  <option value="Adama">Adama</option>
                </select>
              </div>
              <Button className="h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-lg shadow-rose-500/25 transition-all">
                Search
              </Button>
            </div>
            
            {/* Quick Stats */}
            <div className="flex justify-center gap-6 mt-10 text-sm text-gray-400">
               <span className="flex items-center gap-1.5">
                 <ShieldCheck className="w-4 h-4 text-green-400" /> Verified Professionals
               </span>
               <span className="hidden sm:inline">•</span>
               <span className="flex items-center gap-1.5">
                 <Star className="w-4 h-4 text-yellow-400" /> Top Rated Services
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-16 relative">
        <div className="container mx-auto px-4">
          
          {/* Section Header with Filters */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 pb-6 border-b border-gray-200 dark:border-gray-800 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                All Vendors
                <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">248</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Showing best matches for your wedding
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
              <select className="h-9 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-rose-500 focus:border-rose-500">
                <option>Recommended</option>
                <option>Highest Rated</option>
                <option>Most Reviews</option>
                <option>Price: Low to High</option>
              </select>
            </div>
          </div>

          {/* Directory Grid */}
          <div className="relative z-10">
            <VendorDirectory />
          </div>
          
        </div>
      </div>
    </Layout>
  );
};

export default VendorDirectoryPage;