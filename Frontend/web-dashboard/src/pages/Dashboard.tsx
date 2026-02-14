import React from 'react';
import { 
  Mail, 
  Users, 
  MousePointer, 
  TrendingUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { CampaignCard } from '../components/CampaignCard';

export const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Emails Sent',
      value: '45,890',
      change: '+12.5%',
      trend: 'up',
      icon: Mail,
      color: 'bg-blue-500'
    },
    {
      title: 'Open Rate',
      value: '68.2%',
      change: '+5.2%',
      trend: 'up',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      title: 'Click Rate',
      value: '24.8%',
      change: '-2.1%',
      trend: 'down',
      icon: MousePointer,
      color: 'bg-purple-500'
    },
    {
      title: 'Active Contacts',
      value: '12,345',
      change: '+234',
      trend: 'up',
      icon: Users,
      color: 'bg-orange-500'
    }
  ];

  const recentCampaigns = [
    {
      id: '1',
      name: 'Welcome Email Series',
      status: 'active',
      sent: 1234,
      opens: 856,
      clicks: 234,
      date: '2024-02-13'
    },
    {
      id: '2',
      name: 'Product Launch Announcement',
      status: 'completed',
      sent: 5678,
      opens: 3456,
      clicks: 1234,
      date: '2024-02-12'
    },
    {
      id: '3',
      name: 'Monthly Newsletter',
      status: 'scheduled',
      sent: 0,
      opens: 0,
      clicks: 0,
      date: '2024-02-15'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-3">
          <select className="border border-gray-300 rounded-lg px-4 py-2 text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Download Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={`flex items-center text-sm font-medium ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Performance</h2>
          <AnalyticsChart type="line" />
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Open Rate by Campaign</h2>
          <AnalyticsChart type="bar" />
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
        <div className="p-4 text-center border-t border-gray-100">
          <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
            View All Campaigns
          </button>
        </div>
      </div>
    </div>
  );
};