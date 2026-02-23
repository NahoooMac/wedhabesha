import React, { useEffect, useState, useRef } from 'react';
import { Download, Check, X, MapPin, Navigation, Copy, Heart, Calendar } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { invitationApi, rsvpApi, InvitationData } from '../lib/api';
import { cacheInvalidationService } from '../lib/cacheInvalidation';
import { InvitationEngine, TEMPLATE_METADATA } from '../components/invitations/InvitationEngine';
import html2canvas from 'html2canvas';

// --- HELPERS ---

// Helper to generate Google Calendar event URL
function generateGoogleCalendarUrl(invitation: InvitationData): string {
  const customization = invitation.wedding.customization as any;
  const weddingTitle = customization?.wedding_title || 'Wedding Invitation';
  const ceremonyDate = customization?.ceremony_date || invitation.wedding.wedding_date;
  const ceremonyTime = customization?.ceremony_time || '4:00 PM';
  const venueName = customization?.venue_name || invitation.wedding.venue_name;
  const venueAddress = customization?.venue_address || invitation.wedding.venue_address || '';
  
  // Parse date and time
  const dateObj = new Date(ceremonyDate);
  const [time, period] = ceremonyTime.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  dateObj.setHours(hours, minutes || 0, 0, 0);
  
  // Format start time (YYYYMMDDTHHMMSS)
  const startTime = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // End time (assume 4 hours duration)
  const endDate = new Date(dateObj.getTime() + 4 * 60 * 60 * 1000);
  const endTime = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Build Google Calendar URL
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: weddingTitle,
    dates: `${startTime}/${endTime}`,
    details: `You are invited to celebrate ${weddingTitle}`,
    location: `${venueName}, ${venueAddress}`,
    trp: 'false'
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Helper to draw rounded rectangles on canvas (for image generation)
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// --- COMPONENTS ---

// 1. Invitation Preview Component
const InvitationContent: React.FC<{ invitation: InvitationData; invitationRef?: React.RefObject<HTMLDivElement | null> }> = ({ invitation, invitationRef }) => {
  const customization = invitation.wedding.customization as any;
  const templateId = invitation.wedding.template_id || 'elegantgold';
  const templateMeta = TEMPLATE_METADATA.find(t => t.id === templateId);
  const aspectRatio = templateMeta?.aspectRatio || '5/7';
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(invitation.guest.qr_code)}`;
  const weddingTitle = customization?.wedding_title || 'Wedding Invitation';
  const names = weddingTitle.split('&').map((n: string) => n.trim());
  
  const invitationData = {
    bride: names[0] || 'Bride',
    groom: names[1] || 'Groom',
    ceremony_date: customization?.ceremony_date || invitation.wedding.wedding_date,
    ceremony_time: customization?.ceremony_time || '4:00 PM',
    venue_name: customization?.venue_name || invitation.wedding.venue_name,
    venue_address: customization?.venue_address || invitation.wedding.venue_address || '',
    custom_message: customization?.custom_message || 'Join us for our special day',
    guest_name: invitation.guest.name,
    qr_code: qrCodeUrl,
    imageUrl: invitation.wedding.invitation_image_url 
      ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${invitation.wedding.invitation_image_url}`
      : undefined,
    imageSettings: invitation.wedding.image_settings || { x: 0, y: 0, scale: 1 },
  };
  
  return (
      // Mobile: Padding reduced to 4. Desktop: Padding 6.
      <div className="w-full h-full flex items-center justify-center bg-transparent p-4 md:p-6">
        <div 
          ref={invitationRef}
          className="relative w-full max-w-[380px] md:max-w-[420px] shadow-[0_20px_60px_-15px_rgba(244,63,94,0.15)] rounded-sm overflow-hidden bg-white ring-1 ring-rose-100/50"
          style={{ 
            aspectRatio: aspectRatio,
            // CRITICAL FIX: On mobile, let height be auto so it doesn't squash. 
            // On desktop, it's constrained by the parent grid.
           
            maxHeight: '100%', 
            containerType: 'size'
          }}
        >
          <div className="relative w-full h-full">
             <InvitationEngine templateId={templateId} data={invitationData} />
          </div>
        </div>
      </div>
  );
};

// 2. Map Component
const VenueMap: React.FC<{ invitation: InvitationData; className?: string }> = ({ invitation, className }) => {
  const customization = invitation.wedding.customization as any;
  const venueName = customization?.venue_name || invitation.wedding.venue_name;
  const venueAddress = customization?.venue_address || invitation.wedding.venue_address || '';
  
  const [mapUrl, setMapUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setLoading(true);
        const query = `${venueName}, ${venueAddress}`;
        // Using OpenStreetMap Nominatim for geocoding (Free, no API key required for low volume)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          {
            headers: {
              'User-Agent': 'WedHabesha-Wedding-Platform'
            }
          }
        );
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          // Create embed URL for OpenStreetMap
          const staticMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lon)-0.01},${parseFloat(lat)-0.01},${parseFloat(lon)+0.01},${parseFloat(lat)+0.01}&layer=mapnik&marker=${lat},${lon}`;
          setMapUrl(staticMapUrl);
        }
      } catch (error) {
        console.error('Failed to fetch location:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (venueName || venueAddress) {
      fetchLocation();
    }
  }, [venueName, venueAddress]);
  
  return (
    <div className={`w-full h-full min-h-[250px] rounded-3xl overflow-hidden shadow-sm border border-rose-100 bg-white relative group ${className}`}>
        {loading ? (
          // Loading state
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
              <p className="text-sm text-rose-600 font-medium">Locating venue...</p>
            </div>
          </div>
        ) : mapUrl ? (
          // Map iframe
          <>
            <iframe
              src={mapUrl}
              className="absolute inset-0 w-full h-full"
              style={{ border: 0 }}
              loading="lazy"
              title="Venue Location Map"
            />
            {/* Location Label Overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/50 pointer-events-none">
              <p className="text-xs font-bold text-gray-800 text-center flex items-center justify-center gap-2 uppercase tracking-wider">
                <MapPin size={12} className="text-rose-500" />
                {venueName}
              </p>
            </div>
          </>
        ) : (
          // Fallback when no map data (Static Image)
          <>
            <div className="absolute inset-0 opacity-80 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Addis_Ababa_OpenStreetMap.png')] bg-cover bg-center grayscale contrast-[0.9] brightness-110 transition-transform duration-700 group-hover:scale-105"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/30 to-rose-50/10"></div>
            
            <div className="absolute inset-0 flex items-center justify-center pb-8">
              <div className="relative group-hover:-translate-y-2 transition-transform duration-300">
                <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping absolute top-0 left-0 opacity-20"></div>
                <div className="bg-white p-3 rounded-full shadow-[0_8px_30px_rgba(244,63,94,0.2)] border border-rose-50 text-rose-500">
                  <MapPin size={28} fill="currentColor" />
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white/50">
              <p className="text-xs font-bold text-gray-800 text-center flex items-center justify-center gap-2 uppercase tracking-wider">
                <MapPin size={12} className="text-rose-500" />
                {venueName}
              </p>
            </div>
          </>
        )}
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

export const PublicInvitationPage: React.FC = () => {
  const { weddingCode, guestCode } = useParams();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined' | null>(null);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'rsvp' | 'location'>('rsvp');
  
  const invitationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInvitation();
  }, []);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invitationApi.getInvitationData(weddingCode!, guestCode!);
      setInvitation(data);
      if (data.guest.rsvp_status !== 'pending') {
        setRsvpStatus(data.guest.rsvp_status as 'accepted' | 'declined');
        setRsvpMessage(data.guest.rsvp_message || '');
        setSubmitted(true);
      }
    } catch (err) {
      setError('This invitation link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (status: 'accepted' | 'declined') => {
    try {
      setSubmitting(true);
      let response;
      if (submitted) {
        response = await rsvpApi.updateRSVP(weddingCode!, guestCode!, status, rsvpMessage);
      } else {
        response = await rsvpApi.submitRSVP(weddingCode!, guestCode!, status, rsvpMessage);
      }
      setRsvpStatus(status);
      setSubmitted(true);
      
      if (response.wedding_id) {
        await cacheInvalidationService.handleRSVPUpdate(response.wedding_id);
      }
    } catch (err) {
      alert('Failed to submit RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

const handleDownload = async () => {
    if (!invitation || !invitationRef.current) return;

    try {
      setIsDownloading(true);

      const invitationElement = invitationRef.current;

      // FIX 1: Add 'windowWidth' to force a desktop-size capture 
      // This prevents the image from being squashed if user is on mobile
      const canvas = await html2canvas(invitationElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const invitationWidth = canvas.width;
      const invitationHeight = canvas.height;

      // CONFIGURATION
      const borderThickness = 10; 
      const qrSize = 150; 
      const qrPadding = 10; 
      const qrBoxSize = qrSize + (qrPadding * 2); 
      const gapBetweenCardAndQR = -2; 

      const finalWidth = invitationWidth + (borderThickness * 2);
      const finalHeight = invitationHeight + (borderThickness * 2) + gapBetweenCardAndQR + qrBoxSize;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = finalWidth;
      finalCanvas.height = finalHeight;
      const ctx = finalCanvas.getContext('2d');

      if (!ctx) return;

      // --- DRAWING ---
      ctx.clearRect(0, 0, finalWidth, finalHeight);

      // 1. Draw Background
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 0, 0, finalWidth, invitationHeight + (borderThickness * 2), 10);
      ctx.fill();

      // FIX 2: Explicitly state the width and height in drawImage
      // This prevents the browser from guessing dimensions and stretching it
      ctx.drawImage(
          canvas, 
          borderThickness, 
          borderThickness, 
          invitationWidth,   // Force Width
          invitationHeight   // Force Height
      );

      // 3. Generate QR Code
      const qrFetchSize = 300; 
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrFetchSize}x${qrFetchSize}&data=${encodeURIComponent(invitation.guest.qr_code)}`;

      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        qrImage.onload = () => {
          const qrBoxX = (finalWidth - qrBoxSize) / 2;
          const qrBoxY = invitationHeight + (borderThickness * 2) + gapBetweenCardAndQR;

          // Draw QR Container
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 0);
          ctx.fill();

          // Draw QR Code
          ctx.drawImage(qrImage, qrBoxX + qrPadding, qrBoxY + qrPadding, qrSize, qrSize);
          resolve(true);
        };
        qrImage.onerror = reject;
        qrImage.src = qrCodeUrl;
      });

      // Convert and Download
      finalCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const guestName = invitation.guest.name.replace(/\s+/g, '_');
        link.download = `invitation_${guestName}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);

    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download invitation. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };
  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="relative">
           <div className="absolute inset-0 bg-rose-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
           <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm border border-rose-100">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <X className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Invitation Unavailable</h2>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    // PAGE CONTAINER: Gradient Background matching WedHabesha brand
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 via-white to-purple-50/50 font-sans selection:bg-rose-100 selection:text-rose-600 flex items-center justify-center md:p-4">
      
      {/* MAIN LAYOUT CONTAINER
         - Mobile: Auto height (allows scrolling), flex-column stack.
         - Desktop: Fixed height (85vh), Grid layout.
      */}
      <div className="w-full max-w-6xl h-auto md:h-[85vh] bg-white md:rounded-[2rem] shadow-none md:shadow-2xl md:shadow-rose-900/5 md:border md:border-white overflow-hidden flex flex-col md:grid md:grid-cols-12 relative">
            
            {/* --- LEFT SIDE: Invitation Preview (7 Cols) --- */}
            <div className="w-full md:col-span-7 bg-white relative flex flex-col justify-center items-center overflow-hidden md:border-r border-gray-50 min-h-[60vh] md:min-h-0 pt-8 md:pt-0">
                
                {/* Brand Header */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10 bg-gradient-to-b from-white via-white/80 to-transparent">
                    <div className="flex items-center gap-2">
                         <div className="h-2 w-2 bg-rose-500 rounded-full animate-pulse"></div>
                         <span className="text-sm font-bold tracking-tight text-gray-900">WedHabesha</span>
                    </div>
                    {invitation.wedding.wedding_date && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 rounded-full border border-rose-100">
                             <Calendar size={12} className="text-rose-500" />
                             <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">
                                {new Date(invitation.wedding.wedding_date).toLocaleDateString()}
                             </span>
                        </div>
                    )}
                </div>

                {/* Decorative Background Blob */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-100/30 rounded-full blur-[80px] pointer-events-none"></div>

                {/* The Invitation Component */}
                <div className="relative z-0 w-full h-full flex items-center justify-center pt-16 pb-8 px-4">
                    <InvitationContent invitation={invitation} invitationRef={invitationRef} />
                </div>
            </div>

            {/* --- RIGHT SIDE: Interactive Panel (5 Cols) --- */}
            {/* Mobile: rounded-t-[2.5rem] to create a "Sheet" effect that slides over.
               Desktop: Full height, flat corners.
            */}
            <div className="w-full md:col-span-5 bg-white flex flex-col relative z-20 h-auto md:h-full rounded-t-[2.5rem] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none -mt-6 md:mt-0 border-t border-gray-50 md:border-t-0">
                
                {/* Mobile Drag Handle (Visual Cue) */}
                <div className="md:hidden w-full flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 bg-gray-100 rounded-full"></div>
                </div>

                {/* 1. Tabs Navigation */}
                <div className="pt-4 md:pt-8 px-6 md:px-8 pb-4 shrink-0">
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                        <button 
                            onClick={() => setActiveTab('rsvp')}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                                activeTab === 'rsvp'
                                ? 'bg-white text-rose-500 shadow-sm ring-1 ring-rose-100' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Check size={14} strokeWidth={3} /> RSVP
                        </button>
                        <button 
                            onClick={() => setActiveTab('location')}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                                activeTab === 'location'
                                ? 'bg-white text-purple-600 shadow-sm ring-1 ring-purple-100' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <MapPin size={14} strokeWidth={3} /> Location
                        </button>
                    </div>
                </div>

                {/* 2. Scrollable Content Area */}
                <div className="flex-1 px-6 md:px-8 pb-8 custom-scrollbar">
                    
                    {/* RSVP CONTENT */}
                    {activeTab === 'rsvp' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pt-2">
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-2xl text-gray-900 tracking-tight">
                                    Are you attending?
                                </h3>
                                <p className="text-xs text-rose-500 font-semibold uppercase tracking-wider bg-rose-50 py-1.5 px-3 rounded-full inline-block">
                                  Response requested by {invitation.wedding.wedding_date ? new Date(new Date(invitation.wedding.wedding_date).getTime() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString() : 'soon'}
                                </p>
                            </div>

                            {submitted ? (
                                <div className="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-8 text-center border border-rose-100 space-y-4">
                                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 shadow-sm ${
                                        rsvpStatus === 'accepted' ? 'bg-rose-500 text-white' : 'bg-white border border-gray-200 text-gray-400'
                                    }`}>
                                        {rsvpStatus === 'accepted' ? <Heart size={20} fill="currentColor" /> : <X size={20} />}
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-lg">
                                        {rsvpStatus === 'accepted' ? 'See you there!' : 'Response Sent'}
                                    </h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {rsvpStatus === 'accepted' ? 'Get ready for a wonderful celebration.' : 'Thank you for letting us know.'}
                                    </p>
                                    
                                    {rsvpStatus === 'accepted' && (
                                        <button
                                            onClick={() => window.open(generateGoogleCalendarUrl(invitation), '_blank')}
                                            className="w-full py-3 px-4 bg-white border-2 border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm flex items-center justify-center gap-2 mt-4"
                                        >
                                            <Calendar size={16} />
                                            Schedule on Google Calendar
                                        </button>
                                    )}
                                    
                                    <button onClick={() => setSubmitted(false)} className="text-xs font-bold text-rose-400 underline decoration-rose-200 underline-offset-4 hover:text-rose-600 mt-2">
                                        Edit Response
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                          onClick={() => handleRSVP('accepted')}
                                          disabled={submitting}
                                          className="group relative p-4 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200 hover:bg-rose-600 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Check size={20} strokeWidth={3} />
                                                <span className="text-xs font-bold uppercase tracking-wider">Accept</span>
                                            </div>
                                        </button>

                                        <button
                                          onClick={() => handleRSVP('declined')}
                                          disabled={submitting}
                                          className="group relative p-4 rounded-2xl bg-white border border-gray-200 text-gray-500 shadow-sm hover:border-gray-300 hover:text-gray-800 transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <X size={20} strokeWidth={3} />
                                                <span className="text-xs font-bold uppercase tracking-wider">Decline</span>
                                            </div>
                                        </button>
                                    </div>
                                    <textarea
                                        value={rsvpMessage}
                                        onChange={(e) => setRsvpMessage(e.target.value)}
                                        placeholder="Write a message to the couple..."
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-200 focus:bg-white transition-all resize-none outline-none"
                                        rows={3}
                                    />
                                </div>
                            )}

                            {/* Footer / Download */}
                            <div className="pt-6 border-t border-gray-50">
                                <button
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl text-sm font-bold tracking-wide hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isDownloading ? <span className="animate-pulse">Processing...</span> : <><Download size={18} /> Save Invitation</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* LOCATION CONTENT */}
                    {activeTab === 'location' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pt-2 pb-8 h-full flex flex-col">
                            <div className="text-center px-4">
                                <h3 className="font-bold text-xl text-gray-900 leading-tight">
                                    {invitation.wedding.customization?.venue_name || invitation.wedding.venue_name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    {invitation.wedding.customization?.venue_address}
                                </p>
                            </div>

                            <div className="flex-1 min-h-[200px] w-full shadow-sm rounded-3xl overflow-hidden border border-gray-100">
                                <VenueMap invitation={invitation} className="h-full w-full" />
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                                <button
                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(invitation.wedding.customization?.venue_name || '')}`, '_blank')}
                                    className="py-3 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-purple-700 shadow-md shadow-purple-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Navigation size={14} /> Directions
                                </button>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(invitation.wedding.customization?.venue_address || ''); alert("Copied!"); }}
                                    className="py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Copy size={14} /> Copy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
      </div>
      
      {/* Scrollbar Styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #fce7f3; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #fbcfe8; }
      `}</style>
    </div>
  );
};

export default PublicInvitationPage;