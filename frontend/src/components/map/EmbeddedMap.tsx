import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ExternalLink, AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface EmbeddedMapProps {
  venueName: string;
  venueAddress?: string;
  className?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const EmbeddedMap: React.FC<EmbeddedMapProps> = ({ 
  venueName, 
  venueAddress, 
  className = "w-full h-64" 
}) => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [mapError, setMapError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Create search query for the map
  const searchQuery = venueAddress 
    ? `${venueName}, ${venueAddress}`
    : `${venueName}, Addis Ababa, Ethiopia`;

  // Encode the search query for URL
  const encodedQuery = encodeURIComponent(searchQuery);
  
  // Google Maps link for opening in new tab (fallback)
  const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  // Default coordinates for Addis Ababa if geocoding fails
  const defaultCoordinates: Coordinates = {
    lat: 9.0320,
    lng: 38.7469
  };

  // Simple geocoding function using Nominatim (OpenStreetMap)
  const geocodeAddress = async (query: string): Promise<Coordinates | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadCoordinates = async () => {
      setIsLoading(true);
      setMapError(false);
      
      try {
        const coords = await geocodeAddress(searchQuery);
        if (coords) {
          setCoordinates(coords);
        } else {
          // If geocoding returns no results, use default coordinates
          setCoordinates(defaultCoordinates);
        }
      } catch (error) {
        console.error('Error loading coordinates:', error);
        setMapError(true);
        setCoordinates(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCoordinates();
  }, [searchQuery]);

  const openInGoogleMaps = () => {
    window.open(mapLinkUrl, '_blank', 'noopener,noreferrer');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700`}>
        <div className="text-center p-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (mapError || !coordinates) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700`}>
        <div className="text-center p-4">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Unable to load map for {venueName}
          </p>
          <button
            onClick={openInGoogleMaps}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View on Google Maps
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700`}>
      {/* Leaflet Map */}
      <MapContainer
        center={[coordinates.lat, coordinates.lng]}
        zoom={15}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[coordinates.lat, coordinates.lng]}>
          <Popup>
            <div className="text-center">
              <h4 className="font-semibold text-gray-900 mb-1">{venueName}</h4>
              {venueAddress && (
                <p className="text-sm text-gray-600 mb-2">{venueAddress}</p>
              )}
              <button
                onClick={openInGoogleMaps}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open in Google Maps
              </button>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Overlay with venue info and external link */}
      <div className="absolute top-3 left-3 right-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {venueName}
            </h4>
            {venueAddress && (
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {venueAddress}
              </p>
            )}
          </div>
          <button
            onClick={openInGoogleMaps}
            className="ml-2 p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Open in Google Maps"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmbeddedMap;