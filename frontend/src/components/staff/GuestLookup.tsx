import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import CheckInSuccessModal from './CheckInSuccessModal';

interface GuestLookupProps {
  weddingId: number;
  onCheckInSuccess: (guestName: string, isDuplicate?: boolean) => void;
}

interface GuestStatus {
  id: number;
  name: string;
  table_number?: number;
  is_checked_in: boolean;
  checked_in_at?: string;
  qr_code: string;
}

interface CheckInResponse {
  success: boolean;
  message: string;
  guest_name: string;
  checked_in_at: string;
  is_duplicate: boolean;
}

const GuestLookup: React.FC<GuestLookupProps> = ({ weddingId, onCheckInSuccess }) => {
  const [guests, setGuests] = useState<GuestStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    guestName: string;
    isDuplicate: boolean;
    checkedInAt: string;
  } | null>(null);
  const [processingGuestId, setProcessingGuestId] = useState<number | null>(null);

  // Filter guests based on search term
  const filteredGuests = useMemo(() => {
    if (!searchTerm.trim()) return guests;
    
    const term = searchTerm.toLowerCase();
    return guests.filter(guest => 
      guest.name.toLowerCase().includes(term) ||
      (guest.table_number && guest.table_number.toString().includes(term))
    );
  }, [guests, searchTerm]);

  // Separate checked-in and pending guests
  const { checkedInGuests, pendingGuests } = useMemo(() => {
    const checkedIn = filteredGuests.filter(guest => guest.is_checked_in);
    const pending = filteredGuests.filter(guest => !guest.is_checked_in);
    
    return {
      checkedInGuests: checkedIn.sort((a, b) => a.name.localeCompare(b.name)),
      pendingGuests: pending.sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [filteredGuests]);

  const fetchGuests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const staffToken = localStorage.getItem('access_token');
      if (!staffToken) {
        throw new Error('Staff session expired. Please log in again.');
      }

      const response = await fetch('/api/v1/checkin/guests', {
        headers: {
          'Authorization': `Bearer ${staffToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load guests');
      }

      const guestData: GuestStatus[] = await response.json();
      setGuests(guestData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCheckIn = async (guestId: number, guestName: string) => {
    setProcessingGuestId(guestId);
    setError(null);

    try {
      const staffToken = localStorage.getItem('access_token');
      if (!staffToken) {
        throw new Error('Staff session expired. Please log in again.');
      }

      const response = await fetch('/api/v1/checkin/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        body: JSON.stringify({ guest_id: guestId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Check-in failed');
      }

      const result: CheckInResponse = await response.json();
      
      if (result.success) {
        // Show the big success modal
        setSuccessData({
          guestName: result.guest_name,
          isDuplicate: result.is_duplicate,
          checkedInAt: result.checked_in_at
        });
        setShowSuccessModal(true);
        
        // Also call the parent callback for the small notification
        onCheckInSuccess(result.guest_name, result.is_duplicate);
        // Refresh guest list to update status
        await fetchGuests();
      } else {
        setError(result.message || 'Check-in failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setProcessingGuestId(null);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  useEffect(() => {
    fetchGuests();
  }, [weddingId]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading guest list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Manual Guest Lookup
        </h3>
        <p className="text-gray-600">
          Search and check in guests manually
        </p>
      </div>

      {/* Search */}
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or table number..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            {filteredGuests.length} guest{filteredGuests.length !== 1 ? 's' : ''} found
          </span>
          <Button
            onClick={fetchGuests}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Guest Lists */}
      <div className="space-y-6">
        {/* Pending Guests */}
        {pendingGuests.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
              Pending Check-In ({pendingGuests.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md"
                >
                  <div>
                    <p className="font-medium text-gray-900">{guest.name}</p>
                    {guest.table_number && (
                      <p className="text-sm text-gray-600">Table {guest.table_number}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleManualCheckIn(guest.id, guest.name)}
                    disabled={processingGuestId === guest.id}
                    size="sm"
                  >
                    {processingGuestId === guest.id ? 'Checking In...' : 'Check In'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checked-In Guests */}
        {checkedInGuests.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
              Checked In ({checkedInGuests.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {checkedInGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md"
                >
                  <div>
                    <p className="font-medium text-gray-900">{guest.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {guest.table_number && <span>Table {guest.table_number}</span>}
                      {guest.checked_in_at && (
                        <span>
                          Checked in at {new Date(guest.checked_in_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-green-600 font-medium">
                    ✓ Checked In
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredGuests.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <p>No guests found matching your search.</p>
            {searchTerm && (
              <Button
                onClick={() => setSearchTerm('')}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Success Modal */}
      {successData && (
        <CheckInSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccessModal}
          guestName={successData.guestName}
          isDuplicate={successData.isDuplicate}
          checkedInAt={successData.checkedInAt}
        />
      )}
    </div>
  );
};

export default GuestLookup;