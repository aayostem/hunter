// hooks/useAnalytics.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types
export interface TimeSeriesData {
  timestamp: string;
  value: number;
  metric: string;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  sent: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  unsubscribes: number;
  bounces: number;
  complaints: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export interface DeviceBreakdown {
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  count: number;
  percentage: number;
}

export interface LocationBreakdown {
  country: string;
  countryCode: string;
  count: number;
  percentage: number;
}

export interface BrowserBreakdown {
  browser: string;
  count: number;
  percentage: number;
}

export interface LinkClickStats {
  linkId: string;
  url: string;
  clicks: number;
  uniqueClicks: number;
  clickRate: number;
}

export interface TimeOfDayStats {
  hour: number;
  opens: number;
  clicks: number;
}

export interface DayOfWeekStats {
  day: string;
  opens: number;
  clicks: number;
}

export interface AnalyticsFilters {
  campaignIds?: string[];
  dateRange: { start: string; end: string };
  groupBy: 'hour' | 'day' | 'week' | 'month';
  comparePrevious?: boolean;
}

export interface AnalyticsReport {
  summary: {
    totalSent: number;
    totalOpens: number;
    totalUniqueOpens: number;
    totalClicks: number;
    totalUniqueClicks: number;
    totalUnsubscribes: number;
    totalBounces: number;
    overallOpenRate: number;
    overallClickRate: number;
    overallBounceRate: number;
    averageOpenRate: number;
    averageClickRate: number;
  };
  timeSeries: TimeSeriesData[];
  campaignPerformance: CampaignPerformance[];
  deviceBreakdown: DeviceBreakdown[];
  locationBreakdown: LocationBreakdown[];
  browserBreakdown: BrowserBreakdown[];
  linkClicks: LinkClickStats[];
  timeOfDay: TimeOfDayStats[];
  dayOfWeek: DayOfWeekStats[];
  comparison?: {
    previousPeriod: Partial<AnalyticsReport['summary']>;
    changes: Record<string, { absolute: number; percentage: number }>;
  };
}

interface UseAnalyticsOptions {
  autoFetch?: boolean;
  realtime?: boolean;
  cacheTime?: number;
}

// Raw data types from Supabase
interface RawAnalyticsData {
  total_sent?: number;
  total_opens?: number;
  total_unique_opens?: number;
  total_clicks?: number;
  total_unique_clicks?: number;
  total_unsubscribes?: number;
  total_bounces?: number;
  avg_open_rate?: number;
  avg_click_rate?: number;
  time_series?: Array<{
    timestamp: string;
    value: number;
    metric: string;
  }>;
  campaigns?: Array<{
    campaign_id: string;
    campaign_name: string;
    sent: number;
    opens: number;
    unique_opens: number;
    clicks: number;
    unique_clicks: number;
    unsubscribes: number;
    bounces: number;
    complaints: number;
  }>;
  device_breakdown?: Array<{
    device: string;
    count: number;
  }>;
  location_breakdown?: Array<{
    country: string;
    country_code: string;
    count: number;
  }>;
  browser_breakdown?: Array<{
    browser: string;
    count: number;
  }>;
  link_clicks?: Array<{
    link_id: string;
    url: string;
    clicks: number;
    unique_clicks: number;
  }>;
  time_of_day?: Array<{
    hour: number;
    opens: number;
    clicks: number;
  }>;
  day_of_week?: Array<{
    day: string;
    opens: number;
    clicks: number;
  }>;
}

// RPC Parameters type
interface AnalyticsRpcParams {
  p_user_id: string;
  p_start_date: string;
  p_end_date: string;
  p_group_by: 'hour' | 'day' | 'week' | 'month';
  p_campaign_ids: string[];
}

// RPC Response type
interface AnalyticsRpcResponse {
  data: RawAnalyticsData | null;
  error: Error | null;
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  groupBy: 'day',
  comparePrevious: false,
};

// Helper function to call analytics RPC with proper typing
async function callAnalyticsRpc(
  params: AnalyticsRpcParams
): Promise<AnalyticsRpcResponse> {
  try {
    // Use unknown instead of any
    const rpcFunction = supabase.rpc as unknown as (
      fn: string, 
      args: AnalyticsRpcParams
    ) => Promise<{
      data: unknown;
      error: unknown;
    }>;
    
    const response = await rpcFunction('get_analytics', params);
    
    return {
      data: response.data ? response.data as RawAnalyticsData : null,
      error: response.error ? response.error as Error : null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['opens', 'clicks']);

  // Calculate date ranges
  const dateRanges = useMemo(() => {
    const currentStart = new Date(filters.dateRange.start);
    const currentEnd = new Date(filters.dateRange.end);
    const diffDays = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - diffDays);
    
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);

    return {
      current: filters.dateRange,
      previous: {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0],
      },
    };
  }, [filters.dateRange]);

  // Helper to calculate rates with safe number handling
  const calculateRate = useCallback((part: number | undefined, total: number | undefined): number => {
    const safePart = part || 0;
    const safeTotal = total || 0;
    if (safeTotal === 0) return 0;
    return Number(((safePart / safeTotal) * 100).toFixed(2));
  }, []);

  // Process raw analytics data
  const processAnalyticsData = useCallback((current: RawAnalyticsData | null, previous: RawAnalyticsData | null): AnalyticsReport => {
    const safeCurrent = current || {};
    
    // Calculate summary
    const summary = {
      totalSent: safeCurrent.total_sent || 0,
      totalOpens: safeCurrent.total_opens || 0,
      totalUniqueOpens: safeCurrent.total_unique_opens || 0,
      totalClicks: safeCurrent.total_clicks || 0,
      totalUniqueClicks: safeCurrent.total_unique_clicks || 0,
      totalUnsubscribes: safeCurrent.total_unsubscribes || 0,
      totalBounces: safeCurrent.total_bounces || 0,
      overallOpenRate: calculateRate(safeCurrent.total_unique_opens, safeCurrent.total_sent),
      overallClickRate: calculateRate(safeCurrent.total_unique_clicks, safeCurrent.total_sent),
      overallBounceRate: calculateRate(safeCurrent.total_bounces, safeCurrent.total_sent),
      averageOpenRate: safeCurrent.avg_open_rate || 0,
      averageClickRate: safeCurrent.avg_click_rate || 0,
    };

    // Process time series data
    const timeSeries: TimeSeriesData[] = (safeCurrent.time_series || []).map((item) => ({
      timestamp: item.timestamp,
      value: item.value,
      metric: item.metric,
    }));

    // Process campaign performance
    const campaignPerformance: CampaignPerformance[] = (safeCurrent.campaigns || []).map((item) => ({
      campaignId: item.campaign_id,
      campaignName: item.campaign_name,
      sent: item.sent,
      opens: item.opens,
      uniqueOpens: item.unique_opens,
      clicks: item.clicks,
      uniqueClicks: item.unique_clicks,
      unsubscribes: item.unsubscribes,
      bounces: item.bounces,
      complaints: item.complaints,
      openRate: calculateRate(item.unique_opens, item.sent),
      clickRate: calculateRate(item.unique_clicks, item.sent),
      bounceRate: calculateRate(item.bounces, item.sent),
      unsubscribeRate: calculateRate(item.unsubscribes, item.sent),
    }));

    // Process device breakdown
    const deviceTotal = safeCurrent.device_breakdown?.reduce((acc, d) => acc + d.count, 0) || 0;
    const deviceBreakdown: DeviceBreakdown[] = (safeCurrent.device_breakdown || []).map((item) => ({
      device: item.device as DeviceBreakdown['device'],
      count: item.count,
      percentage: calculateRate(item.count, deviceTotal),
    }));

    // Process location breakdown
    const locationTotal = safeCurrent.location_breakdown?.reduce((acc, d) => acc + d.count, 0) || 0;
    const locationBreakdown: LocationBreakdown[] = (safeCurrent.location_breakdown || []).map((item) => ({
      country: item.country,
      countryCode: item.country_code,
      count: item.count,
      percentage: calculateRate(item.count, locationTotal),
    }));

    // Process browser breakdown
    const browserTotal = safeCurrent.browser_breakdown?.reduce((acc, d) => acc + d.count, 0) || 0;
    const browserBreakdown: BrowserBreakdown[] = (safeCurrent.browser_breakdown || []).map((item) => ({
      browser: item.browser,
      count: item.count,
      percentage: calculateRate(item.count, browserTotal),
    }));

    // Process link clicks
    const linkClicks: LinkClickStats[] = (safeCurrent.link_clicks || []).map((item) => ({
      linkId: item.link_id,
      url: item.url,
      clicks: item.clicks,
      uniqueClicks: item.unique_clicks,
      clickRate: calculateRate(item.unique_clicks, summary.totalUniqueOpens),
    }));

    // Process time of day
    const timeOfDay: TimeOfDayStats[] = (safeCurrent.time_of_day || []).map((item) => ({
      hour: item.hour,
      opens: item.opens,
      clicks: item.clicks,
    }));

    // Process day of week
    const dayOfWeek: DayOfWeekStats[] = (safeCurrent.day_of_week || []).map((item) => ({
      day: item.day,
      opens: item.opens,
      clicks: item.clicks,
    }));

    // Calculate comparison if previous data exists
    let comparison = undefined;
    if (previous) {
      const prevSummary = {
        totalSent: previous.total_sent || 0,
        totalOpens: previous.total_opens || 0,
        totalUniqueOpens: previous.total_unique_opens || 0,
        totalClicks: previous.total_clicks || 0,
        totalUniqueClicks: previous.total_unique_clicks || 0,
      };

      const changes: Record<string, { absolute: number; percentage: number }> = {};
      
      (Object.keys(prevSummary) as Array<keyof typeof prevSummary>).forEach((key) => {
        const currentVal = summary[key];
        const prevVal = prevSummary[key];
        changes[key] = {
          absolute: currentVal - prevVal,
          percentage: prevVal ? ((currentVal - prevVal) / prevVal) * 100 : 100,
        };
      });

      comparison = {
        previousPeriod: prevSummary,
        changes,
      };
    }

    return {
      summary,
      timeSeries,
      campaignPerformance,
      deviceBreakdown,
      locationBreakdown,
      browserBreakdown,
      linkClicks,
      timeOfDay,
      dayOfWeek,
      comparison,
    };
  }, [calculateRate]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (compare: boolean = false) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Prepare RPC parameters
      const rpcParams: AnalyticsRpcParams = {
        p_user_id: user.id,
        p_start_date: dateRanges.current.start,
        p_end_date: dateRanges.current.end,
        p_group_by: filters.groupBy,
        p_campaign_ids: filters.campaignIds || [],
      };

      // Fetch main period data
      const { data: currentData, error: currentError } = await callAnalyticsRpc(rpcParams);

      if (currentError) throw currentError;

      let previousData: RawAnalyticsData | null = null;
      
      // Fetch comparison data if requested
      if (compare && filters.comparePrevious) {
        const previousParams: AnalyticsRpcParams = {
          p_user_id: user.id,
          p_start_date: dateRanges.previous.start,
          p_end_date: dateRanges.previous.end,
          p_group_by: filters.groupBy,
          p_campaign_ids: filters.campaignIds || [],
        };

        const { data: prevData, error: prevError } = await callAnalyticsRpc(previousParams);

        if (prevError) throw prevError;
        previousData = prevData;
      }

      // Process and transform data
      const processedReport = processAnalyticsData(currentData, previousData);
      setReport(processedReport);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, dateRanges, processAnalyticsData, showToast]);

  // Set up realtime subscriptions
  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    if (options.realtime && user) {
      subscription = supabase
        .channel('analytics_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'email_opens',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refresh analytics when new opens come in
            fetchAnalytics();
          }
        )
        .subscribe();

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [user, options.realtime, fetchAnalytics]);

  // Fetch on mount and filter changes
  useEffect(() => {
    if (options.autoFetch !== false && user) {
      fetchAnalytics();
    }
  }, [user, filters, fetchAnalytics, options.autoFetch]);

  // Export report
  const exportReport = useCallback(async (format: 'pdf' | 'csv' | 'json' = 'pdf') => {
    if (!report) return;

    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${filters.dateRange.start}_to_${filters.dateRange.end}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Generate CSV report
        const rows = [
          ['Metric', 'Value'],
          ['Total Sent', report.summary.totalSent.toString()],
          ['Total Opens', report.summary.totalOpens.toString()],
          ['Unique Opens', report.summary.totalUniqueOpens.toString()],
          ['Open Rate', `${report.summary.overallOpenRate}%`],
          ['Total Clicks', report.summary.totalClicks.toString()],
          ['Unique Clicks', report.summary.totalUniqueClicks.toString()],
          ['Click Rate', `${report.summary.overallClickRate}%`],
          ['Bounces', report.summary.totalBounces.toString()],
          ['Unsubscribes', report.summary.totalUnsubscribes.toString()],
        ];

        const csv = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${filters.dateRange.start}_to_${filters.dateRange.end}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      showToast('Report exported successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export report';
      showToast(message, 'error');
    }
  }, [report, filters.dateRange, showToast]);

  // Get top campaigns
  const topCampaigns = useMemo(() => {
    if (!report) return [];
    return [...report.campaignPerformance]
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 5);
  }, [report]);

  // Get engagement trends
  const engagementTrends = useMemo(() => {
    if (!report?.timeSeries) return null;
    
    const opens = report.timeSeries.filter(t => t.metric === 'opens');
    const clicks = report.timeSeries.filter(t => t.metric === 'clicks');
    
    return {
      opens,
      clicks,
      trend: opens.length > 1 ? (opens[opens.length - 1].value - opens[0].value) / opens[0].value * 100 : 0,
    };
  }, [report]);

  return {
    // Data
    report,
    isLoading,
    error,
    filters,
    selectedMetrics,
    topCampaigns,
    engagementTrends,
    
    // Actions
    setFilters,
    setSelectedMetrics,
    fetchAnalytics,
    refresh: () => fetchAnalytics(true),
    exportReport,
    
    // Helpers
    hasData: !!report && report.summary.totalSent > 0,
    dateRanges,
  };
};