import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Star } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { VendorResponse, ReviewEligibilityResponse, vendorApi } from '../../lib/api';

interface ReviewEligibilityCheckerProps {
  vendor: VendorResponse;
  onEligible: () => void;
}

const ReviewEligibilityChecker: React.FC<ReviewEligibilityCheckerProps> = ({
  vendor,
  onEligible
}) => {
  const [eligibility, setEligibility] = useState<ReviewEligibilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkEligibility();
  }, [vendor.id]);

  const checkEligibility = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await vendorApi.checkReviewEligibility(vendor.id);
      setEligibility(response);
    } catch (error: any) {
      console.error('Failed to check review eligibility:', error);
      setError(error.message || 'Failed to check review eligibility');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!eligibility) return null;

    if (eligibility.can_review) {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else if (eligibility.already_reviewed) {
      return <CheckCircle className="h-6 w-6 text-blue-500" />;
    } else {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!eligibility) return 'border-secondary-200';

    if (eligibility.can_review) {
      return 'border-green-200 bg-green-50';
    } else if (eligibility.already_reviewed) {
      return 'border-blue-200 bg-blue-50';
    } else {
      return 'border-red-200 bg-red-50';
    }
  };

  const getStatusTitle = () => {
    if (!eligibility) return 'Checking eligibility...';

    if (eligibility.can_review) {
      return 'You can review this vendor';
    } else if (eligibility.already_reviewed) {
      return 'You have already reviewed this vendor';
    } else {
      return 'Review not available';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-secondary-600">Checking review eligibility...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">Unable to check review eligibility</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={checkEligibility}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility) {
    return null;
  }

  return (
    <Card className={getStatusColor()}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {getStatusIcon()}
          
          <div className="flex-1">
            <h3 className="font-medium text-secondary-900 mb-2">
              {getStatusTitle()}
            </h3>
            
            <p className="text-sm text-secondary-700 mb-4">
              {eligibility.reason}
            </p>

            {/* Eligibility Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                {eligibility.has_booking ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={eligibility.has_booking ? 'text-green-700' : 'text-red-700'}>
                  {eligibility.has_booking ? 'You have booked this vendor' : 'No booking with this vendor'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                {eligibility.already_reviewed ? (
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-secondary-400" />
                )}
                <span className={eligibility.already_reviewed ? 'text-blue-700' : 'text-secondary-600'}>
                  {eligibility.already_reviewed ? 'Review already submitted' : 'No review submitted yet'}
                </span>
              </div>
            </div>

            {/* Action Button */}
            {eligibility.can_review && (
              <Button
                onClick={onEligible}
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Write a Review
              </Button>
            )}

            {eligibility.already_reviewed && (
              <div className="text-sm text-blue-700">
                Thank you for your review! You can view it in the reviews section below.
              </div>
            )}

            {!eligibility.has_booking && (
              <div className="text-sm text-secondary-600">
                You can only review vendors you have actually worked with. 
                Contact this vendor and complete a booking to be eligible for reviews.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewEligibilityChecker;