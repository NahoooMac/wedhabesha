import React, { useState, useEffect } from 'react';
import { Grid, List, PackageOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import VendorSearch from './VendorSearch';
import VendorCard from './VendorCard';
import VendorProfileModal from './VendorProfileModal';
import ContactVendorModal from './ContactVendorModal';
import { 
  VendorResponse, 
  VendorCategoryResponse,
  VendorCategory,
  vendorApi 
} from '../../lib/api';

interface VendorSearchParams {
  search?: string;
  category?: VendorCategory;
  location?: string;
  min_rating?: number;
  verified_only?: boolean;
}

const VendorDirectory: React.FC = () => {
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [categories, setCategories] = useState<VendorCategoryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<VendorSearchParams>({});
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 12,
    total: 0,
    hasMore: false
  });
  
  // Modal states
  const [selectedVendor, setSelectedVendor] = useState<VendorResponse | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadCategories();
    loadVendors({});
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await vendorApi.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadVendors = async (params: VendorSearchParams, skip = 0) => {
    setLoading(true);
    try {
      const searchData = await vendorApi.searchVendors({
        ...params,
        skip,
        limit: pagination.limit
      });
      
      if (skip === 0) {
        setVendors(searchData.vendors);
      } else {
        setVendors(prev => [...prev, ...searchData.vendors]);
      }
      
      setPagination({
        skip: searchData.skip,
        limit: searchData.limit,
        total: searchData.total,
        hasMore: searchData.has_more
      });
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params: VendorSearchParams) => {
    // Apply verification filter
    const finalParams = {
      ...params,
      verified_only: verificationFilter === 'verified' ? true : verificationFilter === 'unverified' ? false : undefined
    };
    setSearchParams(finalParams);
    loadVendors(finalParams, 0);
  };

  const handleVerificationFilterChange = (filter: 'all' | 'verified' | 'unverified') => {
    setVerificationFilter(filter);
    const finalParams = {
      ...searchParams,
      verified_only: filter === 'verified' ? true : filter === 'unverified' ? false : undefined
    };
    setSearchParams(finalParams);
    loadVendors(finalParams, 0);
  };

  const handleLoadMore = () => {
    const nextSkip = pagination.skip + pagination.limit;
    loadVendors(searchParams, nextSkip);
  };

  const handleViewProfile = (vendor: VendorResponse) => {
    setSelectedVendor(vendor);
    setShowProfileModal(true);
  };

  const handleContact = (vendor: VendorResponse) => {
    setSelectedVendor(vendor);
    setShowContactModal(true);
  };

  const handleContactSuccess = () => {
    // Could show a success message or redirect to dashboard
    console.log('Contact message sent successfully');
  };

  const getResultsText = () => {
    if (loading && vendors.length === 0) return 'Finding the best matches...';
    if (vendors.length === 0) return 'No vendors found';
    
    const start = pagination.skip + 1;
    const end = Math.min(pagination.skip + vendors.length, pagination.total);
    return (
      <span className="text-gray-600 dark:text-gray-400">
        Showing <span className="font-semibold text-gray-900 dark:text-white">{start}-{end}</span> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> professionals
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Search Component - Wrapped in a cleaner container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-1">
        <VendorSearch
          onSearch={handleSearch}
          categories={categories}
          loading={loading}
        />
      </div>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
        <div className="text-sm">
          {getResultsText()}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Verification Filter */}
          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <button
              onClick={() => handleVerificationFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                verificationFilter === 'all' 
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleVerificationFilterChange('verified')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                verificationFilter === 'verified' 
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Verified Only
            </button>
            <button
              onClick={() => handleVerificationFilterChange('unverified')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                verificationFilter === 'unverified' 
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Not Verified
            </button>
          </div>

          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'grid' 
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'list' 
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Vendors Grid/List */}
      {loading && vendors.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="w-full h-56 bg-gray-200 dark:bg-gray-700"></div>
              <div className="p-6 space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="flex gap-2 pt-4">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : vendors.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
              : 'space-y-6'
          }>
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onContact={handleContact}
                onViewProfile={handleViewProfile}
              />
            ))}
          </div>

          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="text-center pt-12 pb-6">
              <Button
                onClick={handleLoadMore}
                loading={loading}
                variant="outline"
                size="lg"
                className="min-w-[200px] h-12 rounded-xl border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium"
              >
                Show More Vendors
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-6">
            <PackageOpen className="h-10 w-10 text-rose-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No matches found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
            We couldn't find any vendors matching your specific criteria. Try adjusting your filters or search for something else.
          </p>
          <Button 
            onClick={() => handleSearch({})}
            className="h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-500/25"
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Modals */}
      <VendorProfileModal
        vendor={selectedVendor!}
        isOpen={showProfileModal && selectedVendor !== null}
        onClose={() => setShowProfileModal(false)}
        onContact={handleContact}
      />

      <ContactVendorModal
        vendor={selectedVendor}
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSuccess={handleContactSuccess}
      />
    </div>
  );
};

export default VendorDirectory;