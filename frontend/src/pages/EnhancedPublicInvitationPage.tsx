import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Calendar, MapPin, Phone, Mail, CheckCircle, Clock, Users, Gift, Eye, X, ChevronDown, Navigation } from 'lucide-react';
import { InvitationEngine } from '../components/invitations/InvitationEngine';

interface Guest {
  id: number;
  name: string;
  qr_code: string;
  rsvp_status: 'pending' | 'accepted' | 'declined';
  rsvp_message?: string;
  rsvp_responded_at?: string;
}

interface Wedding {
  id: number;
  wedding_code: string;
  wedding_date: string;
  venue_name: string;
  venue_address: string;
  template_id: string;
  customization: {
    wedding_title: string;
    ceremony_date: string;
    ceremony_time: string;
    venue_name: string;
    venue_address: string;
    custom_message: string;
  };
}

interface InvitationData {
  guest: Guest;
  wedding: Wedding;
}

const EnhancedPublicInvitationPage: React.FC = () => {
  const { weddingCode, guestCode } = useParams<{ weddingCode: string; guestCode: string }>();
  const navigate = useNavigate();
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined' | null>(null);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFullInvitation, setShowFullInvitation] = useState(true);
  const [activeTab, setActiveTab] = useState<'rsvp' | 'location'>('rsvp');

  useEffect(() => {
    fetchInvitationData();
  }, [weddingCode, guestCode]);

  const fetchInvitationData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invitations/${weddingCode}/${guestCode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Invitation not found. Please check your invitation link.');
        } else {
          setError('Failed to load invitation. Please try again later.');
        }
        return;
      }

      const data = await response.json();
      setInvitationData(data);
      setRsvpStatus(data.guest.rsvp_status === 'pending' ? null : data.guest.rsvp_status);
      setRsvpMessage(data.guest.rsvp_message || '');
    } catch (err) {
      setError('Failed to load invitation. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRsvpSubmit = async (status: 'accepted' | 'declined') => {
    if (!invitationData) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/guests/${invitationData.guest.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status,
          message: rsvpMessage.trim() || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit RSVP');
      }

      // Update local state
      setInvitationData(prev => prev ? {
        ...prev,
        guest: {
          ...prev.guest,
          rsvp_status: status,
          rsvp_message: rsvpMessage.trim() || undefined,
          rsvp_responded_at: new Date().toISOString()
        }
      } : null);

      setRsvpStatus(status);
    } catch (err) {
      alert('Failed to submit RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invitation Not Found</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const { guest, wedding } = invitationData;
  const hasResponded = guest.rsvp_status !== 'pending';

  // Prepare data for the invitation engine
  const invitationEngineData = {
    guest_name: guest.name,
    wedding_title: wedding.customization.wedding_title,
    ceremony_date: wedding.customization.ceremony_date,
    ceremony_time: wedding.customization.ceremony_time,
    venue_name: wedding.customization.venue_name,
    venue_address: wedding.customization.venue_address,
    custom_message: wedding.customization.custom_message,
    qr_code: guest.qr_code
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden grid grid-cols-5 min-h-[800px]">
            
            {/* Left Side: Full Invitation Display */}
            <div className="col-span-3 relative">
              <div className="w-full h-full">
                <InvitationEngine
                  templateId={wedding.template_id}
                  data={invitationEngineData}
                />
              </div>
            </div>

            {/* Right Side: RSVP & Location Tabs */}
            <div className="col-span-2 bg-white/60 backdrop-blur-lg flex flex-col">
              
              {/* Tab Navigation */}
              <div className="p-8 pb-4">
                <div className="flex bg-gray-100/80 p-1.5 rounded-2xl shadow-inner border border-gray-200/50">
                  <button 
                    onClick={() => setActiveTab('rsvp')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeTab === 'rsvp' 
                        ? 'bg-white text-rose-600 shadow-md shadow-rose-100' 
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  >
                    <CheckCircle size={16} />
                    RSVP
                  </button>
                  <button 
                    onClick={() => setActiveTab('location')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeTab === 'location' 
                        ? 'bg-white text-blue-600 shadow-md shadow-blue-100' 
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  >
                    <MapPin size={16} />
                    Location
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-8 pt-0">
                {activeTab === 'rsvp' ? (
                  <RSVPContent 
                    guest={guest}
                    wedding={wedding}
                    hasResponded={hasResponded}
                    rsvpStatus={rsvpStatus}
                    rsvpMessage={rsvpMessage}
                    setRsvpMessage={setRsvpMessage}
                    handleRsvpSubmit={handleRsvpSubmit}
                    submitting={submitting}
                  />
                ) : (
                  <LocationContent wedding={wedding} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="max-w-md mx-auto bg-white shadow-2xl min-h-screen relative">
          
          {/* Full Invitation Display */}
          {showFullInvitation && (
            <div className="relative">
              <button
                onClick={() => setShowFullInvitation(false)}
                className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white text-slate-700 p-2 rounded-full shadow-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-full" style={{ aspectRatio: '5/7' }}>
                <InvitationEngine
                  templateId={wedding.template_id}
                  data={invitationEngineData}
                />
              </div>
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                  Scroll for RSVP
                </p>
              </div>
            </div>
          )}

          {/* Mobile RSVP Section */}
          <div className="p-6 space-y-6">
            
            {/* Compact Invitation Preview */}
            {!showFullInvitation && (
              <button
                onClick={() => setShowFullInvitation(true)}
                className="w-full bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl p-4 text-left hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 mb-1">{wedding.customization.wedding_title}</h2>
                    <p className="text-sm text-slate-600">{wedding.customization.ceremony_date} • {wedding.customization.ceremony_time}</p>
                  </div>
                  <Eye className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                </div>
              </button>
            )}

            {/* Mobile Tab Navigation */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('rsvp')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'rsvp' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                RSVP
              </button>
              <button 
                onClick={() => setActiveTab('location')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'location' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Location
              </button>
            </div>

            {/* Mobile Tab Content */}
            {activeTab === 'rsvp' ? (
              <RSVPContent 
                guest={guest}
                wedding={wedding}
                hasResponded={hasResponded}
                rsvpStatus={rsvpStatus}
                rsvpMessage={rsvpMessage}
                setRsvpMessage={setRsvpMessage}
                handleRsvpSubmit={handleRsvpSubmit}
                submitting={submitting}
              />
            ) : (
              <LocationContent wedding={wedding} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// RSVP Content Component
const RSVPContent: React.FC<{
  guest: Guest;
  wedding: Wedding;
  hasResponded: boolean;
  rsvpStatus: 'accepted' | 'declined' | null;
  rsvpMessage: string;
  setRsvpMessage: (message: string) => void;
  handleRsvpSubmit: (status: 'accepted' | 'declined') => void;
  submitting: boolean;
}> = ({ guest, wedding, hasResponded, rsvpStatus, rsvpMessage, setRsvpMessage, handleRsvpSubmit, submitting }) => {
  
  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 fill-current" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Hello, {guest.name}!
        </h1>
        <p className="text-slate-600">
          You're invited to celebrate with us
        </p>
      </div>

      {/* Event Details */}
      <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-rose-500 mt-1" />
          <div>
            <p className="font-semibold text-slate-900">{wedding.customization.ceremony_date}</p>
            <p className="text-sm text-slate-600">{wedding.customization.ceremony_time}</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-rose-500 mt-1" />
          <div>
            <p className="font-semibold text-slate-900">{wedding.customization.venue_name}</p>
            <p className="text-sm text-slate-600">{wedding.customization.venue_address}</p>
          </div>
        </div>
      </div>

      {/* RSVP Status */}
      {hasResponded ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-900 mb-2">
            RSVP Confirmed
          </h3>
          <p className="text-green-700 mb-2">
            You responded: <span className="font-semibold">
              {guest.rsvp_status === 'accepted' ? 'Attending' : 'Cannot Attend'}
            </span>
          </p>
          {guest.rsvp_message && (
            <p className="text-sm text-green-600 italic">
              "{guest.rsvp_message}"
            </p>
          )}
          <p className="text-xs text-green-500 mt-3">
            Responded on {new Date(guest.rsvp_responded_at!).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 text-center">
            Will you be joining us?
          </h3>
          
          {/* RSVP Options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRsvpSubmit('accepted')}
              disabled={submitting}
              className="p-4 rounded-xl border-2 border-green-200 hover:border-green-500 hover:bg-green-50 text-green-700 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="font-semibold">Yes, I'll be there!</p>
            </button>
            
            <button
              onClick={() => handleRsvpSubmit('declined')}
              disabled={submitting}
              className="p-4 rounded-xl border-2 border-red-200 hover:border-red-500 hover:bg-red-50 text-red-700 transition-all disabled:opacity-50"
            >
              <X className="w-6 h-6 mx-auto mb-2" />
              <p className="font-semibold">Sorry, can't make it</p>
            </button>
          </div>

          {/* Message Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Add a message (optional)
            </label>
            <textarea
              value={rsvpMessage}
              onChange={(e) => setRsvpMessage(e.target.value)}
              placeholder="Looking forward to celebrating with you!"
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* QR Code */}
      {guest.qr_code && (
        <div className="bg-slate-50 rounded-2xl p-6 text-center">
          <h4 className="font-semibold text-slate-900 mb-3">Your Check-in Code</h4>
          <div className="bg-white p-4 rounded-xl inline-block shadow-sm">
            <img src={guest.qr_code} alt="QR Code" className="w-32 h-32 mx-auto" />
          </div>
          <p className="text-sm text-slate-600 mt-3">
            Show this code at the venue for quick check-in
          </p>
        </div>
      )}
    </div>
  );
};

// Location Content Component
const LocationContent: React.FC<{ wedding: Wedding }> = ({ wedding }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
          <MapPin className="w-3 h-3" /> The Venue
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {wedding.customization.venue_name}
        </h2>
        <p className="text-slate-600">
          {wedding.customization.venue_address}
        </p>
      </div>

      {/* Map Placeholder */}
      <div className="w-full h-64 bg-gray-100 rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-rose-500 mx-auto mb-2" />
            <p className="text-slate-600 font-semibold">{wedding.customization.venue_name}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => {
            const query = encodeURIComponent(`${wedding.customization.venue_name}, ${wedding.customization.venue_address}`);
            const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
            window.open(url, '_blank');
          }}
          className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
        >
          <Navigation className="w-5 h-5" />
          Get Directions
        </button>
        
        <button
          onClick={() => {
            navigator.clipboard.writeText(wedding.customization.venue_address);
            alert("Address copied to clipboard!");
          }}
          className="w-full py-4 bg-white border border-gray-200 text-slate-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
        >
          Copy Address
        </button>
      </div>
    </div>
  );
};

export default EnhancedPublicInvitationPage;