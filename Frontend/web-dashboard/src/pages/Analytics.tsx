import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Download,
  Eye,
  MousePointer,
  Mail,
  Users,
  Clock,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';
import { AnalyticsChart } from '../components/AnalyticsChart';

export const Analytics = () => {
  const [dateRange, setDateRange] = useState('30d');

  const metrics = [
    {
      label: 'Total Emails',
      value: '124,893',
      change: '+12.3%',
      trend: 'up',
      icon: Mail
    },
    {
      label: 'Open Rate',
      value: '68.2%',
      change: '+5.2%',
      trend: 'up',
      icon: Eye
    },
    {
      label: 'Click Rate',
      value: '24.8%',
      change: '-2.1%',
      trend: 'down',
      icon: MousePointer
    },
    {
      label: 'Unique Opens',
      value: '45,234',
      change: '+8.7%',
      trend: 'up',
      icon: Users
    }
  ];

  const campaigns = [
    { name: 'Welcome Series', opens: 856, clicks: 234, openRate: 69.3, clickRate: 18.9 },
    { name: 'Product Launch', opens: 3456, clicks: 1234, openRate: 60.8, clickRate: 21.7 },
    { name: 'Newsletter Feb', opens: 2345, clicks: 567, openRate: 72.1, clickRate: 24.2 },
    { name: 'Feedback Survey', opens: 1234, clicks: 345, openRate: 55.5, clickRate: 27.9 },
  ];

  const deviceData = [
    { device: 'Mobile', percentage: 45, icon: Smartphone },
    { device: 'Desktop', percentage: 42, icon: Monitor },
    { device: 'Tablet', percentage: 13, icon: Monitor },
  ];

  const locationData = [
    { country: 'United States', opens: 15234, percentage: 32 },
    { country: 'United Kingdom', opens: 8765, percentage: 18 },
    { country: 'Canada', opens: 6543, percentage: 14 },
    { country: 'Australia', opens: 4321, percentage: 9 },
    { country: 'Germany', opens: 3987, percentage: 8 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
          <button className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center space-x-2 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <metric.icon className="w-6 h-6" />
              </div>
              <span className={`flex items-center text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {metric.change}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm mb-1">{metric.label}</h3>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Performance Over Time</h2>
          <AnalyticsChart type="line" />
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Open Rate by Campaign</h2>
          <AnalyticsChart type="bar" />
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Campaign</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Opens</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Clicks</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Open Rate</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Click Rate</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((campaign) => (
                <tr key={campaign.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{campaign.opens.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{campaign.clicks.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{campaign.openRate}%</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{campaign.clickRate}%</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">vs avg</span>
                      <span className="text-sm font-medium text-green-600">+5.2%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device & Location Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h2>
          <div className="space-y-4">
            {deviceData.map((device) => (
              <div key={device.device}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center space-x-2">
                    <device.icon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{device.device}</span>
                  </div>
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

        {/* Top Locations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h2>
          <div className="space-y-4">
            {locationData.map((location) => (
              <div key={location.country}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{location.country}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500 text-xs">{location.opens.toLocaleString()} opens</span>
                    <span className="font-medium text-gray-900 w-12 text-right">{location.percentage}%</span>
                  </div>
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
      </div>

      {/* Time of Day Performance */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Best Time to Send</h2>
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Peak Open Time</p>
              <p className="text-lg font-bold text-gray-900">10:00 AM - 12:00 PM</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Peak Click Time</p>
              <p className="text-lg font-bold text-gray-900">2:00 PM - 4:00 PM</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">Best Day</p>
              <p className="text-lg font-bold text-gray-900">Tuesday</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};