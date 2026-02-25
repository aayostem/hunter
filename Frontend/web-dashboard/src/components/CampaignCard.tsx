// components/CampaignCard.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { 
  Mail, 
  Eye, 
  Calendar,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Send,
  Pause,
  Play,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

// Types
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed' | 'completed';
export type CampaignType = 'regular' | 'automated' | 'test';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  type: CampaignType;
  sent: number;
  opens: number;
  clicks: number;
  openRate?: number;
  clickRate?: number;
  date: string;
  scheduledFor?: string;
  tags?: string[];
  listName?: string;
  thumbnail?: string;
}

export interface CampaignCardProps {
  campaign: Campaign;
  onClick?: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
  onDuplicate?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
  onSend?: (campaign: Campaign) => void;
  onPause?: (campaign: Campaign) => void;
  onResume?: (campaign: Campaign) => void;
  onViewStats?: (campaign: Campaign) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  testId?: string;
}

// Status icons and colors
const STATUS_CONFIG: Record<CampaignStatus, { icon: React.FC; color: string; bgColor: string }> = {
  draft: { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  scheduled: { icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  sending: { icon: Send, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  sent: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  paused: { icon: Pause, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  failed: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  completed: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
};

// Helper functions
const calculateRate = (part: number, total: number): string => {
  if (!total || total === 0) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onClick,
  onEdit,
  onDuplicate,
  onDelete,
  onSend,
  onPause,
  onResume,
  onViewStats,
  showActions = true,
  compact = false,
  className = '',
  testId,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate rates
  const openRate = useMemo(() => {
    if (campaign.openRate !== undefined) return campaign.openRate;
    return calculateRate(campaign.opens, campaign.sent);
  }, [campaign]);

  const clickRate = useMemo(() => {
    if (campaign.clickRate !== undefined) return campaign.clickRate;
    return calculateRate(campaign.clicks, campaign.sent);
  }, [campaign]);

  // Handle click
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(campaign);
    }
  }, [campaign, onClick]);

  // Handle action
  const handleAction = useCallback((action: 'edit' | 'duplicate' | 'delete' | 'send' | 'pause' | 'resume' | 'stats') => {
    setShowMenu(false);
    
    switch (action) {
      case 'edit':
        onEdit?.(campaign);
        break;
      case 'duplicate':
        onDuplicate?.(campaign);
        break;
      case 'delete':
        onDelete?.(campaign);
        break;
      case 'send':
        onSend?.(campaign);
        break;
      case 'pause':
        onPause?.(campaign);
        break;
      case 'resume':
        onResume?.(campaign);
        break;
      case 'stats':
        onViewStats?.(campaign);
        break;
    }
  }, [campaign, onEdit, onDuplicate, onDelete, onSend, onPause, onResume, onViewStats]);

  // Get status icon
  // const StatusIcon = STATUS_CONFIG[campaign.status]?.icon || Clock;

  // Compact view
  if (compact) {
    return (
      <div
        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${className}`}
        onClick={handleClick}
        data-testid={testId}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${STATUS_CONFIG[campaign.status]?.bgColor || 'bg-gray-100'}`}>
              <Mail className={`w-5 h-5 ${STATUS_CONFIG[campaign.status]?.color || 'text-gray-600'}`} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{campaign.name}</h4>
              <p className="text-sm text-gray-500">{campaign.subject}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{openRate}</p>
              <p className="text-xs text-gray-500">Opens</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{clickRate}</p>
              <p className="text-xs text-gray-500">Clicks</p>
            </div>
            <StatusBadge status={campaign.status} type="campaign" size="sm" />
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div
      className={`bg-white p-6 hover:shadow-lg transition-all duration-200 relative ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${STATUS_CONFIG[campaign.status]?.bgColor || 'bg-gray-100'}`}>
            <Mail className={`w-5 h-5 ${STATUS_CONFIG[campaign.status]?.color || 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{campaign.subject}</p>
          </div>
        </div>

        {/* Actions Menu */}
        {showActions && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Campaign actions"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => handleAction('edit')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleAction('duplicate')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={() => handleAction('stats')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>View Stats</span>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    {campaign.status === 'draft' && (
                      <button
                        onClick={() => handleAction('send')}
                        className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send Now</span>
                      </button>
                    )}
                    {campaign.status === 'sending' && (
                      <button
                        onClick={() => handleAction('pause')}
                        className="w-full px-4 py-2 text-left text-sm text-yellow-600 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </button>
                    )}
                    {campaign.status === 'paused' && (
                      <button
                        onClick={() => handleAction('resume')}
                        className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>Resume</span>
                      </button>
                    )}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => handleAction('delete')}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{campaign.sent.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Sent</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{campaign.opens.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Opens</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{campaign.clicks.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Clicks</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{openRate}</p>
          <p className="text-xs text-gray-500">Open Rate</p>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 mb-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Opens</span>
            <span className="font-medium text-gray-900">{openRate}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 rounded-full h-2 transition-all duration-500"
              style={{ width: openRate }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Clicks</span>
            <span className="font-medium text-gray-900">{clickRate}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 rounded-full h-2 transition-all duration-500"
              style={{ width: clickRate }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(campaign.date)}</span>
          </div>
          {campaign.scheduledFor && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Clock className="w-3 h-3" />
              <span>Scheduled: {new Date(campaign.scheduledFor).toLocaleDateString()}</span>
            </div>
          )}
          {campaign.listName && (
            <span className="text-gray-500">List: {campaign.listName}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <StatusBadge status={campaign.status} type="campaign" size="sm" />
          {campaign.tags?.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Hover Overlay for Quick Actions */}
      {isHovered && onViewStats && (
        <div className="absolute inset-0 bg-black bg-opacity-5 flex items-center justify-center rounded-lg">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction('stats');
            }}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg shadow-lg hover:shadow-xl transition-shadow flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>View Details</span>
          </button>
        </div>
      )}
    </div>
  );
};