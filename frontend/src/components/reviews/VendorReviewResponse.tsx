import React, { useState } from 'react';
import { MessageSquare, Send, Calendar, Star } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ReviewResponse } from '../../lib/api';

interface VendorReviewResponseProps {
  review: ReviewResponse;
  onResponseSubmit?: (reviewId: number, response: string) => void;
  existingResponse?: string;
  canRespond?: boolean;
}

const VendorReviewResponse: React.FC<VendorReviewResponseProps> = ({
  review,
  onResponseSubmit,
  existingResponse,
  canRespond = true
}) => {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitResponse = async () => {
    if (!responseText.trim() || !onResponseSubmit) return;

    setLoading(true);
    try {
      await onResponseSubmit(review.id, responseText.trim());
      setResponseText('');
      setShowResponseForm(false);
    } catch (error) {
      console.error('Failed to submit response:', error);
    } finally {
      setLoading(false);
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
    <Card className="border-l-4 border-l-primary-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium text-sm">
                {review.couple_id.toString().slice(-2)}
              </span>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                {renderStars(review.rating)}
                <span className="font-medium text-secondary-900">
                  {getRatingText(review.rating)}
                </span>
                {review.is_verified && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Verified
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <Calendar className="h-4 w-4" />
                {formatDate(review.created_at)}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Original Review */}
        <div className="mb-6">
          <h4 className="font-medium text-secondary-900 mb-2">Customer Review</h4>
          <p className="text-secondary-700 leading-relaxed">
            {review.comment}
          </p>
        </div>

        {/* Existing Response */}
        {existingResponse && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Your Response</span>
            </div>
            <p className="text-blue-800 leading-relaxed">
              {existingResponse}
            </p>
          </div>
        )}

        {/* Response Form */}
        {canRespond && !existingResponse && (
          <div className="space-y-4">
            {!showResponseForm ? (
              <Button
                variant="outline"
                onClick={() => setShowResponseForm(true)}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Respond to Review
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="response" className="block text-sm font-medium text-secondary-700 mb-2">
                    Your Response
                  </label>
                  <textarea
                    id="response"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Thank the customer for their feedback and address any concerns professionally..."
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows={4}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-secondary-500">
                      Keep your response professional and constructive
                    </p>
                    <p className="text-sm text-secondary-500">
                      {responseText.length}/500
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <h5 className="font-medium text-yellow-900 mb-1">Response Guidelines</h5>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Thank the customer for their feedback</li>
                    <li>• Address any specific concerns mentioned</li>
                    <li>• Keep the tone professional and positive</li>
                    <li>• Avoid being defensive or argumentative</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowResponseForm(false);
                      setResponseText('');
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitResponse}
                    loading={loading}
                    disabled={!responseText.trim()}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Submit Response
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Response Tips */}
        {canRespond && !existingResponse && !showResponseForm && (
          <div className="mt-4 p-3 bg-secondary-50 border border-secondary-200 rounded-md">
            <p className="text-sm text-secondary-600">
              <strong>Tip:</strong> Responding to reviews shows that you value customer feedback 
              and can help build trust with potential clients.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorReviewResponse;