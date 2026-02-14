import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Type Definitions
type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'scheduled';
type CampaignType = 'Automated' | 'Manual' | 'Triggered';
type EmailStatus = 'opened' | 'clicked' | 'sent' | 'bounced' | 'unsubscribed';

interface CampaignStats {
  sent: number;
  delivered: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  unsubscribes: number;
  complaints: number;
  bounces: number;
  openRate: number;
  clickRate: number;
  deliveryRate: number;
}

interface OpensByDay {
  date: string;
  opens: number;
}

interface ClicksByLink {
  link: string;
  clicks: number;
}

interface DeviceBreakdown {
  device: string;
  percentage: number;
}

interface LocationBreakdown {
  country: string;
  opens: number;
}

interface CampaignPerformance {
  opensByDay: OpensByDay[];
  clicksByLink: ClicksByLink[];
  deviceBreakdown: DeviceBreakdown[];
  locationBreakdown: LocationBreakdown[];
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  type: CampaignType;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  createdAt: string;
  scheduledFor: string | null;
  sentAt: string | null;
  completedAt: string | null;
  template: string;
  content: string;
  list: string;
  listSize: number;
  stats: CampaignStats;
  performance: CampaignPerformance;
}

export const CampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCampaign({
        id: id || '1',
        name: 'Welcome Email Series',
        subject: 'Welcome to our community!',
        status: 'active',
        type: 'Automated',
        fromName: 'Email Suite Team',
        fromEmail: 'welcome@emailsuite.com',
        replyTo: 'support@emailsuite.com',
        createdAt: '2024-02-10T10:00:00Z',
        scheduledFor: null,
        sentAt: '2024-02-10T10:05:00Z',
        completedAt: null,
        template: 'welcome-template',
        content: '<h1>Welcome!</h1><p>Thanks for joining...</p>',
        list: 'All Contacts',
        listSize: 12345,
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
          openRate: 69.3,
          clickRate: 18.9,
          deliveryRate: 99.1
        },
        performance: {
          opensByDay: [
            { date: '2024-02-10', opens: 1200 },
            { date: '2024-02-11', opens: 2100 },
            { date: '2024-02-12', opens: 1800 },
            { date: '2024-02-13', opens: 1500 },
            { date: '2024-02-14', opens: 967 }
          ],
          clicksByLink: [
            { link: 'https://emailsuite.com/welcome', clicks: 890 },
            { link: 'https://emailsuite.com/features', clicks: 567 },
            { link: 'https://emailsuite.com/pricing', clicks: 432 },
            { link: 'https://emailsuite.com/docs', clicks: 234 },
            { link: 'https://emailsuite.com/unsubscribe', clicks: 122 }
          ],
          deviceBreakdown: [
            { device: 'Mobile', percentage: 48 },
            { device: 'Desktop', percentage: 42 },
            { device: 'Tablet', percentage: 10 }
          ],
          locationBreakdown: [
            { country: 'United States', opens: 3245 },
            { country: 'United Kingdom', opens: 1234 },
            { country: 'Canada', opens: 987 },
            { country: 'Australia', opens: 654 },
            { country: 'Germany', opens: 543 }
          ]
        }
      });
      setLoading(false);
    }, 1000);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Loading campaign details..." />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
        <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist or has been deleted.</p>
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

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              {campaign.stats.deliveryRate}% Delivered
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{campaign.stats.sent.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total Sent</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              {campaign.stats.openRate}% Rate
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{campaign.stats.uniqueOpens.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Unique Opens</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <MousePointer className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
              {campaign.stats.clickRate}% Rate
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{campaign.stats.uniqueClicks.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Unique Clicks</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
              {campaign.stats.unsubscribes} Unsubscribed
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{campaign.listSize.toLocaleString()}</p>
          <p className="text-sm text-gray-500">List Size</p>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Information</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd><StatusBadge status={campaign.status} type="campaign" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-sm font-medium text-gray-900">{campaign.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">From</dt>
                <dd className="text-sm text-gray-900">{campaign.fromName} &lt;{campaign.fromEmail}&gt;</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Reply-To</dt>
                <dd className="text-sm text-gray-900">{campaign.replyTo}</dd>
              </div>
            </dl>
          </div>
          <div>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{new Date(campaign.createdAt).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Sent</dt>
                <dd className="text-sm text-gray-900">{campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : 'Not sent yet'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">List</dt>
                <dd className="text-sm text-gray-900">{campaign.list}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Template</dt>
                <dd className="text-sm text-gray-900">{campaign.template}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Opens Over Time</h3>
        <div className="h-80">
          <AnalyticsChart 
          type="line" 
          data={campaign.performance.opensByDay.map((d: OpensByDay) => ({
            name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sent: campaign.stats.sent, // Total sent
            opens: d.opens, // Daily opens
            clicks: Math.round(d.opens * 0.3) // Estimate clicks based on open rate
          }))}
        />
        </div>
      </div>

      {/* Top Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clicked Links</h3>
        <div className="space-y-3">
          {campaign.performance.clicksByLink.map((link: ClicksByLink) => (
            <div key={link.link}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 truncate max-w-md">{link.link}</span>
                <span className="font-medium text-gray-900">{link.clicks} clicks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 rounded-full h-2"
                  style={{ width: `${(link.clicks / campaign.stats.clicks) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Device & Location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          <div className="space-y-4">
            {campaign.performance.deviceBreakdown.map((device: DeviceBreakdown) => (
              <div key={device.device}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{device.device}</span>
                  <span className="font-medium text-gray-900">{device.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 rounded-full h-2"
                    style={{ width: `${device.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
          <div className="space-y-4">
            {campaign.performance.locationBreakdown.map((location: LocationBreakdown) => (
              <div key={location.country}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{location.country}</span>
                  <span className="font-medium text-gray-900">{location.opens.toLocaleString()} opens</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 rounded-full h-2"
                    style={{ width: `${(location.opens / campaign.stats.uniqueOpens) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Stats Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Sent</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.sent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Delivered</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.delivered.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Bounces</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.bounces.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Delivery Rate</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.deliveryRate}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Opens</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.opens.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Unique Opens</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.uniqueOpens.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Clicks</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.clicks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Unique Clicks</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.uniqueClicks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Unsubscribes</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.unsubscribes.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Complaints</p>
            <p className="text-xl font-bold text-gray-900">{campaign.stats.complaints.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecipients = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recipient List</h3>
        <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900">
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search recipients..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Opened</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Clicked</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Opened At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...Array(10)].map((_, i: number) => {
              const statuses: EmailStatus[] = ['opened', 'clicked', 'sent'];
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">user{i}@example.com</td>
                  <td className="px-6 py-4">
                    <StatusBadge 
                      status={statuses[i % 3]} 
                      type="email" 
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{i % 2 === 0 ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{i % 4 === 0 ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {i % 2 === 0 ? '2024-02-13 10:23 AM' : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Showing 1-10 of 12,345 recipients</p>
        <div className="flex space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Previous</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">1</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">2</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">3</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Next</button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Email Content</h3>
        <button className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700">
          <Edit className="w-4 h-4" />
          <span>Edit Content</span>
        </button>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2"><span className="font-medium">Subject:</span> {campaign.subject}</p>
        <p className="text-sm text-gray-600"><span className="font-medium">From:</span> {campaign.fromName} &lt;{campaign.fromEmail}&gt;</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6" dangerouslySetInnerHTML={{ __html: campaign.content }} />
    </div>
  );

  const getActionButton = () => {
    switch (campaign.status) {
      case 'draft':
        return (
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center space-x-2">
            <Send className="w-4 h-4" />
            <span>Send Now</span>
          </button>
        );
      case 'active':
        return (
          <button className="px-6 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 flex items-center space-x-2">
            <Pause className="w-4 h-4" />
            <span>Pause</span>
          </button>
        );
      case 'paused':
        return (
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>Resume</span>
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Created on {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center space-x-2">
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
          {getActionButton()}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 inline-flex items-center space-x-2 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'recipients' && renderRecipients()}
        {activeTab === 'content' && renderContent()}
      </div>
    </div>
  );
};