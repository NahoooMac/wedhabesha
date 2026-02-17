import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { weddingApi, WeddingUpdateRequest } from '../../lib/api';
import { X, MapPin, Search } from 'lucide-react';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface WeddingEditModalProps {
  wedding: {
    id: number;
    wedding_date: string;
    venue_name: string;
    venue_address?: string;
    venue_latitude?: number | null;
    venue_longitude?: number | null;
    expected_guests: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  wedding_date: string;
  venue_name: string;
  venue_address: string;
  venue_latitude: number | null;
  venue_longitude: number | null;
  expected_guests: string;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
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

const WeddingEditModal: React.FC<WeddingEditModalProps> = ({ wedding, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    wedding_date: wedding.wedding_date.split('T')[0], // Convert to YYYY-MM-DD format
    venue_name: wedding.venue_name,
    venue_address: wedding.venue_address || '',
    venue_latitude: wedding.venue_latitude || 9.03, // Default to Addis Ababa
    venue_longitude: wedding.venue_longitude || 38.74,
    expected_guests: wedding.expected_guests.toString(),
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);

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

  // Reverse geocode to get address and venue name from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data.display_name) {
        // Extract venue name from address components
        const venueName = data.name || data.address?.building || data.address?.amenity || 
                         data.address?.tourism || data.address?.leisure || 
                         data.address?.shop || data.address?.office || 
                         data.address?.neighbourhood || 'Selected Location';
        
        setFormData(prev => ({
          ...prev,
          venue_name: venueName,
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
    const venueName = result.name || result.display_name.split(',')[0] || 'Selected Location';
    setFormData(prev => ({
      ...prev,
      venue_name: venueName,
      venue_address: result.display_name,
      venue_latitude: parseFloat(result.lat),
      venue_longitude: parseFloat(result.lon)
    }));
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setShowMap(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: any = {
      wedding_date: formData.wedding_date,
      venue_name: formData.venue_name.trim(),
      venue_address: formData.venue_address.trim() || undefined,
      expected_guests: parseInt(formData.expected_guests),
    };

    // Include coordinates if they exist
    if (formData.venue_latitude !== null) {
      submitData.venue_latitude = formData.venue_latitude;
    }
    if (formData.venue_longitude !== null) {
      submitData.venue_longitude = formData.venue_longitude;
    }

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
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Edit Wedding Details</CardTitle>
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Wedding Date */}
                  <div>
                    <label htmlFor="wedding_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Wedding Date *
                    </label>
                    <input
                      type="date"
                      id="wedding_date"
                      value={formData.wedding_date}
                      onChange={(e) => handleInputChange('wedding_date', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                        errors.wedding_date ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={isLoading}
                    />
                    {errors.wedding_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.wedding_date}</p>
                    )}
                  </div>

                  {/* Expected Guests */}
                  <div>
                    <label htmlFor="expected_guests" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expected Guests *
                    </label>
                    <input
                      type="number"
                      id="expected_guests"
                      value={formData.expected_guests}
                      onChange={(e) => handleInputChange('expected_guests', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
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

                  {/* Venue Name */}
                  <div>
                    <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      id="venue_name"
                      value={formData.venue_name}
                      onChange={(e) => handleInputChange('venue_name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
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
                    <label htmlFor="venue_address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Venue Address
                    </label>
                    <textarea
                      id="venue_address"
                      value={formData.venue_address}
                      onChange={(e) => handleInputChange('venue_address', e.target.value)}
                      rows={3}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
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
                </div>

                {/* Right Column - Map Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Venue Location
                    </label>
                    
                    {/* Search Bar */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLocation())}
                        placeholder="Search for venue location..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-800 dark:text-white"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        onClick={searchLocation}
                        disabled={isSearching || !searchQuery.trim() || isLoading}
                        size="sm"
                        className="bg-rose-600 hover:bg-rose-700"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mb-3 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {searchResults.map((result: SearchResult) => (
                          <button
                            key={result.place_id}
                            type="button"
                            onClick={() => selectSearchResult(result)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-600 last:border-b-0 text-sm"
                          >
                            {result.display_name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Toggle Map Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowMap(!showMap)}
                      className="w-full mb-3"
                      disabled={isLoading}
                    >
                      {showMap ? 'Hide Map' : 'Show Map'}
                    </Button>

                    {/* Interactive Map */}
                    {showMap && (
                      <div className="h-80 rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600">
                        <MapContainer
                          center={[formData.venue_latitude || 9.03, formData.venue_longitude || 38.74]}
                          zoom={13}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          {formData.venue_latitude && formData.venue_longitude && (
                            <Marker position={[formData.venue_latitude, formData.venue_longitude]} />
                          )}
                          <MapClickHandler onLocationSelect={handleLocationSelect} />
                        </MapContainer>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      💡 Click on the map to select venue location. The venue name will be auto-populated.
                    </p>
                  </div>
                </div>
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