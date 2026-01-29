import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { weddingApi, WeddingUpdateRequest } from '../../lib/api';
import { X } from 'lucide-react';

interface WeddingEditModalProps {
  wedding: {
    id: number;
    wedding_date: string;
    venue_name: string;
    venue_address?: string;
    expected_guests: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  wedding_date: string;
  venue_name: string;
  venue_address: string;
  expected_guests: string;
}

const WeddingEditModal: React.FC<WeddingEditModalProps> = ({ wedding, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    wedding_date: wedding.wedding_date.split('T')[0], // Convert to YYYY-MM-DD format
    venue_name: wedding.venue_name,
    venue_address: wedding.venue_address || '',
    expected_guests: wedding.expected_guests.toString(),
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const queryClient = useQueryClient();

  const updateWeddingMutation = useMutation({
    mutationFn: (data: WeddingUpdateRequest) => weddingApi.updateWedding(wedding.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wedding'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to update wedding:', error);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.venue_name.trim()) {
      newErrors.venue_name = 'Venue name is required';
    } else if (formData.venue_name.length > 255) {
      newErrors.venue_name = 'Venue name must be less than 255 characters';
    }

    if (!formData.wedding_date) {
      newErrors.wedding_date = 'Wedding date is required';
    } else {
      const selectedDate = new Date(formData.wedding_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.wedding_date = 'Wedding date cannot be in the past';
      }
    }

    if (formData.venue_address.length > 500) {
      newErrors.venue_address = 'Venue address must be less than 500 characters';
    }

    const guestCount = parseInt(formData.expected_guests);
    if (isNaN(guestCount) || guestCount < 1) {
      newErrors.expected_guests = 'Expected guests must be at least 1';
    } else if (guestCount > 10000) {
      newErrors.expected_guests = 'Expected guests cannot exceed 10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: WeddingUpdateRequest = {
      wedding_date: formData.wedding_date,
      venue_name: formData.venue_name.trim(),
      venue_address: formData.venue_address.trim() || undefined,
      expected_guests: parseInt(formData.expected_guests),
    };

    updateWeddingMutation.mutate(submitData);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const isLoading = updateWeddingMutation.isPending;
  const error = updateWeddingMutation.error;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Edit Wedding Details</CardTitle>
                <CardDescription>
                  Update your wedding information and venue details
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Wedding Date */}
              <div>
                <label htmlFor="wedding_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Wedding Date *
                </label>
                <input
                  type="date"
                  id="wedding_date"
                  value={formData.wedding_date}
                  onChange={(e) => handleInputChange('wedding_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ${
                    errors.wedding_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.wedding_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.wedding_date}</p>
                )}
              </div>

              {/* Venue Name */}
              <div>
                <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Venue Name *
                </label>
                <input
                  type="text"
                  id="venue_name"
                  value={formData.venue_name}
                  onChange={(e) => handleInputChange('venue_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ${
                    errors.venue_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter venue name"
                  maxLength={255}
                  disabled={isLoading}
                />
                {errors.venue_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.venue_name}</p>
                )}
              </div>

              {/* Venue Address */}
              <div>
                <label htmlFor="venue_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Venue Address
                </label>
                <textarea
                  id="venue_address"
                  value={formData.venue_address}
                  onChange={(e) => handleInputChange('venue_address', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ${
                    errors.venue_address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter venue address"
                  maxLength={500}
                  disabled={isLoading}
                />
                {errors.venue_address && (
                  <p className="mt-1 text-sm text-red-600">{errors.venue_address}</p>
                )}
              </div>

              {/* Expected Guests */}
              <div>
                <label htmlFor="expected_guests" className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Guests *
                </label>
                <input
                  type="number"
                  id="expected_guests"
                  value={formData.expected_guests}
                  onChange={(e) => handleInputChange('expected_guests', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ${
                    errors.expected_guests ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Number of expected guests"
                  min={1}
                  max={10000}
                  disabled={isLoading}
                />
                {errors.expected_guests && (
                  <p className="mt-1 text-sm text-red-600">{errors.expected_guests}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update Wedding'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">
                    Failed to update wedding details: {error.message || 'Unknown error'}. Please try again.
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeddingEditModal;