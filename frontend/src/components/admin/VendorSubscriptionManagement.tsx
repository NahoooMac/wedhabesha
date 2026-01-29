import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, VendorSubscriptionResponse, VendorSubscriptionTier } from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface VendorSubscriptionManagementProps {
  className?: string;
}

export const VendorSubscriptionManagement: React.FC<VendorSubscriptionManagementProps> = ({ className }) => {
  const [selectedSubscription, setSelectedSubscription] = useState<VendorSubscriptionResponse | null>(null);
  const [newTier, setNewTier] = useState<VendorSubscriptionTier>('free');
  const [expiresAt, setExpiresAt] = useState('');
  const [filterTier, setFilterTier] = useState<VendorSubscriptionTier | ''>('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const queryClient = useQueryClient();

  // Fetch vendor subscriptions
  const { data: subscriptionsData, isLoading, error } = useQuery({
    queryKey: ['vendor-subscriptions', filterTier, currentPage],
    queryFn: () => adminApi.getVendorSubscriptions(
      filterTier || undefined, 
      currentPage * pageSize, 
      pageSize
    )
  });

  // Update subscription mutation
  const updateMutation = useMutation({
    mutationFn: ({ vendorId, tier, expiresAt }: { 
      vendorId: number; 
      tier: VendorSubscriptionTier; 
      expiresAt?: string 
    }) => adminApi.updateVendorSubscription(vendorId, tier, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-subscriptions'] });
      setSelectedSubscription(null);
      setNewTier('free');
      setExpiresAt('');
    }
  });

  const handleUpdateSubscription = (subscription: VendorSubscriptionResponse) => {
    setSelectedSubscription(subscription);
    setNewTier(subscription.tier);
    setExpiresAt(subscription.expires_at || '');
  };

  const confirmUpdate = () => {
    if (selectedSubscription) {
      updateMutation.mutate({
        vendorId: selectedSubscription.vendor_id,
        tier: newTier,
        expiresAt: expiresAt || undefined
      });
    }
  };

  const getTierBadge = (tier: VendorSubscriptionTier) => {
    const tierStyles = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-gold-100 text-gold-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierStyles[tier]}`}>
        {tier.toUpperCase()}
      </span>
    );
  };

  const getTierFeatures = (tier: VendorSubscriptionTier) => {
    const features = {
      free: ['Basic profile', 'Up to 5 leads/month', 'Standard support'],
      basic: ['Enhanced profile', 'Up to 20 leads/month', 'Priority support', 'Basic analytics'],
      premium: ['Premium profile', 'Unlimited leads', 'Priority support', 'Advanced analytics', 'Featured listing'],
      enterprise: ['Enterprise profile', 'Unlimited leads', 'Dedicated support', 'Full analytics', 'Top placement', 'Custom branding']
    };

    return features[tier] || [];
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-red-600">Failed to load vendor subscriptions</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Subscriptions</h2>
        <p className="text-gray-600">Manage vendor subscription tiers and access levels</p>
      </div>

      {/* Filter Controls */}
      <div className="mb-6">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Tier
            </label>
            <select
              value={filterTier}
              onChange={(e) => {
                setFilterTier(e.target.value as VendorSubscriptionTier | '');
                setCurrentPage(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-4 mb-6">
        {subscriptionsData?.subscriptions.map((subscription) => (
          <Card key={subscription.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {subscription.business_name}
                  </h3>
                  {getTierBadge(subscription.tier)}
                  {!subscription.is_active && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      INACTIVE
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{subscription.vendor_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Started</p>
                    <p className="font-medium">
                      {new Date(subscription.started_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expires</p>
                    <p className="font-medium">
                      {subscription.expires_at 
                        ? new Date(subscription.expires_at).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Tier Features</p>
                  <div className="flex flex-wrap gap-2">
                    {getTierFeatures(subscription.tier).map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleUpdateSubscription(subscription)}
                  variant="outline"
                >
                  Update Subscription
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {subscriptionsData && subscriptionsData.total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, subscriptionsData.total)} of{' '}
            {subscriptionsData.total} subscriptions
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
              disabled={!subscriptionsData.has_more}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Update Subscription Modal */}
      {selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Update Subscription: {selectedSubscription.business_name}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Tier
              </label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value as VendorSubscriptionTier)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expires At (Optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for no expiration
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">New Tier Features</p>
              <div className="space-y-1">
                {getTierFeatures(newTier).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmUpdate}
                disabled={updateMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Subscription'}
              </Button>
              <Button
                onClick={() => {
                  setSelectedSubscription(null);
                  setNewTier('free');
                  setExpiresAt('');
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