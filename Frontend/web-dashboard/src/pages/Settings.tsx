import React, { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  Bell,
  CreditCard,
  Key,
  Users,
  Palette,
  Webhook,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: 'John Doe',
    email: 'john@emailsuite.com',
    company: 'Email Suite Inc.',
    phone: '+1 (555) 123-4567',
    timezone: 'America/New_York',
    language: 'en'
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailOpens: true,
    linkClicks: true,
    unsubscribes: true,
    bounces: true,
    complaints: true,
    campaignCompleted: true,
    weeklyReport: true,
    monthlyReport: false
  });

  const [smtpSettings, setSmtpSettings] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    username: 'noreply@emailsuite.com',
    password: '********',
    encryption: 'tls',
    fromEmail: 'noreply@emailsuite.com',
    fromName: 'Email Suite'
  });

  // Removed unused setBillingInfo state

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'account', name: 'Account', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'smtp', name: 'SMTP Settings', icon: Mail },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'api', name: 'API Keys', icon: Key },
    { id: 'webhooks', name: 'Webhooks', icon: Webhook },
    { id: 'appearance', name: 'Appearance', icon: Palette },
  ];

  const handleSave = () => {
    setSaving(true);
    setSaveSuccess(false);
    
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            JD
          </div>
          <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-50">
            <Camera className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
          <p className="text-sm text-gray-500 mt-1">JPG, GIF or PNG. Max size 2MB.</p>
          <button className="mt-3 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Upload New Photo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
          <input
            type="text"
            value={profileData.company}
            onChange={(e) => setProfileData({...profileData, company: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select
            value={profileData.timezone}
            onChange={(e) => setProfileData({...profileData, timezone: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={profileData.language}
            onChange={(e) => setProfileData({...profileData, language: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Password Security</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Choose a strong password that you don't use elsewhere. We recommend using at least 12 characters with a mix of letters, numbers, and symbols.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordData.current}
              onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
          <input
            type="password"
            value={passwordData.new}
            onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex space-x-1">
            <div className="h-1 w-1/4 bg-red-500 rounded"></div>
            <div className="h-1 w-1/4 bg-yellow-500 rounded"></div>
            <div className="h-1 w-1/4 bg-gray-200 rounded"></div>
            <div className="h-1 w-1/4 bg-gray-200 rounded"></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Password strength: Weak</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
          <input
            type="password"
            value={passwordData.confirm}
            onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            <p className="text-xs text-gray-500 mt-1">Require a verification code in addition to your password</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Enable 2FA
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Current Session</p>
              <p className="text-xs text-gray-500">Chrome on Windows • Last active now</p>
            </div>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Mobile App</p>
              <p className="text-xs text-gray-500">iPhone • Last active 2 hours ago</p>
            </div>
            <button className="text-sm text-red-600 hover:text-red-700">Revoke</button>
          </div>
        </div>
        <button className="mt-4 text-sm text-red-600 hover:text-red-700">Sign out of all devices</button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Email Events</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Email Opens</span>
              <input
                type="checkbox"
                checked={notificationSettings.emailOpens}
                onChange={(e) => setNotificationSettings({...notificationSettings, emailOpens: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Link Clicks</span>
              <input
                type="checkbox"
                checked={notificationSettings.linkClicks}
                onChange={(e) => setNotificationSettings({...notificationSettings, linkClicks: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Unsubscribes</span>
              <input
                type="checkbox"
                checked={notificationSettings.unsubscribes}
                onChange={(e) => setNotificationSettings({...notificationSettings, unsubscribes: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Bounces</span>
              <input
                type="checkbox"
                checked={notificationSettings.bounces}
                onChange={(e) => setNotificationSettings({...notificationSettings, bounces: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Spam Complaints</span>
              <input
                type="checkbox"
                checked={notificationSettings.complaints}
                onChange={(e) => setNotificationSettings({...notificationSettings, complaints: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Campaign Reports</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Campaign Completed</span>
              <input
                type="checkbox"
                checked={notificationSettings.campaignCompleted}
                onChange={(e) => setNotificationSettings({...notificationSettings, campaignCompleted: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Weekly Performance Report</span>
              <input
                type="checkbox"
                checked={notificationSettings.weeklyReport}
                onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReport: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Monthly Performance Report</span>
              <input
                type="checkbox"
                checked={notificationSettings.monthlyReport}
                onChange={(e) => setNotificationSettings({...notificationSettings, monthlyReport: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Methods</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input type="checkbox" checked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Email notifications</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Browser notifications</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Slack notifications</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSMTP = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">SMTP Configuration</h4>
            <p className="text-sm text-blue-700 mt-1">
              These settings are used to send emails from your campaigns. Make sure to use valid SMTP credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
          <input
            type="text"
            value={smtpSettings.host}
            onChange={(e) => setSmtpSettings({...smtpSettings, host: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
          <input
            type="text"
            value={smtpSettings.port}
            onChange={(e) => setSmtpSettings({...smtpSettings, port: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <input
            type="text"
            value={smtpSettings.username}
            onChange={(e) => setSmtpSettings({...smtpSettings, username: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={smtpSettings.password}
            onChange={(e) => setSmtpSettings({...smtpSettings, password: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Encryption</label>
          <select
            value={smtpSettings.encryption}
            onChange={(e) => setSmtpSettings({...smtpSettings, encryption: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="ssl">SSL</option>
            <option value="tls">TLS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
          <input
            type="email"
            value={smtpSettings.fromEmail}
            onChange={(e) => setSmtpSettings({...smtpSettings, fromEmail: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
          <input
            type="text"
            value={smtpSettings.fromName}
            onChange={(e) => setSmtpSettings({...smtpSettings, fromName: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Test Connection
        </button>
        <span className="text-sm text-gray-500">Last tested: Never</span>
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Invite Member
        </button>
      </div>

      <div className="space-y-4">
        {[
          { name: 'John Doe', email: 'john@emailsuite.com', role: 'Owner', status: 'active' },
          { name: 'Jane Smith', email: 'jane@emailsuite.com', role: 'Admin', status: 'active' },
          { name: 'Bob Johnson', email: 'bob@emailsuite.com', role: 'Member', status: 'pending' },
          { name: 'Alice Brown', email: 'alice@emailsuite.com', role: 'Member', status: 'active' },
        ].map((member) => (
          <div key={member.email} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{member.role}</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                member.status === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {member.status}
              </span>
              <button className="text-sm text-red-600 hover:text-red-700">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBilling = () => {
    const billingInfo = {
      plan: 'Professional',
      status: 'active',
      nextBilling: '2024-03-15',
      amount: '$49.00',
      paymentMethod: 'Visa ending in 4242',
      cardExpiry: '05/25'
    };

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium mb-2">Current Plan: {billingInfo.plan}</h3>
          <p className="text-3xl font-bold mb-4">{billingInfo.amount}/month</p>
          <button className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">
            Upgrade Plan
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <p className="font-medium text-gray-900 capitalize">{billingInfo.status}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Next Billing Date</p>
            <p className="font-medium text-gray-900">{billingInfo.nextBilling}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Payment Method</p>
            <p className="font-medium text-gray-900">{billingInfo.paymentMethod}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Card Expiry</p>
            <p className="font-medium text-gray-900">{billingInfo.cardExpiry}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Billing History</h4>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Description</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-sm text-gray-600">Feb {10 + i}, 2024</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Professional Plan - Monthly</td>
                  <td className="px-4 py-3 text-sm text-gray-600">$49.00</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Paid</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-sm text-blue-600 hover:text-blue-700">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAPI = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Key className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">API Keys</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Keep your API keys secure. Do not share them publicly or expose them in client-side code.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { name: 'Production API Key', key: 'esk_live_1234567890abcdef', created: '2024-01-15', lastUsed: '2024-02-13' },
          { name: 'Development API Key', key: 'esk_test_abcdef1234567890', created: '2024-01-15', lastUsed: '2024-02-12' },
        ].map((apiKey) => (
          <div key={apiKey.name} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
              <div className="flex items-center space-x-2">
                <button className="text-sm text-blue-600 hover:text-blue-700">Regenerate</button>
                <button className="text-sm text-red-600 hover:text-red-700">Revoke</button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <code className="flex-1 p-2 bg-gray-50 rounded text-sm font-mono">
                {apiKey.key}
              </code>
              <button className="text-sm text-gray-600 hover:text-gray-900">Copy</button>
            </div>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>Created: {apiKey.created}</span>
              <span>Last used: {apiKey.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
        Generate New API Key
      </button>
    </div>
  );

  const renderWebhooks = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Webhook Endpoints</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Endpoint
        </button>
      </div>

      <div className="space-y-4">
        {[
          { url: 'https://api.example.com/webhooks/email-opens', events: ['email.opened'], status: 'active' },
          { url: 'https://api.example.com/webhooks/email-clicks', events: ['email.clicked'], status: 'active' },
          { url: 'https://api.example.com/webhooks/campaign-completed', events: ['campaign.completed'], status: 'inactive' },
        ].map((webhook, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  webhook.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <code className="text-sm font-mono text-gray-900">{webhook.url}</code>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-sm text-gray-600 hover:text-gray-900">Test</button>
                <button className="text-sm text-red-600 hover:text-red-700">Delete</button>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              {webhook.events.map((event) => (
                <span key={event} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {event}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          <button className="p-4 border-2 border-blue-500 rounded-lg text-center">
            <div className="w-full h-20 bg-white border border-gray-200 rounded mb-2"></div>
            <span className="text-sm font-medium text-gray-900">Light</span>
          </button>
          <button className="p-4 border-2 border-transparent rounded-lg text-center hover:border-gray-200">
            <div className="w-full h-20 bg-gray-900 rounded mb-2"></div>
            <span className="text-sm font-medium text-gray-900">Dark</span>
          </button>
          <button className="p-4 border-2 border-transparent rounded-lg text-center hover:border-gray-200">
            <div className="w-full h-20 bg-gradient-to-r from-gray-900 to-white rounded mb-2"></div>
            <span className="text-sm font-medium text-gray-900">System</span>
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Density</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-3">
            <input type="radio" name="density" className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700">Comfortable</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="radio" name="density" checked className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700">Compact</span>
          </label>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Date & Time Format</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
            <select className="w-full border border-gray-300 rounded-lg px-4 py-2">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
            <select className="w-full border border-gray-300 rounded-lg px-4 py-2">
              <option>12-hour (12:00 PM)</option>
              <option>24-hour (14:00)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="flex items-center space-x-3">
          {saveSuccess && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Settings saved!</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-12 divide-x divide-gray-200">
          {/* Sidebar */}
          <div className="col-span-3 p-6">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="col-span-9 p-6">
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'account' && renderAccount()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'smtp' && renderSMTP()}
            {activeTab === 'team' && renderTeam()}
            {activeTab === 'billing' && renderBilling()}
            {activeTab === 'api' && renderAPI()}
            {activeTab === 'webhooks' && renderWebhooks()}
            {activeTab === 'appearance' && renderAppearance()}
          </div>
        </div>
      </div>
    </div>
  );
};