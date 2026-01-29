import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CheckInHistoryProps {
  weddingId: number;
}

interface CheckInRecord {
  id: number;
  guest_name: string;
  checked_in_at: string;
  method: string;
  checked_in_by: string;
  table_number?: number;
}

const CheckInHistory: React.FC<CheckInHistoryProps> = ({ weddingId }) => {
  const [history, setHistory] = useState<CheckInRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [methodFilter, setMethodFilter] = useState<'all' | 'QR_SCAN' | 'MANUAL'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'last_hour' | 'last_30min'>('all');

  const fetchHistory = React.useCallback(async () => {
    try {
      setError(null);
      
      const staffToken = localStorage.getItem('access_token');
      if (!staffToken) {
        throw new Error('Staff session expired. Please log in again.');
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append('limit', '100');
      
      if (methodFilter !== 'all') {
        params.append('method_filter', methodFilter);
      }
      
      if (timeFilter !== 'all') {
        params.append('time_filter', timeFilter);
      }

      const response = await fetch(`/api/v1/checkin/history?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${staffToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load check-in history');
      }

      const historyData: CheckInRecord[] = await response.json();
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load check-in history');
    } finally {
      setIsLoading(false);
    }
  }, [methodFilter, timeFilter]);

  useEffect(() => {
    fetchHistory();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHistory, 30000);
    
    return () => clearInterval(interval);
  }, [weddingId, methodFilter, timeFilter, fetchHistory]); // Re-fetch when filters change

  // Filter and sort history with enhanced filtering
  const filteredAndSortedHistory = React.useMemo(() => {
    let filtered = history;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = history.filter(record => 
        record.guest_name.toLowerCase().includes(term) ||
        (record.table_number && record.table_number.toString().includes(term))
      );
    }

    // Apply method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(record => record.method === methodFilter);
    }

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoffTime = new Date();
      
      if (timeFilter === 'last_hour') {
        cutoffTime.setHours(now.getHours() - 1);
      } else if (timeFilter === 'last_30min') {
        cutoffTime.setMinutes(now.getMinutes() - 30);
      }
      
      filtered = filtered.filter(record => 
        new Date(record.checked_in_at) >= cutoffTime
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'time') {
        const timeA = new Date(a.checked_in_at).getTime();
        const timeB = new Date(b.checked_in_at).getTime();
        comparison = timeA - timeB;
      } else if (sortBy === 'name') {
        comparison = a.guest_name.localeCompare(b.guest_name);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [history, searchTerm, sortBy, sortOrder, methodFilter, timeFilter]);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: date.toLocaleDateString()
      };
    } catch {
      return { time: 'Unknown', date: 'Unknown' };
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'qr_scan':
        return '📱';
      case 'manual':
        return '👤';
      default:
        return '✓';
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'qr_scan':
        return 'QR Scan';
      case 'manual':
        return 'Manual';
      default:
        return method;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Check-In History
          </h3>
          <Button
            onClick={fetchHistory}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            🔄 Refresh
          </Button>
        </div>

        {/* Enhanced Search and Filter Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by guest name or table number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'time' | 'name')}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="time">Sort by Time</option>
                <option value="name">Sort by Name</option>
              </select>
              
              <Button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                variant="outline"
                size="sm"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as 'all' | 'QR_SCAN' | 'MANUAL')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Methods</option>
              <option value="QR_SCAN">QR Scan Only</option>
              <option value="MANUAL">Manual Only</option>
            </select>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as 'all' | 'last_hour' | 'last_30min')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="last_hour">Last Hour</option>
              <option value="last_30min">Last 30 Minutes</option>
            </select>

            {(searchTerm || methodFilter !== 'all' || timeFilter !== 'all') && (
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setMethodFilter('all');
                  setTimeFilter('all');
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary with Filter Info */}
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Showing {filteredAndSortedHistory.length} of {history.length} check-ins</span>
          <div className="flex items-center space-x-4">
            {methodFilter !== 'all' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {methodFilter === 'QR_SCAN' ? '📱 QR Only' : '👤 Manual Only'}
              </span>
            )}
            {timeFilter !== 'all' && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                {timeFilter === 'last_hour' ? '⏰ Last Hour' : '⏰ Last 30min'}
              </span>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* History List */}
        {!error && filteredAndSortedHistory.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {searchTerm || methodFilter !== 'all' || timeFilter !== 'all' ? (
              <div>
                <p>No check-ins found matching your filters.</p>
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setMethodFilter('all');
                    setTimeFilter('all');
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">📋</div>
                <p>No check-ins recorded yet</p>
              </div>
            )}
          </div>
        )}

        {!error && filteredAndSortedHistory.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAndSortedHistory.map((record) => {
              const { time, date } = formatTime(record.checked_in_at);
              
              return (
                <div
                  key={`${record.guest_name}-${record.checked_in_at}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">
                          {getMethodIcon(record.method)}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-900">
                        {record.guest_name}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{time}</span>
                        <span>•</span>
                        <span>{date}</span>
                        {record.table_number && (
                          <>
                            <span>•</span>
                            <span>Table {record.table_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {getMethodLabel(record.method)}
                    </div>
                    <div className="text-xs text-gray-500">
                      by {record.checked_in_by}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export default CheckInHistory;