import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { weddingApi, WeddingCreateRequest, WeddingCreateResponse } from '../../lib/api';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface WeddingSetupWizardProps {
  onComplete: (wedding: WeddingCreateResponse) => void;
}

interface FormData {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
  venue_name: string;
  venue_address: string;
  venue_latitude: number | null;
  venue_longitude: number | null;
  expected_guests: number;
  venue_decided: boolean; // Track if venue is decided
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

// Map click handler component
const MapClickHandler: React.FC<{ onLocationSelect: (lat: number, lng: number) => void }> = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const WeddingSetupWizard: React.FC<WeddingSetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    partner1_name: '',
    partner2_name: '',
    wedding_date: '',
    venue_name: '',
    venue_address: '',
    venue_latitude: 9.03, // Default to Addis Ababa
    venue_longitude: 38.74,
    expected_guests: 50,
    venue_decided: true, // Default to true (venue is decided)
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const queryClient = useQueryClient();
  const totalSteps = 4;

  const createWeddingMutation = useMutation({
    mutationFn: async (data: WeddingCreateRequest) => {
      // Ensure token is available before making the request
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      // Small delay to ensure token is properly set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return weddingApi.createWedding(data);
    },
    onSuccess: (wedding) => {
      queryClient.invalidateQueries({ queryKey: ['wedding'] });
      onComplete(wedding);
    },
    onError: (error: any) => {
      console.error('Failed to create wedding:', error);
      // Error will be displayed in the UI
    },
  });

  // Search location using Nominatim (OpenStreetMap)
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Location search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data.display_name) {
        setFormData(prev => ({
          ...prev,
          venue_address: data.display_name,
          venue_latitude: lat,
          venue_longitude: lng
        }));
        setSearchQuery(data.display_name);
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    reverseGeocode(lat, lng);
    setSearchResults([]);
  };

  const selectSearchResult = (result: SearchResult) => {
    setFormData(prev => ({
      ...prev,
      venue_address: result.display_name,
      venue_latitude: parseFloat(result.lat),
      venue_longitude: parseFloat(result.lon)
    }));
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.partner1_name.trim()) {
        newErrors.partner1_name = 'Bride/Partner 1 name is required';
      } else if (formData.partner1_name.length > 100) {
        newErrors.partner1_name = 'Name must be less than 100 characters';
      }

      if (!formData.partner2_name.trim()) {
        newErrors.partner2_name = 'Groom/Partner 2 name is required';
      } else if (formData.partner2_name.length > 100) {
        newErrors.partner2_name = 'Name must be less than 100 characters';
      }
    }

    if (step === 2) {
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
    }

    if (step === 3) {
      // Only validate venue if it's marked as decided
      if (formData.venue_decided) {
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
      } else {
        // If venue not decided, set default values and clear any errors
        setFormData(prev => ({
          ...prev,
          venue_name: 'To be decided',
          venue_address: 'To be decided',
          venue_latitude: null,
          venue_longitude: null
        }));
      }
    }

    if (step === 4) {
      if (formData.expected_guests < 1) {
        newErrors.expected_guests = 'Expected guests must be at least 1';
      } else if (formData.expected_guests > 10000) {
        newErrors.expected_guests = 'Expected guests cannot exceed 10,000';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    // Prepare the data, excluding null latitude/longitude
    const submissionData: any = {
      partner1_name: formData.partner1_name,
      partner2_name: formData.partner2_name,
      wedding_date: formData.wedding_date,
      venue_name: formData.venue_name,
      venue_address: formData.venue_address,
      expected_guests: formData.expected_guests,
    };

    // Only include coordinates if they are not null
    if (formData.venue_latitude !== null) {
      submissionData.venue_latitude = formData.venue_latitude;
    }
    if (formData.venue_longitude !== null) {
      submissionData.venue_longitude = formData.venue_longitude;
    }

    createWeddingMutation.mutate(submissionData);
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

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step === currentStep
                  ? 'bg-primary-600 text-white scale-110'
                  : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step < currentStep ? '✓' : step}
            </div>
            <span className={`text-xs mt-2 ${step === currentStep ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>
              {step === 1 && 'Names'}
              {step === 2 && 'Date'}
              {step === 3 && 'Venue'}
              {step === 4 && 'Guests'}
            </span>
          </div>
          {index < 3 && (
            <div
              className={`w-16 h-1 mx-2 transition-all ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="partner1_name" className="block text-sm font-medium text-secondary-700 mb-2">
                Bride / Partner 1 Name *
              </label>
              <input
                type="text"
                id="partner1_name"
                value={formData.partner1_name}
                onChange={(e) => handleInputChange('partner1_name', e.target.value)}
                placeholder="Enter bride or first partner's name"
                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.partner1_name ? 'border-red-300' : 'border-secondary-300'
                }`}
                maxLength={100}
              />
              {errors.partner1_name && (
                <p className="mt-1 text-sm text-red-600">{errors.partner1_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="partner2_name" className="block text-sm font-medium text-secondary-700 mb-2">
                Groom / Partner 2 Name *
              </label>
              <input
                type="text"
                id="partner2_name"
                value={formData.partner2_name}
                onChange={(e) => handleInputChange('partner2_name', e.target.value)}
                placeholder="Enter groom or second partner's name"
                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.partner2_name ? 'border-red-300' : 'border-secondary-300'
                }`}
                maxLength={100}
              />
              {errors.partner2_name && (
                <p className="mt-1 text-sm text-red-600">{errors.partner2_name}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="wedding_date" className="block text-sm font-medium text-secondary-700 mb-2">
                Wedding Date *
              </label>
              <input
                type="date"
                id="wedding_date"
                value={formData.wedding_date}
                onChange={(e) => handleInputChange('wedding_date', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.wedding_date ? 'border-red-300' : 'border-secondary-300'
                }`}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.wedding_date && (
                <p className="mt-1 text-sm text-red-600">{errors.wedding_date}</p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Select the date of your special day
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Venue Decision Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Have you decided on a venue?</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">You can skip this step and add venue details later</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, venue_decided: true }));
                    setErrors({});
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.venue_decided
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ 
                      ...prev, 
                      venue_decided: false,
                      venue_name: '',
                      venue_address: '',
                    }));
                    setErrors({});
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !formData.venue_decided
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  Not yet
                </button>
              </div>
            </div>

            {formData.venue_decided ? (
              <>
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
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.venue_name ? 'border-red-300' : 'border-secondary-300'
                    }`}
                    maxLength={200}
                  />
                  {errors.venue_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.venue_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="venue_search" className="block text-sm font-medium text-secondary-700 mb-2">
                    Search Venue Location *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="venue_search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchLocation())}
                      placeholder="Search for venue address..."
                      className="flex-1 px-4 py-3 border border-secondary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <Button
                      type="button"
                      onClick={searchLocation}
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-6"
                    >
                      {isSearching ? 'Searching...' : '🔍 Search'}
                    </Button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.place_id}
                          type="button"
                          onClick={() => selectSearchResult(result)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="text-sm text-gray-800">{result.display_name}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {errors.venue_address && (
                    <p className="mt-1 text-sm text-red-600">{errors.venue_address}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Click on the map or search to select venue location
                  </p>
                </div>

                {/* Map */}
                <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
                  <MapContainer
                    center={[formData.venue_latitude || 9.03, formData.venue_longitude || 38.74]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {formData.venue_latitude && formData.venue_longitude && (
                      <Marker position={[formData.venue_latitude, formData.venue_longitude]} />
                    )}
                    <MapClickHandler onLocationSelect={handleLocationSelect} />
                  </MapContainer>
                </div>

                {/* Selected Address Display */}
                {formData.venue_address && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Selected Address:</p>
                    <p className="text-sm text-blue-700 mt-1">{formData.venue_address}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Venue Not Yet Decided</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  No problem! You can add your venue details later from your dashboard.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Click "Next" to continue to the final step
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
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
                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.expected_guests ? 'border-red-300' : 'border-secondary-300'
                }`}
              />
              {errors.expected_guests && (
                <p className="mt-1 text-sm text-red-600">{errors.expected_guests}</p>
              )}
              <p className="mt-2 text-sm text-secondary-500">
                This helps us prepare your guest management system
              </p>
            </div>

            {/* Summary */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wedding Summary</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Couple:</span>
                  <p className="text-sm text-gray-900">{formData.partner1_name} & {formData.partner2_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Date:</span>
                  <p className="text-sm text-gray-900">{new Date(formData.wedding_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Venue:</span>
                  <p className="text-sm text-gray-900">{formData.venue_name}</p>
                  <p className="text-xs text-gray-600 mt-1">{formData.venue_address}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Expected Guests:</span>
                  <p className="text-sm text-gray-900">{formData.expected_guests}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set Up Your Wedding</CardTitle>
          <CardDescription>
            Step {currentStep} of {totalSteps}: Complete your wedding details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepIndicator()}

          <form onSubmit={handleSubmit} className="mt-8">
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="px-6"
              >
                ← Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="px-6"
                >
                  Next →
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={createWeddingMutation.isPending}
                  disabled={createWeddingMutation.isPending}
                  className="px-6"
                >
                  {createWeddingMutation.isPending ? 'Creating Wedding...' : 'Create Wedding'}
                </Button>
              )}
            </div>

            {/* Error Message */}
            {createWeddingMutation.isError && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  {createWeddingMutation.error instanceof Error && 'status' in createWeddingMutation.error && (createWeddingMutation.error as any).status === 409
                    ? 'Wedding Already Exists'
                    : createWeddingMutation.error instanceof Error && 'status' in createWeddingMutation.error && ((createWeddingMutation.error as any).status === 401 || (createWeddingMutation.error as any).status === 403)
                    ? 'Authentication Error'
                    : 'Failed to Create Wedding'}
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  {createWeddingMutation.error instanceof Error && 'message' in createWeddingMutation.error
                    ? createWeddingMutation.error.message
                    : 'An unexpected error occurred. Please try again.'}
                </p>
                {createWeddingMutation.error instanceof Error && 'status' in createWeddingMutation.error && (createWeddingMutation.error as any).status === 409 && (
                  <p className="text-sm text-red-600 dark:text-red-300 mt-2">
                    You already have a wedding profile. Please go to your dashboard to view and manage it.
                  </p>
                )}
                {createWeddingMutation.error instanceof Error && 'status' in createWeddingMutation.error && ((createWeddingMutation.error as any).status === 401 || (createWeddingMutation.error as any).status === 403) && (
                  <div className="mt-2">
                    <p className="text-sm text-red-600 dark:text-red-300">
                      Your session has expired or is invalid. Please log out and log back in to continue.
                    </p>
                    <button
                      onClick={() => {
                        localStorage.removeItem('jwt_token');
                        localStorage.removeItem('access_token');
                        window.location.href = '/login';
                      }}
                      className="mt-2 text-sm text-red-700 dark:text-red-400 underline hover:text-red-800 dark:hover:text-red-300"
                    >
                      Click here to log in again
                    </button>
                  </div>
                )}
                {createWeddingMutation.error instanceof Error && 'details' in createWeddingMutation.error && (createWeddingMutation.error as any).details && (
                  <ul className="mt-2 text-sm text-red-600 dark:text-red-300 list-disc list-inside">
                    {Array.isArray((createWeddingMutation.error as any).details) 
                      ? (createWeddingMutation.error as any).details.map((detail: any, index: number) => (
                          <li key={index}>{detail.msg || detail.message || JSON.stringify(detail)}</li>
                        ))
                      : <li>{JSON.stringify((createWeddingMutation.error as any).details)}</li>
                    }
                  </ul>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeddingSetupWizard;
