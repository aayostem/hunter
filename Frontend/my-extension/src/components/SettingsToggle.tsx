import React from 'react';

interface SettingsToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  label?: string;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  enabled,
  onToggle,
  label = 'Email Tracking'
}) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
          enabled ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);