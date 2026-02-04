import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vendorApi, adminApi, VendorPerformanceData } from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface VendorPerformanceMonitoringProps {
  className?: string;
}

export const VendorPerformanceMonitoring: React.FC<VendorPerformanceMonitoringProps> = ({ className }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rating' | 'leads' | 'conversion'>('rating');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  // Fetch vendor categories
  const { data: categories } = useQuery({
    queryKey: ['vendor-categories'],
    queryFn: () => vendorApi.getCategories()
  });

  // Fetch vendor performance data from real API
  const { data: performanceData, isLoading, error } = useQuery({
    queryKey: ['vendor-performance', selectedTier, selectedCategory, currentPage],
    queryFn: () => adminApi.getVendorPerformance(
      selectedTier as any || undefined,
      selectedCategory || undefined,
      currentPage * pageSize,
      pageSize
    )
  });

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 60) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 40) return { level: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getTierBadge = (tier: string) => {
    const tierStyles = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-gold-100 text-gold-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierStyles[tier as keyof typeof tierStyles] || tierStyles.free}`}>
        {tier.toUpperCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-red-600">Failed to load vendor performance data</p>
      </div>
    );
  }

  const vendors = performanceData?.vendors || [];

  // Sort vendors based on selected criteria
  const sortedVendors = [...vendors].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'leads':
        return b.total_leads - a.total_leads;
      case 'conversion':
        return b.conversion_rate - a.conversion_rate;
      default:
        return 0;
    }
  });

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Performance Monitoring</h2>
        <p className="text-gray-600">Monitor vendor performance metrics and engagement</p>
      </div>

      {/* Filter Controls */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Categories</option>
              {categories?.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Tier
            </label>
            <select
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'leads' | 'conversion')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="rating">Rating</option>
              <option value="leads">Total Leads</option>
              <option value="conversion">Conversion Rate</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setSelectedCategory('');
                setSelectedTier('');
                setSortBy('rating');
                setCurrentPage(0);
              }}
              variant="outline"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {performanceData?.total || 0}
            </div>
            <div className="text-sm text-gray-600">Total Vendors</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {vendors.filter(v => v.performance_score >= 80).length}
            </div>
            <div className="text-sm text-gray-600">Excellent Performance</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {vendors.length > 0 ? (vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1) : '0.0'}
            </div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {vendors.length > 0 ? (vendors.reduce((sum, v) => sum + v.conversion_rate, 0) / vendors.length).toFixed(1) : '0.0'}%
            </div>
            <div className="text-sm text-gray-600">Avg Conversion Rate</div>
          </div>
        </Card>
      </div>

      {/* Vendor Performance List */}
      <div className="space-y-4 mb-6">
        {sortedVendors.map((vendor) => {
          const performance = getPerformanceLevel(vendor.performance_score);
          
          return (
            <Card key={vendor.vendor_id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vendor.business_name}
                    </h3>
                    {getTierBadge(vendor.subscription_tier)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${performance.bg} ${performance.color}`}>
                      {performance.level}
                    </span>
                    {vendor.is_verified && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        VERIFIED
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Performance Score</p>
                      <p className="text-xl font-bold text-gray-900">{vendor.performance_score}/100</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rating</p>
                      <p className="font-medium">{vendor.rating.toFixed(1)} ⭐</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reviews</p>
                      <p className="font-medium">{vendor.total_reviews}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Leads</p>
                      <p className="font-medium">{vendor.total_leads}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Conversion Rate</p>
                      <p className="font-medium">{vendor.conversion_rate.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Category:</span> {vendor.category}
                    </div>
                    <div>
                      <span className="font-medium">Monthly Fee:</span> ${vendor.monthly_fee}
                    </div>
                    <div>
                      <span className="font-medium">Last Activity:</span>{' '}
                      {new Date(vendor.last_activity).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Performance Score</span>
                      <span className="font-medium">{vendor.performance_score}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          vendor.performance_score >= 80 ? 'bg-green-500' :
                          vendor.performance_score >= 60 ? 'bg-blue-500' :
                          vendor.performance_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${vendor.performance_score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {vendors.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Vendor Performance Data</h3>
          <p className="text-gray-600">No vendors match the current filters or there is no performance data available.</p>
        </Card>
      )}

      {/* Pagination */}
      {performanceData && performanceData.total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, performanceData.total)} of{' '}
            {performanceData.total} vendors
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!performanceData.has_more}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};