import React, { useState, useEffect } from 'react';
import { Star, Filter, ChevronDown, Flag, ThumbsUp, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { 
  ReviewResponse, 
  ReviewsResponse, 
  RatingBreakdownResponse,
  vendorApi 
} from '../../lib/api';

interface ReviewDisplayProps {
  vendorId: number;
  showFilters?: boolean;
  maxReviews?: number;
}

interface ReviewFilters {
  rating?: number;
  verified_only: boolean;
  sort_by: 'newest' | 'oldest' | 'highest_rating' | 'lowest_rating';
}

const ReviewDisplay: React.FC<ReviewDisplayProps> = ({
  vendorId,
  showFilters = true,
  maxReviews
}) => {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReviewFilters>({
    verified_only: true,
    sort_by: 'newest'
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: maxReviews || 10,
    total: 0,
    hasMore: false
  });
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [vendorId, filters]);

  const loadReviews = async (skip = 0) => {
    setLoading(true);
    try {
      const response = await vendorApi.getVendorReviews(vendorId, {
        verified_only: filters.verified_only,
        offset: skip,  // Changed from skip to offset
        limit: pagination.limit
      });

      // Apply client-side sorting and filtering
      let sortedReviews = [...response.reviews];
      
      if (filters.rating) {
        sortedReviews = sortedReviews.filter(review => review.rating === filters.rating);
      }

      switch (filters.sort_by) {
        case 'oldest':
          sortedReviews.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
        case 'highest_rating':
          sortedReviews.sort((a, b) => b.rating - a.rating);
          break;
        case 'lowest_rating':
          sortedReviews.sort((a, b) => a.rating - b.rating);
          break;
        case 'newest':
        default:
          sortedReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
      }

      if (skip === 0) {
        setReviews(sortedReviews);
        // Set rating breakdown from the reviews response
        if (response.summary) {
          setRatingBreakdown({
            total_reviews: response.summary.total_reviews,
            average_rating: response.summary.average_rating ? parseFloat(response.summary.average_rating) : undefined,
            rating_distribution: response.summary.rating_distribution,
            recent_reviews: [] // Not provided by backend
          });
        }
      } else {
        setReviews(prev => [...prev, ...sortedReviews]);
      }

      setPagination({
        skip: response.offset || 0,
        limit: response.limit,
        total: response.total,
        hasMore: response.reviews.length === response.limit
      });
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRatingBreakdown = async () => {
    // Rating breakdown is now loaded with reviews, so this function is no longer needed
    // but we keep it for compatibility
  };

  const handleLoadMore = () => {
    const nextSkip = pagination.skip + pagination.limit;
    loadReviews(nextSkip);
  };

  const handleFilterChange = (newFilters: Partial<ReviewFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, skip: 0 }));
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`${starSize} ${
            i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-300'
          }`}
        />
      );
    }

    return <div className="flex">{stars}</div>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {ratingBreakdown && ratingBreakdown.total_reviews > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-8">
              {/* Overall Rating */}
              <div className="text-center">
                <div className="text-4xl font-bold text-secondary-900 mb-1">
                  {ratingBreakdown.average_rating?.toFixed(1) || '0.0'}
                </div>
                <div className="flex justify-center mb-2">
                  {renderStars(Math.round(ratingBreakdown.average_rating || 0), 'md')}
                </div>
                <div className="text-sm text-secondary-600">
                  {ratingBreakdown.total_reviews} review{ratingBreakdown.total_reviews !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingBreakdown.rating_distribution[rating] || 0;
                  const percentage = ratingBreakdown.total_reviews > 0 
                    ? (count / ratingBreakdown.total_reviews) * 100 
                    : 0;

                  return (
                    <div key={rating} className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium w-12">
                        {rating} star{rating !== 1 ? 's' : ''}
                      </span>
                      <div className="flex-1 bg-secondary-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-secondary-600 w-8">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-secondary-900">
              Reviews ({pagination.total})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFiltersPanel ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {showFiltersPanel && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Rating Filter */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Filter by Rating
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

                  {/* Verification Filter */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Review Type
                    </label>
                    <select
                      value={filters.verified_only ? 'verified' : 'all'}
                      onChange={(e) => handleFilterChange({ 
                        verified_only: e.target.value === 'verified' 
                      })}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="verified">Verified Only</option>
                      <option value="all">All Reviews</option>
                    </select>
                  </div>

                  {/* Sort Filter */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Sort By
                    </label>
                    <select
                      value={filters.sort_by}
                      onChange={(e) => handleFilterChange({ 
                        sort_by: e.target.value as ReviewFilters['sort_by']
                      })}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="highest_rating">Highest Rating</option>
                      <option value="lowest_rating">Lowest Rating</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading && reviews.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-secondary-200 rounded-full"></div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, j) => (
                            <div key={j} className="w-4 h-4 bg-secondary-200 rounded"></div>
                          ))}
                        </div>
                        <div className="w-20 h-4 bg-secondary-200 rounded"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-4 bg-secondary-200 rounded"></div>
                        <div className="w-3/4 h-4 bg-secondary-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Reviewer Avatar */}
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-medium text-sm">
                      {review.user_id?.toString().slice(-2) || 'U'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Review Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="font-medium text-secondary-900">
                          {getRatingText(review.rating)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-secondary-500">
                        <Calendar className="h-4 w-4" />
                        {formatDate(review.created_at)}
                      </div>
                    </div>

                    {/* Review Content */}
                    <p className="text-secondary-700 leading-relaxed mb-4">
                      {review.review_text}
                    </p>

                    {/* Review Actions */}
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-2 text-sm text-secondary-500 hover:text-secondary-700 transition-colors">
                        <ThumbsUp className="h-4 w-4" />
                        Helpful
                      </button>
                      <button className="flex items-center gap-2 text-sm text-secondary-500 hover:text-red-600 transition-colors">
                        <Flag className="h-4 w-4" />
                        Report
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Star className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No reviews yet
            </h3>
            <p className="text-secondary-600">
              {filters.rating || !filters.verified_only 
                ? 'No reviews match your current filters'
                : 'Be the first to review this vendor'
              }
            </p>
          </div>
        )}

        {/* Load More Button */}
        {pagination.hasMore && !maxReviews && (
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
      </div>
    </div>
  );
};

export default ReviewDisplay;