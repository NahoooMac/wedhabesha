import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface LiveMonitoringDashboardProps {
  weddingId: number;
}

interface GuestStatus {
  id: number;
  name: string;
  table_number?: number;
  is_checked_in: boolean;
  checked_in_at?: string;
  qr_code: string;
}

interface CheckInStatsData {
  total_guests: number;
  checked_in_count: number;
  pending_count: number;
  checkin_rate: number;
  recent_checkins: Array<{
    guest_name: string;
    checked_in_at: string;
    method: string;
  }>;
}

interface ArrivalPattern {
  hour: number;
  count: number;
  percentage: number;
}

const LiveMonitoringDashboard: React.FC<LiveMonitoringDashboardProps> = ({ weddingId }) => {
  const [stats, setStats] = useState<CheckInStatsData | null>(null);
  const [guests, setGuests] = useState<GuestStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'pending'>('all');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setError(null);
      
      const staffToken = localStorage.getItem('access_token');
      if (!staffToken) {
        throw new Error('Staff session expired. Please log in again.');
      }

      // Fetch stats and guests in parallel
      const [statsResponse, guestsResponse] = await Promise.all([
        fetch('/api/v1/checkin/stats', {
          headers: { 'Authorization': `Bearer ${staffToken}` }
        }),
        fetch('/api/v1/checkin/guests', {
          headers: { 'Authorization': `Bearer ${staffToken}` }
        })
      ]);

      if (!statsResponse.ok || !guestsResponse.ok) {
        throw new Error('Failed to load monitoring data');
      }

      const [statsData, guestsData] = await Promise.all([
        statsResponse.json(),
        guestsResponse.json()
      ]);

      setStats(statsData);
      setGuests(guestsData);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectWebSocket = React.useCallback(() => {
    const staffToken = localStorage.getItem('access_token');
    if (!staffToken) {
      setConnectionError('No staff session token available');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/wedding/${weddingId}?token=${staffToken}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('WebSocket connected for live monitoring');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'stats_update') {
            setStats(message.data);
            setLastUpdate(new Date());
          } else if (message.type === 'checkin_update') {
            // Refresh data when check-in occurs
            fetchData();
          } else if (message.type === 'guest_update') {
            // Refresh guest list when guest data changes
            fetchData();
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        setConnectionError('WebSocket connection failed');
        console.error('WebSocket error:', error);
      };

    } catch (err) {
      setConnectionError('Failed to establish WebSocket connection');
      console.error('WebSocket setup error:', err);
    }
  }, [weddingId, fetchData]);

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  };

  useEffect(() => {
    fetchData();
    connectWebSocket();
    
    // Auto-refresh every 30 seconds as fallback
    const interval = setInterval(fetchData, 30000);
    
    return () => {
      clearInterval(interval);
      disconnectWebSocket();
    };
  }, [weddingId, fetchData, connectWebSocket]);

  // Calculate arrival patterns by hour
  const arrivalPatterns = React.useMemo(() => {
    if (!stats?.recent_checkins) return [];

    const hourCounts: { [hour: number]: number } = {};
    
    stats.recent_checkins.forEach(checkin => {
      const checkinTime = new Date(checkin.checked_in_at);
      const hour = checkinTime.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const patterns: ArrivalPattern[] = [];
    const totalCheckins = stats.recent_checkins.length;

    for (let hour = 0; hour < 24; hour++) {
      const count = hourCounts[hour] || 0;
      patterns.push({
        hour,
        count,
        percentage: totalCheckins > 0 ? (count / totalCheckins) * 100 : 0
      });
    }

    return patterns.filter(p => p.count > 0).sort((a, b) => b.count - a.count);
  }, [stats]);

  // Filter guests based on search and status
  const filteredGuests = React.useMemo(() => {
    let filtered = guests;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(guest => 
        guest.name.toLowerCase().includes(term) ||
        (guest.table_number && guest.table_number.toString().includes(term))
      );
    }
    
    // Apply status filter
    if (filterStatus === 'checked_in') {
      filtered = filtered.filter(g => g.is_checked_in);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(g => !g.is_checked_in);
    }
    
    return filtered;
  }, [guests, searchTerm, filterStatus]);

  const checkedInGuests = filteredGuests.filter(g => g.is_checked_in);
  const pendingGuests = filteredGuests.filter(g => !g.is_checked_in);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh and connection status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Monitoring</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={connectWebSocket}
            variant="outline"
            size="sm"
            disabled={isConnected}
          >
            🔗 {isConnected ? 'Connected' : 'Connect'}
          </Button>
          <Button
            onClick={fetchData}
            variant="outline"
            disabled={isLoading}
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {connectionError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <p className="text-yellow-800">WebSocket: {connectionError}</p>
          </div>
        </div>
      )}

      {/* Real-time Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total_guests}</div>
            <div className="text-sm text-gray-600">Total Guests</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.checked_in_count}</div>
            <div className="text-sm text-gray-600">Arrived</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending_count}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.checkin_rate}%</div>
            <div className="text-sm text-gray-600">Arrival Rate</div>
          </Card>
        </div>
      )}

      {/* Arrival Patterns */}
      {arrivalPatterns.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Arrival Patterns by Hour
          </h3>
          <div className="space-y-2">
            {arrivalPatterns.slice(0, 6).map((pattern) => (
              <div key={pattern.hour} className="flex items-center space-x-4">
                <div className="w-16 text-sm text-gray-600">
                  {pattern.hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(pattern.percentage, 5)}%` }}
                  ></div>
                </div>
                <div className="w-12 text-sm text-gray-900 font-medium">
                  {pattern.count}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Guest Status Overview with Enhanced Filtering */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search and Filter */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Guest Status Overview
              </h3>
              <div className="text-sm text-gray-600">
                {filteredGuests.length} of {guests.length} guests
              </div>
            </div>
            
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guests or table numbers..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Status Filter Buttons */}
            <div className="flex space-x-2">
              <Button
                onClick={() => setFilterStatus('all')}
                variant={filterStatus === 'all' ? 'primary' : 'outline'}
                size="sm"
                className="flex-1"
              >
                All ({guests.length})
              </Button>
              <Button
                onClick={() => setFilterStatus('checked_in')}
                variant={filterStatus === 'checked_in' ? 'primary' : 'outline'}
                size="sm"
                className="flex-1"
              >
                ✅ Arrived ({checkedInGuests.length})
              </Button>
              <Button
                onClick={() => setFilterStatus('pending')}
                variant={filterStatus === 'pending' ? 'primary' : 'outline'}
                size="sm"
                className="flex-1"
              >
                ⏳ Pending ({pendingGuests.length})
              </Button>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {checkedInGuests.length}
                </div>
                <div className="text-sm text-green-800">Checked In</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">
                  {pendingGuests.length}
                </div>
                <div className="text-sm text-yellow-800">Pending</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Check-in History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Check-ins
          </h3>
          {stats?.recent_checkins && stats.recent_checkins.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recent_checkins.slice(0, 8).map((checkin, index) => (
                <div
                  key={`${checkin.guest_name}-${checkin.checked_in_at}-${index}`}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {checkin.guest_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(checkin.checked_in_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {checkin.method === 'QR_SCAN' ? '📱' : '👤'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">👥</div>
              <p>No check-ins yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* Detailed Guest List */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Guest List ({filteredGuests.length})
            </h3>
            <div className="text-sm text-gray-600">
              {filterStatus === 'all' ? 'All guests' : 
               filterStatus === 'checked_in' ? 'Checked in guests' : 'Pending guests'}
            </div>
          </div>

          {filteredGuests.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchTerm || filterStatus !== 'all' ? (
                <div>
                  <p>No guests found matching your criteria.</p>
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">👥</div>
                  <p>No guests found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    guest.is_checked_in 
                      ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      guest.is_checked_in ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                    
                    <div>
                      <p className="font-medium text-gray-900">
                        {guest.name}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        {guest.table_number && (
                          <>
                            <span>Table {guest.table_number}</span>
                            <span>•</span>
                          </>
                        )}
                        <span className="font-mono text-xs">
                          {guest.qr_code.slice(-8)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {guest.is_checked_in ? (
                      <div>
                        <div className="text-sm font-medium text-green-700">
                          ✅ Checked In
                        </div>
                        {guest.checked_in_at && (
                          <div className="text-xs text-green-600">
                            {new Date(guest.checked_in_at).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-yellow-700">
                        ⏳ Pending
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Enhanced Duplicate Prevention Notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 text-xl">🛡️</div>
          <div>
            <h4 className="font-medium text-blue-900">Advanced Duplicate Prevention</h4>
            <div className="text-sm text-blue-800 mt-1 space-y-1">
              <p>
                • The system automatically prevents duplicate check-ins across all entry points
              </p>
              <p>
                • If a guest attempts to check in again, you'll see their original check-in time
              </p>
              <p>
                • All duplicate attempts are logged for security and audit purposes
              </p>
              <p>
                • Real-time synchronization ensures consistency across multiple staff devices
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LiveMonitoringDashboard;