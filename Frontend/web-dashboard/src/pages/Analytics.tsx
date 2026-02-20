import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Eye,
  MousePointer,
  Mail,
  Smartphone,
  Monitor,
  Tablet,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  DownloadCloud,
  ChevronDown,
} from 'lucide-react';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { ChartDataPoint, ChartSeries } from '../components/AnalyticsChart';

// Types
export interface OverviewMetrics {
  totalEmails: number;
  totalOpens: number;
  totalClicks: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  ctr: number;
  bounceRate: number;
  unsubscribeRate: number;
  spamRate: number;
  deliveryRate: number;
  previousPeriod?: {
    openRate: number;
    clickRate: number;
    ctr: number;
  };
}

export interface CampaignPerformance {
  id: string;
  name: string;
  sent: number;
  opens: number;
  clicks: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  date: string;
  status: 'active' | 'completed' | 'draft' | 'scheduled';
}

export interface DeviceData {
  device: string;
  count: number;
  percentage: number;
  icon: React.FC<{ className?: string }>;
}

export interface LocationData {
  country: string;
  code: string;
  flag?: string;
  opens: number;
  clicks: number;
  percentage: number;
}

export interface TimeSeriesData {
  date: string;
  opens: number;
  clicks: number;
  deliveries: number;
  unsubscribes?: number;
  complaints?: number;
}

export interface TopLink {
  url: string;
  clicks: number;
  percentage: number;
  uniqueClicks?: number;
}

export interface AnalyticsData {
  overview: OverviewMetrics;
  campaigns: CampaignPerformance[];
  deviceBreakdown: DeviceData[];
  locationBreakdown: LocationData[];
  timeSeriesData: TimeSeriesData[];
  topLinks: TopLink[];
}

// Mock data generators
const generateMockOverview = (): OverviewMetrics => ({
  totalEmails: 124893,
  totalOpens: 85672,
  totalClicks: 23456,
  uniqueOpens: 45234,
  uniqueClicks: 18904,
  openRate: 68.2,
  clickRate: 27.4,
  ctr: 18.9,
  bounceRate: 2.3,
  unsubscribeRate: 0.8,
  spamRate: 0.2,
  deliveryRate: 97.7,
  previousPeriod: {
    openRate: 65.1,
    clickRate: 25.8,
    ctr: 17.2,
  },
});

const generateMockCampaigns = (): CampaignPerformance[] => [
  { id: '1', name: 'Welcome Series', sent: 12345, opens: 8567, clicks: 2345, openRate: 69.3, clickRate: 18.9, bounceRate: 1.2, date: '2024-02-13', status: 'completed' },
  { id: '2', name: 'Product Launch', sent: 87654, opens: 34567, clicks: 12345, openRate: 60.8, clickRate: 21.7, bounceRate: 2.1, date: '2024-02-12', status: 'active' },
  { id: '3', name: 'Newsletter Feb', sent: 43210, opens: 23456, clicks: 5678, openRate: 72.1, clickRate: 24.2, bounceRate: 1.8, date: '2024-02-11', status: 'completed' },
  { id: '4', name: 'Feedback Survey', sent: 9876, opens: 4321, clicks: 1234, openRate: 55.5, clickRate: 27.9, bounceRate: 3.4, date: '2024-02-10', status: 'completed' },
  { id: '5', name: 'Holiday Promotion', sent: 23456, opens: 12345, clicks: 4567, openRate: 65.2, clickRate: 19.8, bounceRate: 2.5, date: '2024-02-09', status: 'completed' },
  { id: '6', name: 'Abandoned Cart', sent: 5678, opens: 3456, clicks: 1234, openRate: 72.4, clickRate: 21.7, bounceRate: 1.5, date: '2024-02-08', status: 'active' },
  { id: '7', name: 'Re-engagement', sent: 3456, opens: 2345, clicks: 876, openRate: 68.9, clickRate: 23.4, bounceRate: 2.8, date: '2024-02-07', status: 'draft' },
];

const generateMockDeviceData = (): DeviceData[] => [
  { device: 'Mobile', count: 38945, percentage: 45, icon: Smartphone },
  { device: 'Desktop', count: 36278, percentage: 42, icon: Monitor },
  { device: 'Tablet', count: 11243, percentage: 13, icon: Tablet },
];

const generateMockLocationData = (): LocationData[] => [
  { country: 'United States', code: 'US', flag: '🇺🇸', opens: 15234, clicks: 4567, percentage: 32 },
  { country: 'United Kingdom', code: 'GB', flag: '🇬🇧', opens: 8765, clicks: 2345, percentage: 18 },
  { country: 'Canada', code: 'CA', flag: '🇨🇦', opens: 6543, clicks: 1876, percentage: 14 },
  { country: 'Australia', code: 'AU', flag: '🇦🇺', opens: 4321, clicks: 1234, percentage: 9 },
  { country: 'Germany', code: 'DE', flag: '🇩🇪', opens: 3987, clicks: 987, percentage: 8 },
  { country: 'France', code: 'FR', flag: '🇫🇷', opens: 2876, clicks: 765, percentage: 6 },
  { country: 'Other', code: 'XX', flag: '🌍', opens: 5432, clicks: 1234, percentage: 13 },
];

const generateMockTimeSeriesData = (days: number = 30): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      opens: Math.floor(Math.random() * 3000) + 1000,
      clicks: Math.floor(Math.random() * 800) + 200,
      deliveries: Math.floor(Math.random() * 5000) + 8000,
      unsubscribes: Math.floor(Math.random() * 20),
      complaints: Math.floor(Math.random() * 5),
    });
  }
  
  return data;
};

const generateMockTopLinks = (): TopLink[] => [
  { url: 'https://emailsuite.com/welcome', clicks: 2345, percentage: 28, uniqueClicks: 1890 },
  { url: 'https://emailsuite.com/features', clicks: 1876, percentage: 22, uniqueClicks: 1543 },
  { url: 'https://emailsuite.com/pricing', clicks: 1543, percentage: 18, uniqueClicks: 1234 },
  { url: 'https://emailsuite.com/blog/article-1', clicks: 1234, percentage: 15, uniqueClicks: 987 },
  { url: 'https://emailsuite.com/unsubscribe', clicks: 876, percentage: 10, uniqueClicks: 876 },
  { url: 'https://emailsuite.com/contact', clicks: 654, percentage: 7, uniqueClicks: 543 },
];

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: React.FC<{ className?: string }>;
  color: string;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  prefix = '',
  suffix = '',
  tooltip,
}) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  return (
    <div 
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {tooltip && showTooltip && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-white`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <span
            className={`flex items-center text-sm font-medium ${
              change.type === 'increase' 
                ? 'text-green-600' 
                : change.type === 'decrease' 
                  ? 'text-red-600' 
                  : 'text-gray-500'
            }`}
          >
            {change.type === 'increase' && <ArrowUp className="w-4 h-4 mr-1" />}
            {change.type === 'decrease' && <ArrowDown className="w-4 h-4 mr-1" />}
            {change.value > 0 ? '+' : ''}{change.value}%
          </span>
        )}
      </div>
      <h3 className="text-gray-500 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">
        {prefix}
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix}
      </p>
    </div>
  );
};

// Campaign Table Row Component
interface CampaignRowProps {
  campaign: CampaignPerformance;
}

const CampaignRow: React.FC<CampaignRowProps> = ({ campaign }) => {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-gray-900">{campaign.name}</p>
          <p className="text-xs text-gray-500 mt-1">{campaign.date}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[campaign.status]}`}>
          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </span>
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-600">{campaign.sent.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-sm text-gray-600">{campaign.opens.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-sm text-gray-600">{campaign.clicks.toLocaleString()}</td>
      <td className="px-6 py-4 text-right">
        <span className="text-sm font-medium text-gray-900">{campaign.openRate.toFixed(1)}%</span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="text-sm font-medium text-gray-900">{campaign.clickRate.toFixed(1)}%</span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="text-sm text-gray-600">{campaign.bounceRate.toFixed(1)}%</span>
      </td>
    </tr>
  );
};

// Main Analytics Component
export const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '12m' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set<string>());
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    overview: generateMockOverview(),
    campaigns: generateMockCampaigns(),
    deviceBreakdown: generateMockDeviceData(),
    locationBreakdown: generateMockLocationData(),
    timeSeriesData: generateMockTimeSeriesData(30),
    topLinks: generateMockTopLinks(),
  });

  // Handle refresh
  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production, fetch new data from API
      setAnalyticsData({
        overview: generateMockOverview(),
        campaigns: generateMockCampaigns(),
        deviceBreakdown: generateMockDeviceData(),
        locationBreakdown: generateMockLocationData(),
        timeSeriesData: generateMockTimeSeriesData(
          dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
        ),
        topLinks: generateMockTopLinks(),
      });
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Handle date range change
  useEffect(() => {
    handleRefresh();
  }, [dateRange, handleRefresh]);

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'pdf' | 'excel'): void => {
    // In production, implement export functionality
    console.log(`Exporting as ${format}`);
    
    // Show success message or trigger download
    alert(`Exporting as ${format}... This would download a file in production.`);
  }, []);

  // Calculate trend metrics
  const trends = useMemo(() => {
    const prev = analyticsData.overview.previousPeriod;
    const current = analyticsData.overview;
    
    return {
      openRate: prev ? {
        value: Number(((current.openRate - prev.openRate) / prev.openRate * 100).toFixed(1)),
        type: current.openRate > prev.openRate ? 'increase' as const : 'decrease' as const,
      } : undefined,
      clickRate: prev ? {
        value: Number(((current.clickRate - prev.clickRate) / prev.clickRate * 100).toFixed(1)),
        type: current.clickRate > prev.clickRate ? 'increase' as const : 'decrease' as const,
      } : undefined,
      ctr: prev ? {
        value: Number(((current.ctr - prev.ctr) / prev.ctr * 100).toFixed(1)),
        type: current.ctr > prev.ctr ? 'increase' as const : 'decrease' as const,
      } : undefined,
    };
  }, [analyticsData.overview]);

  // Prepare chart data for time series
  const timeSeriesChartData = useMemo<ChartDataPoint[]>(() => {
    return analyticsData.timeSeriesData.map(item => ({
      name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      opens: item.opens,
      clicks: item.clicks,
      deliveries: item.deliveries,
      // Add value property for ChartDataPoint compatibility
      value: item.opens, // Use opens as the default value
    }));
  }, [analyticsData.timeSeriesData]);

  // Prepare chart series for time series
  const timeSeriesChartSeries = useMemo<ChartSeries[]>(() => [
    { dataKey: 'opens', name: 'Opens', color: '#2563EB', type: 'monotone' },
    { dataKey: 'clicks', name: 'Clicks', color: '#16A34A', type: 'monotone' },
    { dataKey: 'deliveries', name: 'Deliveries', color: '#CA8A04', type: 'monotone' },
  ], []);

  // Prepare device chart data
  const deviceChartData = useMemo<ChartDataPoint[]>(() => {
    return analyticsData.deviceBreakdown.map(device => ({
      name: device.device,
      value: device.percentage,
      count: device.count,
    }));
  }, [analyticsData.deviceBreakdown]);

  // Filter campaigns by selected IDs
  const filteredCampaigns = useMemo(() => {
    if (selectedCampaigns.size === 0) return analyticsData.campaigns;
    return analyticsData.campaigns.filter(c => selectedCampaigns.has(c.id));
  }, [analyticsData.campaigns, selectedCampaigns]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your email performance and engagement metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
              <option value="custom">Custom Range</option>
            </select>
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Custom Date Range (shown when custom is selected) */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Export</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                Export as Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 last:rounded-b-lg"
              >
                Export as PDF
              </button>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading analytics data..." />
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Emails"
              value={analyticsData.overview.totalEmails}
              icon={Mail}
              color="bg-blue-500"
              tooltip="Total emails sent in selected period"
            />
            <MetricCard
              title="Open Rate"
              value={analyticsData.overview.openRate}
              change={trends.openRate}
              icon={Eye}
              color="bg-green-500"
              suffix="%"
              tooltip="Percentage of emails opened"
            />
            <MetricCard
              title="Click Rate"
              value={analyticsData.overview.clickRate}
              change={trends.clickRate}
              icon={MousePointer}
              color="bg-purple-500"
              suffix="%"
              tooltip="Percentage of opens that resulted in clicks"
            />
            <MetricCard
              title="CTR"
              value={analyticsData.overview.ctr}
              change={trends.ctr}
              icon={TrendingUp}
              color="bg-orange-500"
              suffix="%"
              tooltip="Click-through rate (clicks / deliveries)"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Unique Opens</p>
              <p className="text-lg font-semibold text-gray-900">
                {analyticsData.overview.uniqueOpens.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((analyticsData.overview.uniqueOpens / analyticsData.overview.totalOpens) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Unique Clicks</p>
              <p className="text-lg font-semibold text-gray-900">
                {analyticsData.overview.uniqueClicks.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((analyticsData.overview.uniqueClicks / analyticsData.overview.totalClicks) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Bounce Rate</p>
              <p className="text-lg font-semibold text-gray-900">
                {analyticsData.overview.bounceRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.overview.bounceRate > 3 ? '⚠️ High' : '✅ Good'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Delivery Rate</p>
              <p className="text-lg font-semibold text-gray-900">
                {analyticsData.overview.deliveryRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.overview.deliveryRate > 97 ? '✅ Excellent' : '⚠️ Needs attention'}
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time Series Chart */}
            <div className="lg:col-span-2">
              <AnalyticsChart
                type="line"
                data={timeSeriesChartData}
                series={timeSeriesChartSeries}
                title="Email Performance Over Time"
                subtitle="Daily opens, clicks, and deliveries"
                height={400}
                showLegend={true}
                showGrid={true}
                showTooltip={true}
                showBrush={true}
                showDownload={true}
                showFullscreen={true}
                onRefresh={handleRefresh}
                isLoading={isLoading}
                xAxisLabel="Date"
                yAxisLabel="Count"
              />
            </div>

            {/* Device Breakdown */}
            <div className="lg:col-span-1">
              <AnalyticsChart
                type="pie"
                data={deviceChartData}
                title="Device Breakdown"
                subtitle="Opens by device type"
                height={400}
                showLegend={true}
                showTooltip={true}
                showDownload={true}
                colors={['#2563EB', '#16A34A', '#CA8A04']}
              />
            </div>
          </div>

          {/* Second Row - Location and Links */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Locations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
              <div className="space-y-4">
                {analyticsData.locationBreakdown.map((location) => (
                  <div key={location.code}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{location.flag}</span>
                        <span className="text-gray-600">{location.country}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{location.opens.toLocaleString()} opens</span>
                        <span className="font-medium text-gray-900 w-12 text-right">{location.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2"
                        style={{ width: `${location.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Links */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Clicked Links</h3>
              <div className="space-y-4">
                {analyticsData.topLinks.map((link) => (
                  <div key={link.url}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="truncate max-w-75">
                        <span className="text-gray-600">{link.url}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{link.clicks.toLocaleString()} clicks</span>
                        <span className="font-medium text-gray-900 w-12 text-right">{link.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 rounded-full h-2"
                        style={{ width: `${link.percentage}%` }}
                      />
                    </div>
                    {link.uniqueClicks && (
                      <p className="text-xs text-gray-400 mt-1">
                        {link.uniqueClicks.toLocaleString()} unique clicks
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign Performance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Detailed breakdown of all campaigns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCampaigns(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear filters
                </button>
                <button className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Campaign</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Sent</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Opens</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Clicks</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Open Rate</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Click Rate</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Bounce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCampaigns.map((campaign) => (
                    <CampaignRow key={campaign.id} campaign={campaign} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination (simplified) */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredCampaigns.length} of {analyticsData.campaigns.length} campaigns
              </p>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                  Previous
                </button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">1</button>
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">2</button>
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">3</button>
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Next</button>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <h4 className="text-sm font-medium opacity-90 mb-2">Best Performing Day</h4>
              <p className="text-2xl font-bold mb-1">Tuesday</p>
              <p className="text-sm opacity-90">Average open rate: 72.4%</p>
            </div>
            <div className="bg-linear-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <h4 className="text-sm font-medium opacity-90 mb-2">Peak Open Time</h4>
              <p className="text-2xl font-bold mb-1">10:00 AM - 12:00 PM</p>
              <p className="text-sm opacity-90">Best time to send emails</p>
            </div>
            <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <h4 className="text-sm font-medium opacity-90 mb-2">Engagement Score</h4>
              <p className="text-2xl font-bold mb-1">86/100</p>
              <p className="text-sm opacity-90">⬆️ 12% from last month</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;