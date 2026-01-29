import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Star,
  Calendar,
  DollarSign,
  Target,
  Award,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { VendorLeadStatsResponse, vendorApi } from '../../lib/api';

interface AnalyticsData {
  leadStats: VendorLeadStatsResponse;
  monthlyLeads: Array<{ month: string; leads: number; conversions: number }>;
  leadSources: Array<{ source: string; count: number; color: string }>;
  performanceMetrics: {
    responseTime: number;
    satisfactionScore: number;
    repeatCustomers: number;
  };
}

const VendorAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load lead statistics
      const leadStats = await vendorApi.getLeadStats();
      
      // Mock data for demonstration - in real app, these would come from API
      const mockAnalytics: AnalyticsData = {
        leadStats,
        monthlyLeads: [
          { month: 'Jan', leads: 12, conversions: 3 },
          { month: 'Feb', leads: 18, conversions: 5 },
          { month: 'Mar', leads: 15, conversions: 4 },
          { month: 'Apr', leads: 22, conversions: 7 },
          { month: 'May', leads: 28, conversions: 9 },
          { month: 'Jun', leads: 25, conversions: 8 },
        ],
        leadSources: [
          { source: 'Direct Search', count: 45, color: '#3B82F6' },
          { source: 'Category Browse', count: 32, color: '#10B981' },
          { source: 'Referrals', count: 18, color: '#F59E0B' },
          { source: 'Reviews', count: 12, color: '#EF4444' },
        ],
        performanceMetrics: {
          responseTime: 2.5, // hours
          satisfactionScore: 4.7,
          repeatCustomers: 23
        }
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-6 bg-secondary-200 rounded mb-4"></div>
                <div className="h-8 bg-secondary-200 rounded"></div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-6 bg-secondary-200 rounded mb-4"></div>
                <div className="h-64 bg-secondary-200 rounded"></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-12 text-center">
        <BarChart className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          No Analytics Data
        </h3>
        <p className="text-secondary-600">
          Analytics will appear here once you start receiving leads
        </p>
      </Card>
    );
  }

  const { leadStats, monthlyLeads, leadSources, performanceMetrics } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-xl font-semibold text-secondary-900">
            Business Analytics
          </h2>
          <p className="text-secondary-600 mt-1">
            Track your performance and lead conversion metrics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Total Leads</p>
              <p className="text-2xl font-bold text-secondary-900">{leadStats.total_leads}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12% from last month</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-secondary-900">{leadStats.conversion_rate}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+5% from last month</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Active Leads</p>
              <p className="text-2xl font-bold text-secondary-900">{leadStats.recent_leads}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <MessageSquare className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-secondary-600">Needs attention</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Satisfaction</p>
              <p className="text-2xl font-bold text-secondary-900">{performanceMetrics.satisfactionScore}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Award className="h-4 w-4 text-purple-500 mr-1" />
            <span className="text-purple-600">Excellent rating</span>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Leads Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Leads & Conversions Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyLeads}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="leads" fill="#3B82F6" name="Total Leads" />
              <Bar dataKey="conversions" fill="#10B981" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Lead Sources */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Lead Sources
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadSources}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {leadSources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">Response Time</h3>
              <p className="text-sm text-secondary-600">Average time to respond</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-900">
            {performanceMetrics.responseTime}h
          </div>
          <div className="mt-2 text-sm text-green-600">
            ✓ Within industry standard
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Star className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">Customer Rating</h3>
              <p className="text-sm text-secondary-600">Average review score</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-900">
            {performanceMetrics.satisfactionScore}/5.0
          </div>
          <div className="mt-2 text-sm text-green-600">
            ✓ Excellent performance
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">Repeat Customers</h3>
              <p className="text-sm text-secondary-600">Returning clients</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-900">
            {performanceMetrics.repeatCustomers}%
          </div>
          <div className="mt-2 text-sm text-blue-600">
            ↗ Growing loyalty
          </div>
        </Card>
      </div>

      {/* Lead Status Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Lead Status Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(leadStats.by_status).map(([status, count]) => (
            <div key={status} className="text-center p-4 bg-secondary-50 rounded-lg">
              <div className="text-2xl font-bold text-secondary-900 mb-1">
                {count}
              </div>
              <div className="text-sm text-secondary-600 capitalize">
                {status} Leads
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tips for Improvement */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">
          Tips to Improve Performance
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Respond to new leads within 2 hours to increase conversion rates</li>
          <li>• Update your profile regularly with recent work and testimonials</li>
          <li>• Follow up with contacted leads within 24-48 hours</li>
          <li>• Ask satisfied customers to leave reviews to boost your rating</li>
          <li>• Offer competitive pricing and clear service packages</li>
        </ul>
      </Card>
    </div>
  );
};

export default VendorAnalytics;