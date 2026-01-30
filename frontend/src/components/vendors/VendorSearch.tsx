import React, { useState } from 'react';
import { Search, Filter, MapPin, Star, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { VendorCategory, VendorCategoryResponse } from '../../lib/api';

interface VendorSearchProps {
  onSearch: (params: LocalVendorSearchParams) => void;
  categories: VendorCategoryResponse[];
  loading?: boolean;
  initialValues?: LocalVendorSearchParams;
}

interface LocalVendorSearchParams {
  search?: string;
  category?: VendorCategory;
  location?: string;
  min_rating?: number;
  verified_only?: boolean;
}

const VendorSearch: React.FC<VendorSearchProps> = ({ onSearch, categories, loading = false, initialValues = {} }) => {
  const [searchTerm, setSearchTerm] = useState(initialValues.search || '');
  const [selectedCategory, setSelectedCategory] = useState<VendorCategory | ''>(initialValues.category || '');
  const [location, setLocation] = useState(initialValues.location || '');
  const [minRating, setMinRating] = useState<number | ''>(initialValues.min_rating || '');
  const [verifiedOnly, setVerifiedOnly] = useState(initialValues.verified_only || false);
  const [showFilters, setShowFilters] = useState(false);

  // Update form values when initialValues change (e.g., from URL)
  React.useEffect(() => {
    setSearchTerm(initialValues.search || '');
    setSelectedCategory(initialValues.category || '');
    setLocation(initialValues.location || '');
    setMinRating(initialValues.min_rating || '');
    setVerifiedOnly(initialValues.verified_only || false);
    
    // Show filters if any filter values are set
    const hasFilters = initialValues.category || initialValues.location || initialValues.min_rating || initialValues.verified_only;
    if (hasFilters) {
      setShowFilters(true);
    }
  }, [initialValues]);

  const handleSearch = () => {
    const params: LocalVendorSearchParams = {};
    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (selectedCategory) params.category = selectedCategory as VendorCategory;
    if (location.trim()) params.location = location.trim();
    if (minRating) params.min_rating = minRating as number;
    if (verifiedOnly) params.verified_only = true;
    onSearch(params);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setLocation('');
    setMinRating('');
    setVerifiedOnly(false);
    onSearch({});
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Main Search Input */}
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search vendors (e.g., 'Wedding Photographer')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all placeholder:text-gray-400 dark:text-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-12 px-6 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all ${showFilters ? 'bg-gray-100 dark:bg-gray-700 border-rose-500 text-rose-600' : ''}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          <Button 
            onClick={handleSearch} 
            loading={loading}
            className="h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-500/25 transition-all"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Expandable Filters Area */}
      {showFilters && (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as VendorCategory | '')}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all dark:text-white"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="City or Area"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rating</label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : '')}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all dark:text-white"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars (Excellent)</option>
                  <option value="3">3+ Stars (Good)</option>
                  <option value="2">2+ Stars (Fair)</option>
                </select>
              </div>
            </div>

            {/* Verified Switch */}
            <div className="flex items-end pb-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${verifiedOnly ? 'bg-rose-600 border-rose-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'}`}>
                  {verifiedOnly && <X className="h-3 w-3 text-white rotate-45 transform origin-center" style={{transform: 'rotate(0deg)'}}><path d="M5 13l4 4L19 7"/></X> /* Checkmark icon hack using lucide if needed, or simple css */}
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="hidden"
                  />
                  {verifiedOnly && (
                    <svg className="w-3.5 h-3.5 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-700 dark:text-gray-300 group-hover:text-rose-600 transition-colors">Verified Vendors Only</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button variant="ghost" onClick={handleReset} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Clear All
            </Button>
            <Button onClick={handleSearch} className="bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 rounded-lg px-6">
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorSearch;