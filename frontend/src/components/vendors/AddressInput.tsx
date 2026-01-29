import React, { useState, useEffect } from 'react';
import { MapPin, Search, Navigation } from 'lucide-react';

interface AddressInputProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  placeholder = "Enter your business address",
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock geocoding function - in production, use Google Maps API or similar
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // Mock suggestions for Ethiopian addresses
    const mockSuggestions = [
      {
        id: 1,
        address: `${query}, Bole, Addis Ababa, Ethiopia`,
        coordinates: { lat: 8.9806, lng: 38.7578 }
      },
      {
        id: 2,
        address: `${query}, Kazanchis, Addis Ababa, Ethiopia`,
        coordinates: { lat: 9.0192, lng: 38.7525 }
      },
      {
        id: 3,
        address: `${query}, Piazza, Addis Ababa, Ethiopia`,
        coordinates: { lat: 9.0348, lng: 38.7369 }
      }
    ].filter(suggestion => 
      suggestion.address.toLowerCase().includes(query.toLowerCase())
    );

    setTimeout(() => {
      setSuggestions(mockSuggestions);
      setIsLoading(false);
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    
    if (newValue.trim()) {
      searchAddresses(newValue);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchQuery(suggestion.address);
    onChange(suggestion.address, suggestion.coordinates);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // In production, reverse geocode to get address
          const mockAddress = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          setSearchQuery(mockAddress);
          onChange(mockAddress, { lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500 dark:focus:ring-rose-400 ${className}`}
        />
        <button
          type="button"
          onClick={getCurrentLocation}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors"
          title="Use current location"
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Address Suggestions */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-4 h-4 animate-spin mx-auto mb-2" />
              Searching addresses...
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 dark:text-white text-sm">
                    {suggestion.address}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        Please enter the exact location so it can be accurately found on the map.
      </p>
    </div>
  );
};

export default AddressInput;