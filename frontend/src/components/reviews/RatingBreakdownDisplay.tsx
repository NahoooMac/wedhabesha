import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { RatingBreakdownResponse } from '../../lib/api';

interface RatingBreakdownDisplayProps {
  breakdown: RatingBreakdownResponse;
  showTrends?: boolean;
  compact?: boolean;
}

const RatingBreakdownDisplay: React.FC<RatingBreakdownDisplayProps> = ({
  breakdown,
  showTrends = false,
  compact = false
}) => {
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`${sizeClasses[size]} ${
            i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-300'
          }`}
        />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 5: return 'Excellent';
      case 4: return 'Very Good';
      case 3: return 'Good';
      case 2: return 'Fair';
      case 1: return 'Poor';
      default: return '';
    }
  };

  const getOverallRatingColor = (rating?: number) => {
    if (!rating) return 'text-secondary-500';
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-green-500';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getOverallRatingText = (rating?: number) => {
    if (!rating) return 'No ratings';
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Very Good';
    if (rating >= 3.5) return 'Good';
    if (rating >= 3.0) return 'Average';
    return 'Below Average';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getOverallRatingColor(breakdown.average_rating)}`}>
            {breakdown.average_rating?.toFixed(1) || '0.0'}
          </div>
          <div className="flex justify-center mb-1">
            {renderStars(Math.round(breakdown.average_rating || 0))}
          </div>
          <div className="text-xs text-secondary-600">
            {breakdown.total_reviews} review{breakdown.total_reviews !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = breakdown.rating_distribution[rating] || 0;
            const percentage = breakdown.total_reviews > 0 
              ? (count / breakdown.total_reviews) * 100 
              : 0;

            return (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs w-6">{rating}★</span>
                <div className="flex-1 bg-secondary-200 rounded-full h-1.5">
                  <div
                    className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-secondary-500 w-6">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400" />
          Rating Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Overall Rating */}
          <div className="text-center">
            <div className={`text-5xl font-bold mb-2 ${getOverallRatingColor(breakdown.average_rating)}`}>
              {breakdown.average_rating?.toFixed(1) || '0.0'}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(breakdown.average_rating || 0), 'lg')}
            </div>
            <div className={`text-lg font-medium mb-1 ${getOverallRatingColor(breakdown.average_rating)}`}>
              {getOverallRatingText(breakdown.average_rating)}
            </div>
            <div className="text-secondary-600">
              Based on {breakdown.total_reviews} review{breakdown.total_reviews !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-3">
            <h4 className="font-medium text-secondary-900 mb-4">Rating Distribution</h4>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = breakdown.rating_distribution[rating] || 0;
              const percentage = breakdown.total_reviews > 0 
                ? (count / breakdown.total_reviews) * 100 
                : 0;

              return (
                <div key={rating} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-8">{rating}</span>
                      {renderStars(rating, 'sm')}
                      <span className="text-secondary-600">{getRatingLabel(rating)}</span>
                    </span>
                    <span className="text-secondary-600">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="bg-secondary-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Reviews Preview */}
        {breakdown.recent_reviews && breakdown.recent_reviews.length > 0 && (
          <div className="mt-8 pt-6 border-t border-secondary-200">
            <h4 className="font-medium text-secondary-900 mb-4">Recent Reviews</h4>
            <div className="space-y-3">
              {breakdown.recent_reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="flex items-start gap-3 p-3 bg-secondary-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {renderStars(review.rating, 'sm')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-secondary-700 line-clamp-2">
                      {review.comment}
                    </p>
                    <p className="text-xs text-secondary-500 mt-1">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating Insights */}
        {showTrends && breakdown.total_reviews > 5 && (
          <div className="mt-8 pt-6 border-t border-secondary-200">
            <h4 className="font-medium text-secondary-900 mb-4">Rating Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-green-900">
                  {Math.round(((breakdown.rating_distribution[5] || 0) + (breakdown.rating_distribution[4] || 0)) / breakdown.total_reviews * 100)}%
                </div>
                <div className="text-xs text-green-700">Positive Reviews</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Minus className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-yellow-900">
                  {Math.round((breakdown.rating_distribution[3] || 0) / breakdown.total_reviews * 100)}%
                </div>
                <div className="text-xs text-yellow-700">Neutral Reviews</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-red-900">
                  {Math.round(((breakdown.rating_distribution[2] || 0) + (breakdown.rating_distribution[1] || 0)) / breakdown.total_reviews * 100)}%
                </div>
                <div className="text-xs text-red-700">Negative Reviews</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RatingBreakdownDisplay;