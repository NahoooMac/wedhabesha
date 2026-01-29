import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { weddingApi, WeddingCreateRequest, WeddingCreateResponse } from '../../lib/api';

interface WeddingSetupWizardProps {
  onComplete: (wedding: WeddingCreateResponse) => void;
}

interface FormData {
  wedding_date: string;
  venue_name: string;
  venue_address: string;
  expected_guests: number;
}

const WeddingSetupWizard: React.FC<WeddingSetupWizardProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState<FormData>({
    wedding_date: '',
    venue_name: '',
    venue_address: '',
    expected_guests: 50,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const queryClient = useQueryClient();

  const createWeddingMutation = useMutation({
    mutationFn: (data: WeddingCreateRequest) => weddingApi.createWedding(data),
    onSuccess: (wedding) => {
      queryClient.invalidateQueries({ queryKey: ['wedding'] });
      onComplete(wedding);
    },
    onError: (error: any) => {
      console.error('Failed to create wedding:', error);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.wedding_date) {
      newErrors.wedding_date = 'Wedding date is required';
    } else {
      const selectedDate = new Date(formData.wedding_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.wedding_date = 'Wedding date must be in the future';
      }
    }

    if (!formData.venue_name.trim()) {
      newErrors.venue_name = 'Venue name is required';
    } else if (formData.venue_name.length > 200) {
      newErrors.venue_name = 'Venue name must be less than 200 characters';
    }

    if (!formData.venue_address.trim()) {
      newErrors.venue_address = 'Venue address is required';
    } else if (formData.venue_address.length > 500) {
      newErrors.venue_address = 'Venue address must be less than 500 characters';
    }

    if (formData.expected_guests < 1) {
      newErrors.expected_guests = 'Expected guests must be at least 1';
    } else if (formData.expected_guests > 10000) {
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

    createWeddingMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set Up Your Wedding</CardTitle>
          <CardDescription>
            Let's get started by setting up your wedding details. This information will help us create your unique wedding code and staff PIN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Wedding Date */}
            <div>
              <label htmlFor="wedding_date" className="block text-sm font-medium text-secondary-700 mb-2">
                Wedding Date *
              </label>
              <input
                type="date"
                id="wedding_date"
                value={formData.wedding_date}
                onChange={(e) => handleInputChange('wedding_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.wedding_date ? 'border-red-300' : 'border-secondary-300'
                }`}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.wedding_date && (
                <p className="mt-1 text-sm text-red-600">{errors.wedding_date}</p>
              )}
            </div>

            {/* Venue Name */}
            <div>
              <label htmlFor="venue_name" className="block text-sm font-medium text-secondary-700 mb-2">
                Venue Name *
              </label>
              <input
                type="text"
                id="venue_name"
                value={formData.venue_name}
                onChange={(e) => handleInputChange('venue_name', e.target.value)}
                placeholder="e.g., Hilton Hotel, Sheraton Addis"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.venue_name ? 'border-red-300' : 'border-secondary-300'
                }`}
                maxLength={200}
              />
              {errors.venue_name && (
                <p className="mt-1 text-sm text-red-600">{errors.venue_name}</p>
              )}
            </div>

            {/* Venue Address */}
            <div>
              <label htmlFor="venue_address" className="block text-sm font-medium text-secondary-700 mb-2">
                Venue Address *
              </label>
              <textarea
                id="venue_address"
                value={formData.venue_address}
                onChange={(e) => handleInputChange('venue_address', e.target.value)}
                placeholder="Full address including city and region"
                rows={3}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.venue_address ? 'border-red-300' : 'border-secondary-300'
                }`}
                maxLength={500}
              />
              {errors.venue_address && (
                <p className="mt-1 text-sm text-red-600">{errors.venue_address}</p>
              )}
            </div>

            {/* Expected Guests */}
            <div>
              <label htmlFor="expected_guests" className="block text-sm font-medium text-secondary-700 mb-2">
                Expected Number of Guests *
              </label>
              <input
                type="number"
                id="expected_guests"
                value={formData.expected_guests}
                onChange={(e) => handleInputChange('expected_guests', parseInt(e.target.value) || 0)}
                min={1}
                max={10000}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.expected_guests ? 'border-red-300' : 'border-secondary-300'
                }`}
              />
              {errors.expected_guests && (
                <p className="mt-1 text-sm text-red-600">{errors.expected_guests}</p>
              )}
              <p className="mt-1 text-sm text-secondary-500">
                This helps us prepare your guest management system
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                loading={createWeddingMutation.isPending}
                disabled={createWeddingMutation.isPending}
              >
                {createWeddingMutation.isPending ? 'Creating Wedding...' : 'Create Wedding'}
              </Button>
            </div>

            {/* Error Message */}
            {createWeddingMutation.isError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  Failed to create wedding. Please try again.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeddingSetupWizard;