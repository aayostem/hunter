// pages/Dashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Users, 
  MousePointer, 
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  Calendar,
  AlertCircle,
  Eye,
  Clock,
  EyeOff,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { CampaignCard } from '../components/CampaignCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { formatCompactNumber, formatPercentage } from '../utils/formatters';

// Types from backend
interface DashboardStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  activeContacts: number;
  bounceRate: number;
  unsubscribeRate: number;
  complaintRate: number;
  previousPeriod: {
    totalSent: number;
    openRate: number;
    clickRate: number;
    activeContacts: number;
    bounceRate: number;
    unsubscribeRate: number;
    complaintRate: number;
  };
}

interface TimeSeriesDataPoint {
  date: string;
  opens: number;
  clicks: number;
  sent: number;
}

interface CampaignSummary {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
  sent: number;
  opens: number;
  clicks: number;
  openRate: number;
  clickRate: number;
  sentAt: string | null;
}

interface TimeRange {
  value: '7d' | '30d' | '90d' | 'custom';
  label: string;
  days: number;
}

const TIME_RANGES: TimeRange[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [selectedRange, setSelectedRange] = useState<TimeRange['value']>('30d');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [isLoadingTimeSeries, setIsLoadingTimeSeries] = useState(true);
  const [timeSeriesError, setTimeSeriesError] = useState<string | null>(null);
  
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    if (customDateRange) {
      return customDateRange;
    }

    const end = new Date().toISOString().split('T')[0];
    const start = new Date();
    const range = TIME_RANGES.find(r => r.value === selectedRange) || TIME_RANGES[1];
    start.setDate(start.getDate() - range.days);
    
    return {
      start: start.toISOString().split('T')[0],
      end,
    };
  }, [selectedRange, customDateRange]);

  // Fetch dashboard stats from backend
  const fetchStats = useCallback(async () => {
    if (!user || !token) return;

    try {
      const response = await api.get<DashboardStats>('/dashboard/stats', {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
      });
      setStats(response.data);
      setStatsError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      setStatsError(message);
      showToast(message, 'error');
    } finally {
      setIsLoadingStats(false);
    }
  }, [user, token, dateRange, showToast]);

  // Fetch time series data from backend
  const fetchTimeSeries = useCallback(async () => {
    if (!user || !token) return;

    try {
      const response = await api.get<TimeSeriesDataPoint[]>('/dashboard/timeseries', {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
          interval: selectedRange === '7d' ? 'day' : selectedRange === '30d' ? 'day' : 'week',
        },
      });
      setTimeSeriesData(response.data);
      setTimeSeriesError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch time series data';
      setTimeSeriesError(message);
      showToast(message, 'error');
    } finally {
      setIsLoadingTimeSeries(false);
    }
  }, [user, token, dateRange, selectedRange, showToast]);

  // Fetch recent campaigns from backend
  const fetchRecentCampaigns = useCallback(async () => {
    if (!user || !token) return;

    try {
      const response = await api.get<CampaignSummary[]>('/campaigns/recent', {
        params: {
          limit: 5,
        },
      });
      setRecentCampaigns(response.data);
      setCampaignsError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch campaigns';
      setCampaignsError(message);
      showToast(message, 'error');
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [user, token, showToast]);

  // Load all data
  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchTimeSeries(),
      fetchRecentCampaigns(),
    ]);
    setIsRefreshing(false);
  }, [fetchStats, fetchTimeSeries, fetchRecentCampaigns]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [dateRange]); // Reload when date range changes

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await loadAllData();
    showToast('Dashboard updated', 'success');
  }, [loadAllData, showToast]);

  // Handle export
  const handleExport = useCallback(async (format: 'pdf' | 'csv' | 'json') => {
    try {
      const response = await api.get('/dashboard/export', {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
          format,
        },
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast(`Report exported as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export report';
      showToast(message, 'error');
    }
  }, [dateRange, showToast]);

  // Calculate stat cards from real data
  const statCards = useMemo(() => {
    if (!stats) return [];

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return { value: '+100%', trend: 'up' as const };
      const change = ((current - previous) / previous) * 100;
      return {
        value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
        trend: change >= 0 ? ('up' as const) : ('down' as const),
      };
    };

    return [
      {
        id: 'sent',
        title: 'Total Sent',
        value: formatCompactNumber(stats.totalSent),
        change: calculateChange(stats.totalSent, stats.previousPeriod.totalSent),
        icon: Mail,
        color: 'bg-blue-500',
        tooltip: 'Total emails sent in selected period',
      },
      {
        id: 'openRate',
        title: 'Open Rate',
        value: formatPercentage(stats.openRate),
        change: calculateChange(stats.openRate, stats.previousPeriod.openRate),
        icon: Eye,
        color: 'bg-green-500',
        tooltip: 'Percentage of emails opened',
      },
      {
        id: 'clickRate',
        title: 'Click Rate',
        value: formatPercentage(stats.clickRate),
        change: calculateChange(stats.clickRate, stats.previousPeriod.clickRate),
        icon: MousePointer,
        color: 'bg-purple-500',
        tooltip: 'Percentage of emails clicked',
      },
      {
        id: 'contacts',
        title: 'Active Contacts',
        value: formatCompactNumber(stats.activeContacts),
        change: calculateChange(stats.activeContacts, stats.previousPeriod.activeContacts),
        icon: Users,
        color: 'bg-orange-500',
        tooltip: 'Total active contacts',
      },
      {
        id: 'bounceRate',
        title: 'Bounce Rate',
        value: formatPercentage(stats.bounceRate),
        change: calculateChange(stats.bounceRate, stats.previousPeriod.bounceRate),
        icon: AlertCircle,
        color: 'bg-red-500',
        tooltip: 'Percentage of emails that bounced',
      },
      {
        id: 'unsubscribeRate',
        title: 'Unsubscribe Rate',
        value: formatPercentage(stats.unsubscribeRate),
        change: calculateChange(stats.unsubscribeRate, stats.previousPeriod.unsubscribeRate),
        icon: EyeOff,
        color: 'bg-yellow-500',
        tooltip: 'Percentage of users who unsubscribed',
      },
    ];
  }, [stats]);

  // Prepare chart data from real backend data
  const chartData = useMemo(() => {
    return timeSeriesData.map(point => ({
      name: new Date(point.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      opens: point.opens,
      clicks: point.clicks,
      sent: point.sent,
    }));
  }, [timeSeriesData]);

  // Prepare campaign data from real backend data
  const campaignChartData = useMemo(() => {
    return recentCampaigns
      .filter(c => c.sent > 0)
      .slice(0, 10)
      .map(c => ({
        name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
        opens: c.opens,
        clicks: c.clicks,
        rate: c.openRate,
      }));
  }, [recentCampaigns]);

  // Loading state
  if (isLoadingStats || isLoadingTimeSeries || isLoadingCampaigns) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  // Error state
  if (statsError || timeSeriesError || campaignsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
        <p className="text-gray-600 mb-4">{statsError || timeSeriesError || campaignsError}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.name || 'User'}! Here's your overview
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Time range selector */}
          <div className="relative">
            <select
              value={selectedRange}
              onChange={(e) => {
                setSelectedRange(e.target.value as TimeRange['value']);
                setCustomDateRange(null);
              }}
              className="appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select time range"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
              <option value="custom">Custom Range</option>
            </select>
            <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Custom date picker */}
          {selectedRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDateRange?.start || ''}
                onChange={(e) => setCustomDateRange(prev => ({ 
                  ...prev!, 
                  start: e.target.value 
                }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customDateRange?.end || ''}
                onChange={(e) => setCustomDateRange(prev => ({ 
                  ...prev!, 
                  end: e.target.value 
                }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Action buttons */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            title={stat.tooltip}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center text-sm font-medium ${
                stat.change.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change.trend === 'up' ? (
                  <ArrowUp className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-1" />
                )}
                {stat.change.value}
              </div>
            </div>
            <h3 className="text-gray-500 text-sm mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Performance</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span className="text-xs text-gray-500">Sent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-xs text-gray-500">Opens</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                <span className="text-xs text-gray-500">Clicks</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <AnalyticsChart
              type="line"
              data={chartData}
              title="Performance Over Time"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Campaigns</h2>
            <button
              onClick={() => navigate('/campaigns')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          <div className="h-80">
            <AnalyticsChart
              type="bar"
              data={campaignChartData}
              title="Opens by Campaign"
            />
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your latest email campaigns and their performance
            </p>
          </div>
          <button
            onClick={() => navigate('/campaigns')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </button>
        </div>
        
        {recentCampaigns.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first email campaign</p>
            <button
              onClick={() => navigate('/campaigns/create')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Create Campaign
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/campaigns/create')}
          className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          <Mail className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Create Campaign</h3>
          <p className="text-sm text-blue-100">Start a new email campaign</p>
        </button>

        <button
          onClick={() => navigate('/templates')}
          className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all"
        >
          <FileText className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Browse Templates</h3>
          <p className="text-sm text-purple-100">Choose from our templates</p>
        </button>

        <button
          onClick={() => navigate('/contacts/import')}
          className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all"
        >
          <Users className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Import Contacts</h3>
          <p className="text-sm text-green-100">Add new contacts to your list</p>
        </button>
      </div>

      {/* Refresh Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <LoadingSpinner size="sm" />
            <span className="text-gray-700">Refreshing dashboard...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;