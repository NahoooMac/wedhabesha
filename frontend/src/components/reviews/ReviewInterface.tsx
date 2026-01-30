import React, { useState } from 'react';
import { Star, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { VendorResponse } from '../../lib/api';
import ReviewDisplay from './ReviewDisplay';
import ReviewEligibilityChecker from './ReviewEligibilityChecker';
import ReviewSubmissionForm from './ReviewSubmissionForm';

interface ReviewInterfaceProps {
  vendor: VendorResponse;
  showSubmissionForm?: boolean;
  maxReviews?: number;
}

type ViewMode = 'display' | 'eligibility' | 'submission';

const ReviewInterface: React.FC<ReviewInterfaceProps> = ({
  vendor,
  showSubmissionForm = true,
  maxReviews
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('display');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleWriteReview = () => {
    setViewMode('eligibility');
  };

  const handleEligibilityConfirmed = () => {
    setViewMode('submission');
  };

  const handleReviewSubmitted = () => {
    setViewMode('display');
    // Use timestamp to ensure unique refresh key
    setRefreshKey(Date.now());
  };

  const handleCancel = () => {
    setViewMode('display');
  };

  const renderHeader = () => {
    switch (viewMode) {
      case 'eligibility':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('display')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reviews
            </Button>
            <h2 className="text-xl font-semibold text-secondary-900">
              Review Eligibility Check
            </h2>
          </div>
        );
      
      case 'submission':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('eligibility')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h2 className="text-xl font-semibold text-secondary-900">
              Write a Review
            </h2>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-secondary-900 flex items-center gap-2">
              <Star className="h-5 w-5" />
              Reviews & Ratings
            </h2>
            {showSubmissionForm && (
              <Button
                onClick={handleWriteReview}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Write a Review
              </Button>
            )}
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'eligibility':
        return (
          <ReviewEligibilityChecker
            vendor={vendor}
            onEligible={handleEligibilityConfirmed}
          />
        );
      
      case 'submission':
        return (
          <ReviewSubmissionForm
            vendor={vendor}
            onSuccess={handleReviewSubmitted}
            onCancel={handleCancel}
          />
        );
      
      default:
        return (
          <ReviewDisplay
            key={refreshKey}
            vendorId={vendor.id}
            maxReviews={maxReviews}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderContent()}
    </div>
  );
};

export default ReviewInterface;