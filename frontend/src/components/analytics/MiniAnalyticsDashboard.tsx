import React from 'react';
import { Users, UserCheck, Heart, MessageSquare, TrendingUp } from 'lucide-react';
import AnalyticsWidget from './AnalyticsWidget';
import { useAnalytics } from '../../contexts/AnalyticsContext';

interface MiniAnalyticsDashboardProps {
  weddingId: number;
  showTitle?: boolean;
  onViewFullAnalytics?: () => void;
}

const MiniAnalyticsDashboard: React.FC<MiniAnalyticsDashboardProps> = ({
  weddingId,
  showTitle = true,
  onViewFullAnalytics
}) => {
  const { analyticsData, isLoading, setWeddingId } = useAnalytics();

  React.useEffect(() => {
    setWeddingId(weddingId);
  }, [weddingId, setWeddingId]);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Analytics Overview</h3>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <AnalyticsWidget
              key={i}
              title="Loading..."
              value="--"
              isLoading={true}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500 dark:text-slate-400">No analytics data available</p>
      </div>
    );
  }

  const { overview, performance } = analyticsData;

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Analytics Overview</h3>
          {onViewFullAnalytics && (
            <button
              onClick={onViewFullAnalytics}
              className="text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium flex items-center space-x-1"
            >
              <span>View Full Analytics</span>
              <TrendingUp className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsWidget
          title="Total Guests"
          value={overview.total_guests}
          subtitle="Invited to wedding"
          trend={{
            direction: 'up',
            value: '+12',
            label: 'this week'
          }}
          icon={<Users className="w-7 h-7" />}
          color="blue"
          onClick={onViewFullAnalytics}
        />

        <AnalyticsWidget
          title="Check-in Rate"
          value={formatPercentage(performance.checkin_rate)}
          subtitle={`${overview.checked_in_count} checked in`}
          trend={{
            direction: performance.checkin_rate >= 75 ? 'up' : performance.checkin_rate >= 50 ? 'neutral' : 'down',
            value: performance.checkin_rate >= 75 ? 'Good' : performance.checkin_rate >= 50 ? 'Fair' : 'Low',
            label: 'rate'
          }}
          icon={<UserCheck className="w-7 h-7" />}
          color="green"
          onClick={onViewFullAnalytics}
        />

        <AnalyticsWidget
          title="RSVP Rate"
          value={formatPercentage(performance.rsvp_response_rate)}
          subtitle={`${overview.rsvp_accepted} accepted`}
          trend={{
            direction: performance.rsvp_response_rate >= 80 ? 'up' : performance.rsvp_response_rate >= 60 ? 'neutral' : 'down',
            value: performance.rsvp_response_rate >= 80 ? 'Excellent' : performance.rsvp_response_rate >= 60 ? 'Good' : 'Needs attention',
            label: 'response'
          }}
          icon={<Heart className="w-7 h-7" />}
          color="purple"
          onClick={onViewFullAnalytics}
        />

        <AnalyticsWidget
          title="Messages Sent"
          value={overview.messages_sent}
          subtitle={`${formatPercentage(performance.message_delivery_rate)} delivered`}
          trend={{
            direction: performance.message_delivery_rate >= 90 ? 'up' : performance.message_delivery_rate >= 80 ? 'neutral' : 'down',
            value: formatPercentage(performance.message_delivery_rate),
            label: 'delivery rate'
          }}
          icon={<MessageSquare className="w-7 h-7" />}
          color="yellow"
          onClick={onViewFullAnalytics}
        />
      </div>
    </div>
  );
};

export default MiniAnalyticsDashboard;