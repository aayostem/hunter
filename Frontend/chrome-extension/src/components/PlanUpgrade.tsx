import React from 'react';
import { Zap, Crown, TrendingUp } from 'lucide-react';

type Plan = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

interface PlanUpgradeProps {
  currentPlan: Plan;
  onUpgrade?: (plan: string) => void;
}

const PLANS: Record<Plan, { title: string; color: string; limits: string; nextPlan: string | null; nextPrice: string | null; features: string[] }> = {
  FREE:       { title: 'Free Plan',     color: 'gray',   limits: '100 emails/month',    nextPlan: 'PRO',        nextPrice: '$9.99/mo',  features: ['Basic tracking', 'Email open notifications', '7-day data retention'] },
  PRO:        { title: 'Pro Plan',      color: 'blue',   limits: '10,000 emails/month', nextPlan: 'BUSINESS',   nextPrice: '$29.99/mo', features: ['Advanced tracking', 'Link click tracking', '30-day data retention', 'Priority support'] },
  BUSINESS:   { title: 'Business Plan', color: 'purple', limits: 'Unlimited emails',    nextPlan: 'ENTERPRISE', nextPrice: 'Custom',    features: ['Everything in Pro', 'Team collaboration', 'API access', 'Custom domain', '1-year data retention'] },
  ENTERPRISE: { title: 'Enterprise',    color: 'gold',   limits: 'Unlimited',           nextPlan: null,         nextPrice: null,        features: ['Everything in Business', 'SLA guarantee', 'Dedicated support', 'Custom integrations', 'Unlimited retention'] },
};

const BADGE_COLORS: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  gold:   'bg-yellow-100 text-yellow-800',
  gray:   'bg-gray-100 text-gray-800',
};

const ICONS: Partial<Record<Plan, React.ReactNode>> = {
  PRO:        <Zap className="w-5 h-5" />,
  BUSINESS:   <TrendingUp className="w-5 h-5" />,
  ENTERPRISE: <Crown className="w-5 h-5" />,
};

export const PlanUpgrade: React.FC<PlanUpgradeProps> = ({ currentPlan, onUpgrade }) => {
  const plan = PLANS[currentPlan];

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {ICONS[currentPlan]}
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${BADGE_COLORS[plan.color]}`}>
            {plan.title}
          </span>
        </div>
        <span className="text-xs text-gray-500">{plan.limits}</span>
      </div>

      <div className="space-y-2 mb-4">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center space-x-2 text-xs text-gray-600">
            <span className="w-1 h-1 bg-green-500 rounded-full" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {plan.nextPlan && (
        <button
          onClick={() => onUpgrade?.(plan.nextPlan as string)}
          className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          Upgrade to {plan.nextPlan}{plan.nextPrice && ` - ${plan.nextPrice}`}
        </button>
      )}
    </div>
  );
};
