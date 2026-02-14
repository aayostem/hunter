import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, MousePointer, Calendar, MoreVertical } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    status: string;
    sent: number;
    opens: number;
    clicks: number;
    date: string;
  };
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  const openRate = campaign.sent > 0 ? ((campaign.opens / campaign.sent) * 100).toFixed(1) : '0';
  const clickRate = campaign.opens > 0 ? ((campaign.clicks / campaign.opens) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Link to={`/campaigns/${campaign.id}`} className="text-lg font-medium text-gray-900 hover:text-blue-600">
            {campaign.name}
          </Link>
          <div className="flex items-center space-x-4 mt-2">
            <StatusBadge status={campaign.status} />
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(campaign.date).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <p className="text-sm text-gray-500">Sent</p>
            <p className="font-semibold text-gray-900">{campaign.sent.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center text-sm text-gray-500">
              <Eye className="w-4 h-4 mr-1" />
              <span>Opens</span>
            </div>
            <p className="font-semibold text-gray-900">{campaign.opens.toLocaleString()} ({openRate}%)</p>
          </div>
          <div className="text-center">
            <div className="flex items-center text-sm text-gray-500">
              <MousePointer className="w-4 h-4 mr-1" />
              <span>Clicks</span>
            </div>
            <p className="font-semibold text-gray-900">{campaign.clicks.toLocaleString()} ({clickRate}%)</p>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};