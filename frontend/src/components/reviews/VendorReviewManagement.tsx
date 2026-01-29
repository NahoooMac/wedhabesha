import React, { useState, useEffect } from 'react';
import { 
  Star, 
  BarChart3, 
  MessageSquare, 
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { 
  ReviewResponse, 
  ReviewsResponse, 
  RatingBreakdownResponse,
  vendorApi 
} from '../../lib/api';
import RatingBreakdownDisplay from './RatingBreakdownDisplay';
import VendorReviewResponse from './VendorReviewResponse';
import ReviewAnalytics from './ReviewAnalytics';

interface VendorReviewManagementProps {
  vendorId: number;
}

interface ReviewFilters {
  rating?: number;
  responded?: boolean;
  verified_only: boolean;
}

const VendorReviewManagement: React.FC<VendorReviewManagementProps> = ({
  vendorId
}) => {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ReviewFilters>({
    verified_only: true
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 20,
    total: 0,
    hasMore: false
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'analytics'>('overview');

  useEffect(() => {
    loadData();
  }, [vendorId, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsData, breakdownData] = await Promise.all([
        vendorApi.getVendorReviews(vendorId, {
          verified_only: filters.verified_only,
          skip: 0,
          limit: pagination.limit
        }),
        vendorApi.getRatingBreakdown(vendorId)
      ]);

      // Apply client-side filters
      let filteredReviews = reviewsData.reviews;
      
      if (filters.rating) {
        filteredReviews = filteredReviews.filter(review => review.rating === filters.rating);
      }

      setReviews(filteredReviews);
      setRatingBreakdown(breakdownData);
      setPagination({
        skip: reviewsData.skip,
        limit: reviewsData.limit,
        total: reviewsData.total,
        hasMore: reviewsData.has_more
      });
    } catch (error) {
      console.error('Failed to load review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const nextSkip = pagination.skip + pagination.limit;
      const reviewsData = await vendorApi.getVendorReviews(vendorId, {
        verified_only: filters.verified_only,
        skip: nextSkip,
        limit: pagination.limit
      });

      setReviews(prev => [...prev, ...reviewsData.reviews]);
      setPagination({
        skip: reviewsData.skip,
        limit: reviewsData.limit,
        total: reviewsData.total,
        hasMore: reviewsData.has_more
      });
    } catch (error) {
      console.error('Failed to load more reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewResponse = async (reviewId: number, response: string) => {
    try {
      // This would call the vendor response API endpoint
      // await vendorApi.respondToReview(reviewId, { response });
      
      // For now, we'll just log it
      console.log('Review response submitted:', { reviewId, response });
      
      // Refresh data to show the response
      await loadData();
    } catch (error) {
      console.error('Failed to submit review response:', error);
      throw error;
    }
  };

  const handleFilterChange = (newFilters: Partial<ReviewFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const exportReviews = () => {
    // Create CSV content
    const csvContent = [
      ['Date', 'Rating', 'Comment', 'Verified', 'Couple ID'].join(','),
      ...reviews.map(review => [
        new Date(review.created_at).toLocaleDateString(),
        review.rating,
        `"${review.comment.replace(/"/g, '""')}"`,
        review.is_verified ? 'Yes' : 'No',
        review.couple_id
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-reviews-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getOverviewStats = () => {
    if (!ratingBreakdown) return null;

    const positiveReviews = (ratingBreakdown.rating_distribution[5] || 0) + 
                           (ratingBreakdown.rating_distribution[4] || 0);
    const responseRate = 0; // This would come from the API
    
    return {
      totalReviews: ratingBreakdown.total_reviews,
      averageRating: ratingBreakdown.average_rating,
      positivePercentage: ratingBreakdown.total_reviews > 0 
        ? Math.round((positiveReviews / ratingBreakdown.total_reviews) * 100)
        : 0,
      responseRate
    };
  };

  const stats = getOverviewStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Review Management
          </h2>
          <p className="text-secondary-600 mt-1">
            Manage your customer reviews and ratings
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportReviews}
            disabled={reviews.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-900">
                  {stats.totalReviews}
                </div>
                <div className="text-sm text-secondary-600">Total Reviews</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.averageRating?.toFixed(1) || '0.0'}
                </div>
                <div className="text-sm text-secondary-600">Average Rating</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.positivePercentage}%
                </div>
                <div className="text-sm text-secondary-600">Positive Reviews</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.responseRate}%
                </div>
                <div className="text-sm text-secondary-600">Response Rate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {ratingBreakdown && (
            <RatingBreakdownDisplay
              breakdown={ratingBreakdown}
              showTrends={true}
            />
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Rating
                  </label>
                  <select
                    value={filters.rating || ''}
                    onChange={(e) => handleFilterChange({ 
                      rating: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Verification Status
                  </label>
                  <select
                    value={filters.verified_only ? 'verified' : 'all'}
                    onChange={(e) => handleFilterChange({ 
                      verified_only: e.target.value === 'verified' 
                    })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Reviews</option>
                    <option value="verified">Verified Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Response Status
                  </label>
                  <select
                    value={filters.responded !== undefined ? (filters.responded ? 'responded' : 'not_responded') : 'all'}
                    onChange={(e) => handleFilterChange({ 
                      responded: e.target.value === 'all' ? undefined : e.target.value === 'responded'
                    })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Reviews</option>
                    <option value="not_responded">Need Response</option>
                    <option value="responded">Already Responded</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          <div className="space-y-4">
            {loading && reviews.length === 0 ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-secondary-200 rounded-full"></div>
                        <div className="flex-1 space-y-3">
                          <div className="w-32 h-4 bg-secondary-200 rounded"></div>
                          <div className="w-full h-4 bg-secondary-200 rounded"></div>
                          <div className="w-3/4 h-4 bg-secondary-200 rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <>
                {reviews.map((review) => (
                  <VendorReviewResponse
                    key={review.id}
                    review={review}
                    onResponseSubmit={handleReviewResponse}
                    canRespond={true}
                  />
                ))}
                
                {pagination.hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      onClick={handleLoadMore}
                      loading={loading}
                      variant="outline"
                    >
                      Load More Reviews
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  No reviews found
                </h3>
                <p className="text-secondary-600">
                  {filters.rating || filters.responded !== undefined
                    ? 'No reviews match your current filters'
                    : 'You haven\'t received any reviews yet'
                  }
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {ratingBreakdown && stats && (
            <ReviewAnalytics
              breakdown={ratingBreakdown}
              totalReviews={stats.totalReviews}
              averageRating={stats.averageRating}
              responseRate={stats.responseRate}
              recentTrend="stable"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorReviewManagement;