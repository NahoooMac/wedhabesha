import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { weddingApi, Wedding } from '../../lib/api';
import WeddingDetailsSection from './WeddingDetailsSection';

interface WeddingConfigurationProps {
  wedding: Wedding;
  staffPin?: string; // Only available immediately after creation
}

const WeddingConfiguration: React.FC<WeddingConfigurationProps> = ({ wedding, staffPin }) => {
  const queryClient = useQueryClient();

  const updatePinMutation = useMutation({
    mutationFn: (pin: string) => weddingApi.updateStaffPin(wedding.id, pin),
    onSuccess: () => {
      alert('Staff PIN updated successfully! All active staff sessions have been logged out.');
    },
    onError: (error: any) => {
      console.error('Failed to update staff PIN:', error);
      alert('Failed to update PIN. Please try again.');
    },
  });

  const refreshCodeMutation = useMutation({
    mutationFn: () => weddingApi.refreshWeddingCode(wedding.id),
    onSuccess: (data) => {
      queryClient.setQueryData(['wedding', 'current'], data.wedding);
      alert('Wedding code refreshed successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to refresh wedding code:', error);
      alert('Failed to refresh wedding code. Please try again.');
    },
  });

  const handleUpdatePin = async (newPin: string) => {
    if (confirm('Are you sure you want to update the staff PIN? All active staff sessions will be logged out.')) {
      await updatePinMutation.mutateAsync(newPin);
    }
  };

  const handleRefreshCode = async () => {
    if (confirm('Are you sure you want to refresh the wedding code? Staff will need the new code to log in.')) {
      await refreshCodeMutation.mutateAsync();
    }
  };

  return (
    <WeddingDetailsSection
      wedding={{
        ...wedding,
        staff_pin: staffPin // Pass the staff PIN if available
      }}
      onUpdatePin={handleUpdatePin}
      onRefreshCode={handleRefreshCode}
    />
  );
};

export default WeddingConfiguration;