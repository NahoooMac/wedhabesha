import React, { useState, useEffect } from 'react';
import { MapPin, Star, Verified, MessageCircle, Grid, Award, ArrowLeft, Share2, Globe, Clock, Phone, Package, ExternalLink, Copy, Navigation } from 'lucide-react';
import { Button } from '../ui/Button';
import { VendorResponse, ReviewsResponse, RatingBreakdownResponse, vendorApi } from '../../lib/api';
import ReviewInterface from '../reviews/ReviewInterface';
import EmbeddedMap from '../map/EmbeddedMap';
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

interface VendorProfileModalProps {
  vendor: VendorResponse;
  isOpen: boolean;
  onClose: () => void;
}

const VendorProfileModal: React.FC<VendorProfileModalProps> = ({
  vendor,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'portfolio' | 'services'>('overview');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [messagingVendor, setMessagingVendor] = useState(false);

  useEffect(() => {
    if (isOpen && vendor) {
      loadVendorData();
      // Lock body scroll for the full-screen view
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, vendor]);

  const loadVendorData = async () => {
    setLoading(true);
    try {
      const reviewsData = await vendorApi.getVendorReviews(vendor.id, { verified_only: true, offset: 0, limit: 10 });
      
      // Set rating breakdown from the reviews response
      if (reviewsData.summary) {
        setRatingBreakdown({
          total_reviews: reviewsData.summary.total_reviews,
          average_rating: reviewsData.summary.average_rating ? parseFloat(reviewsData.summary.average_rating) : undefined,
          rating_distribution: reviewsData.summary.rating_distribution,
          recent_reviews: [] // Not provided by backend
        });
      }
    } catch (error) {
      console.error('Failed to load vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Share functionality
  const handleShare = async () => {
    const shareData = {
      title: `${vendor.business_name} - ${vendor.category}`,
      text: `Check out ${vendor.business_name} on WedHabesha - ${vendor.description}`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Share cancelled or failed
      }
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareMenu(false);
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy link');
    }
  };

  const shareToSocial = (platform: 'twitter' | 'facebook') => {
    const text = `Check out ${vendor.business_name} on WedHabesha!`;
    const url = encodeURIComponent(window.location.href);
    
    let shareUrl;
    if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
    } else if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  // Contact functionality
  const handlePhoneCall = () => {
    if (vendor.phone) {
      window.location.href = `tel:${vendor.phone}`;
    }
  };

  const handleWebsiteVisit = () => {
    if (vendor.website) {
      let url = vendor.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
    }
  };

  // Directions functionality
  const handleGetDirections = () => {
    const address = vendor.map_address || vendor.street_address || vendor.location;
    const encodedAddress = encodeURIComponent(address);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  };

  // Handle Message Vendor button click
  const handleMessageVendorClick = async () => {
    // Check if user is signed in
    if (!user) {
      // Close modal and redirect to sign-in page
      onClose();
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
        () => {
          // Success - close modal and show success message
          onClose();
          // The messaging utility will handle navigation to Communication tab
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

  const formatCategory = (category: string) => category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (!isOpen) return null;

  return (
    // Full screen overlay that acts like a page with top padding for navbar
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto animate-slide-up pt-16">
      
      {/* Navigation Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="group flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 pl-0"
          >
            <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Back to Vendors</span>
          </Button>

          <div className="flex gap-3">
            <div className="relative">
              <Button 
                variant="outline" 
                className="hidden sm:flex rounded-full border-gray-200"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
              
              {/* Share Dropdown */}
              {showShareMenu && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[160px] z-10">
                  <button
                    onClick={copyLink}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Share on Twitter
                  </button>
                  <button
                    onClick={() => shareToSocial('facebook')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Share on Facebook
                  </button>
                </div>
              )}
            </div>
            <Button 
              onClick={handleMessageVendorClick}
              loading={messagingVendor}
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> 
              {messagingVendor ? 'Starting Conversation...' : user ? 'Message Vendor' : 'Sign In to Message'}
            </Button>
          </div>
        </div>
      </div>

      <div className="pb-20">
        {/* Hero Section */}
        <div className="relative h-[400px] w-full bg-gray-900">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 opacity-90"></div>
          {/* Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12 relative z-10">
            <div className="flex flex-col md:flex-row items-end gap-8">
              {/* Profile Image */}
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white p-1.5 shadow-2xl shadow-black/50 rotate-3">
                <div className="w-full h-full bg-gradient-to-br from-rose-100 to-purple-100 rounded-2xl flex items-center justify-center text-5xl md:text-6xl font-bold text-rose-600 select-none overflow-hidden">
                  {/* Try to show first business photo if available, else initial */}
                  {vendor.business_photos && vendor.business_photos.length > 0 ? (
                    <img src={getImageUrl(vendor.business_photos[0])} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    vendor.business_name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              {/* Text Info */}
              <div className="flex-1 text-white mb-2">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                    {formatCategory(vendor.category)}
                  </span>
                  {vendor.is_verified && (
                    <span className="flex items-center gap-1.5 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 px-3 py-1 rounded-full text-xs font-medium text-blue-200">
                      <Verified className="w-3 h-3" /> Verified Business
                    </span>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight flex items-center gap-3">
                  {vendor.business_name}
                  {vendor.is_verified && (
                    <Verified className="h-8 w-8 text-blue-400" />
                  )}
                </h1>
                <div className="flex flex-wrap items-center gap-6 text-gray-300 text-sm md:text-base">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    {vendor.city && vendor.state ? `${vendor.city}, ${vendor.state}` : vendor.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white font-bold">{vendor.rating?.toFixed(1) || 'New'}</span>
                    <span>({ratingBreakdown?.total_reviews || 0} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>Member since {new Date(vendor.created_at).getFullYear()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Sidebar */}
            <div className="space-y-6">
              {/* Quick Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Contact & Info
                </h3>
                <div className="space-y-4 text-sm">
                  {vendor.phone && (
                    <button
                      onClick={handlePhoneCall}
                      className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors w-full text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      {vendor.phone}
                    </button>
                  )}
                  {vendor.website && (
                    <button
                      onClick={handleWebsiteVisit}
                      className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors w-full text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className="hover:underline truncate">
                        {vendor.website.replace(/^https?:\/\//, '')}
                      </span>
                    </button>
                  )}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Service Area</h4>
                    <p className="text-gray-500 leading-relaxed">
                      {vendor.service_area || `${vendor.city || vendor.location} and surrounding areas`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Map Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="h-48 rounded-xl overflow-hidden relative">
                  <EmbeddedMap 
                    venueName={vendor.business_name} 
                    venueAddress={vendor.map_address || vendor.street_address || vendor.location} 
                    className="w-full h-full" 
                  />
                </div>
                <div className="p-3 text-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={handleGetDirections}
                  >
                    <Navigation className="w-3 h-3 mr-2" />
                    Get Directions
                  </Button>
                </div>
              </div>
            </div>

            {/* Center Content */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-1.5 flex gap-1 overflow-x-auto">
                {['overview', 'services', 'portfolio', 'reviews'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                      activeTab === tab 
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                  <div className="space-y-8 animate-fade-in">
                    <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">About Us</h2>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-line">
                        {vendor.description}
                      </p>
                    </section>

                    <section>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Why Choose Us</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {vendor.why_choose_us && vendor.why_choose_us.length > 0 && vendor.why_choose_us.some(reason => reason.trim()) ? (
                          vendor.why_choose_us.filter(reason => reason.trim()).map((reason, i) => (
                            <div key={i} className="flex gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 shrink-0">
                                <Award className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">{reason}</h4>
                                <p className="text-sm text-gray-500">What makes us special</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback content when no reasons are provided
                          [
                            { title: 'Experienced Team', desc: 'Years of professional service' },
                            { title: 'Quality Guarantee', desc: 'Top-tier equipment & materials' },
                            { title: 'Custom Packages', desc: 'Tailored to your budget' },
                            { title: 'Verified Vendor', desc: 'Vetted by WedHabesha' }
                          ].map((item, i) => (
                            <div key={i} className="flex gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 shrink-0">
                                <Award className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">{item.title}</h4>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'services' && (
                  <div className="space-y-6 animate-fade-in">
                    {vendor.service_packages && vendor.service_packages.length > 0 ? (
                      vendor.service_packages.map((pkg, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-6">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{pkg.name}</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">{pkg.description}</p>
                            {pkg.features && (
                              <ul className="space-y-2">
                                {pkg.features.map((feature, fIdx) => (
                                  <li key={fIdx} className="flex items-center gap-2 text-sm text-gray-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="text-right flex flex-col justify-between min-w-[140px]">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Starting from</p>
                              <p className="text-2xl font-bold text-rose-600">ETB {pkg.price.toLocaleString()}</p>
                            </div>
                            <Button 
                              onClick={handleMessageVendorClick} 
                              className="mt-4 w-full"
                            >
                              {user ? 'Inquire' : 'Sign In to Inquire'}
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 bg-gray-50 rounded-2xl">
                        <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No specific service packages listed.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'portfolio' && (
                  <div className="animate-fade-in">
                    {vendor.portfolio_photos && vendor.portfolio_photos.length > 0 ? (
                      <div className="columns-1 sm:columns-2 gap-6 space-y-6">
                        {vendor.portfolio_photos.map((photo, index) => (
                          <div key={index} className="break-inside-avoid rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md group relative">
                            <img
                              src={getImageUrl(photo)}
                              alt={`Portfolio ${index + 1}`}
                              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Grid className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Portfolio Empty</h3>
                        <p className="text-gray-500 max-w-md mx-auto">This vendor hasn't uploaded any portfolio photos yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="animate-fade-in bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <ReviewInterface vendor={vendor} showSubmissionForm={true} maxReviews={10} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfileModal;