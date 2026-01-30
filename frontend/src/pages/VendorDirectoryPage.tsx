import React from 'react';
import { Search, MapPin, Filter, Star, ShieldCheck } from 'lucide-react';
import Layout from '../components/layout/Layout';
import VendorDirectory from '../components/vendors/VendorDirectory';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const VendorDirectoryPage: React.FC = () => {
  return (
    <Layout>
    
      {/* Main Content Area */}
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-18 relative">
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