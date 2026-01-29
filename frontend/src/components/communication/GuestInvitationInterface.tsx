import React, { useState, useEffect } from 'react';
import { Guest, communicationApi, BulkMessageResponse, MessageTemplate } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface GuestInvitationInterfaceProps {
  weddingId: number;
  guests: Guest[];
  onClose: () => void;
}

interface MessageTemplateOption {
  id: string;
  name: string;
  description: string;
  template: string;
}

const GuestInvitationInterface: React.FC<GuestInvitationInterfaceProps> = ({
  weddingId,
  guests,
  onClose
}) => {
  const [selectedGuests, setSelectedGuests] = useState<number[]>([]);
  const [preferWhatsApp, setPreferWhatsApp] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('qr_invitation');
  const [templates, setTemplates] = useState<Record<string, MessageTemplate>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BulkMessageResponse | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Load message templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await communicationApi.getMessageTemplates();
        setTemplates(response.templates);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };

    loadTemplates();
  }, []);

  const handleGuestSelection = (guestId: number) => {
    setSelectedGuests(prev => 
      prev.includes(guestId) 
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  const handleSelectAll = () => {
    const guestsWithPhone = guests.filter(guest => guest.phone);
    if (selectedGuests.length === guestsWithPhone.length) {
      setSelectedGuests([]);
    } else {
      setSelectedGuests(guestsWithPhone.map(guest => guest.id));
    }
  };

  const handleSendInvitations = async () => {
    if (selectedGuests.length === 0) {
      alert('Please select at least one guest to send invitations to.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await communicationApi.sendQRInvitations({
        guest_ids: selectedGuests,
        prefer_whatsapp: preferWhatsApp,
        custom_message: customMessage || undefined
      });

      setResults(response);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to send invitations:', error);
      alert('Failed to send invitations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const guestsWithPhone = guests.filter(guest => guest.phone);
  const guestsWithoutPhone = guests.filter(guest => !guest.phone);

  if (showResults && results) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Invitation Results</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{results.total_sent}</div>
              <div className="text-sm text-gray-600">Total Sent</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{results.successful}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </Card>
          </div>

          {/* Detailed Results */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Results</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {results.results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.status === 'sent' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{result.phone}</div>
                      <div className="text-sm text-gray-600">
                        Method: {result.method} | Status: {result.status}
                      </div>
                      {result.error && (
                        <div className="text-sm text-red-600 mt-1">{result.error}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Send Guest Invitations</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Guest Selection */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Guests</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedGuests.length === guestsWithPhone.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* Guests with phone numbers */}
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {guestsWithPhone.map(guest => (
                <div
                  key={guest.id}
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`guest-${guest.id}`}
                    checked={selectedGuests.includes(guest.id)}
                    onChange={() => handleGuestSelection(guest.id)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`guest-${guest.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">{guest.name}</div>
                    <div className="text-sm text-gray-600">{guest.phone}</div>
                  </label>
                </div>
              ))}
            </div>

            {/* Guests without phone numbers */}
            {guestsWithoutPhone.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Guests without phone numbers ({guestsWithoutPhone.length})
                </h4>
                <div className="text-sm text-gray-500 space-y-1">
                  {guestsWithoutPhone.slice(0, 3).map(guest => (
                    <div key={guest.id}>{guest.name}</div>
                  ))}
                  {guestsWithoutPhone.length > 3 && (
                    <div>... and {guestsWithoutPhone.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Message Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Settings</h3>

            {/* Communication Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Method
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="method"
                    checked={preferWhatsApp}
                    onChange={() => setPreferWhatsApp(true)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  WhatsApp (with SMS fallback)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="method"
                    checked={!preferWhatsApp}
                    onChange={() => setPreferWhatsApp(false)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  SMS Only
                </label>
              </div>
            </div>

            {/* Template Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(templates).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message to include with the invitation..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                This will be added to the standard invitation template
              </div>
            </div>

            {/* Preview */}
            {templates[selectedTemplate] && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Preview
                </label>
                <div className="p-3 bg-gray-50 border rounded-md text-sm">
                  <div className="text-gray-600">
                    Variables: {templates[selectedTemplate].variables.join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t">
          <div className="text-sm text-gray-600">
            {selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvitations}
              disabled={isLoading || selectedGuests.length === 0}
            >
              {isLoading ? 'Sending...' : `Send Invitations (${selectedGuests.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestInvitationInterface;