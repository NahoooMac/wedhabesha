import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { guestApi, Guest, invitationApi, weddingApi } from '../../lib/api';
import TemplateGalleryModal from '../invitations/TemplateGalleryModal';
import TemplateCustomizerModal from '../invitations/TemplateCustomizerModal';
import { RSVPAnalyticsDashboard } from '../communication';
import GoogleContactsImporter from './GoogleContactsImporter';

interface GuestListProps {
  weddingId: number;
  onAddGuest: () => void;
  onEditGuest: (guest: Guest) => void;
}

const GuestList: React.FC<GuestListProps> = ({ 
  weddingId, 
  onAddGuest, 
  onEditGuest
}) => {
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'table' | 'created_at' | 'arrived'>('name');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Selection State
  const [selectedGuests, setSelectedGuests] = useState<Set<number>>(new Set());
  
  // Feature State
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template-1');
  
  // QR Modal State
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedGuestForQR, setSelectedGuestForQR] = useState<Guest | null>(null);
  const [qrRequestCount, setQrRequestCount] = useState(0);
  const [lastQrRequest, setLastQrRequest] = useState(0);
  
  // Google Import State
  const [showGoogleImporter, setShowGoogleImporter] = useState(false);

  const queryClient = useQueryClient();

  // --- Queries ---

  const { data: guestsData, isLoading, error } = useQuery({
    queryKey: ['guests', weddingId],
    queryFn: () => guestApi.getGuests(weddingId),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: wedding } = useQuery({
    queryKey: ['wedding', weddingId],
    queryFn: () => weddingApi.getWedding(weddingId),
  });

  const { data: invitationSettings } = useQuery({
    queryKey: ['invitationSettings', weddingId],
    queryFn: () => invitationApi.getWeddingSettings(weddingId),
  });

  // Effect to sync template ID
  React.useEffect(() => {
    if (invitationSettings?.template_id) {
      setSelectedTemplateId(invitationSettings.template_id);
    }
  }, [invitationSettings]);

  const guests = Array.isArray(guestsData) ? guestsData : [];

  // --- Mutations ---

  const sendInvitationMutation = useMutation({
    mutationFn: (guestId: number) => invitationApi.sendSMS(weddingId, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
      alert('Invitation sent successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to send invitation:', error);
      alert(`Failed to send invitation: ${error.message || 'Please try again'}`);
    },
  });

  const sendBulkInvitationsMutation = useMutation({
    mutationFn: (guestIds: number[]) => invitationApi.sendBulkSMS(weddingId, guestIds),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
      alert(`Successfully sent ${response.total_sent} invitations!`);
    },
    onError: (error: any) => {
      console.error('Failed to send bulk invitations:', error);
      alert(`Failed to send invitations: ${error.message || 'Please try again'}`);
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: (guestId: number) => guestApi.deleteGuest(weddingId, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
    },
    onError: (error: any) => {
      console.error('Failed to delete guest:', error);
      alert(error.message ? `Failed to delete guest: ${error.message}` : 'Failed to delete guest. Please try again.');
    },
  });

  const csvImportMutation = useMutation({
    mutationFn: (file: File) => guestApi.bulkImportGuestsCSV(weddingId, file),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
      setIsImporting(false);
      
      if (response.successful_imports > 0) {
        const message = `Successfully imported ${response.successful_imports} guests.${response.failed_imports > 0 ? ` ${response.failed_imports} failed.` : ''}`;
        alert(message);
      } else if (response.failed_imports > 0) {
        alert(`Import failed. ${response.failed_imports} guests failed to import.\n\nPlease check your CSV format.`);
      } else {
        alert('No guests were processed. Please check your CSV file format.');
      }
    },
    onError: (error: any) => {
      setIsImporting(false);
      alert(`Failed to import guests: ${error.message || 'Unknown error'}`);
    },
  });

  // --- Logic & Helpers ---

  // Memoized filtering and sorting to prevent re-runs on every render
  const filteredGuests = useMemo(() => {
    return guests
      .filter(guest => {
        const matchesSearch = searchTerm === '' || 
                             guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             guest.phone?.includes(searchTerm);
        
        const matchesStatus = filterStatus === 'all' ||
                             (filterStatus === 'checked_in' && guest.is_checked_in) ||
                             (filterStatus === 'pending' && !guest.is_checked_in);
        
        const matchesRSVP = rsvpFilter === 'all' ||
                           (guest.rsvp_status && guest.rsvp_status === rsvpFilter);
        
        return matchesSearch && matchesStatus && matchesRSVP;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name': return a.name.localeCompare(b.name);
          case 'table': return (a.table_number || 0) - (b.table_number || 0);
          case 'created_at': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'arrived':
            if (a.is_checked_in && !b.is_checked_in) return -1;
            if (!a.is_checked_in && b.is_checked_in) return 1;
            if (a.is_checked_in && b.is_checked_in) {
              const aTime = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
              const bTime = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0;
              return bTime - aTime;
            }
            return 0;
          default: return 0;
        }
      });
  }, [guests, searchTerm, filterStatus, rsvpFilter, sortBy]);

  // Actions
  const handleDeleteGuest = (guest: Guest) => {
    if (window.confirm(`Are you sure you want to delete ${guest.name}? This action cannot be undone.`)) {
      deleteGuestMutation.mutate(guest.id);
    }
  };

  // Selection handlers
  const handleSelectGuest = (guestId: number) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
    }
  };

  const handleBulkAction = (action: 'sms' | 'delete') => {
    const selectedGuestsList = filteredGuests.filter(g => selectedGuests.has(g.id));
    
    if (action === 'sms') {
      const guestsWithPhone = selectedGuestsList.filter(g => g.phone);
      if (guestsWithPhone.length === 0) {
        return alert('None of the selected guests have phone numbers.');
      }
      if (window.confirm(`Send invitations to ${guestsWithPhone.length} selected guests via SMS?`)) {
        sendBulkInvitationsMutation.mutate(guestsWithPhone.map(g => g.id));
        setSelectedGuests(new Set());
      }
    } else if (action === 'delete') {
      if (window.confirm(`Are you sure you want to delete ${selectedGuestsList.length} selected guests? This action cannot be undone.`)) {
        Promise.all(selectedGuestsList.map(g => deleteGuestMutation.mutateAsync(g.id)))
          .then(() => {
            setSelectedGuests(new Set());
            queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
          });
      }
    }
  };

  const generateQRCodeUrl = (qrCode: string) => 
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`;

  const getBackendQRCodeUrl = async (guestId: number): Promise<string> => {
    try {
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      const response = await fetch(`/api/guests/${guestId}/qr-code`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.qr_code_image;
      }
      throw new Error('Backend QR generation failed');
    } catch (error) {
      console.error('Backend QR code error:', error);
      throw error;
    }
  };

  const downloadQRCode = (guest: Guest) => {
    const link = document.createElement('a');
    link.href = generateQRCodeUrl(guest.qr_code);
    link.download = `${guest.name.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendInvitation = (guest: Guest) => {
    if (!guest.phone) return alert('Guest does not have a phone number.');
    if (window.confirm(`Send invitation to ${guest.name} via SMS?`)) {
      sendInvitationMutation.mutate(guest.id);
    }
  };

  const handleCopyInvitationLink = async (guest: Guest) => {
    try {
      const response = await invitationApi.getInvitationLink(weddingId, guest.id);
      await navigator.clipboard.writeText(response.url);
      alert('Invitation link copied!');
    } catch (error) {
      alert('Failed to copy invitation link.');
    }
  };

  const handleSendAllInvitations = () => {
    const guestsWithPhone = guests.filter(g => g.phone);
    if (guestsWithPhone.length === 0) return alert('No guests with phone numbers found.');
    if (window.confirm(`Send invitations to ${guestsWithPhone.length} guests via SMS?`)) {
      sendBulkInvitationsMutation.mutate(guestsWithPhone.map(g => g.id));
    }
  };

  const handleShowQRCode = (guest: Guest) => {
    const now = Date.now();
    if (now - lastQrRequest > 60000) {
      setQrRequestCount(1);
      setLastQrRequest(now);
    } else if (qrRequestCount >= 10) {
      return alert('Too many requests. Please wait a moment.');
    } else {
      setQrRequestCount(prev => prev + 1);
    }
    setSelectedGuestForQR(guest);
    setShowQRModal(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsImporting(true);
      csvImportMutation.mutate(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportGuestsCSV = () => {
    if (guests.length === 0) return alert('No guests to export.');
    
    const headers = ['name', 'email', 'phone', 'table_number', 'dietary_restrictions', 'rsvp_status', 'is_checked_in'];
    const csvContent = [
      headers.join(','),
      ...guests.map(g => [
        `"${g.name}"`, `"${g.email||''}"`, `"${g.phone||''}"`, g.table_number||'', `"${g.dietary_restrictions||''}"`, g.rsvp_status||'pending', g.is_checked_in?'Yes':'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wedding_guests.csv';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  };

  // Avatar Helpers
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guests...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-6 text-center text-red-600">Failed to load guests.</div>;

  if (showAnalytics) {
    return (
      <div className="space-y-6">
        <button onClick={() => setShowAnalytics(false)} className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span>Back to Guest List</span>
        </button>
        <RSVPAnalyticsDashboard weddingId={weddingId} />
      </div>
    );
  }

  // Stats Calculation
  const totalGuests = guests.length;
  const acceptedGuests = guests.filter(g => g.rsvp_status === 'accepted').length;
  const declinedGuests = guests.filter(g => g.rsvp_status === 'declined').length;
  const pendingRSVP = guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length;
  const checkedInGuests = guests.filter(g => g.is_checked_in).length;
  const notCheckedInGuests = totalGuests - checkedInGuests;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* --- Modals --- */}
      <TemplateGalleryModal
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelectTemplate={(id) => { setSelectedTemplateId(id); setShowTemplateGallery(false); setShowCustomizer(true); }}
        currentTemplateId={wedding?.invitation_template_id}
      />

      {showCustomizer && (
        <TemplateCustomizerModal
          weddingId={weddingId}
          templateId={selectedTemplateId}
          isOpen={showCustomizer}
          onClose={() => setShowCustomizer(false)}
          currentCustomization={invitationSettings?.customization}
          onSave={() => {
            setShowCustomizer(false);
            queryClient.invalidateQueries({ queryKey: ['wedding', weddingId] });
            queryClient.invalidateQueries({ queryKey: ['invitationSettings', weddingId] });
          }}
        />
      )}

      {showQRModal && selectedGuestForQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">QR Code</h3>
              <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
                <img
                  src={`/api/guests/${selectedGuestForQR.id}/qr-code`} // Simplified for render
                  alt="QR Code"
                  className="w-48 h-48 mx-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = generateQRCodeUrl(selectedGuestForQR.qr_code); }}
                />
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">{selectedGuestForQR.name}</p>
              
              {/* QR Code Text Display */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">QR Code</p>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-2">
                  <code className="text-sm font-mono text-slate-900 dark:text-slate-100 break-all">
                    {selectedGuestForQR.qr_code}
                  </code>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(selectedGuestForQR.qr_code);
                      alert('QR code copied to clipboard!');
                    } catch (error) {
                      alert('Failed to copy QR code');
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to Clipboard
                </button>
              </div>

              <button
                onClick={() => downloadQRCode(selectedGuestForQR)}
                className="w-full bg-slate-900 dark:bg-slate-700 text-white font-medium py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download QR Image
              </button>
            </div>
          </div>
        </div>
      )}

      {showGoogleImporter && (
        <GoogleContactsImporter
          weddingId={weddingId}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['guests', weddingId] })}
          onClose={() => setShowGoogleImporter(false)}
        />
      )}

      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

      {/* --- Stats Cards (Responsive Grid) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          { label: 'Total Guests', value: totalGuests, color: 'blue', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
          { label: 'Accepted', value: acceptedGuests, color: 'emerald', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Declined', value: declinedGuests, color: 'red', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Pending', value: pendingRSVP, color: 'amber', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{stat.label}</p>
                <p className={`text-2xl md:text-3xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value}</p>
              </div>
              <div className={`hidden md:flex w-12 h-12 bg-${stat.color}-100 dark:bg-${stat.color}-900/40 rounded-xl items-center justify-center`}>
                <svg className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Main Management Section --- */}
      <div className="bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
        
        {/* Header Controls */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Guest List</h3>
            
            {/* Action Bar - Scrollable on Mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
               <Button onClick={onAddGuest} className="bg-rose-600 hover:bg-rose-700 text-white whitespace-nowrap shadow-sm shadow-rose-200">
                <span className="mr-1">+</span> Add Guest
              </Button>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0"></div>
              <Button onClick={() => setShowAnalytics(true)} variant="outline" className="whitespace-nowrap flex-shrink-0 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20" title="View RSVP Analytics">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </Button>
              <Button onClick={handleSendAllInvitations} variant="outline" className="whitespace-nowrap flex-shrink-0 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" title="Send SMS invitations to all guests">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                SMS All
              </Button>
              <Button onClick={() => setShowTemplateGallery(true)} variant="outline" className="whitespace-nowrap flex-shrink-0 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Select invitation template">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Template
              </Button>
              <Button onClick={() => setShowGoogleImporter(true)} variant="outline" className="group relative whitespace-nowrap flex-shrink-0 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Import phone contacts from Google Contacts">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"/>
                </svg>
                Phone Contacts
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  Import from Google Contacts
                  <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></span>
                </span>
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="whitespace-nowrap flex-shrink-0 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20" title="Import guests from CSV file">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import CSV
              </Button>
              <Button onClick={exportGuestsCSV} variant="outline" className="whitespace-nowrap flex-shrink-0 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" title="Export guest list to CSV">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-12" />
                </svg>
                Export
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
              />
            </div>
            
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Check-in Status</option>
              <option value="checked_in">✅ Checked In ({checkedInGuests})</option>
              <option value="pending">⏳ Not Checked In ({notCheckedInGuests})</option>
            </select>

            <select 
              value={rsvpFilter}
              onChange={(e) => setRsvpFilter(e.target.value as any)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All RSVP Status</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="pending">Pending</option>
            </select>

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
            >
              <option value="name">Sort: Name</option>
              <option value="table">Sort: Table</option>
              <option value="created_at">Sort: Newest</option>
              <option value="arrived">Sort: Arrived</option>
            </select>
          </div>

          {/* Bulk Actions Bar */}
          {selectedGuests.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedGuests.size} guest{selectedGuests.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkAction('sms')}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Send SMS
                </Button>
                <Button
                  onClick={() => handleBulkAction('delete')}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </Button>
                <Button
                  onClick={() => setSelectedGuests(new Set())}
                  variant="outline"
                  size="sm"
                  className="text-slate-600"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* --- Content Area --- */}
        <div className="flex-grow bg-slate-50 dark:bg-slate-900/50 min-h-[300px]">
          {filteredGuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <p className="text-slate-500 font-medium">No guests found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or add a new guest.</p>
              {filteredGuests.length === 0 && searchTerm === '' && filterStatus === 'all' && (
                 <Button onClick={onAddGuest} className="mt-4 bg-rose-600 text-white">Add Your First Guest</Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-6 w-12">
                        <input
                          type="checkbox"
                          checked={filteredGuests.length > 0 && selectedGuests.size === filteredGuests.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-rose-600 bg-white border-slate-300 rounded focus:ring-rose-500 focus:ring-2 cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest</th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Table</th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">RSVP Status</th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check-in</th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedGuests.has(guest.id)}
                            onChange={() => handleSelectGuest(guest.id)}
                            className="w-4 h-4 text-rose-600 bg-white border-slate-300 rounded focus:ring-rose-500 focus:ring-2 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(guest.name)}`}>
                              {getInitials(guest.name)}
                            </div>
                            <div className="font-medium text-slate-900 dark:text-white">{guest.name}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                          {guest.email && <div>{guest.email}</div>}
                          {guest.phone && <div className="text-xs text-slate-500">{guest.phone}</div>}
                        </td>
                        <td className="py-4 px-6 text-sm font-medium">{guest.table_number || '-'}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium ${
                            guest.rsvp_status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 
                            guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {guest.rsvp_status === 'accepted' ? 'Accepted' : guest.rsvp_status === 'declined' ? 'Declined' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {guest.is_checked_in ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                ✅ Checked In
                              </span>
                              {guest.checked_in_at && (
                                <span className="text-[10px] text-slate-500 mt-1">
                                  {new Date(guest.checked_in_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                              ⏳ Not Checked In
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-1">
                            <button onClick={() => handleSendInvitation(guest)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded" title="SMS"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></button>
                            <button onClick={() => handleCopyInvitationLink(guest)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Copy Link"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></button>
                            <button onClick={() => handleShowQRCode(guest)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="QR Code"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg></button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={() => onEditGuest(guest)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            <button onClick={() => handleDeleteGuest(guest)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (Visible on Mobile) */}
              <div className="md:hidden space-y-3 p-4">
                {filteredGuests.map((guest) => (
                  <div key={guest.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedGuests.has(guest.id)}
                        onChange={() => handleSelectGuest(guest.id)}
                        className="mt-1 w-4 h-4 text-rose-600 bg-white border-slate-300 rounded focus:ring-rose-500 focus:ring-2 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(guest.name)}`}>
                              {getInitials(guest.name)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white leading-tight">{guest.name}</h4>
                              <div className="text-xs text-slate-500 mt-0.5">Table: {guest.table_number || 'None'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                            guest.rsvp_status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 
                            guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {guest.rsvp_status || 'Pending'}
                          </span>
                          {guest.is_checked_in ? (
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
                              ✅ Checked In
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-yellow-100 text-yellow-700">
                              ⏳ Not Checked In
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-4">
                           {guest.email && <div className="flex items-center"><svg className="w-3.5 h-3.5 mr-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>{guest.email}</div>}
                           {guest.phone && <div className="flex items-center"><svg className="w-3.5 h-3.5 mr-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>{guest.phone}</div>}
                           {guest.is_checked_in && guest.checked_in_at && (
                             <div className="text-xs text-green-600 font-medium">
                               Arrived: {new Date(guest.checked_in_at).toLocaleString()}
                             </div>
                           )}
                        </div>

                        <div className="grid grid-cols-5 gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                           <button onClick={() => handleSendInvitation(guest)} className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-green-600 text-[10px]">
                             <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                             SMS
                           </button>
                           <button onClick={() => handleCopyInvitationLink(guest)} className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-blue-600 text-[10px]">
                             <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /></svg>
                             Link
                           </button>
                           <button onClick={() => handleShowQRCode(guest)} className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-purple-600 text-[10px]">
                             <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01" /></svg>
                             QR
                           </button>
                           <button onClick={() => onEditGuest(guest)} className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 text-[10px]">
                             <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             Edit
                           </button>
                           <button onClick={() => handleDeleteGuest(guest)} className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-red-600 text-[10px]">
                             <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             Delete
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestList;