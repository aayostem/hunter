// hooks/useAnalytics.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

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

const DEFAULT_FILTERS: AnalyticsFilters = {
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  groupBy: 'day',
  comparePrevious: false,
};

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['opens', 'clicks']);

  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);

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

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (compare: boolean = false) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch main period data
      const { data: currentData, error: currentError } = await supabase
        .rpc('get_analytics', {
          p_user_id: user.id,
          p_start_date: dateRanges.current.start,
          p_end_date: dateRanges.current.end,
          p_group_by: filters.groupBy,
          p_campaign_ids: filters.campaignIds || [],
        });

      if (currentError) throw currentError;

      let comparisonData = null;
      
      // Fetch comparison data if requested
      if (compare && filters.comparePrevious) {
        const { data: prevData, error: prevError } = await supabase
          .rpc('get_analytics', {
            p_user_id: user.id,
            p_start_date: dateRanges.previous.start,
            p_end_date: dateRanges.previous.end,
            p_group_by: filters.groupBy,
            p_campaign_ids: filters.campaignIds || [],
          });

        if (prevError) throw prevError;
        comparisonData = prevData;
      }

      // Process and transform data
      const processedReport = processAnalyticsData(currentData, comparisonData);
      setReport(processedReport);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, dateRanges, showToast]);

  // Process raw analytics data
  const processAnalyticsData = useCallback((current: any, previous: any | null): AnalyticsReport => {
    // Calculate summary
    const summary = {
      totalSent: current?.total_sent || 0,
      totalOpens: current?.total_opens || 0,
      totalUniqueOpens: current?.total_unique_opens || 0,
      totalClicks: current?.total_clicks || 0,
      totalUniqueClicks: current?.total_unique_clicks || 0,
      totalUnsubscribes: current?.total_unsubscribes || 0,
      totalBounces: current?.total_bounces || 0,
      overallOpenRate: calculateRate(current?.total_unique_opens, current?.total_sent),
      overallClickRate: calculateRate(current?.total_unique_clicks, current?.total_sent),
      overallBounceRate: calculateRate(current?.total_bounces, current?.total_sent),
      averageOpenRate: current?.avg_open_rate || 0,
      averageClickRate: current?.avg_click_rate || 0,
    };

    // Process time series data
    const timeSeries: TimeSeriesData[] = (current?.time_series || []).map((item: any) => ({
      timestamp: item.timestamp,
      value: item.value,
      metric: item.metric,
    }));

    // Process campaign performance
    const campaignPerformance: CampaignPerformance[] = (current?.campaigns || []).map((item: any) => ({
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
    const total = current?.device_breakdown?.reduce((acc: number, d: any) => acc + d.count, 0) || 0;
    const deviceBreakdown: DeviceBreakdown[] = (current?.device_breakdown || []).map((item: any) => ({
      device: item.device,
      count: item.count,
      percentage: calculateRate(item.count, total),
    }));

    // Process location breakdown
    const locationBreakdown: LocationBreakdown[] = (current?.location_breakdown || []).map((item: any) => ({
      country: item.country,
      countryCode: item.country_code,
      count: item.count,
      percentage: calculateRate(item.count, total),
    }));

    // Process browser breakdown
    const browserBreakdown: BrowserBreakdown[] = (current?.browser_breakdown || []).map((item: any) => ({
      browser: item.browser,
      count: item.count,
      percentage: calculateRate(item.count, total),
    }));

    // Process link clicks
    const linkClicks: LinkClickStats[] = (current?.link_clicks || []).map((item: any) => ({
      linkId: item.link_id,
      url: item.url,
      clicks: item.clicks,
      uniqueClicks: item.unique_clicks,
      clickRate: calculateRate(item.unique_clicks, summary.totalUniqueOpens),
    }));

    // Process time of day
    const timeOfDay: TimeOfDayStats[] = (current?.time_of_day || []).map((item: any) => ({
      hour: item.hour,
      opens: item.opens,
      clicks: item.clicks,
    }));

    // Process day of week
    const dayOfWeek: DayOfWeekStats[] = (current?.day_of_week || []).map((item: any) => ({
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
      
      Object.keys(prevSummary).forEach(key => {
        const currentVal = summary[key as keyof typeof summary] as number;
        const prevVal = prevSummary[key as keyof typeof prevSummary] as number;
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
  }, []);

  // Helper to calculate rates
  const calculateRate = (part: number, total: number): number => {
    if (!total || total === 0) return 0;
    return Number(((part / total) * 100).toFixed(2));
  };

  // Set up realtime subscriptions
  useEffect(() => {
    if (options.realtime && user) {
      const subscription = supabase
        .channel('analytics_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'opens',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refresh analytics when new opens come in
            fetchAnalytics();
          }
        )
        .subscribe();

      setRealtimeSubscription(subscription);

      return () => {
        subscription.unsubscribe();
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
      } else if (format === 'csv') {
        // Generate CSV report
        const rows = [
          ['Metric', 'Value'],
          ['Total Sent', report.summary.totalSent],
          ['Total Opens', report.summary.totalOpens],
          ['Unique Opens', report.summary.totalUniqueOpens],
          ['Open Rate', `${report.summary.overallOpenRate}%`],
          ['Total Clicks', report.summary.totalClicks],
          ['Unique Clicks', report.summary.totalUniqueClicks],
          ['Click Rate', `${report.summary.overallClickRate}%`],
          ['Bounces', report.summary.totalBounces],
          ['Unsubscribes', report.summary.totalUnsubscribes],
        ];

        const csv = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${filters.dateRange.start}_to_${filters.dateRange.end}.csv`;
        a.click();
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