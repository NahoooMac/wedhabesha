import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MessageLog {
  id: number;
  message_type: string;
  method: string;
  recipient_phone: string;
  recipient_name?: string;
  status: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  retry_count: number;
}

interface CommunicationStats {
  total_messages: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  delivery_rate: number;
  failure_rate: number;
}

interface CommunicationHistoryProps {
  weddingId: number;
}

const CommunicationHistory: React.FC<CommunicationHistoryProps> = ({ weddingId }) => {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    const loadCommunicationData = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock message logs
      const mockMessages: MessageLog[] = [
        {
          id: 1,
          message_type: 'qr_invitation',
          method: 'whatsapp',
          recipient_phone: '+251911234567',
          recipient_name: 'John Doe',
          status: 'delivered',
          created_at: '2024-01-20T10:30:00Z',
          sent_at: '2024-01-20T10:30:05Z',
          delivered_at: '2024-01-20T10:30:15Z',
          retry_count: 0
        },
        {
          id: 2,
          message_type: 'qr_invitation',
          method: 'sms',
          recipient_phone: '+251922345678',
          recipient_name: 'Jane Smith',
          status: 'sent',
          created_at: '2024-01-20T10:30:00Z',
          sent_at: '2024-01-20T10:30:08Z',
          retry_count: 0
        },
        {
          id: 3,
          message_type: 'event_update',
          method: 'whatsapp',
          recipient_phone: '+251933456789',
          recipient_name: 'Bob Johnson',
          status: 'failed',
          created_at: '2024-01-20T11:15:00Z',
          error_message: 'Invalid phone number format',
          retry_count: 2
        },
        {
          id: 4,
          message_type: 'qr_invitation',
          method: 'whatsapp',
          recipient_phone: '+251944567890',
          recipient_name: 'Alice Brown',
          status: 'delivered',
          created_at: '2024-01-20T10:30:00Z',
          sent_at: '2024-01-20T10:30:12Z',
          delivered_at: '2024-01-20T10:30:25Z',
          retry_count: 0
        },
        {
          id: 5,
          message_type: 'custom',
          method: 'sms',
          recipient_phone: '+251955678901',
          recipient_name: 'Charlie Wilson',
          status: 'pending',
          created_at: '2024-01-20T12:00:00Z',
          retry_count: 0
        }
      ];

      // Mock statistics
      const mockStats: CommunicationStats = {
        total_messages: 50,
        sent: 45,
        delivered: 40,
        failed: 5,
        pending: 0,
        delivery_rate: 0.8,
        failure_rate: 0.1
      };

      setMessages(mockMessages);
      setStats(mockStats);
      setIsLoading(false);
    };

    loadCommunicationData();
  }, [weddingId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'sent':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'qr_invitation':
        return 'QR Invitation';
      case 'event_update':
        return 'Event Update';
      case 'reminder':
        return 'Reminder';
      case 'custom':
        return 'Custom Message';
      default:
        return type;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'whatsapp':
        return '📱';
      case 'sms':
        return '💬';
      case 'email':
        return '📧';
      default:
        return '📞';
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesFilter = filter === 'all' || message.status === filter;
    const matchesSearch = searchTerm === '' || 
      message.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.recipient_phone.includes(searchTerm);
    
    return matchesFilter && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Communication History</h2>
        <Button variant="outline" size="sm">
          Export History
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total_messages}</div>
            <div className="text-sm text-gray-600">Total Messages</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-sm text-gray-600">Delivered</div>
            <div className="text-xs text-gray-500">
              {(stats.delivery_rate * 100).toFixed(1)}% rate
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            <div className="text-sm text-gray-600">Sent</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-xs text-gray-500">
              {(stats.failure_rate * 100).toFixed(1)}% rate
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="delivered">Delivered</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Message List */}
      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-gray-500">
              {searchTerm || filter !== 'all' 
                ? 'No messages match your filters' 
                : 'No messages sent yet'
              }
            </div>
          </Card>
        ) : (
          filteredMessages.map(message => (
            <Card key={message.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-lg">{getMethodIcon(message.method)}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {message.recipient_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {message.recipient_phone}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {getMessageTypeLabel(message.message_type)}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      Created: {new Date(message.created_at).toLocaleString()}
                    </div>
                    {message.sent_at && (
                      <div>
                        Sent: {new Date(message.sent_at).toLocaleString()}
                      </div>
                    )}
                    {message.delivered_at && (
                      <div>
                        Delivered: {new Date(message.delivered_at).toLocaleString()}
                      </div>
                    )}
                    {message.error_message && (
                      <div className="text-red-600">
                        Error: {message.error_message}
                      </div>
                    )}
                    {message.retry_count > 0 && (
                      <div className="text-yellow-600">
                        Retries: {message.retry_count}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {message.status === 'failed' && (
                    <Button variant="outline" size="sm">
                      Retry
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredMessages.length > 0 && (
        <div className="text-center">
          <Button variant="outline">
            Load More Messages
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommunicationHistory;