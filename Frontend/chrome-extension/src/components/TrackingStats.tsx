import React from 'react';

interface TrackingStatsProps {
  stats: {
    emailsSent: number;
    emailsOpened: number;
    linksClicked: number;
  };
}

const STAT_ITEMS = (stats: TrackingStatsProps['stats']) => [
  { label: 'Sent',   value: stats.emailsSent,    color: 'text-blue-600'  },
  { label: 'Opened', value: stats.emailsOpened,  color: 'text-green-600' },
  { label: 'Clicks', value: stats.linksClicked,  color: 'text-red-500'   },
];

export const TrackingStats: React.FC<TrackingStatsProps> = ({ stats }) => (
  <div className="my-4">
    <h3 className="text-sm font-medium text-gray-800 mb-3">Today's Activity</h3>
    <div className="grid grid-cols-3 gap-2">
      {STAT_ITEMS(stats).map(({ label, value, color }) => (
        <div key={label} className="text-center">
          <div className={`text-xl font-bold ${color}`}>{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      ))}
    </div>
  </div>
);