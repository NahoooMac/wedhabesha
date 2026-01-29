import React, { useState, useEffect } from 'react';
import { Guest, communicationApi, BulkMessageResponse, MessageTemplate } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface BulkCommunicationInterfaceProps {
  weddingId: number;
  guests: Guest[];
  onClose: () => void;
}

interface GuestGroup {
  id: string;
  name: string;
  description: string;
  filter: (guest: Guest) => boolean;
  count?: number;
}

interface DeliveryProgress {
  messageId: string;
  phone: string;
  guestName: string;
  status: 'pending' | 'sending' | 'sent' | 'delivered' | 'failed';
  method: 'whatsapp' | 'sms';
  timestamp: string;
  error?: string;
  retryCount: number;
}

const BulkCommunicationInterface: React.FC<BulkCommunicationInterfaceProps> = ({
  weddingId,
  guests,
  onClose
}) => {
  const [selectedGuests, setSelectedGuests] = useState<number[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('custom');
  const [messageType, setMessageType] = useState<'event_update' | 'reminder' | 'announcement' | 'custom'>('event_update');
  const [updateMessage, setUpdateMessage] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [preferWhatsApp, setPreferWhatsApp] = useState(true);
  const [templates, setTemplates] = useState<Record<string, MessageTemplate>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BulkMessageResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deliveryProgress, setDeliveryProgress] = useState<DeliveryProgress[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [customFilters, setCustomFilters] = useState({
    hasEmail: false,
    hasPhone: true,
    checkedIn: 'all' as 'all' | 'yes' | 'no',
    tableAssigned: 'all' as 'all' | 'yes' | 'no',
    dietaryRestrictions: 'all' as 'all' | 'yes' | 'no'
  });

  // Enhanced guest groups with dynamic counts
  const guestGroups: GuestGroup[] = [
    {
      id: 'all',
      name: 'All Guests',
      description: 'All guests with phone numbers',
      filter: (guest) => !!guest.phone,
      count: guests.filter(g => !!g.phone).length
    },
    {
      id: 'checked_in',
      name: 'Checked In',
      description: 'Guests who have already checked in',
      filter: (guest) => !!guest.phone && guest.is_checked_in,
      count: guests.filter(g => !!g.phone && g.is_checked_in).length
    },
    {
      id: 'not_checked_in',
      name: 'Not Checked In',
      description: 'Guests who have not checked in yet',
      filter: (guest) => !!guest.phone && !guest.is_checked_in,
      count: guests.filter(g => !!g.phone && !g.is_checked_in).length
    },
    {
      id: 'with_table',
      name: 'With Table Assignment',
      description: 'Guests with assigned table numbers',
      filter: (guest) => !!guest.phone && !!guest.table_number,
      count: guests.filter(g => !!g.phone && !!g.table_number).length
    },
    {
      id: 'without_table',
      name: 'Without Table Assignment',
      description: 'Guests without assigned table numbers',
      filter: (guest) => !!guest.phone && !guest.table_number,
      count: guests.filter(g => !!g.phone && !g.table_number).length
    },
    {
      id: 'with_dietary',
      name: 'With Dietary Restrictions',
      description: 'Guests with dietary restrictions noted',
      filter: (guest) => !!guest.phone && !!guest.dietary_restrictions,
      count: guests.filter(g => !!g.phone && !!g.dietary_restrictions).length
    },
    {
      id: 'with_email',
      name: 'With Email',
      description: 'Guests with email addresses',
      filter: (guest) => !!guest.phone && !!guest.email,
      count: guests.filter(g => !!g.phone && !!g.email).length
    },
    {
      id: 'custom',
      name: 'Custom Selection',
      description: 'Manually select specific guests or use advanced filters',
      filter: () => true,
      count: 0
    }
  ];

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

  // Update selected guests when group changes or custom filters change
  useEffect(() => {
    if (selectedGroup !== 'custom') {
      const group = guestGroups.find(g => g.id === selectedGroup);
      if (group) {
        const filteredGuests = guests.filter(group.filter);
        setSelectedGuests(filteredGuests.map(guest => guest.id));
      }
    } else if (showAdvancedFilters) {
      // Apply custom filters
      const filteredGuests = guests.filter(guest => {
        if (!guest.phone && customFilters.hasPhone) return false;
        if (customFilters.hasEmail && !guest.email) return false;
        if (customFilters.checkedIn === 'yes' && !guest.is_checked_in) return false;
        if (customFilters.checkedIn === 'no' && guest.is_checked_in) return false;
        if (customFilters.tableAssigned === 'yes' && !guest.table_number) return false;
        if (customFilters.tableAssigned === 'no' && guest.table_number) return false;
        if (customFilters.dietaryRestrictions === 'yes' && !guest.dietary_restrictions) return false;
        if (customFilters.dietaryRestrictions === 'no' && guest.dietary_restrictions) return false;
        return true;
      });
      setSelectedGuests(filteredGuests.map(guest => guest.id));
    }
  }, [selectedGroup, guests, customFilters, showAdvancedFilters]);

  const handleCustomFilterChange = (filterKey: keyof typeof customFilters, value: any) => {
    setCustomFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

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

  const simulateProgress = () => {
    setShowProgress(true);
    setProgress(0);
    
    // Initialize delivery progress for selected guests
    const selectedGuestObjects = guests.filter(guest => selectedGuests.includes(guest.id));
    const initialProgress: DeliveryProgress[] = selectedGuestObjects.map(guest => ({
      messageId: `msg_${guest.id}_${Date.now()}`,
      phone: guest.phone!,
      guestName: guest.name,
      status: 'pending',
      method: preferWhatsApp ? 'whatsapp' : 'sms',
      timestamp: new Date().toISOString(),
      retryCount: 0
    }));
    
    setDeliveryProgress(initialProgress);
    
    // Simulate progressive delivery updates
    let currentIndex = 0;
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + (100 / selectedGuests.length), 100);
        
        // Update delivery status for current guest
        if (currentIndex < initialProgress.length) {
          setDeliveryProgress(prevProgress => 
            prevProgress.map((item, index) => {
              if (index === currentIndex) {
                // Simulate random success/failure
                const isSuccess = Math.random() > 0.1; // 90% success rate
                return {
                  ...item,
                  status: isSuccess ? 'delivered' : 'failed',
                  error: isSuccess ? undefined : 'Network timeout',
                  timestamp: new Date().toISOString()
                };
              }
              if (index < currentIndex) {
                return item;
              }
              if (index === currentIndex + 1) {
                return { ...item, status: 'sending' };
              }
              return item;
            })
          );
          currentIndex++;
        }
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setShowProgress(false);
        }
        return newProgress;
      });
    }, 300);
  };

  const handleSendMessages = async () => {
    if (selectedGuests.length === 0) {
      alert('Please select at least one guest to send messages to.');
      return;
    }

    let messageContent = '';
    if (messageType === 'event_update' && !updateMessage.trim()) {
      alert('Please enter an update message.');
      return;
    }
    if (messageType === 'custom' && !customMessage.trim()) {
      alert('Please enter a custom message.');
      return;
    }
    if (messageType === 'announcement' && (!announcementTitle.trim() || !announcementMessage.trim())) {
      alert('Please enter both announcement title and message.');
      return;
    }
    if (messageType === 'reminder' && !selectedTemplate) {
      alert('Please select a reminder template.');
      return;
    }

    setIsLoading(true);
    simulateProgress();

    try {
      let response: BulkMessageResponse;

      if (messageType === 'event_update') {
        response = await communicationApi.sendEventUpdate({
          guest_ids: selectedGuests,
          update_message: updateMessage,
          prefer_whatsapp: preferWhatsApp
        });
      } else if (messageType === 'announcement') {
        // For announcements, we need to prepare recipients with formatted message
        const selectedGuestObjects = guests.filter(guest => selectedGuests.includes(guest.id));
        const recipients = selectedGuestObjects.map(guest => ({
          phone: guest.phone!,
          message: `📢 ${announcementTitle}\n\n${announcementMessage}`
        }));

        response = await communicationApi.sendBulkMessages({
          recipients,
          prefer_whatsapp: preferWhatsApp
        });
      } else if (messageType === 'reminder') {
        // Use template-based reminder
        const selectedGuestObjects = guests.filter(guest => selectedGuests.includes(guest.id));
        const recipients = selectedGuestObjects.map(guest => ({
          phone: guest.phone!,
          message: templates[selectedTemplate]?.description || 'Wedding reminder'
        }));

        response = await communicationApi.sendBulkMessages({
          recipients,
          prefer_whatsapp: preferWhatsApp
        });
      } else {
        // For custom messages, we need to prepare recipients
        const selectedGuestObjects = guests.filter(guest => selectedGuests.includes(guest.id));
        const recipients = selectedGuestObjects.map(guest => ({
          phone: guest.phone!,
          message: customMessage
        }));

        response = await communicationApi.sendBulkMessages({
          recipients,
          prefer_whatsapp: preferWhatsApp
        });
      }

      setResults(response);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to send messages:', error);
      alert('Failed to send messages. Please try again.');
    } finally {
      setIsLoading(false);
      setShowProgress(false);
    }
  };

  const getSelectedGuestObjects = () => {
    return guests.filter(guest => selectedGuests.includes(guest.id));
  };

  if (showResults && results) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Message Results</h2>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{results.total_sent}</div>
              <div className="text-sm text-gray-600">Total Sent</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{results.successful}</div>
              <div className="text-sm text-gray-600">Successful</div>
              <div className="text-xs text-gray-500">
                {results.total_sent > 0 ? Math.round((results.successful / results.total_sent) * 100) : 0}%
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-xs text-gray-500">
                {results.total_sent > 0 ? Math.round((results.failed / results.total_sent) * 100) : 0}%
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {deliveryProgress.filter(p => p.status === 'delivered').length}
              </div>
              <div className="text-sm text-gray-600">Delivered</div>
            </Card>
          </div>

          {/* Real-time Delivery Progress */}
          {deliveryProgress.length > 0 && (
            <Card className="p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Progress</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {deliveryProgress.map((progress, index) => (
                  <div
                    key={progress.messageId}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      progress.status === 'delivered' 
                        ? 'bg-green-50 border-green-200' 
                        : progress.status === 'failed'
                        ? 'bg-red-50 border-red-200'
                        : progress.status === 'sending'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        progress.status === 'delivered' ? 'bg-green-500' :
                        progress.status === 'failed' ? 'bg-red-500' :
                        progress.status === 'sending' ? 'bg-blue-500 animate-pulse' :
                        'bg-gray-300'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900">{progress.guestName}</div>
                        <div className="text-sm text-gray-600">{progress.phone}</div>
                        {progress.error && (
                          <div className="text-sm text-red-600">{progress.error}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        progress.status === 'delivered' ? 'text-green-600' :
                        progress.status === 'failed' ? 'text-red-600' :
                        progress.status === 'sending' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {progress.method.toUpperCase()}
                      </div>
                      {progress.retryCount > 0 && (
                        <div className="text-xs text-yellow-600">
                          Retries: {progress.retryCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

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

          <div className="flex justify-between items-center mt-6">
            <div className="flex space-x-3">
              {results.failed > 0 && (
                <Button variant="outline">
                  Retry Failed ({results.failed})
                </Button>
              )}
              <Button variant="outline">
                Export Report
              </Button>
            </div>
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
          <h2 className="text-2xl font-bold text-gray-900">Bulk Communication</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Sending messages...</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {deliveryProgress.filter(p => p.status === 'delivered').length} delivered, {' '}
              {deliveryProgress.filter(p => p.status === 'failed').length} failed, {' '}
              {deliveryProgress.filter(p => p.status === 'sending').length} sending
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Guest Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Recipients</h3>

            {/* Group Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest Group
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {guestGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.count || 0}) - {group.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Advanced Filters for Custom Selection */}
            {selectedGroup === 'custom' && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Advanced Filters
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                </div>

                {showAdvancedFilters && (
                  <Card className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Check-in Status
                        </label>
                        <select
                          value={customFilters.checkedIn}
                          onChange={(e) => handleCustomFilterChange('checkedIn', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="all">All</option>
                          <option value="yes">Checked In</option>
                          <option value="no">Not Checked In</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Table Assignment
                        </label>
                        <select
                          value={customFilters.tableAssigned}
                          onChange={(e) => handleCustomFilterChange('tableAssigned', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="all">All</option>
                          <option value="yes">With Table</option>
                          <option value="no">Without Table</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Dietary Restrictions
                        </label>
                        <select
                          value={customFilters.dietaryRestrictions}
                          onChange={(e) => handleCustomFilterChange('dietaryRestrictions', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="all">All</option>
                          <option value="yes">With Restrictions</option>
                          <option value="no">No Restrictions</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center text-xs font-medium text-gray-600">
                          <input
                            type="checkbox"
                            checked={customFilters.hasEmail}
                            onChange={(e) => handleCustomFilterChange('hasEmail', e.target.checked)}
                            className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          Has Email Address
                        </label>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Custom Guest Selection */}
            {selectedGroup === 'custom' && !showAdvancedFilters && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Guests Manually
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedGuests.length === guests.filter(g => g.phone).length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {guests.filter(guest => guest.phone).map(guest => (
                    <div
                      key={guest.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded"
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
                        <div className="text-sm text-gray-600 flex items-center space-x-2">
                          <span>{guest.phone}</span>
                          {guest.is_checked_in && (
                            <span className="text-green-600 text-xs">✓ Checked In</span>
                          )}
                          {guest.table_number && (
                            <span className="text-blue-600 text-xs">Table {guest.table_number}</span>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Guests Summary */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm font-medium text-blue-900">
                {selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''} selected
              </div>
              {selectedGuests.length > 0 && (
                <div className="text-xs text-blue-700 mt-1">
                  {getSelectedGuestObjects().slice(0, 3).map(guest => guest.name).join(', ')}
                  {selectedGuests.length > 3 && ` and ${selectedGuests.length - 3} more`}
                </div>
              )}
            </div>
          </div>

          {/* Message Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Settings</h3>

            {/* Message Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="messageType"
                    value="event_update"
                    checked={messageType === 'event_update'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  Event Update
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="messageType"
                    value="announcement"
                    checked={messageType === 'announcement'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  Announcement
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="messageType"
                    value="reminder"
                    checked={messageType === 'reminder'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  Reminder (Template)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="messageType"
                    value="custom"
                    checked={messageType === 'custom'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  Custom Message
                </label>
              </div>
            </div>

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

            {/* Message Content */}
            {messageType === 'event_update' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Message
                </label>
                <textarea
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Enter your wedding update message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  This will be formatted with your wedding details
                </div>
              </div>
            ) : messageType === 'announcement' ? (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Enter announcement title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Announcement Message
                  </label>
                  <textarea
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Enter your announcement message..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Will be sent with 📢 icon and title formatting
                  </div>
                </div>
              </div>
            ) : messageType === 'reminder' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a template...</option>
                  <option value="day_before">Day Before Reminder</option>
                  <option value="morning_of">Morning of Wedding</option>
                  <option value="ceremony_time">Ceremony Time Reminder</option>
                  <option value="reception_time">Reception Time Reminder</option>
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  Pre-formatted reminder messages with wedding details
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your custom message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  This message will be sent as-is to all selected guests
                </div>
              </div>
            )}

            {/* Preview */}
            {messageType === 'event_update' && templates.event_update && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Preview
                </label>
                <div className="p-3 bg-gray-50 border rounded-md text-sm">
                  <div className="text-gray-600">
                    Variables: {templates.event_update.variables.join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t">
          <div className="text-sm text-gray-600">
            Ready to send to {selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessages}
              disabled={isLoading || selectedGuests.length === 0}
            >
              {isLoading ? 'Sending...' : `Send Messages (${selectedGuests.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkCommunicationInterface;