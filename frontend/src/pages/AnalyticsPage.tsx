import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, MessageSquare, DollarSign, Star } from 'lucide-react';
import UnifiedAnalyticsDashboard from '../components/analytics/UnifiedAnalyticsDashboard';
import { AnalyticsProvider } from '../contexts/AnalyticsContext';

const AnalyticsPage: React.FC = () => {
  const { weddingId } = useParams<{ weddingId: string }>();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'overview' | 'guests' | 'rsvp' | 'communication' | 'budget' | 'vendors'>('overview');

  const weddingIdNum = weddingId ? parseInt(weddingId) : 1;

  const viewOptions = [
    {
      key: 'overview' as const,
      label: 'Overview',
      icon: BarChart3,
      description: 'Complete wedding analytics overview'
    },
    {
      key: 'guests' as const,
      label: 'Guests',
      icon: Users,
      description: 'Guest check-ins and attendance'
    },
    {
      key: 'rsvp' as const,
      label: 'RSVP',
      icon: MessageSquare,
      description: 'RSVP responses and trends'
    },
    {
      key: 'communication' as const,
      label: 'Communication',
      icon: MessageSquare,
      description: 'Message delivery and engagement'
    },
    {
      key: 'budget' as const,
      label: 'Budget',
      icon: DollarSign,
      description: 'Budget utilization and spending'
    },
    {
      key: 'vendors' as const,
      label: 'Vendors',
      icon: Star,
      description: 'Vendor status and performance'
    }
  ];

  return (
    <AnalyticsProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Wedding Analytics</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Comprehensive insights and performance metrics for your wedding
                </p>
              </div>
            </div>

            {/* View Selector */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {viewOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      onClick={() => setActiveView(option.key)}
                      className={`p-4 rounded-xl text-left transition-all duration-200 ${
                        activeView === option.key
                          ? 'bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-transparent text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-xs opacity-75 line-clamp-2">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <UnifiedAnalyticsDashboard
            weddingId={weddingIdNum}
            view={activeView}
          />
        </div>
      </div>
    </AnalyticsProvider>
  );
};

export default AnalyticsPage;