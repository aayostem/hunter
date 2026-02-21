import React, { useState, useEffect } from 'react';
import { TrackingStats } from '../components/TrackingStats';
import { SettingsToggle } from '../components/SettingsToggle';
import { PlanUpgrade } from '../components/PlanUpgrade';
import { PlanUpgradeManager } from '../utils/planupgrade';

type PlanType = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

const planManager = new PlanUpgradeManager();

export const Popup: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<PlanType>('FREE');
  const [todayStats, setTodayStats] = useState({
    emailsSent: 0,
    emailsOpened: 0,
    linksClicked: 0
  });

  const loadPlan = () => {
    try {
      const plan = planManager.getCurrentPlan();
      if (plan?.name) setCurrentPlan(plan.name.toUpperCase() as PlanType);
    } catch (e) {
      console.error('Email Suite: failed to load plan:', e);
    }
  };

  useEffect(() => {
    // Load settings and stats from storage
    chrome.storage.local.get(['trackingEnabled', 'todayStats'], (result) => {
      if (result.trackingEnabled !== undefined) setIsTrackingEnabled(result.trackingEnabled);
      if (result.todayStats) setTodayStats(result.todayStats);
      setLoading(false);
    });

    loadPlan();

    // Fixed: keep stats in sync if storage changes while popup is open
    const onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.trackingEnabled) setIsTrackingEnabled(changes.trackingEnabled.newValue);
      if (changes.todayStats) setTodayStats(changes.todayStats.newValue);
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  const handleToggleTracking = (enabled: boolean) => {
    setIsTrackingEnabled(enabled);
    chrome.storage.local.set({ trackingEnabled: enabled });

    // Fixed: guard against empty tabs array and undefined tab id
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId !== undefined) {
        chrome.tabs.sendMessage(tabId, { type: 'TRACKING_TOGGLED', enabled });
      }
    });
  };

  const handleUpgrade = async (targetPlan: string) => {
    try {
      const success = await planManager.upgradePlan(targetPlan);
      if (success) loadPlan();
    } catch (e) {
      console.error('Email Suite: upgrade failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="w-80 p-4 flex items-center justify-center h-32">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-80 p-4">
      <h1 className="text-lg font-semibold text-blue-600 mb-4">
        📊 Email Suite
      </h1>

      <SettingsToggle
        enabled={isTrackingEnabled}
        onToggle={handleToggleTracking}
      />

      <TrackingStats stats={todayStats} />

      <PlanUpgrade
        currentPlan={currentPlan}
        onUpgrade={handleUpgrade}
      />

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => chrome.tabs.create({ url: 'https://app.emailsuite.com/dashboard' })}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          Open Dashboard
        </button>
      </div>
    </div>
  );
};