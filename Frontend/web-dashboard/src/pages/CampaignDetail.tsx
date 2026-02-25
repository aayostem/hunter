import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Send,
  Pause,
  Play,
  BarChart3,
  Users,
  Eye,
  MousePointer,
  Mail,
  Download,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  FileText,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Link2,
  Calendar,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '../components/StatusBadge';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { DataTable } from '../components/DataTable';

// Types
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'scheduled' | 'failed';
export type CampaignType = 'regular' | 'automated' | 'test' | 'triggered';
export type RecipientStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'complained';

export interface CampaignStats {
  sent: number;
  delivered: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  unsubscribes: number;
  complaints: number;
  bounces: number;
  forwards?: number;
  prints?: number;
  attachments?: number;
  spamReports?: number;
  openRate: number;
  clickRate: number;
  deliveryRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  complaintRate: number;
}

export interface TimeSeriesData {
  date: string;
  opens: number;
  clicks: number;
  unsubscribes: number;
  bounces: number;
}

export interface LinkClickData {
  linkId: string;
  url: string;
  text: string;
  clicks: number;
  uniqueClicks: number;
  clickRate: number;
}

export interface DeviceData {
  device: 'desktop' | 'mobile' | 'tablet' | 'other';
  opens: number;
  clicks: number;
  percentage: number;
}

export interface LocationData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  opens: number;
  clicks: number;
  percentage: number;
}

export interface Recipient {
  id: string;
  email: string;
  status: RecipientStatus;
  openedAt: string | null;
  clickedAt: string | null;
  openedCount: number;
  clickedCount: number;
  userAgent: string | null;
  ipAddress: string | null;
  location: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  status: CampaignStatus;
  type: CampaignType;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  createdAt: string;
  scheduledFor: string | null;
  sentAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  templateId: string;
  templateName: string;
  content: string;
  plainContent: string;
  listId: string;
  listName: string;
  listSize: number;
  tags: string[];
  stats: CampaignStats;
  timeSeries: TimeSeriesData[];
  links: LinkClickData[];
  devices: DeviceData[];
  locations: LocationData[];
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecipientFilters {
  search?: string;
  status?: RecipientStatus[];
  opened?: boolean;
  clicked?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Toast notification (simplified since useToast might not exist)
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  // In production, use a proper toast library
  console.log(`[${type.toUpperCase()}] ${message}`);
  alert(message);
};

export const CampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Campaign Data
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'recipients' | 'content'>('overview');

  // Recipients Data
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState<boolean>(false);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [recipientFilters, setRecipientFilters] = useState<RecipientFilters>({
    page: 1,
    limit: 50,
    sortBy: 'email',
    sortOrder: 'asc',
  });
  const [recipientsPagination, setRecipientsPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });

  // Actions State
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDuplicating, setIsDuplicating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isPausing, setIsPausing] = useState<boolean>(false);
  const [isResuming, setIsResuming] = useState<boolean>(false);

  // Fetch Campaign Data
  const fetchCampaign = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      const mockCampaign: Campaign = {
        id,
        name: 'Welcome Email Series',
        subject: 'Welcome to our community!',
        previewText: 'Thanks for joining us...',
        status: 'active',
        type: 'automated',
        fromName: 'Email Suite Team',
        fromEmail: 'welcome@emailsuite.com',
        replyTo: 'support@emailsuite.com',
        createdAt: new Date().toISOString(),
        scheduledFor: null,
        sentAt: new Date().toISOString(),
        completedAt: null,
        updatedAt: new Date().toISOString(),
        templateId: 'template-1',
        templateName: 'Welcome Template',
        content: '<h1>Welcome!</h1><p>Thanks for joining...</p>',
        plainContent: 'Welcome! Thanks for joining...',
        listId: 'list-1',
        listName: 'All Contacts',
        listSize: 12345,
        tags: ['welcome', 'automated'],
        stats: {
          sent: 12345,
          delivered: 12234,
          opens: 8567,
          uniqueOpens: 7234,
          clicks: 2345,
          uniqueClicks: 1890,
          unsubscribes: 45,
          complaints: 12,
          bounces: 111,
          forwards: 234,
          prints: 56,
          attachments: 78,
          spamReports: 3,
          openRate: 69.3,
          clickRate: 18.9,
          deliveryRate: 99.1,
          bounceRate: 0.9,
          unsubscribeRate: 0.4,
          complaintRate: 0.1,
        },
        timeSeries: [
          { date: '2024-02-07', opens: 1200, clicks: 300, unsubscribes: 5, bounces: 10 },
          { date: '2024-02-08', opens: 1400, clicks: 350, unsubscribes: 3, bounces: 8 },
          { date: '2024-02-09', opens: 1800, clicks: 450, unsubscribes: 4, bounces: 12 },
          { date: '2024-02-10', opens: 2100, clicks: 520, unsubscribes: 6, bounces: 15 },
          { date: '2024-02-11', opens: 1900, clicks: 480, unsubscribes: 5, bounces: 11 },
          { date: '2024-02-12', opens: 1600, clicks: 400, unsubscribes: 4, bounces: 9 },
          { date: '2024-02-13', opens: 1300, clicks: 320, unsubscribes: 3, bounces: 7 },
        ],
        links: [
          { linkId: '1', url: 'https://emailsuite.com/welcome', text: 'Welcome Page', clicks: 890, uniqueClicks: 720, clickRate: 32.5 },
          { linkId: '2', url: 'https://emailsuite.com/features', text: 'Features', clicks: 670, uniqueClicks: 540, clickRate: 24.5 },
          { linkId: '3', url: 'https://emailsuite.com/pricing', text: 'Pricing', clicks: 540, uniqueClicks: 430, clickRate: 19.7 },
        ],
        devices: [
          { device: 'mobile', opens: 4200, clicks: 1100, percentage: 48 },
          { device: 'desktop', opens: 3800, clicks: 950, percentage: 42 },
          { device: 'tablet', opens: 900, clicks: 250, percentage: 10 },
          { device: 'other', opens: 100, clicks: 25, percentage: 1 },
        ],
        locations: [
          { country: 'United States', countryCode: 'US', region: 'California', city: 'San Francisco', opens: 1200, clicks: 300, percentage: 25 },
          { country: 'United Kingdom', countryCode: 'GB', region: 'England', city: 'London', opens: 800, clicks: 200, percentage: 17 },
          { country: 'Canada', countryCode: 'CA', region: 'Ontario', city: 'Toronto', opens: 600, clicks: 150, percentage: 13 },
        ],
      };
      
      setCampaign(mockCampaign);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load campaign';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch Recipients
  const fetchRecipients = useCallback(async () => {
    if (!id || activeTab !== 'recipients') return;

    try {
      setRecipientsLoading(true);
      setRecipientsError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock recipients data
      const mockRecipients: Recipient[] = Array.from({ length: 50 }, (_, i) => ({
        id: `recipient-${i}`,
        email: `user${i}@example.com`,
        status: i % 5 === 0 ? 'opened' : i % 4 === 0 ? 'clicked' : i % 3 === 0 ? 'bounced' : 'delivered',
        openedAt: i % 2 === 0 ? new Date().toISOString() : null,
        clickedAt: i % 4 === 0 ? new Date().toISOString() : null,
        openedCount: i % 2 === 0 ? Math.floor(Math.random() * 3) + 1 : 0,
        clickedCount: i % 4 === 0 ? Math.floor(Math.random() * 2) + 1 : 0,
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.' + i,
        location: i % 3 === 0 ? 'New York, US' : i % 3 === 1 ? 'London, UK' : 'Toronto, CA',
      }));

      setRecipients(mockRecipients);
      setRecipientsPagination({
        total: 12345,
        page: recipientFilters.page,
        limit: recipientFilters.limit,
        totalPages: Math.ceil(12345 / recipientFilters.limit),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recipients';
      setRecipientsError(message);
      showToast(message, 'error');
    } finally {
      setRecipientsLoading(false);
    }
  }, [id, activeTab, recipientFilters.page, recipientFilters.limit]);

  // Load campaign on mount
  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Load recipients when tab changes or filters change
  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients, recipientFilters.page, recipientFilters.limit]);

  // Handle Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchCampaign(),
      fetchRecipients(),
    ]);
    setIsRefreshing(false);
    showToast('Campaign data updated', 'success');
  }, [fetchCampaign, fetchRecipients]);

  // Handle Duplicate
  const handleDuplicate = useCallback(async () => {
    if (!id) return;

    try {
      setIsDuplicating(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Campaign duplicated successfully', 'success');
      navigate(`/campaigns/${id}-copy`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate campaign';
      showToast(message, 'error');
    } finally {
      setIsDuplicating(false);
    }
  }, [id, navigate]);

  // Handle Delete
  const handleDelete = useCallback(async () => {
    if (!id) return;

    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Campaign deleted successfully', 'success');
      navigate('/campaigns');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete campaign';
      showToast(message, 'error');
      setIsDeleting(false);
    }
  }, [id, navigate]);

  // Handle Send
  const handleSend = useCallback(async () => {
    if (!id) return;

    try {
      setIsSending(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      showToast('Campaign sent successfully', 'success');
      await fetchCampaign();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send campaign';
      showToast(message, 'error');
    } finally {
      setIsSending(false);
    }
  }, [id, fetchCampaign]);

  // Handle Pause
  const handlePause = useCallback(async () => {
    if (!id) return;

    try {
      setIsPausing(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Campaign paused', 'success');
      await fetchCampaign();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause campaign';
      showToast(message, 'error');
    } finally {
      setIsPausing(false);
    }
  }, [id, fetchCampaign]);

  // Handle Resume
  const handleResume = useCallback(async () => {
    if (!id) return;

    try {
      setIsResuming(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Campaign resumed', 'success');
      await fetchCampaign();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume campaign';
      showToast(message, 'error');
    } finally {
      setIsResuming(false);
    }
  }, [id, fetchCampaign]);

  // Handle Export Recipients
  const handleExportRecipients = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    if (!id) return;

    try {
      showToast(`Recipients exported as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export recipients';
      showToast(message, 'error');
    }
  }, [id]);

  // Prepare Chart Data - Fixed to include required 'value' property
  const chartData = useMemo(() => {
    if (!campaign) return [];
    
    return campaign.timeSeries.map(point => ({
      name: format(parseISO(point.date), 'MMM d'),
      opens: point.opens,
      clicks: point.clicks,
      unsubscribes: point.unsubscribes,
      bounces: point.bounces,
      value: point.opens, // Add required value property
    }));
  }, [campaign]);

  // Prepare Device Chart Data
  const deviceChartData = useMemo(() => {
    if (!campaign) return [];
    
    return campaign.devices.map(device => ({
      name: device.device.charAt(0).toUpperCase() + device.device.slice(1),
      value: device.opens,
      percentage: device.percentage,
    }));
  }, [campaign]);

  // Get Status Icon
const getStatusIcon = (): React.ReactNode => {
    if (!campaign) return null;
    
    switch (campaign.status) {
      case 'draft':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'scheduled':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'active':
        return <Play className="w-5 h-5 text-green-500" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getActionButton = (): React.ReactNode => {
    if (!campaign) return null;

    switch (campaign.status) {
      case 'draft':
        return (
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Now</span>
              </>
            )}
          </button>
        );
      case 'scheduled':
        return (
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send Now</span>
          </button>
        );
      case 'active':
        return (
          <button
            onClick={handlePause}
            disabled={isPausing}
            className="px-6 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isPausing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Pausing...</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            )}
          </button>
        );
      case 'paused':
        return (
          <button
            onClick={handleResume}
            disabled={isResuming}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isResuming ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Resuming...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </>
            )}
          </button>
        );
      default:
        return null;
    }
  };

  // Format helpers
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const formatDateTime = (dateString: string): string => {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading campaign details..." />
      </div>
    );
  }

  // Error State
  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
        <p className="text-gray-600 mb-6">{error || "The campaign you're looking for doesn't exist."}</p>
        <button
          onClick={() => navigate('/campaigns')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Eye },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'recipients', name: 'Recipients', icon: Users },
    { id: 'content', name: 'Content', icon: Mail },
  ] as const;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to campaigns"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              {getStatusIcon()}
              <StatusBadge status={campaign.status} type="campaign" size="md" />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created {format(parseISO(campaign.createdAt), 'MMMM d, yyyy')} • Last updated {format(parseISO(campaign.updatedAt), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
          
          {getActionButton()}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Campaign sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 inline-flex items-center space-x-2 border-b-2 font-medium text-sm
                transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
              {tab.id === 'recipients' && campaign.stats.sent > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {formatNumber(campaign.stats.sent)}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    {formatPercentage(campaign.stats.deliveryRate)} Delivered
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.stats.sent)}</p>
                <p className="text-sm text-gray-500">Total Sent</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                    <Eye className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    {formatPercentage(campaign.stats.openRate)} Rate
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.stats.uniqueOpens)}</p>
                <p className="text-sm text-gray-500">Unique Opens</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                    <MousePointer className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                    {formatPercentage(campaign.stats.clickRate)} Rate
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.stats.uniqueClicks)}</p>
                <p className="text-sm text-gray-500">Unique Clicks</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    {formatNumber(campaign.stats.unsubscribes)} Unsubscribed
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.listSize)}</p>
                <p className="text-sm text-gray-500">List Size</p>
              </div>
            </div>

            {/* Campaign Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <dl className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd><StatusBadge status={campaign.status} type="campaign" /></dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Type</dt>
                    <dd className="text-sm font-medium text-gray-900 capitalize">{campaign.type}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">From</dt>
                    <dd className="text-sm text-gray-900">{campaign.fromName} &lt;{campaign.fromEmail}&gt;</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Reply-To</dt>
                    <dd className="text-sm text-gray-900">{campaign.replyTo}</dd>
                  </div>
                </dl>
                <dl className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Created</dt>
                    <dd className="text-sm text-gray-900">{formatDateTime(campaign.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Sent</dt>
                    <dd className="text-sm text-gray-900">
                      {campaign.sentAt ? formatDateTime(campaign.sentAt) : 'Not sent yet'}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">List</dt>
                    <dd className="text-sm text-gray-900">{campaign.listName}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Template</dt>
                    <dd className="text-sm text-gray-900">{campaign.templateName}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Performance Chart */}
            {campaign.timeSeries.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Over Time</h3>
                <div className="h-80">
                  <AnalyticsChart
                    type="line"
                    data={chartData}
                    title="Opens & Clicks Over Time"
                    showLegend={true}
                  />
                </div>
              </div>
            )}

            {/* Top Links */}
            {campaign.links.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clicked Links</h3>
                <div className="space-y-4">
                  {campaign.links.slice(0, 10).map((link) => (
                    <div key={link.linkId}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center space-x-2 max-w-md">
                          <Link2 className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 truncate" title={link.url}>
                            {link.text || link.url}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-medium text-gray-900">{formatNumber(link.clicks)} clicks</span>
                          <span className="text-xs text-gray-500">({formatPercentage(link.clickRate)})</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 rounded-full h-2 transition-all"
                          style={{ width: `${(link.clicks / campaign.stats.clicks) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Device Breakdown */}
            {campaign.devices.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {campaign.devices.map((device) => {
                      const Icon = device.device === 'mobile' ? Smartphone :
                                  device.device === 'tablet' ? Tablet :
                                  device.device === 'desktop' ? Monitor : Globe;
                      
                      return (
                        <div key={device.device}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center space-x-2">
                              <Icon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 capitalize">{device.device}</span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {formatNumber(device.opens)} opens ({formatPercentage(device.percentage)})
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 rounded-full h-2"
                              style={{ width: `${device.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-64">
                    <AnalyticsChart
                      type="pie"
                      data={deviceChartData}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Location Breakdown */}
            {campaign.locations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
                <div className="space-y-4">
                  {campaign.locations.slice(0, 10).map((location, index) => (
                    <div key={`${location.country}-${location.city}-${index}`}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {location.city}, {location.country}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {formatNumber(location.opens)} opens ({formatPercentage(location.percentage)})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 rounded-full h-2"
                          style={{ width: `${location.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Stats Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Sent</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.sent)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Delivered</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.delivered)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bounces</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.bounces)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Delivery Rate</p>
                  <p className="text-xl font-bold text-gray-900">{formatPercentage(campaign.stats.deliveryRate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Opens</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.opens)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Unique Opens</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.uniqueOpens)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Clicks</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.clicks)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Unique Clicks</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.uniqueClicks)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Unsubscribes</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.unsubscribes)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Complaints</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.complaints)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Forwards</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.forwards || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Prints</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.stats.prints || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recipients Tab */}
        {activeTab === 'recipients' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recipient List</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportRecipients('csv')}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => handleExportRecipients('json')}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <FileText className="w-4 h-4" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={recipientFilters.search || ''}
                  onChange={(e) => setRecipientFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={recipientFilters.status?.join(',') || ''}
                onChange={(e) => {
                  const statuses = e.target.value ? e.target.value.split(',').filter(Boolean) as RecipientStatus[] : undefined;
                  setRecipientFilters(prev => ({ ...prev, status: statuses, page: 1 }));
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="opened">Opened</option>
                <option value="clicked">Clicked</option>
                <option value="bounced">Bounced</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="complained">Complained</option>
              </select>

              <select
                value={recipientFilters.opened === true ? 'opened' : recipientFilters.opened === false ? 'not-opened' : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setRecipientFilters(prev => ({
                    ...prev,
                    opened: value === 'opened' ? true : value === 'not-opened' ? false : undefined,
                    page: 1,
                  }));
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
              >
                <option value="">All Opens</option>
                <option value="opened">Opened</option>
                <option value="not-opened">Not Opened</option>
              </select>

              <select
                value={recipientFilters.clicked === true ? 'clicked' : recipientFilters.clicked === false ? 'not-clicked' : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setRecipientFilters(prev => ({
                    ...prev,
                    clicked: value === 'clicked' ? true : value === 'not-clicked' ? false : undefined,
                    page: 1,
                  }));
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
              >
                <option value="">All Clicks</option>
                <option value="clicked">Clicked</option>
                <option value="not-clicked">Not Clicked</option>
              </select>
            </div>

            {/* Recipients Table */}
            <DataTable
              columns={[
                {
                  id: 'email',
                  header: 'Email',
                  accessor: 'email',
                  cell: (value: unknown) => (
                    <span className="font-medium text-gray-900">{String(value)}</span>
                  ),
                  sortable: true,
                },
                {
                  id: 'status',
                  header: 'Status',
                  accessor: 'status',
                  cell: (value: unknown) => (
                    <StatusBadge status={String(value)} type="email" size="sm" />
                  ),
                  sortable: true,
                },
                {
                  id: 'opened',
                  header: 'Opened',
                  accessor: (row: Recipient) => row.openedAt ? 'Yes' : 'No',
                  cell: (value: unknown, row: Recipient) => (
                    <div>
                      <span className={row.openedAt ? 'text-green-600' : 'text-gray-400'}>
                        {String(value)}
                      </span>
                      {row.openedCount > 1 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({row.openedCount} times)
                        </span>
                      )}
                    </div>
                  ),
                  sortable: true,
                },
                {
                  id: 'clicked',
                  header: 'Clicked',
                  accessor: (row: Recipient) => row.clickedAt ? 'Yes' : 'No',
                  cell: (value: unknown, row: Recipient) => (
                    <div>
                      <span className={row.clickedAt ? 'text-green-600' : 'text-gray-400'}>
                        {String(value)}
                      </span>
                      {row.clickedCount > 1 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({row.clickedCount} times)
                        </span>
                      )}
                    </div>
                  ),
                  sortable: true,
                },
                {
                  id: 'openedAt',
                  header: 'Opened At',
                  accessor: (row: Recipient) => row.openedAt ? formatDateTime(row.openedAt) : '-',
                  sortable: true,
                },
                {
                  id: 'location',
                  header: 'Location',
                  accessor: (row: Recipient) => row.location || '-',
                },
              ]}
              data={recipients}
              keyExtractor={(row: Recipient) => row.id}
              loading={recipientsLoading}
              error={recipientsError}
              pagination={{
                currentPage: recipientsPagination.page,
                totalPages: recipientsPagination.totalPages,
                totalItems: recipientsPagination.total,
                itemsPerPage: recipientsPagination.limit,
                onPageChange: (page: number) => setRecipientFilters(prev => ({ ...prev, page })),
                onItemsPerPageChange: (limit: number) => setRecipientFilters(prev => ({ ...prev, limit, page: 1 })),
              }}
              sorting={{
                sortBy: recipientFilters.sortBy,
                sortDirection: recipientFilters.sortOrder,
                onSort: (columnId: string) => {
                  setRecipientFilters(prev => ({
                    ...prev,
                    sortBy: columnId,
                    sortOrder: prev.sortBy === columnId && prev.sortOrder === 'asc' ? 'desc' : 'asc',
                  }));
                },
              }}
              emptyMessage="No recipients found"
              className="mt-4"
            />
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Email Content</h3>
              <button
                onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Content</span>
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Subject:</span> {campaign.subject}
              </p>
              {campaign.previewText && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Preview:</span> {campaign.previewText}
                </p>
              )}
              <p className="text-sm text-gray-600">
                <span className="font-medium">From:</span> {campaign.fromName} &lt;{campaign.fromEmail}&gt;
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Reply-To:</span> {campaign.replyTo}
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">HTML Version</h4>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: campaign.content }} />
              </div>
            </div>

            {campaign.plainContent && (
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Plain Text Version</h4>
                </div>
                <pre className="p-6 text-sm text-gray-600 whitespace-pre-wrap font-mono">
                  {campaign.plainContent}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refresh Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <LoadingSpinner size="sm" />
            <span className="text-gray-700">Refreshing campaign data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetail;