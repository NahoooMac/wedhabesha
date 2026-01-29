import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Flag, 
  Eye, 
  EyeOff, 
  Star,
  Calendar,
  User,
  MessageSquare
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ReviewResponse, ReviewsResponse, vendorApi } from '../../lib/api';

interface ReviewModerationInterfaceProps {
  onReviewModerated?: () => void;
}

interface ModerationAction {
  reviewId: number;
  action: 'verify' | 'reject' | 'hide';
  reason?: string;
}

const ReviewModerationInterface: React.FC<ReviewModerationInterfaceProps> = ({
  onReviewModerated
}) => {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'unverified' | 'flagged'>('unverified');
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 20,
    total: 0,
    hasMore: false
  });

  useEffect(() => {
    loadReviews();
  }, [filter]);

  const loadReviews = async (skip = 0) => {
    setLoading(true);
    try {
      // Note: This would need to be implemented in the backend as an admin endpoint
      // For now, we'll simulate the interface
      const response = await vendorApi.getVendorReviews(1, {
        verified_only: filter === 'unverified' ? false : true,
        skip,
        limit: pagination.limit
      });

      if (skip === 0) {
        setReviews(response.reviews);
      } else {
        setReviews(prev => [...prev, ...response.reviews]);
      }

      setPagination({
        skip: response.skip,
        limit: response.limit,
        total: response.total,
        hasMore: response.has_more
      });
    } catch (error) {
      console.error('Failed to load reviews for moderation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModeration = async (action: ModerationAction) => {
    setModerating(action.reviewId);
    
    try {
      // This would call the admin moderation endpoint
      // await adminApi.moderateReview(action.reviewId, {
      //   is_verified: action.action === 'verify',
      //   reason: action.reason
      // });

      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === action.reviewId 
          ? { ...review, is_verified: action.action === 'verify' }
          : review
      ));

      if (onReviewModerated) {
        onReviewModerated();
      }
    } catch (error) {
      console.error('Failed to moderate review:', error);
    } finally {
      setModerating(null);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReviewStatus = (review: ReviewResponse) => {
    if (review.is_verified) {
      return { label: 'Verified', color: 'text-green-600 bg-green-100', icon: CheckCircle };
    } else {
      return { label: 'Pending', color: 'text-yellow-600 bg-yellow-100', icon: Flag };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Review Moderation
          </h2>
          <p className="text-secondary-600 mt-1">
            Review and moderate vendor reviews for quality and appropriateness
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-secondary-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('unverified')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'unverified'
                ? 'bg-white text-secondary-900 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Unverified ({reviews.filter(r => !r.is_verified).length})
          </button>
          <button
            onClick={() => setFilter('flagged')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'flagged'
                ? 'bg-white text-secondary-900 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Flagged (0)
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white text-secondary-900 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            All Reviews ({pagination.total})
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading && reviews.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-secondary-200 rounded-lg"></div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-4 bg-secondary-200 rounded"></div>
                        <div className="w-24 h-4 bg-secondary-200 rounded"></div>
                      </div>
                      <div className="w-full h-4 bg-secondary-200 rounded"></div>
                      <div className="w-3/4 h-4 bg-secondary-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => {
            const status = getReviewStatus(review);
            const StatusIcon = status.icon;

            return (
              <Card key={review.id} className="border-l-4 border-l-secondary-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <User className="h-6 w-6 text-primary-600" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {renderStars(review.rating)}
                          <span className="text-sm font-medium text-secondary-900">
                            {review.rating}/5 stars
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-secondary-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(review.created_at)}
                          </span>
                          <span>Couple ID: {review.couple_id}</span>
                          <span>Vendor ID: {review.vendor_id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Review Content */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-secondary-400" />
                      <span className="text-sm font-medium text-secondary-700">Review Content</span>
                    </div>
                    <p className="text-secondary-900 leading-relaxed pl-6">
                      {review.comment}
                    </p>
                  </div>

                  {/* Moderation Actions */}
                  {!review.is_verified && (
                    <div className="flex items-center gap-3 pt-4 border-t border-secondary-200">
                      <Button
                        size="sm"
                        onClick={() => handleModeration({
                          reviewId: review.id,
                          action: 'verify',
                          reason: 'Review approved after moderation'
                        })}
                        loading={moderating === review.id}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleModeration({
                          reviewId: review.id,
                          action: 'reject',
                          reason: 'Review rejected due to policy violation'
                        })}
                        loading={moderating === review.id}
                        className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleModeration({
                          reviewId: review.id,
                          action: 'hide',
                          reason: 'Review hidden pending further review'
                        })}
                        loading={moderating === review.id}
                        className="flex items-center gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                      >
                        <EyeOff className="h-4 w-4" />
                        Hide
                      </Button>
                    </div>
                  )}

                  {review.is_verified && (
                    <div className="pt-4 border-t border-secondary-200">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>This review has been verified and is visible to users</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No reviews to moderate
            </h3>
            <p className="text-secondary-600">
              {filter === 'unverified' 
                ? 'All reviews have been verified'
                : filter === 'flagged'
                ? 'No reviews have been flagged'
                : 'No reviews found'
              }
            </p>
          </div>
        )}

        {/* Load More Button */}
        {pagination.hasMore && (
          <div className="text-center pt-4">
            <Button
              onClick={() => loadReviews(pagination.skip + pagination.limit)}
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

export default ReviewModerationInterface;