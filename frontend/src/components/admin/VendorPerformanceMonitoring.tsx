import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vendorApi, adminApi } from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface VendorPerformanceMonitoringProps {
  className?: string;
}

interface VendorPerformanceData {
  vendor_id: number;
  business_name: string;
  category: string;
  rating: number;
  total_reviews: number;
  total_leads: number;
  conversion_rate: number;
  subscription_tier: string;
  is_verified: boolean;
  created_at: string;
  last_activity: string;
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

  // Fetch vendor subscriptions for performance data
  const { data: subscriptionsData, isLoading, error } = useQuery({
    queryKey: ['vendor-subscriptions', selectedTier, currentPage],
    queryFn: () => adminApi.getVendorSubscriptions(
      selectedTier as any || undefined,
      currentPage * pageSize,
      pageSize
    )
  });

  // Mock performance data - in real implementation, this would come from analytics API
  const getPerformanceData = (subscription: any): VendorPerformanceData => {
    return {
      vendor_id: subscription.vendor_id,
      business_name: subscription.business_name,
      category: 'Photography', // Would come from vendor data
      rating: Math.random() * 2 + 3, // 3-5 rating
      total_reviews: Math.floor(Math.random() * 50) + 5,
      total_leads: Math.floor(Math.random() * 100) + 10,
      conversion_rate: Math.random() * 30 + 10, // 10-40%
      subscription_tier: subscription.tier,
      is_verified: true,
      created_at: subscription.started_at,
      last_activity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  };

  const getPerformanceScore = (data: VendorPerformanceData) => {
    const ratingScore = (data.rating / 5) * 30;
    const reviewScore = Math.min(data.total_reviews / 20, 1) * 25;
    const leadScore = Math.min(data.total_leads / 50, 1) * 25;
    const conversionScore = (data.conversion_rate / 40) * 20;
    
    return Math.round(ratingScore + reviewScore + leadScore + conversionScore);
  };

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

  const performanceData = subscriptionsData?.subscriptions.map(getPerformanceData) || [];

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
              {performanceData.length}
            </div>
            <div className="text-sm text-gray-600">Total Vendors</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {performanceData.filter(v => getPerformanceScore(v) >= 80).length}
            </div>
            <div className="text-sm text-gray-600">Excellent Performance</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(performanceData.reduce((sum, v) => sum + v.rating, 0) / performanceData.length || 0).toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(performanceData.reduce((sum, v) => sum + v.conversion_rate, 0) / performanceData.length || 0).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Conversion Rate</div>
          </div>
        </Card>
      </div>

      {/* Vendor Performance List */}
      <div className="space-y-4 mb-6">
        {performanceData.map((vendor) => {
          const score = getPerformanceScore(vendor);
          const performance = getPerformanceLevel(score);
          
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
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Performance Score</p>
                      <p className="text-xl font-bold text-gray-900">{score}/100</p>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Category:</span> {vendor.category}
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
                      <span className="font-medium">{score}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          score >= 80 ? 'bg-green-500' :
                          score >= 60 ? 'bg-blue-500' :
                          score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {subscriptionsData && subscriptionsData.total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, subscriptionsData.total)} of{' '}
            {subscriptionsData.total} vendors
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
              disabled={!subscriptionsData.has_more}
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