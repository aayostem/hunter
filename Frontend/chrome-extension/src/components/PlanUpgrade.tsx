
import React from 'react';
import { Zap, Crown, TrendingUp } from 'lucide-react';

interface PlanUpgradeProps {
  currentPlan: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  onUpgrade?: (plan: string) => void;
}

export const PlanUpgrade: React.FC<PlanUpgradeProps> = ({ 
  currentPlan, 
  onUpgrade 
}) => {
  const getPlanFeatures = () => {
    switch(currentPlan) {
      case 'FREE':
        return {
          title: 'Free Plan',
          color: 'gray',
          limits: '100 emails/month',
          nextPlan: 'PRO',
          nextPrice: '$9.99/mo',
          features: [
            'Basic tracking',
            'Email open notifications',
            '7-day data retention'
          ]
        };
      case 'PRO':
        return {
          title: 'Pro Plan',
          color: 'blue',
          limits: '10,000 emails/month',
          nextPlan: 'BUSINESS',
          nextPrice: '$29.99/mo',
          features: [
            'Advanced tracking',
            'Link click tracking',
            '30-day data retention',
            'Priority support'
          ]
        };
      case 'BUSINESS':
        return {
          title: 'Business Plan',
          color: 'purple',
          limits: 'Unlimited emails',
          nextPlan: 'ENTERPRISE',
          nextPrice: 'Custom',
          features: [
            'Everything in Pro',
            'Team collaboration',
            'API access',
            'Custom domain',
            '1-year data retention'
          ]
        };
      default:
        return {
          title: 'Enterprise',
          color: 'gold',
          limits: 'Unlimited',
          nextPlan: null,
          nextPrice: null,
          features: [
            'Everything in Business',
            'SLA guarantee',
            'Dedicated support',
            'Custom integrations',
            'Unlimited retention'
          ]
        };
    }
  };

  const plan = getPlanFeatures();

  const getBadgeColor = () => {
    switch(plan.color) {
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'purple': return 'bg-purple-100 text-purple-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIcon = () => {
    switch(currentPlan) {
      case 'PRO': return <Zap className="w-5 h-5" />;
      case 'BUSINESS': return <TrendingUp className="w-5 h-5" />;
      case 'ENTERPRISE': return <Crown className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getBadgeColor()}`}>
            {plan.title}
          </span>
        </div>
        <span className="text-xs text-gray-500">{plan.limits}</span>
      </div>

      <div className="space-y-2 mb-4">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
            <span className="w-1 h-1 bg-green-500 rounded-full"></span>
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {plan.nextPlan && (
        <button
          onClick={() => onUpgrade?.(plan.nextPlan!)}
          className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          Upgrade to {plan.nextPlan} {plan.nextPrice && `- ${plan.nextPrice}`}
        </button>
      )}
    </div>
  );
};