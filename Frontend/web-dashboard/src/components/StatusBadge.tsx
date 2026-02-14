import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  PlayCircle,
  PauseCircle,
  AlertCircle,
  Send,
  Eye,
  MousePointer
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type?: 'campaign' | 'email' | 'contact' | 'default';
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  type = 'default',
  showIcon = true,
  size = 'md'
}) => {
  const getStatusConfig = () => {
    const statusLower = status.toLowerCase();
    
    // Campaign statuses
    if (type === 'campaign') {
      switch (statusLower) {
        case 'active':
        case 'sending':
          return {
            bg: 'bg-green-100',
            text: 'text-green-800',
            icon: PlayCircle,
            label: 'Active'
          };
        case 'draft':
          return {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            icon: Clock,
            label: 'Draft'
          };
        case 'scheduled':
          return {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            icon: Clock,
            label: 'Scheduled'
          };
        case 'paused':
          return {
            bg: 'bg-yellow-100',
            text: 'text-yellow-800',
            icon: PauseCircle,
            label: 'Paused'
          };
        case 'completed':
        case 'sent':
          return {
            bg: 'bg-green-100',
            text: 'text-green-800',
            icon: CheckCircle,
            label: 'Completed'
          };
        case 'failed':
          return {
            bg: 'bg-red-100',
            text: 'text-red-800',
            icon: XCircle,
            label: 'Failed'
          };
        default:
          return {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            icon: AlertCircle,
            label: status
          };
      }
    }
    
    // Email statuses
    if (type === 'email') {
      switch (statusLower) {
        case 'sent':
          return {
            bg: 'bg-green-100',
            text: 'text-green-800',
            icon: Send,
            label: 'Sent'
          };
        case 'opened':
          return {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            icon: Eye,
            label: 'Opened'
          };
        case 'clicked':
          return {
            bg: 'bg-purple-100',
            text: 'text-purple-800',
            icon: MousePointer,
            label: 'Clicked'
          };
        case 'bounced':
          return {
            bg: 'bg-red-100',
            text: 'text-red-800',
            icon: XCircle,
            label: 'Bounced'
          };
        default:
          return {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            icon: Clock,
            label: status
          };
      }
    }
    
    // Contact statuses
    if (type === 'contact') {
      switch (statusLower) {
        case 'active':
        case 'subscribed':
          return {
            bg: 'bg-green-100',
            text: 'text-green-800',
            icon: CheckCircle,
            label: 'Active'
          };
        case 'unsubscribed':
          return {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            icon: XCircle,
            label: 'Unsubscribed'
          };
        case 'bounced':
          return {
            bg: 'bg-red-100',
            text: 'text-red-800',
            icon: AlertCircle,
            label: 'Bounced'
          };
        default:
          return {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            icon: Clock,
            label: status
          };
      }
    }
    
    // Default statuses
    switch (statusLower) {
      case 'success':
      case 'active':
      case 'completed':
      case 'sent':
      case 'delivered':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: CheckCircle,
          label: status
        };
      case 'pending':
      case 'waiting':
      case 'scheduled':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: Clock,
          label: status
        };
      case 'failed':
      case 'error':
      case 'bounced':
      case 'rejected':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          icon: XCircle,
          label: status
        };
      case 'processing':
      case 'sending':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: Send,
          label: status
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: AlertCircle,
          label: status
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} rounded-full font-medium ${config.bg} ${config.text}`}>
      {showIcon && <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />}
      {config.label}
    </span>
  );
};

// Pre-configured badges for common use cases
export const CampaignStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <StatusBadge status={status} type="campaign" />
);

export const EmailStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <StatusBadge status={status} type="email" />
);

export const ContactStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <StatusBadge status={status} type="contact" />
);
