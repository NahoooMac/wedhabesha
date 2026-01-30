import React, { useState } from 'react';
import { Star, Send, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { VendorResponse, ReviewCreateRequest, vendorApi } from '../../lib/api';

interface ReviewSubmissionFormProps {
  vendor: VendorResponse;
  onSuccess: () => void;
  onCancel: () => void;
}

const ReviewSubmissionForm: React.FC<ReviewSubmissionFormProps> = ({
  vendor,
  onSuccess,
  onCancel
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    if (comment.trim().length < 10) {
      setError('Please provide a comment with at least 10 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reviewData: ReviewCreateRequest = {
        rating,
        review_text: comment.trim()
      };

      console.log('Submitting review:', { vendorId: vendor.id, reviewData });
      
      const result = await vendorApi.createReview(vendor.id, reviewData);
      console.log('Review submitted successfully:', result);
      
      onSuccess();
    } catch (error: any) {
      console.error('Review submission failed:', error);
      setError(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = hoverRating || rating;

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          className={`p-1 transition-colors ${
            i <= displayRating ? 'text-yellow-400' : 'text-secondary-300'
          } hover:text-yellow-400`}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => setRating(i)}
        >
          <Star className={`h-8 w-8 ${i <= displayRating ? 'fill-current' : ''}`} />
        </button>
      );
    }

    return stars;
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select a rating';
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
            <span className="text-primary-600 text-xl font-bold">
              {vendor.business_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold">Review {vendor.business_name}</h3>
            <p className="text-secondary-600 text-sm">
              Share your experience with this vendor
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Selection */}
          <div className="text-center">
            <label className="block text-sm font-medium text-secondary-700 mb-3">
              How would you rate this vendor?
            </label>
            <div className="flex justify-center items-center gap-1 mb-2">
              {renderStars()}
            </div>
            <p className="text-lg font-medium text-secondary-900">
              {getRatingText(hoverRating || rating)}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-secondary-700 mb-2">
              Your Review
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience with this vendor. What did you like? What could be improved?"
              className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              rows={6}
              maxLength={1000}
              required
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-secondary-500">
                Minimum 10 characters required
              </p>
              <p className="text-sm text-secondary-500">
                {comment.length}/1000
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Review Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">Review Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be honest and constructive in your feedback</li>
              <li>• Focus on your actual experience with the vendor</li>
              <li>• Avoid personal attacks or inappropriate language</li>
              <li>• Your review will be verified before being published</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={rating === 0 || comment.trim().length < 10}
              className="flex-1 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Submit Review
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewSubmissionForm;