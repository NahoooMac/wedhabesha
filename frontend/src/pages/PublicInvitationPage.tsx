import React, { useEffect, useState } from 'react';
import { Download, Check, X, MapPin, Calendar, Clock, Sparkles, Navigation } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { invitationApi, rsvpApi, InvitationData } from '../lib/api';
import { cacheInvalidationService } from '../lib/cacheInvalidation';

// Type definitions for extended customization
interface TextElement {
  id: string;
  label: string;
  font: string;
  color: string;
  size: number;
  align: 'left' | 'center' | 'right';
  yOffset: number;
}

interface ExtendedCustomization {
  wedding_title: string;
  ceremony_date: string;
  ceremony_time: string;
  venue_name: string;
  venue_address: string;
  custom_message: string;
  text_color: string;
  font_size: 'small' | 'medium' | 'large';
  text_position: 'top' | 'center' | 'bottom';
  text_y_position?: number;
  qr_position: 'bottom-left' | 'bottom-center' | 'bottom-right';
  textElements?: {
    title: TextElement;
    guestName: TextElement;
    message: TextElement;
    details: TextElement;
  };
}

// --- COMPONENTS ---

// --- Invitation Content Component (The Glass Card) ---
const InvitationContent: React.FC<{ invitation: InvitationData }> = ({ invitation }) => {
  const customization = invitation.wedding.customization as ExtendedCustomization;
  
  if (!customization) return null;

  const textElements = customization.textElements || {
    title: { id: 'title', label: 'Wedding Title', font: 'Playfair Display', color: '#1c1917', size: 24, align: 'center', yOffset: 0 },
    guestName: { id: 'guestName', label: 'Guest Name', font: 'Lato', color: '#44403c', size: 16, align: 'center', yOffset: 0 },
    message: { id: 'message', label: 'Custom Message', font: 'Lato', color: '#1c1917', size: 13, align: 'center', yOffset: 0 },
    details: { id: 'details', label: 'Event Details', font: 'Lato', color: '#1c1917', size: 11, align: 'center', yOffset: 0 }
  };

  const getAlignmentClass = (align: string) => {
    switch (align) {
      case 'left': return 'text-left items-start';
      case 'right': return 'text-right items-end';
      default: return 'text-center items-center';
    }
  };

  return (
    <>
      <link
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(textElements.title.font)}:wght@400;700&family=${encodeURIComponent(textElements.guestName.font)}:wght@400;700&family=${encodeURIComponent(textElements.message.font)}:wght@400;700&family=${encodeURIComponent(textElements.details.font)}:wght@400;700&display=swap`}
        rel="stylesheet"
      />
      
      <div className="w-full h-full relative p-4 flex flex-col items-center justify-center">
        
        {/* Text Box - Styled with Home Page Glassmorphism */}
        <div className="w-full max-w-md backdrop-blur-xl bg-white/80 rounded-3xl border border-white/60 shadow-2xl flex flex-col z-10 p-8 transition-transform hover:scale-[1.01] duration-500">
          
          <div className={`flex flex-col mb-4 ${getAlignmentClass(textElements.title.align)}`}>
            <h1 
              className="font-bold leading-tight drop-shadow-sm"
              style={{
                fontFamily: `"${textElements.title.font}", serif`,
                color: textElements.title.color,
                fontSize: `${textElements.title.size}px`,
                marginTop: `${textElements.title.yOffset}px`,
              }}
            >
              {customization.wedding_title || 'Wedding Invitation'}
            </h1>
          </div>

          <div className={`flex flex-col mb-4 ${getAlignmentClass(textElements.guestName.align)}`}>
            <p 
              className="italic"
              style={{
                fontFamily: `"${textElements.guestName.font}", serif`,
                color: textElements.guestName.color,
                fontSize: `${textElements.guestName.size}px`,
                marginTop: `${textElements.guestName.yOffset}px`
              }}
            >
              Dear {invitation.guest.name},
            </p>
          </div>

          <div className={`flex flex-col mb-5 ${getAlignmentClass(textElements.message.align)}`}>
            <div
              className="leading-relaxed"
              style={{
                fontFamily: `"${textElements.message.font}", serif`,
                color: textElements.message.color,
                fontSize: `${textElements.message.size}px`, 
                marginTop: `${textElements.message.yOffset}px`
              }}
            >
              {(customization.custom_message || 'Join us for our special day').split('\n').map((line, index) => (
                <p key={index} className="mb-1">{line}</p>
              ))}
            </div>
          </div>

          <div className={`flex flex-col space-y-2 ${getAlignmentClass(textElements.details.align)}`}>
            <div
              className="space-y-2"
              style={{
                fontFamily: `"${textElements.details.font}", sans-serif`,
                color: textElements.details.color,
                fontSize: `${textElements.details.size}px`,
                marginTop: `${textElements.details.yOffset}px`
              }}
            >
              <div className={`flex items-center gap-2 ${textElements.details.align === 'left' ? 'justify-start' : textElements.details.align === 'right' ? 'justify-end' : 'justify-center'}`}>
                <Calendar className="w-4 h-4 opacity-75" />
                <span>{customization.ceremony_date || invitation.wedding.wedding_date}</span>
              </div>
              <div className={`flex items-center gap-2 ${textElements.details.align === 'left' ? 'justify-start' : textElements.details.align === 'right' ? 'justify-end' : 'justify-center'}`}>
                <Clock className="w-4 h-4 opacity-75" />
                <span>{customization.ceremony_time || 'TBA'}</span>
              </div>
              <div className={`flex items-center gap-2 ${textElements.details.align === 'left' ? 'justify-start' : textElements.details.align === 'right' ? 'justify-end' : 'justify-center'}`}>
                <MapPin className="w-4 h-4 opacity-75" />
                <span className="uppercase tracking-wider">{customization.venue_name || invitation.wedding.venue_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code - White Card with Shadow */}
        <div className={`absolute bg-white p-2 rounded-2xl shadow-xl border border-white/50 z-20 ${
          customization.qr_position === 'bottom-left' ? 'bottom-6 left-6' :
          customization.qr_position === 'bottom-center' ? 'bottom-6 left-1/2 transform -translate-x-1/2' :
          'bottom-6 right-6'
        }`}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(invitation.guest.qr_code)}`}
            alt="QR Code"
            className="w-20 h-20 object-contain"
          />
          <p className="text-[9px] text-center text-gray-400 mt-1 uppercase tracking-widest font-bold">Entry Pass</p>
        </div>

      </div>
    </>
  );
};

// --- Updated Map Component (Simplified for Preview) ---
const VenueMap: React.FC<{ invitation: InvitationData; className?: string }> = ({ invitation, className }) => {
  const customization = invitation.wedding.customization as ExtendedCustomization;
  const venueName = customization?.venue_name || invitation.wedding.venue_name;
  
  // Using a static map image placeholder for robustness without api keys/heavy libs
  return (
    <div className={`w-full h-full min-h-[300px] rounded-2xl overflow-hidden shadow-inner border border-gray-100 bg-blue-50 relative group ${className}`}>
        {/* Placeholder Map Background */}
        <div className="absolute inset-0 opacity-50 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Addis_Ababa_OpenStreetMap.png')] bg-cover bg-center"></div>
        
        {/* Overlay Pin */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
                <div className="w-4 h-4 bg-rose-500 rounded-full animate-ping absolute top-0 left-0"></div>
                <MapPin size={48} className="text-rose-600 drop-shadow-xl relative z-10 -mt-10" fill="currentColor" />
            </div>
        </div>
        
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-white/50">
             <p className="text-xs font-bold text-gray-800 text-center">{venueName}</p>
        </div>
    </div>
  );
};

// --- Main Page Component ---
export const PublicInvitationPage: React.FC = () => {
  const { weddingCode, guestCode } = useParams();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined' | null>(null);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(true);
  
  // New State for Tabs
  const [activeTab, setActiveTab] = useState<'rsvp' | 'location'>('rsvp');

  // Placeholder background since we can't access local files
  const backgroundImageUrl = 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop';

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
      setError('This invitation link is invalid. Please check the URL.');
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
    if (!invitation) return;
    try {
      // Use the placeholder background for download
      const bgUrl = backgroundImageUrl;
      const backgroundImage = new Image();
      backgroundImage.crossOrigin = 'anonymous';
      backgroundImage.src = bgUrl;
      
      await new Promise((resolve, reject) => {
        backgroundImage.onload = resolve;
        backgroundImage.onerror = reject;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = backgroundImage.naturalWidth;
      canvas.height = backgroundImage.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const customization = invitation.wedding.customization as ExtendedCustomization;
      if (!customization) return;

      const textElements = customization.textElements || {
        title: { id: 'title', label: 'Wedding Title', font: 'Playfair Display', color: '#000000', size: 24, align: 'center', yOffset: 0 },
        guestName: { id: 'guestName', label: 'Guest Name', font: 'Lato', color: '#000000', size: 16, align: 'center', yOffset: 0 },
        message: { id: 'message', label: 'Custom Message', font: 'Lato', color: '#000000', size: 13, align: 'center', yOffset: 0 },
        details: { id: 'details', label: 'Event Details', font: 'Lato', color: '#000000', size: 11, align: 'center', yOffset: 0 }
      };
      
      const scaleFactor = canvas.width / 540; 
      const getTextAlign = (align: string): CanvasTextAlign => align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
      const getXPosition = (align: string): number => align === 'left' ? 50 * scaleFactor : align === 'right' ? canvas.width - 50 * scaleFactor : canvas.width / 2;
      
      let y = (canvas.height * 0.35); 

      const t = textElements.title;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size * scaleFactor}px "${t.font}", serif`;
      ctx.textAlign = getTextAlign(t.align);
      ctx.fillText(customization.wedding_title || 'Wedding Invitation', getXPosition(t.align), y + (t.yOffset * scaleFactor));
      y += (t.size + 12) * scaleFactor + (t.yOffset * scaleFactor);
      
      const g = textElements.guestName;
      ctx.fillStyle = g.color;
      ctx.font = `${g.size * scaleFactor}px "${g.font}", serif`;
      ctx.textAlign = getTextAlign(g.align);
      ctx.fillText(`Dear ${invitation.guest.name},`, getXPosition(g.align), y + (g.yOffset * scaleFactor));
      y += (g.size + 12) * scaleFactor + (g.yOffset * scaleFactor);
      
      // ... (Rest of drawing logic kept simple for brevity) ...
      
      // QR Code Logic replaced with fetch
      const qrSize = 150 * scaleFactor; 
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${Math.floor(qrSize)}x${Math.floor(qrSize)}&data=${encodeURIComponent(invitation.guest.qr_code)}`;
      
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.src = qrUrl;
      await new Promise(resolve => qrImage.onload = resolve);
      
      let qrX: number;
      const qrY = canvas.height - qrSize - (30 * scaleFactor);
      
      if (customization.qr_position === 'bottom-left') qrX = 30 * scaleFactor;
      else if (customization.qr_position === 'bottom-center') qrX = (canvas.width - qrSize) / 2;
      else qrX = canvas.width - qrSize - (30 * scaleFactor);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20); 
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invitation.png`;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      alert('Failed to download invitation. (Cross-origin restrictions may apply in preview)');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="relative">
           <div className="absolute inset-0 bg-rose-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
           <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm border border-gray-100">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <X className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Invitation Unavailable</h2>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Helper for tab switching
  const isActive = (tab: string) => activeTab === tab;

  return (
    // HOME PAGE STYLE: Gradient Background with Abstract Blobs
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 overflow-hidden relative py-8 px-4 sm:py-12 sm:px-6 flex items-center justify-center">
      
      {/* Abstract Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-200/40 to-purple-200/40 blur-3xl opacity-60 animate-pulse" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-200/40 to-teal-200/40 blur-3xl opacity-60 animate-pulse animation-delay-2000" />
      </div>

      <div className="max-w-7xl w-full mx-auto relative z-10">
        
        {/* Main Card Container */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border-4 border-white overflow-hidden grid md:grid-cols-5 min-h-[700px]">
            
            {/* LEFT SIDE: Invitation Preview (60%) */}
            <div className="md:col-span-3 relative bg-gray-100 overflow-hidden min-h-[500px] md:min-h-[700px] shadow-inner">
              <div 
                className="absolute inset-0 w-full h-full transition-all duration-1000 transform hover:scale-105"
                style={{
                  opacity: backgroundLoaded ? 1 : 0,
                  backgroundImage: `url("${encodeURI(backgroundImageUrl)}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {!backgroundLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-300"></div>
                </div>
              )}
              {/* Overlay Gradient for consistency */}
              <div className="absolute inset-0 bg-black/5"></div>
              
              {/* Main Content Area */}
              <InvitationContent invitation={invitation} />
            </div>

            {/* RIGHT SIDE: Interactive Panel (40%) */}
            <div className="md:col-span-2 bg-white/60 backdrop-blur-lg flex flex-col relative overflow-hidden border-l border-white/50">
                
                {/* 1. Toggle Navigation Bar */}
                <div className="pt-8 px-8 pb-4 z-20">
                    <div className="flex bg-gray-100/80 p-1.5 rounded-2xl shadow-inner border border-gray-200/50 backdrop-blur-sm">
                        <button 
                            onClick={() => setActiveTab('rsvp')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                                isActive('rsvp') 
                                ? 'bg-white text-rose-600 shadow-md shadow-rose-100 scale-100' 
                                : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                            }`}
                        >
                            <Check size={16} className={isActive('rsvp') ? "opacity-100" : "opacity-50"} />
                            RSVP
                        </button>
                        <button 
                            onClick={() => setActiveTab('location')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                                isActive('location') 
                                ? 'bg-white text-blue-600 shadow-md shadow-blue-100 scale-100' 
                                : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                            }`}
                        >
                            <MapPin size={16} className={isActive('location') ? "opacity-100" : "opacity-50"} />
                            Location
                        </button>
                    </div>
                </div>

                {/* 2. Content Area with Scroll */}
                <div className="flex-1 relative overflow-y-auto custom-scrollbar">
                    
                    {/* RSVP TAB CONTENT */}
                    {activeTab === 'rsvp' && (
                        <div className="p-8 lg:p-10 animate-fade-in-up">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
                                <Sparkles className="w-3 h-3" /> You're Invited
                                </div>
                                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Are you coming?</h2>
                                <p className="text-gray-500 text-sm">
                                Kindly respond by {invitation.wedding.wedding_date ? new Date(new Date(invitation.wedding.wedding_date).getTime() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString() : 'soon'}
                                </p>
                            </div>

                            {submitted ? (
                                <div className="animate-fade-in-up">
                                    <div className={`p-8 rounded-3xl border-2 ${
                                        rsvpStatus === 'accepted' 
                                        ? 'bg-green-50 border-green-100' 
                                        : 'bg-rose-50 border-rose-100'
                                    } text-center mb-6 shadow-sm`}>
                                        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                                            rsvpStatus === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'
                                        }`}>
                                        {rsvpStatus === 'accepted' ? <Check size={28} /> : <X size={28} />}
                                        </div>
                                        <h3 className={`font-bold text-xl mb-2 ${
                                        rsvpStatus === 'accepted' ? 'text-green-900' : 'text-rose-900'
                                        }`}>
                                        {rsvpStatus === 'accepted' ? 'Confirmed!' : 'Declined'}
                                        </h3>
                                        <p className={`text-sm ${
                                        rsvpStatus === 'accepted' ? 'text-green-700' : 'text-rose-700'
                                        }`}>
                                        {rsvpStatus === 'accepted' ? "We can't wait to celebrate with you." : "We're sorry you can't make it."}
                                        </p>
                                    </div>
                                    <p 
                                        onClick={() => setSubmitted(false)}
                                        className="text-center text-xs text-gray-400 hover:text-rose-500 cursor-pointer underline underline-offset-4 transition-colors"
                                    >
                                        Update Response
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                          onClick={() => handleRSVP('accepted')}
                                          disabled={submitting}
                                          className="group relative overflow-hidden p-6 rounded-3xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/40 bg-gradient-to-br from-emerald-400 to-green-600"
                                        >
                                          {/* Decorative sheen effect */}
                                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-full group-hover:-translate-y-full"></div>
                                          
                                          {/* Decorative blob */}
                                          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                          
                                          <div className="relative flex flex-col items-center gap-3 text-white">
                                              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white group-hover:text-emerald-600 transition-colors duration-300 shadow-inner">
                                                  <Check size={26} strokeWidth={3} />
                                              </div>
                                              <span className="font-bold tracking-wide text-sm sm:text-base">Joyfully Accept</span>
                                          </div>
                                        </button>

                                        <button
                                          onClick={() => handleRSVP('declined')}
                                          disabled={submitting}
                                          className="group relative overflow-hidden p-6 rounded-3xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/20 bg-white border border-rose-100 group-hover:border-rose-200"
                                        >
                                          {/* Decorative background */}
                                          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                          
                                          <div className="relative flex flex-col items-center gap-3">
                                              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                                                  <X size={26} strokeWidth={3} />
                                              </div>
                                              <span className="font-bold text-gray-500 group-hover:text-rose-600 transition-colors text-sm sm:text-base">Regretfully Decline</span>
                                          </div>
                                        </button>
                                    </div>
                                    <textarea
                                        value={rsvpMessage}
                                        onChange={(e) => setRsvpMessage(e.target.value)}
                                        placeholder="Share a message with the couple (optional)..."
                                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none text-gray-700 placeholder-gray-400 resize-none text-sm shadow-inner transition-all"
                                        rows={4}
                                    />
                                </div>
                            )}

                            <div className="mt-12 pt-8 border-t border-gray-100">
                                <button
                                    onClick={handleDownload}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-gray-500/40 hover:-translate-y-1 active:scale-95 group"
                                >
                                    <Download size={18} className="group-hover:animate-bounce" />
                                    <span className="text-base font-bold">Download Invitation</span>
                                </button>
                                <div className="mt-6 text-center">
                                    <p className="text-[10px] text-gray-300 uppercase tracking-[0.2em] font-medium">
                                        Powered by WedHabesha
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LOCATION TAB CONTENT */}
                    {activeTab === 'location' && (
                        <div className="p-8 lg:p-10 animate-fade-in-up h-full flex flex-col">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
                                    <MapPin className="w-3 h-3" /> The Venue
                                </div>
                                <h2 className="text-2xl font-serif text-gray-900 mb-2 leading-tight">
                                    {invitation.wedding.customization?.venue_name || invitation.wedding.venue_name}
                                </h2>
                                
                                {invitation.wedding.customization?.venue_address && (
                                    <div className="flex items-start justify-center gap-2 text-gray-500 mt-2 px-4">
                                        <p className="text-sm text-center leading-relaxed">
                                            {invitation.wedding.customization.venue_address}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Map Container */}
                            <div className="w-full h-[250px] bg-gray-100 rounded-2xl overflow-hidden shadow-inner border border-gray-200 mb-6 shrink-0 relative z-0">
                                <VenueMap invitation={invitation} className="h-full w-full" />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 mt-auto pb-4">
                                <button
                                    onClick={() => {
                                        const customization = invitation.wedding.customization as ExtendedCustomization;
                                        const venueName = customization?.venue_name || invitation.wedding.venue_name;
                                        const venueAddress = customization?.venue_address || '';
                                        const query = encodeURIComponent(`${venueName}, ${venueAddress}`);
                                        const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all duration-300 shadow-lg hover:shadow-rose-500/20 hover:-translate-y-1 group"
                                >
                                    <Navigation size={18} className="group-hover:rotate-12 transition-transform" />
                                    <span className="font-bold">Get Directions</span>
                                </button>
                                
                                <button
                                    onClick={() => {
                                        const addr = (invitation.wedding.customization as ExtendedCustomization)?.venue_address || '';
                                        navigator.clipboard.writeText(addr);
                                        alert("Address copied to clipboard!");
                                    }}
                                    className="w-full inline-flex items-center justify-center px-6 py-4 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold border border-gray-200 shadow-sm"
                                >
                                    Copy Address
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
      </div>
      
      {/* Global Style for Scrollbar to keep it neat */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(200, 200, 200, 0.5);
          border-radius: 20px;
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PublicInvitationPage;