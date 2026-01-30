import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import VendorReviewManagement from '../reviews/VendorReviewManagement';

interface VendorReviewManagementWrapperProps {
  vendorId?: string;
}

const VendorReviewManagementWrapper: React.FC<VendorReviewManagementWrapperProps> = ({ vendorId }) => {
  const { user } = useAuth();
  
  if (!user || user.user_type !== 'VENDOR') {
    return (
      <div className="text-center py-8">
        <p className="text-secondary-600">Access denied. Vendor account required.</p>
      </div>
    );
  }

  // Convert vendorId to number, fallback to user ID if available
  const numericVendorId = vendorId ? parseInt(vendorId, 10) : (user.id ? parseInt(user.id.toString(), 10) : 1);

  // Validate that we have a valid vendor ID
  if (isNaN(numericVendorId) || numericVendorId <= 0) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Invalid vendor ID. Please contact support.</p>
      </div>
    );
  }

  return <VendorReviewManagement vendorId={numericVendorId} />;
};

export default VendorReviewManagementWrapper;