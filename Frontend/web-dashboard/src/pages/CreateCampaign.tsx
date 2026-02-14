import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send,
  Users,
  Calendar,
  Settings,
  Eye
} from 'lucide-react';

export const CreateCampaign: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    fromName: '',
    fromEmail: '',
    replyTo: '',
    template: 'blank',
    content: '',
    list: '',
    schedule: 'now',
    scheduledDate: ''
  });

  const steps = [
    { number: 1, name: 'Campaign Info', icon: Settings },
    { number: 2, name: 'Design Email', icon: Eye },
    { number: 3, name: 'Select Audience', icon: Users },
    { number: 4, name: 'Schedule', icon: Calendar },
  ];

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignData.name}
                onChange={(e) => setCampaignData({...campaignData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Welcome Series"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={campaignData.subject}
                onChange={(e) => setCampaignData({...campaignData, subject: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Welcome to our community!"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={campaignData.fromName}
                  onChange={(e) => setCampaignData({...campaignData, fromName: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Your Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={campaignData.fromEmail}
                  onChange={(e) => setCampaignData({...campaignData, fromEmail: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="noreply@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reply-To Email
              </label>
              <input
                type="email"
                value={campaignData.replyTo}
                onChange={(e) => setCampaignData({...campaignData, replyTo: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="support@company.com"
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Template
              </label>
              <select
                value={campaignData.template}
                onChange={(e) => setCampaignData({...campaignData, template: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="blank">Blank Template</option>
                <option value="welcome">Welcome Email</option>
                <option value="newsletter">Newsletter</option>
                <option value="promotional">Promotional</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Content
              </label>
              <textarea
                value={campaignData.content}
                onChange={(e) => setCampaignData({...campaignData, content: e.target.value})}
                rows={10}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono"
                placeholder="Write your email content here... HTML supported"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Use {'{{name}}'} to personalize emails with recipient's name
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Contact List
              </label>
              <select
                value={campaignData.list}
                onChange={(e) => setCampaignData({...campaignData, list: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">Choose a list...</option>
                <option value="all">All Contacts (12,345)</option>
                <option value="customers">Customers (8,234)</option>
                <option value="leads">Leads (4,111)</option>
                <option value="newsletter">Newsletter Subscribers (6,789)</option>
              </select>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-3">List Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Contacts:</span>
                  <span className="font-medium">12,345</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Subscribers:</span>
                  <span className="font-medium">10,234</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unsubscribed:</span>
                  <span className="font-medium">2,111</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule
              </label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="now"
                    checked={campaignData.schedule === 'now'}
                    onChange={(e) => setCampaignData({...campaignData, schedule: e.target.value})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Send immediately</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="later"
                    checked={campaignData.schedule === 'later'}
                    onChange={(e) => setCampaignData({...campaignData, schedule: e.target.value})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Schedule for later</span>
                </label>
              </div>
            </div>

            {campaignData.schedule === 'later' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date and Time
                </label>
                <input
                  type="datetime-local"
                  value={campaignData.scheduledDate}
                  onChange={(e) => setCampaignData({...campaignData, scheduledDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Estimated Delivery</h4>
              <p className="text-sm text-yellow-700">
                Approximately 10,234 emails will be sent. Estimated delivery time: 15 minutes
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Campaigns
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Campaign</h1>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s) => (
              <div
                key={s.number}
                className={`flex items-center ${
                  s.number < steps.length ? 'flex-1' : ''
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      s.number <= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Step {s.number}</p>
                    <p className="text-xs text-gray-500">{s.name}</p>
                  </div>
                </div>
                {s.number < steps.length && (
                  <div className="flex-1 mx-4">
                    <div
                      className={`h-1 rounded ${
                        s.number < step ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className={`px-6 py-2 rounded-lg ${
              step === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Previous
          </button>
          
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Next Step
            </button>
          ) : (
            <button className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2">
              <Send className="w-4 h-4" />
              <span>Launch Campaign</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};