import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CommunicationAnalyticsProps {
  weddingId: number;
}

interface AnalyticsData {
  totalMessages: number;
  deliveryRate: number;
  failureRate: number;
  methodBreakdown: {
    whatsapp: number;
    sms: number;
    email: number;
  };
  messageTypeBreakdown: {
    qr_invitation: number;
    event_update: number;
    reminder: number;
    custom: number;
  };
  recentActivity: Array<{
    date: string;
    messages: number;
    deliveryRate: number;
  }>;
  topFailureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

const CommunicationAnalytics: React.FC<CommunicationAnalyticsProps> = ({ weddingId }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock analytics data
      const mockAnalytics: AnalyticsData = {
        totalMessages: 156,
        deliveryRate: 0.87,
        failureRate: 0.13,
        methodBreakdown: {
          whatsapp: 120,
          sms: 30,
          email: 6
        },
        messageTypeBreakdown: {
          qr_invitation: 80,
          event_update: 45,
          reminder: 20,
          custom: 11
        },
        recentActivity: [
          { date: '2024-01-20', messages: 25, deliveryRate: 0.92 },
          { date: '2024-01-19', messages: 18, deliveryRate: 0.89 },
          { date: '2024-01-18', messages: 32, deliveryRate: 0.85 },
          { date: '2024-01-17', messages: 12, deliveryRate: 0.91 },
          { date: '2024-01-16', messages: 8, deliveryRate: 0.88 },
          { date: '2024-01-15', messages: 15, deliveryRate: 0.87 },
          { date: '2024-01-14', messages: 22, deliveryRate: 0.83 }
        ],
        topFailureReasons: [
          { reason: 'Invalid phone number', count: 8, percentage: 40 },
          { reason: 'Network timeout', count: 5, percentage: 25 },
          { reason: 'Service unavailable', count: 4, percentage: 20 },
          { reason: 'Rate limit exceeded', count: 3, percentage: 15 }
        ]
      };

      setAnalytics(mockAnalytics);
      setIsLoading(false);
    };

    loadAnalytics();
  }, [weddingId, timeRange]);

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

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'qr_invitation':
        return 'QR Invitations';
      case 'event_update':
        return 'Event Updates';
      case 'reminder':
        return 'Reminders';
      case 'custom':
        return 'Custom Messages';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-6 text-center">
        <div className="text-gray-500">No analytics data available</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Communication Analytics</h2>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-3xl font-bold text-blue-600">{analytics.totalMessages}</div>
          <div className="text-sm text-gray-600">Total Messages Sent</div>
          <div className="text-xs text-gray-500 mt-1">
            Across all communication channels
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-3xl font-bold text-green-600">
            {(analytics.deliveryRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Delivery Rate</div>
          <div className="text-xs text-gray-500 mt-1">
            Successfully delivered messages
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-3xl font-bold text-red-600">
            {(analytics.failureRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Failure Rate</div>
          <div className="text-xs text-gray-500 mt-1">
            Messages that failed to deliver
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication Methods</h3>
          <div className="space-y-4">
            {Object.entries(analytics.methodBreakdown).map(([method, count]) => (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getMethodIcon(method)}</span>
                  <span className="font-medium text-gray-900 capitalize">{method}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-600">{count} messages</div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(count / analytics.totalMessages) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 w-12">
                    {((count / analytics.totalMessages) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Message Type Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Types</h3>
          <div className="space-y-4">
            {Object.entries(analytics.messageTypeBreakdown).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900">{getMessageTypeLabel(type)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-600">{count} messages</div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(count / analytics.totalMessages) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 w-12">
                    {((count / analytics.totalMessages) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {analytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <div className="font-medium text-gray-900">
                    {new Date(activity.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {activity.messages} messages sent
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    activity.deliveryRate >= 0.9 ? 'text-green-600' : 
                    activity.deliveryRate >= 0.8 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(activity.deliveryRate * 100).toFixed(1)}% delivered
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Failure Reasons */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Failure Reasons</h3>
          <div className="space-y-3">
            {analytics.topFailureReasons.map((reason, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{reason.reason}</div>
                  <div className="text-sm text-gray-600">{reason.count} occurrences</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${reason.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 w-8">
                    {reason.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Recommendations</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div>• WhatsApp has the highest delivery rate - prioritize it for important messages</div>
          <div>• {analytics.topFailureReasons[0]?.reason.toLowerCase()} is the top failure reason - consider validating phone numbers</div>
          <div>• Your overall delivery rate is {(analytics.deliveryRate * 100).toFixed(1)}% - industry average is 85%</div>
          <div>• Consider sending reminders to guests who haven't received messages</div>
        </div>
      </Card>
    </div>
  );
};

export default CommunicationAnalytics;