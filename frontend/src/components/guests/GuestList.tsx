import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { guestApi, Guest, invitationApi, weddingApi } from '../../lib/api';
import TemplateGalleryModal from '../invitations/TemplateGalleryModal';
import TemplateCustomizerModal from '../invitations/TemplateCustomizerModal';
import { RSVPAnalyticsDashboard } from '../communication';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'table' | 'created_at' | 'arrived'>('name');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // RSVP-related state
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template-1');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedGuestForQR, setSelectedGuestForQR] = useState<Guest | null>(null);
  const [qrRequestCount, setQrRequestCount] = useState(0);
  const [lastQrRequest, setLastQrRequest] = useState(0);

  const queryClient = useQueryClient();

  const { data: guestsData, isLoading, error } = useQuery({
    queryKey: ['guests', weddingId],
    queryFn: () => guestApi.getGuests(weddingId),
    // Add polling to refresh guest data every 30 seconds
    refetchInterval: 30000,
    // Refetch when window gains focus (user comes back to tab)
    refetchOnWindowFocus: true,
  });

  const { data: wedding } = useQuery({
    queryKey: ['wedding', weddingId],
    queryFn: () => weddingApi.getWedding(weddingId),
  });

  // Fetch invitation settings
  const { data: invitationSettings } = useQuery({
    queryKey: ['invitationSettings', weddingId],
    queryFn: () => invitationApi.getWeddingSettings(weddingId),
  });

  // Update selectedTemplateId when invitation settings are loaded
  React.useEffect(() => {
    if (invitationSettings?.template_id) {
      setSelectedTemplateId(invitationSettings.template_id);
    }
  }, [invitationSettings]);

  // Ensure guests is always an array
  const guests = Array.isArray(guestsData) ? guestsData : [];

  // Send invitation mutation
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

  // Send bulk invitations mutation
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
      let errorMessage = 'Failed to delete guest. Please try again.';
      
      if (error.message) {
        errorMessage = `Failed to delete guest: ${error.message}`;
      }
      
      alert(errorMessage);
    },
  });

  const csvImportMutation = useMutation({
    mutationFn: (file: File) => guestApi.bulkImportGuestsCSV(weddingId, file),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
      setIsImporting(false);
      
      console.log('CSV Import Response:', response);
      
      if (response.successful_imports > 0) {
        const message = `Successfully imported ${response.successful_imports} guests.${response.failed_imports > 0 ? ` ${response.failed_imports} failed.` : ''}`;
        alert(message);
      } else if (response.failed_imports > 0) {
        const errorSample = response.errors && response.errors.length > 0 ? 
          `\n\nFirst few errors:\n${response.errors.slice(0, 3).join('\n')}` : '';
        alert(`Import failed. ${response.failed_imports} guests failed to import.${errorSample}\n\nPlease check your CSV format. Only the 'name' field is required.`);
      } else {
        alert('No guests were processed. Please check your CSV file format.');
      }
    },
    onError: (error: any) => {
      console.error('Failed to import guests:', error);
      setIsImporting(false);
      
      let errorMessage = 'Failed to import guests. Please check your CSV format and try again.';
      
      if (error.message) {
        errorMessage = `Failed to import guests: ${error.message}`;
      }
      
      errorMessage += '\n\nTips:\n- Only the "name" field is required\n- Use the template for proper format\n- Check for special characters in names';
      
      alert(errorMessage);
    },
  });

  // Filter and sort guests
  const filteredGuests = guests
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
        case 'name':
          return a.name.localeCompare(b.name);
        case 'table':
          return (a.table_number || 0) - (b.table_number || 0);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'arrived':
          // Sort by check-in status (checked in first), then by check-in time
          if (a.is_checked_in && !b.is_checked_in) return -1;
          if (!a.is_checked_in && b.is_checked_in) return 1;
          if (a.is_checked_in && b.is_checked_in) {
            const aTime = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
            const bTime = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0;
            return bTime - aTime; // Most recent first
          }
          return 0;
        default:
          return 0;
      }
    });

  const handleDeleteGuest = (guest: Guest) => {
    if (window.confirm(`Are you sure you want to delete ${guest.name}? This action cannot be undone.`)) {
      deleteGuestMutation.mutate(guest.id);
    }
  };

  const generateQRCodeUrl = (qrCode: string) => {
    // Use external QR service as fallback only
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`;
  };

  const getBackendQRCodeUrl = async (guestId: number): Promise<string> => {
    try {
      const response = await fetch(`/api/guests/${guestId}/qr-code`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || localStorage.getItem('access_token')}` // Adjust based on your auth
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.qr_code_image; // This is a data URL
      } else {
        throw new Error('Backend QR generation failed');
      }
    } catch (error) {
      console.error('Backend QR code error:', error);
      throw error;
    }
  };

  const downloadQRCode = (guest: Guest) => {
    const qrUrl = generateQRCodeUrl(guest.qr_code);
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${guest.name.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyQRCode = (qrCode: string) => {
    navigator.clipboard.writeText(qrCode).then(() => {
      console.log('QR code copied to clipboard');
    });
  };

  const handleSendInvitation = (guest: Guest) => {
    if (!guest.phone) {
      alert('Guest does not have a phone number. Please add one before sending invitation.');
      return;
    }
    if (window.confirm(`Send invitation to ${guest.name} via SMS?`)) {
      sendInvitationMutation.mutate(guest.id);
    }
  };

  const handleCopyInvitationLink = async (guest: Guest) => {
    try {
      const response = await invitationApi.getInvitationLink(weddingId, guest.id);
      await navigator.clipboard.writeText(response.url);
      alert('Invitation link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy invitation link:', error);
      alert('Failed to copy invitation link. Please try again.');
    }
  };

  const handleSendAllInvitations = () => {
    const guestsWithPhone = guests.filter(g => g.phone);
    if (guestsWithPhone.length === 0) {
      alert('No guests with phone numbers found.');
      return;
    }
    if (window.confirm(`Send invitations to ${guestsWithPhone.length} guests via SMS?`)) {
      sendBulkInvitationsMutation.mutate(guestsWithPhone.map(g => g.id));
    }
  };

  const handleShowQRCode = (guest: Guest) => {
    // Rate limiting: max 10 requests per minute
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    if (now - lastQrRequest > oneMinute) {
      // Reset counter after a minute
      setQrRequestCount(1);
      setLastQrRequest(now);
    } else if (qrRequestCount >= 10) {
      alert('Too many QR code requests. Please wait a moment before trying again.');
      return;
    } else {
      setQrRequestCount(prev => prev + 1);
    }
    
    setSelectedGuestForQR(guest);
    setShowQRModal(true);
  };

  const handleCopyQRCode = async (qrCode: string) => {
    try {
      await navigator.clipboard.writeText(qrCode);
      alert('QR code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy QR code:', error);
      alert('Failed to copy QR code. Please try again.');
    }
  };

  const getQRCodeImageUrl = (guest: Guest) => {
    // Use backend API for QR code generation if available, otherwise fallback to external service
    return `/api/guests/${guest.id}/qr-code`;
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowTemplateGallery(false);
    setShowCustomizer(true);
  };

  const handleCSVImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a CSV file.');
        return;
      }
      
      setIsImporting(true);
      csvImportMutation.mutate(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadCSVTemplate = () => {
    try {
      const csvContent = 'name,email,phone,table_number,dietary_restrictions\n"John Doe","john@example.com","1234567890",1,"Vegetarian"\n"Jane Smith","jane@example.com","0987654321",2,"None"\n"Alice Johnson","alice@example.com","5551234567",3,"Gluten-free"\n"Bob Wilson","","123-456-7890",4,""\n"Carol Davis","carol@example.com","",5,"Vegan"';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Check if the browser supports the download attribute
      if ((window.navigator as any).msSaveOrOpenBlob) {
        // For IE/Edge
        (window.navigator as any).msSaveOrOpenBlob(blob, 'guest_import_template.csv');
      } else {
        // For other browsers
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'guest_import_template.csv';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      }
      
      console.log('CSV template download initiated');
    } catch (error) {
      console.error('Failed to download CSV template:', error);
      alert('Failed to download CSV template. Please try again.');
    }
  };

  const exportGuestsCSV = () => {
    try {
      if (guests.length === 0) {
        alert('No guests to export.');
        return;
      }

      // Create CSV header
      const headers = ['name', 'email', 'phone', 'table_number', 'dietary_restrictions', 'rsvp_status', 'is_checked_in', 'checked_in_at'];
      
      // Create CSV content
      const csvRows = [
        headers.join(','), // Header row
        ...guests.map(guest => [
          `"${guest.name || ''}"`,
          `"${guest.email || ''}"`,
          `"${guest.phone || ''}"`,
          guest.table_number || '',
          `"${guest.dietary_restrictions || ''}"`,
          guest.rsvp_status || 'pending',
          guest.is_checked_in ? 'Yes' : 'No',
          guest.checked_in_at ? `"${new Date(guest.checked_in_at).toLocaleString()}"` : ''
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Check if the browser supports the download attribute
      if ((window.navigator as any).msSaveOrOpenBlob) {
        // For IE/Edge
        (window.navigator as any).msSaveOrOpenBlob(blob, 'wedding_guests.csv');
      } else {
        // For other browsers
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'wedding_guests.csv';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      }
      
      console.log('Guest list CSV export initiated');
    } catch (error) {
      console.error('Failed to export guest list:', error);
      alert('Failed to export guest list. Please try again.');
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-yellow-100 text-yellow-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-indigo-100 text-indigo-700',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading guests...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="text-center text-red-600">
          <p>Failed to load guests. Please try again.</p>
        </div>
      </div>
    );
  }

  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.is_checked_in).length;
  const pendingGuests = guests.filter(g => !g.is_checked_in).length;
  const checkInRate = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  // RSVP stats
  const acceptedGuests = guests.filter(g => g.rsvp_status === 'accepted').length;
  const declinedGuests = guests.filter(g => g.rsvp_status === 'declined').length;
  const pendingRSVP = guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length;

  // Show analytics view if enabled
  if (showAnalytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAnalytics(false)}
            className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Guest List</span>
          </button>
        </div>
        <RSVPAnalyticsDashboard weddingId={weddingId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Gallery Modal */}
      <TemplateGalleryModal
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelectTemplate={handleTemplateSelect}
        currentTemplateId={wedding?.invitation_template_id}
      />

      {/* Template Customizer Modal */}
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

      {/* QR Code Modal */}
      {showQRModal && selectedGuestForQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                QR Code for {selectedGuestForQR.name}
              </h3>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setSelectedGuestForQR(null);
                }}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              {/* QR Code Image */}
              <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-sm">
                <img
                  src={getBackendQRCodeUrl(selectedGuestForQR.id)}
                  alt={`QR Code for ${selectedGuestForQR.name}`}
                  className="w-48 h-48 mx-auto"
                  onError={(e) => {
                    // Fallback to external QR service if backend fails
                    const target = e.target as HTMLImageElement;
                    target.src = generateQRCodeUrl(selectedGuestForQR.qr_code);
                  }}
                />
              </div>
              
              {/* QR Code Text and Copy Button */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">QR Code:</p>
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                  <code className="text-sm font-mono text-slate-900 dark:text-white break-all">
                    {selectedGuestForQR.qr_code}
                  </code>
                  <button
                    onClick={() => handleCopyQRCode(selectedGuestForQR.qr_code)}
                    className="ml-2 p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex-shrink-0"
                    title="Copy QR Code"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Download Button */}
              <button
                onClick={() => downloadQRCode(selectedGuestForQR)}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Stats Cards - Enhanced with dark mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Guests */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Guests</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalGuests}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* RSVP Accepted */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">RSVP Accepted</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{acceptedGuests}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* RSVP Declined */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">RSVP Declined</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{declinedGuests}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* RSVP Pending */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">RSVP Pending</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingRSVP}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Guest List Card - Enhanced */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Header with Search and Actions */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Guest Management</h3>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowAnalytics(true)}
                variant="outline"
                className="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                RSVP Analytics
              </Button>
              <Button
                onClick={() => setShowTemplateGallery(true)}
                variant="outline"
                className="text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Select Template
              </Button>
              <Button
                onClick={handleSendAllInvitations}
                disabled={sendBulkInvitationsMutation.isPending || guests.filter(g => g.phone).length === 0}
                variant="outline"
                className="text-green-600 dark:text-green-400 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                {sendBulkInvitationsMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                    </svg>
                    Send All Invitations
                  </>
                )}
              </Button>
              <Button
                onClick={exportGuestsCSV}
                variant="outline"
                className="text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                disabled={guests.length === 0}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </Button>
              <Button
                onClick={handleCSVImport}
                disabled={isImporting}
                variant="outline"
                className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-600 mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Import CSV
                  </>
                )}
              </Button>
              <Button onClick={onAddGuest} className="bg-rose-600 hover:bg-rose-700 text-white">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Guest
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search guests by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:ring-rose-400 dark:focus:border-rose-400"
            />
          </div>
        </div>

        {/* Tabs and Sort Options */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setRsvpFilter('all')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  rsvpFilter === 'all'
                    ? 'border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                All Guests
              </button>
              <button
                onClick={() => setRsvpFilter('accepted')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  rsvpFilter === 'accepted'
                    ? 'border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                RSVP Accepted
              </button>
              <button
                onClick={() => setRsvpFilter('declined')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  rsvpFilter === 'declined'
                    ? 'border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                RSVP Declined
              </button>
              <button
                onClick={() => setRsvpFilter('pending')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  rsvpFilter === 'pending'
                    ? 'border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                RSVP Pending
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1.5 text-sm rounded-xl transition-colors ${
                  sortBy === 'name'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Sort by Name
              </button>
              <button
                onClick={() => setSortBy('table')}
                className={`px-3 py-1.5 text-sm rounded-xl transition-colors ${
                  sortBy === 'table'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Sort by Table
              </button>
              <button
                onClick={() => setSortBy('created_at')}
                className={`px-3 py-1.5 text-sm rounded-xl transition-colors ${
                  sortBy === 'created_at'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Sort by Date Added
              </button>
              <button
                onClick={() => setSortBy('arrived')}
                className={`px-3 py-1.5 text-sm rounded-xl transition-colors ${
                  sortBy === 'arrived'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Sort by Arrived
              </button>
            </div>
          </div>
        </div>

        {/* Guest Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Table</th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">RSVP Status</th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Arrived</th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invitation</th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <svg className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {searchTerm || filterStatus !== 'all' ? 'No guests match your search criteria' : 'No guests added yet'}
                    </p>
                    {!searchTerm && filterStatus === 'all' && (
                      <Button onClick={onAddGuest} className="bg-rose-600 hover:bg-rose-700 text-white">
                        Add Your First Guest
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${getAvatarColor(guest.name)}`}>
                          {getInitials(guest.name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{guest.name}</p>
                          {guest.dietary_restrictions && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Dietary: {guest.dietary_restrictions}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        {guest.email && (
                          <div className="flex items-center text-slate-700 dark:text-slate-300 mb-1">
                            <svg className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {guest.email}
                          </div>
                        )}
                        {guest.phone && (
                          <div className="flex items-center text-slate-600 dark:text-slate-400">
                            <svg className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {guest.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {guest.table_number || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        guest.rsvp_status === 'accepted'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : guest.rsvp_status === 'declined'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {guest.rsvp_status === 'accepted' ? '✓ Accepted' : guest.rsvp_status === 'declined' ? '✗ Declined' : 'Pending'}
                      </span>
                      {guest.rsvp_responded_at && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(guest.rsvp_responded_at).toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        guest.is_checked_in
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {guest.is_checked_in ? '✓ Arrived' : 'Not Arrived'}
                      </span>
                      {guest.checked_in_at && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(guest.checked_in_at).toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSendInvitation(guest)}
                          disabled={!guest.phone || sendInvitationMutation.isPending}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Send Invitation via SMS"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleCopyInvitationLink(guest)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Copy Invitation Link"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleShowQRCode(guest)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Show QR Code"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                        {guest.invitation_sent_at && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Sent {new Date(guest.invitation_sent_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditGuest(guest)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Guest"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteGuest(guest)}
                          disabled={deleteGuestMutation.isPending}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Guest"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GuestList;
