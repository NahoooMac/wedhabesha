import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Users, 
  MessageSquare, 
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { RatingBreakdownResponse } from '../../lib/api';

interface ReviewAnalyticsProps {
  breakdown: RatingBreakdownResponse;
  totalReviews: number;
  averageRating?: number;
  responseRate?: number;
  recentTrend?: 'up' | 'down' | 'stable';
}

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
}

const ReviewAnalytics: React.FC<ReviewAnalyticsProps> = ({
  breakdown,
  totalReviews,
  averageRating,
  responseRate = 0,
  recentTrend = 'stable'
}) => {
  const calculateMetrics = (): AnalyticsMetric[] => {
    const positiveReviews = (breakdown.rating_distribution[5] || 0) + (breakdown.rating_distribution[4] || 0);
    const negativeReviews = (breakdown.rating_distribution[2] || 0) + (breakdown.rating_distribution[1] || 0);
    const positivePercentage = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0;
    
    return [
      {
        label: 'Total Reviews',
        value: totalReviews,
        icon: MessageSquare,
        color: 'text-blue-600',
        trend: recentTrend
      },
      {
        label: 'Average Rating',
        value: averageRating?.toFixed(1) || '0.0',
        icon: Star,
        color: 'text-yellow-600',
        trend: recentTrend
      },
      {
        label: 'Positive Reviews',
        value: `${positivePercentage}%`,
        change: `${positiveReviews}/${totalReviews}`,
        icon: TrendingUp,
        color: 'text-green-600'
      },
      {
        label: 'Response Rate',
        value: `${Math.round(responseRate)}%`,
        icon: Users,
        color: 'text-purple-600'
      }
    ];
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getReviewQualityInsights = () => {
    const insights = [];
    
    const excellentPercentage = totalReviews > 0 
      ? Math.round(((breakdown.rating_distribution[5] || 0) / totalReviews) * 100)
      : 0;
    
    const poorPercentage = totalReviews > 0 
      ? Math.round(((breakdown.rating_distribution[1] || 0) / totalReviews) * 100)
      : 0;

    if (excellentPercentage >= 60) {
      insights.push({
        type: 'positive',
        message: `${excellentPercentage}% of your reviews are 5-star ratings - excellent work!`,
        icon: TrendingUp,
        color: 'text-green-600 bg-green-50 border-green-200'
      });
    }

    if (poorPercentage >= 20) {
      insights.push({
        type: 'warning',
        message: `${poorPercentage}% of reviews are 1-star. Consider addressing common concerns.`,
        icon: TrendingDown,
        color: 'text-red-600 bg-red-50 border-red-200'
      });
    }

    if (responseRate < 50 && totalReviews > 5) {
      insights.push({
        type: 'suggestion',
        message: 'Consider responding to more reviews to show customer engagement.',
        icon: MessageSquare,
        color: 'text-blue-600 bg-blue-50 border-blue-200'
      });
    }

    return insights;
  };

  const metrics = calculateMetrics();
  const insights = getReviewQualityInsights();

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">
                      {metric.label}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold text-secondary-900">
                        {metric.value}
                      </p>
                      {metric.trend && getTrendIcon(metric.trend)}
                    </div>
                    {metric.change && (
                      <p className="text-xs text-secondary-500 mt-1">
                        {metric.change}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-full bg-secondary-100 ${metric.color}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rating Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Rating Distribution Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = breakdown.rating_distribution[rating] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              
              const getBarColor = (rating: number) => {
                if (rating >= 4) return 'bg-green-500';
                if (rating === 3) return 'bg-yellow-500';
                return 'bg-red-500';
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

              return (
                <div key={rating} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-8 font-medium">{rating}★</span>
                      <span className="text-secondary-600">{getRatingLabel(rating)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-secondary-900 font-medium">{count}</span>
                      <span className="text-secondary-500">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="bg-secondary-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${getBarColor(rating)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => {
                const IconComponent = insight.icon;
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-4 border rounded-lg ${insight.color}`}
                  >
                    <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">
                      {insight.message}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Timeline */}
      {breakdown.recent_reviews && breakdown.recent_reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Review Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {breakdown.recent_reviews.map((review, index) => (
                <div key={review.id} className="flex items-start gap-4 p-3 bg-secondary-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-secondary-700 line-clamp-2">
                      {review.comment}
                    </p>
                    <p className="text-xs text-secondary-500 mt-1">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReviewAnalytics;