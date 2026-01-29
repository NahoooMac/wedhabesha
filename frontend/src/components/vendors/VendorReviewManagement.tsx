import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import VendorReviewManagement from '../reviews/VendorReviewManagement';

const VendorReviewManagementWrapper: React.FC = () => {
  const { user } = useAuth();
  
  // In a real app, you would get the vendor ID from the user's vendor profile
  // For now, we'll use a placeholder
  const vendorId = 1; // This would come from the vendor profile context
  
  if (!user || user.user_type !== 'VENDOR') {
    return (
      <div className="text-center py-8">
        <p className="text-secondary-600">Access denied. Vendor account required.</p>
      </div>
    );
  }

  return <VendorReviewManagement vendorId={vendorId} />;
};

export default VendorReviewManagementWrapper;