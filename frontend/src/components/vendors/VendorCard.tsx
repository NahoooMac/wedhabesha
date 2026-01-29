import React, { useState } from 'react';
import { MapPin, Star, Verified, MessageCircle, Eye, Heart } from 'lucide-react';
import { Button } from '../ui/Button';
import { VendorResponse } from '../../lib/api';
import { handleMessageVendor } from '../../utils/messaging';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Helper function to get full image URL
const getImageUrl = (photo: string) => {
  if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
    return photo;
  }
  return photo;
};

interface VendorCardProps {
  vendor: VendorResponse;
  onContact: (vendor: VendorResponse) => void;
  onViewProfile: (vendor: VendorResponse) => void;
}

const VendorCard: React.FC<VendorCardProps> = ({ vendor, onContact, onViewProfile }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [messagingVendor, setMessagingVendor] = useState(false);

  const formatCategory = (category: string) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Handle Message Vendor button click
  const handleMessageVendorClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is signed in
    if (!user) {
      // Redirect to sign-in page
      navigate('/login');
      return;
    }
    
    // Only allow couples to message vendors
    if (user.user_type !== 'COUPLE') {
      alert('Only couples can message vendors. Please log in as a couple.');
      return;
    }

    try {
      setMessagingVendor(true);
      
      await handleMessageVendor(
        vendor.id.toString(),
        vendor.business_name,
        (threadId) => {
          // Success - the messaging utility will handle navigation to Communication tab
        },
        (error) => {
          // Error - show error message
          alert(`Failed to start conversation: ${error}`);
        }
      );
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setMessagingVendor(false);
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg">New</span>;
    
    return (
      <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm">
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  // Get the first business photo or portfolio photo
  const getVendorImage = () => {
    if (vendor.business_photos && vendor.business_photos.length > 0) {
      return getImageUrl(vendor.business_photos[0]);
    }
    if (vendor.portfolio_photos && vendor.portfolio_photos.length > 0) {
      return getImageUrl(vendor.portfolio_photos[0]);
    }
    return null;
  };

  const vendorImage = getVendorImage();

  return (
    <div 
      className="group relative h-full flex flex-col bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden cursor-pointer"
      onClick={() => onViewProfile(vendor)}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        {/* Skeleton/Placeholder */}
        <div className={`absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse transition-opacity duration-500 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`} />
        
        {/* Image */}
        {vendorImage ? (
          <img
            src={vendorImage}
            alt={vendor.business_name}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-100 to-purple-100 dark:from-gray-800 dark:to-gray-700">
            <span className="text-4xl font-bold text-rose-300 dark:text-gray-600 select-none">
              {vendor.business_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-80" />
        
        {/* Top Actions */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          <span className="bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            {formatCategory(vendor.category)}
          </span>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-300 transform hover:scale-110 ${
              isLiked 
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' 
                : 'bg-white/20 hover:bg-white text-white hover:text-rose-500 border border-white/20'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Bottom Content overlaid on image */}
        <div className="absolute bottom-4 left-4 right-4 z-10 text-white">
          <div className="flex justify-between items-end mb-2">
            <div className="flex-1 mr-2">
              <h3 className="font-bold text-xl leading-tight mb-1 group-hover:text-rose-200 transition-colors flex items-center gap-2">
                {vendor.business_name}
                {vendor.is_verified && (
                  <Verified className="h-5 w-5 text-blue-400" />
                )}
              </h3>
              <div className="flex items-center gap-1.5 text-gray-200 text-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                <span className="truncate">{vendor.location}</span>
              </div>
            </div>
            {renderStars(vendor.rating)}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-1 relative">
        {/* Decoration */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent opacity-50"></div>

        <div className="flex items-start justify-between mb-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 leading-relaxed flex-1">
            {vendor.description || "No description provided."}
          </p>
        </div>

        {/* Verified Badge inline */}
        {vendor.is_verified && (
          <div className="flex items-center gap-1.5 mb-4 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded w-fit">
            <Verified className="h-3.5 w-3.5" />
            <span>Verified Professional</span>
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="w-full text-xs font-semibold h-10 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(vendor);
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-2" />
            Details
          </Button>
          <Button
            className="w-full text-xs font-semibold h-10 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white shadow-md shadow-rose-500/20 rounded-xl transition-all hover:scale-[1.02]"
            onClick={handleMessageVendorClick}
            loading={messagingVendor}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-2" />
            {messagingVendor ? 'Starting...' : user ? 'Message' : 'Sign In to Message'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VendorCard;