import React, { useState } from 'react';
import { MapPin, Calendar, Clock, Phone, User, Users, MessageSquare, Check, Send } from 'lucide-react';
import { RSVPTemplate as TemplateType } from './TemplateGallery';

interface RSVPFormData {
  guestName: string;
  phoneNumber: string;
  attendance: 'yes' | 'no' | '';
  numberOfGuests: number;
  message: string;
}

interface RSVPTemplateProps {
  template: TemplateType;
  weddingData: {
    coupleName: string;
    groomName: string;
    brideName: string;
    weddingDate: string;
    weddingTime: string;
    venue: string;
    venueAddress: string;
    mapUrl?: string;
    coverImage?: string;
  };
  onSubmit: (data: RSVPFormData) => Promise<void>;
}

const RSVPTemplate: React.FC<RSVPTemplateProps> = ({ template, weddingData, onSubmit }) => {
  const [formData, setFormData] = useState<RSVPFormData>({
    guestName: '',
    phoneNumber: '',
    attendance: '',
    numberOfGuests: 1,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.guestName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }
    if (!formData.attendance) {
      setError('Please select your attendance');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit RSVP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppConfirmation = () => {
    const message = `Hello! I've confirmed my RSVP for ${weddingData.coupleName}'s wedding on ${weddingData.weddingDate}. ${formData.attendance === 'yes' ? `I will be attending with ${formData.numberOfGuests} guest(s).` : 'Unfortunately, I cannot attend.'}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Apply template styles
  const styles = {
    primary: template.colors.primary,
    secondary: template.colors.secondary,
    accent: template.colors.accent,
    background: template.colors.background,
    headingFont: template.fonts.heading,
    bodyFont: template.fonts.body
  };

  if (isSubmitted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          backgroundColor: styles.background,
          fontFamily: styles.bodyFont
        }}
      >
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500">
          <div 
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ backgroundColor: styles.accent + '20' }}
          >
            <Check className="w-10 h-10" style={{ color: styles.accent }} />
          </div>
          
          <div>
            <h2 
              className="text-3xl font-bold mb-3"
              style={{ 
                color: styles.primary,
                fontFamily: styles.headingFont
              }}
            >
              Thank You!
            </h2>
            <p className="text-lg" style={{ color: styles.primary + 'CC' }}>
              Your RSVP has been received successfully.
            </p>
          </div>

          <div 
            className="p-6 rounded-2xl"
            style={{ backgroundColor: styles.secondary }}
          >
            <p className="font-medium mb-2" style={{ color: styles.primary }}>
              {formData.guestName}
            </p>
            <p className="text-sm" style={{ color: styles.primary + 'AA' }}>
              {formData.attendance === 'yes' 
                ? `Attending with ${formData.numberOfGuests} guest(s)`
                : 'Unable to attend'
              }
            </p>
          </div>

          <button
            onClick={handleWhatsAppConfirmation}
            className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: styles.accent,
              color: '#ffffff'
            }}
          >
            Share on WhatsApp
          </button>

          <p className="text-sm" style={{ color: styles.primary + '99' }}>
            We look forward to celebrating with you!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: styles.background,
        fontFamily: styles.bodyFont
      }}
    >
      {/* Hero Section */}
      <div 
        className="relative min-h-[60vh] flex items-center justify-center p-8"
        style={{
          backgroundImage: weddingData.coverImage 
            ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${weddingData.coverImage})`
            : `linear-gradient(135deg, ${styles.primary}22, ${styles.accent}22)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="space-y-2">
            <p 
              className="text-lg tracking-widest uppercase"
              style={{ color: weddingData.coverImage ? '#ffffff' : styles.primary + 'CC' }}
            >
              You're Invited to the Wedding of
            </p>
            <h1 
              className="text-5xl md:text-7xl font-bold"
              style={{ 
                color: weddingData.coverImage ? '#ffffff' : styles.primary,
                fontFamily: styles.headingFont
              }}
            >
              {weddingData.groomName}
            </h1>
            <p 
              className="text-3xl md:text-4xl"
              style={{ 
                color: weddingData.coverImage ? '#ffffff' : styles.accent,
                fontFamily: styles.headingFont
              }}
            >
              &
            </p>
            <h1 
              className="text-5xl md:text-7xl font-bold"
              style={{ 
                color: weddingData.coverImage ? '#ffffff' : styles.primary,
                fontFamily: styles.headingFont
              }}
            >
              {weddingData.brideName}
            </h1>
          </div>
          
          <div 
            className="inline-block px-8 py-3 rounded-full text-lg font-semibold"
            style={{ 
              backgroundColor: weddingData.coverImage ? 'rgba(255,255,255,0.9)' : styles.secondary,
              color: styles.primary
            }}
          >
            {weddingData.weddingDate}
          </div>
        </div>
      </div>

      {/* Event Details Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div 
          className="rounded-3xl p-8 md:p-12 shadow-2xl"
          style={{ backgroundColor: styles.secondary }}
        >
          <h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ 
              color: styles.primary,
              fontFamily: styles.headingFont
            }}
          >
            Event Details
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: styles.accent + '20' }}
              >
                <Calendar className="w-6 h-6" style={{ color: styles.accent }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: styles.primary }}>
                  Date
                </h3>
                <p style={{ color: styles.primary + 'CC' }}>
                  {weddingData.weddingDate}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: styles.accent + '20' }}
              >
                <Clock className="w-6 h-6" style={{ color: styles.accent }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: styles.primary }}>
                  Time
                </h3>
                <p style={{ color: styles.primary + 'CC' }}>
                  {weddingData.weddingTime}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 md:col-span-2">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: styles.accent + '20' }}
              >
                <MapPin className="w-6 h-6" style={{ color: styles.accent }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1" style={{ color: styles.primary }}>
                  Venue
                </h3>
                <p className="mb-2" style={{ color: styles.primary + 'CC' }}>
                  {weddingData.venue}
                </p>
                <p className="text-sm mb-3" style={{ color: styles.primary + '99' }}>
                  {weddingData.venueAddress}
                </p>
                {weddingData.mapUrl && (
                  <a
                    href={weddingData.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ 
                      backgroundColor: styles.accent,
                      color: '#ffffff'
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* RSVP Form */}
          <div 
            className="rounded-2xl p-8"
            style={{ backgroundColor: styles.background }}
          >
            <h3 
              className="text-2xl font-bold text-center mb-6"
              style={{ 
                color: styles.primary,
                fontFamily: styles.headingFont
              }}
            >
              RSVP
            </h3>

            {error && (
              <div 
                className="mb-6 p-4 rounded-lg"
                style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Guest Name */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: styles.primary }}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  Your Name *
                </label>
                <input
                  type="text"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: styles.secondary,
                    backgroundColor: styles.background
                  }}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: styles.primary }}
                >
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: styles.secondary,
                    backgroundColor: styles.background
                  }}
                  placeholder="+251 9XX XXX XXX"
                  required
                />
              </div>

              {/* Attendance */}
              <div>
                <label 
                  className="block text-sm font-medium mb-3"
                  style={{ color: styles.primary }}
                >
                  Will you be attending? *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, attendance: 'yes' })}
                    className="py-3 px-6 rounded-lg font-semibold transition-all border-2"
                    style={{
                      backgroundColor: formData.attendance === 'yes' ? styles.accent : styles.background,
                      borderColor: formData.attendance === 'yes' ? styles.accent : styles.secondary,
                      color: formData.attendance === 'yes' ? '#ffffff' : styles.primary
                    }}
                  >
                    ✓ Yes, I'll be there
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, attendance: 'no' })}
                    className="py-3 px-6 rounded-lg font-semibold transition-all border-2"
                    style={{
                      backgroundColor: formData.attendance === 'no' ? styles.primary : styles.background,
                      borderColor: formData.attendance === 'no' ? styles.primary : styles.secondary,
                      color: formData.attendance === 'no' ? '#ffffff' : styles.primary
                    }}
                  >
                    ✗ Can't make it
                  </button>
                </div>
              </div>

              {/* Number of Guests */}
              {formData.attendance === 'yes' && (
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: styles.primary }}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.numberOfGuests}
                    onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: styles.secondary,
                      backgroundColor: styles.background
                    }}
                  />
                </div>
              )}

              {/* Message */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: styles.primary }}
                >
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Message (Optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all resize-none"
                  style={{ 
                    borderColor: styles.secondary,
                    backgroundColor: styles.background
                  }}
                  placeholder="Share your wishes for the couple..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: styles.accent,
                  color: '#ffffff'
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit RSVP
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RSVPTemplate;