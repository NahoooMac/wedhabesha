import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, FlaggedReviewResponse } from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ContentModerationDashboardProps {
  className?: string;
}

export const ContentModerationDashboard: React.FC<ContentModerationDashboardProps> = ({ className }) => {
  const [selectedReview, setSelectedReview] = useState<FlaggedReviewResponse | null>(null);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | 'hide'>('approve');
  const [moderationReason, setModerationReason] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const queryClient = useQueryClient();

  // Fetch flagged reviews
  const { data: reviewsData, isLoading, error } = useQuery({
    queryKey: ['flagged-reviews', currentPage],
    queryFn: () => adminApi.getFlaggedReviews(currentPage * pageSize, pageSize)
  });

  // Moderate review mutation
  const moderateMutation = useMutation({
    mutationFn: ({ reviewId, action, reason }: { 
      reviewId: number; 
      action: 'approve' | 'reject' | 'hide'; 
      reason?: string 
    }) => adminApi.moderateReview(reviewId, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-reviews'] });
      setSelectedReview(null);
      setModerationAction('approve');
      setModerationReason('');
    }
  });

  const handleModerateReview = (review: FlaggedReviewResponse) => {
    setSelectedReview(review);
    setModerationAction('approve');
    setModerationReason('');
  };

  const confirmModeration = () => {
    if (selectedReview) {
      moderateMutation.mutate({
        reviewId: selectedReview.id,
        action: moderationAction,
        reason: moderationReason || undefined
      });
    }
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getActionBadge = (action: string) => {
    const actionStyles = {
      approve: 'bg-green-100 text-green-800',
      reject: 'bg-red-100 text-red-800',
      hide: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionStyles[action as keyof typeof actionStyles]}`}>
        {action.toUpperCase()}
      </span>
    );
  };

  const getSeverityLevel = (comment: string) => {
    // Simple content analysis - in real implementation, this would use ML/AI
    const lowSeverityWords = ['disappointed', 'okay', 'average', 'not great'];
    const mediumSeverityWords = ['bad', 'terrible', 'awful', 'worst', 'hate'];
    const highSeverityWords = ['scam', 'fraud', 'steal', 'cheat', 'illegal'];
    
    const lowerComment = comment.toLowerCase();
    
    if (highSeverityWords.some(word => lowerComment.includes(word))) {
      return { level: 'High', color: 'text-red-600', bg: 'bg-red-100' };
    }
    if (mediumSeverityWords.some(word => lowerComment.includes(word))) {
      return { level: 'Medium', color: 'text-orange-600', bg: 'bg-orange-100' };
    }
    if (lowSeverityWords.some(word => lowerComment.includes(word))) {
      return { level: 'Low', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    }
    
    return { level: 'Low', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading flagged reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-12 ${className}`}>
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Failed to Load Reviews</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">There was an error loading flagged reviews.</p>
        <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Content Moderation</h2>
            <p className="text-slate-600 dark:text-slate-400">Review and moderate flagged content</p>
          </div>
        </div>

        {/* Moderation Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/20">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                {reviewsData?.total || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Flagged Reviews</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/20">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                {reviewsData?.reviews.filter(r => getSeverityLevel(r.comment).level === 'High').length || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">High Severity</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {reviewsData?.reviews.filter(r => getSeverityLevel(r.comment).level === 'Medium').length || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Medium Severity</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {reviewsData?.reviews.filter(r => getSeverityLevel(r.comment).level === 'Low').length || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Low Severity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Flagged Reviews List */}
      <div className="space-y-4 mb-6">
        {reviewsData?.reviews.map((review) => {
          const severity = getSeverityLevel(review.comment);
          
          return (
            <Card key={review.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Review for {review.vendor_name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${severity.bg} ${severity.color}`}>
                      {severity.level} Severity
                    </span>
                    {review.is_hidden && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        HIDDEN
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Reviewer</p>
                      <p className="font-medium">{review.couple_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rating</p>
                      <p className="font-medium">{getRatingStars(review.rating)} ({review.rating}/5)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Review Content</p>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{review.comment}</p>
                    </div>
                  </div>

                  {/* Content Analysis */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Content Analysis</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Severity Level:</span>{' '}
                        <span className={severity.color}>{severity.level}</span>
                      </div>
                      <div>
                        <span className="font-medium">Word Count:</span> {review.comment.split(' ').length}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleModerateReview(review)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Moderate Review
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {reviewsData?.reviews.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Flagged Reviews</h3>
          <p className="text-gray-600">All reviews have been moderated or there are no flagged reviews at this time.</p>
        </Card>
      )}

      {/* Pagination */}
      {reviewsData && reviewsData.total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, reviewsData.total)} of{' '}
            {reviewsData.total} flagged reviews
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
              disabled={!reviewsData.has_more}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Moderate Review: {selectedReview.vendor_name}
            </h3>
            
            {/* Review Details */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-sm text-gray-600">Reviewer:</span>
                  <span className="ml-2 font-medium">{selectedReview.couple_name}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Rating:</span>
                  <span className="ml-2 font-medium">{getRatingStars(selectedReview.rating)}</span>
                </div>
              </div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">Review:</span>
              </div>
              <p className="text-gray-900 italic">"{selectedReview.comment}"</p>
            </div>

            {/* Moderation Action */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moderation Action
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="action"
                    value="approve"
                    checked={moderationAction === 'approve'}
                    onChange={(e) => setModerationAction(e.target.value as 'approve')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Approve</strong> - Review is appropriate and will be visible
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="action"
                    value="hide"
                    checked={moderationAction === 'hide'}
                    onChange={(e) => setModerationAction(e.target.value as 'hide')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Hide</strong> - Review will be hidden from public view
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="action"
                    value="reject"
                    checked={moderationAction === 'reject'}
                    onChange={(e) => setModerationAction(e.target.value as 'reject')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Reject</strong> - Review violates guidelines and will be removed
                  </span>
                </label>
              </div>
            </div>

            {/* Moderation Reason */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="Provide a reason for this moderation action..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmModeration}
                disabled={moderateMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {moderateMutation.isPending ? 'Processing...' : `${moderationAction.charAt(0).toUpperCase() + moderationAction.slice(1)} Review`}
              </Button>
              <Button
                onClick={() => {
                  setSelectedReview(null);
                  setModerationAction('approve');
                  setModerationReason('');
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};