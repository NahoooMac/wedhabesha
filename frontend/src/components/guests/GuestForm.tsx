import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { guestApi, Guest, GuestCreateRequest, GuestUpdateRequest } from '../../lib/api';

interface GuestFormProps {
  weddingId: number;
  guest?: Guest; // If provided, this is an edit form
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  table_number: string;
  dietary_restrictions: string;
}

const GuestForm: React.FC<GuestFormProps> = ({ weddingId, guest, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    name: guest?.name || '',
    email: guest?.email || '',
    phone: guest?.phone || '',
    table_number: guest?.table_number?.toString() || '',
    dietary_restrictions: guest?.dietary_restrictions || '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const queryClient = useQueryClient();
  const isEditing = !!guest;

  const createGuestMutation = useMutation({
    mutationFn: (data: GuestCreateRequest) => guestApi.addGuest(weddingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to create guest:', error);
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: (data: GuestUpdateRequest) => guestApi.updateGuest(weddingId, guest!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to update guest:', error);
      // The error will be displayed in the form
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 200) {
      newErrors.name = 'Name must be less than 200 characters';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Invalid email format';
      } else if (formData.email.length > 254) {
        newErrors.email = 'Email must be less than 254 characters';
      }
    }

    if (formData.phone.trim()) {
      // Match backend validation: allow +, digits, spaces, dashes, parentheses (7-20 chars)
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = 'Invalid phone number format';
      }
    }

    if (formData.table_number.trim()) {
      const tableNum = parseInt(formData.table_number);
      if (isNaN(tableNum) || tableNum < 1 || tableNum > 1000) {
        newErrors.table_number = 'Table number must be between 1 and 1000';
      }
    }

    if (formData.dietary_restrictions.length > 500) {
      newErrors.dietary_restrictions = 'Dietary restrictions must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      table_number: formData.table_number.trim() ? parseInt(formData.table_number) : undefined,
      dietary_restrictions: formData.dietary_restrictions.trim() || undefined,
    };

    if (isEditing) {
      // Send all fields for updates (backend validation requires all fields)
      updateGuestMutation.mutate(submitData);
    } else {
      createGuestMutation.mutate(submitData);
    }
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

  const isLoading = createGuestMutation.isPending || updateGuestMutation.isPending;
  const error = createGuestMutation.error || updateGuestMutation.error;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isEditing ? 'Edit Guest' : 'Add New Guest'}</CardTitle>
                <CardDescription>
                  {isEditing ? 'Update guest information' : 'Add a new guest to your wedding'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.name ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholder="Guest full name"
                  maxLength={200}
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.email ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholder="guest@example.com"
                  maxLength={254}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.phone ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholder="+251 911 123456"
                  maxLength={20}
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Table Number */}
              <div>
                <label htmlFor="table_number" className="block text-sm font-medium text-secondary-700 mb-1">
                  Table Number
                </label>
                <input
                  type="number"
                  id="table_number"
                  value={formData.table_number}
                  onChange={(e) => handleInputChange('table_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.table_number ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholder="Table assignment"
                  min={1}
                  max={1000}
                  disabled={isLoading}
                />
                {errors.table_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.table_number}</p>
                )}
              </div>

              {/* Dietary Restrictions */}
              <div>
                <label htmlFor="dietary_restrictions" className="block text-sm font-medium text-secondary-700 mb-1">
                  Dietary Restrictions
                </label>
                <textarea
                  id="dietary_restrictions"
                  value={formData.dietary_restrictions}
                  onChange={(e) => handleInputChange('dietary_restrictions', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.dietary_restrictions ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholder="Any dietary restrictions or allergies"
                  maxLength={500}
                  disabled={isLoading}
                />
                {errors.dietary_restrictions && (
                  <p className="mt-1 text-sm text-red-600">{errors.dietary_restrictions}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading 
                    ? (isEditing ? 'Updating...' : 'Adding...') 
                    : (isEditing ? 'Update Guest' : 'Add Guest')
                  }
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
                    Failed to {isEditing ? 'update' : 'add'} guest: {error.message || 'Unknown error'}. Please try again.
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

export default GuestForm;