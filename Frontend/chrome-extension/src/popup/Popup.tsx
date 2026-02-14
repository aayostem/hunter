import React, { useState, useEffect } from "react";
import { TrackingStats } from "../components/TrackingStats";
import { SettingsToggle } from "../components/SettingsToggle";
import { PlanUpgrade } from "../components/PlanUpgrade";
import { PlanUpgradeManager } from "../utils/planupgrade";

type PlanType = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export const Popup: React.FC = () => {
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [planManager] = useState(() => new PlanUpgradeManager());
  const [currentPlan, setCurrentPlan] = useState<PlanType>("FREE");
  const [todayStats, setTodayStats] = useState({
    emailsSent: 0,
    emailsOpened: 0,
    linksClicked: 0,
  });

  useEffect(() => {
    // Load settings and stats
    chrome.storage.local.get(["trackingEnabled", "todayStats"], (result) => {
      if (result.trackingEnabled !== undefined) {
        setIsTrackingEnabled(result.trackingEnabled);
      }
      if (result.todayStats) {
        setTodayStats(result.todayStats);
      }
    });

    // Load plan from manager
    const plan = planManager.getCurrentPlan();
    if (plan) {
      // Map the plan name to the correct type
      const planName = plan.name.toUpperCase() as PlanType;
      setCurrentPlan(planName);
    }
  }, [planManager]);

  const handleToggleTracking = (enabled: boolean) => {
    setIsTrackingEnabled(enabled);
    chrome.storage.local.set({ trackingEnabled: enabled });

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "TRACKING_TOGGLED",
          enabled,
        });
      }
    });
  };

  const handleUpgrade = async (targetPlan: string) => {
    const success = await planManager.upgradePlan(targetPlan);
    if (success) {
      const plan = planManager.getCurrentPlan();
      if (plan) {
        setCurrentPlan(plan.name.toUpperCase() as PlanType);
      }
    }
  };

  return (
    <div
      className="popup-container"
      style={{ width: "320px", padding: "16px" }}
    >
      <div className="popup-header">
        <h1
          style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#1a73e8" }}
        >
          📊 Email Suite
        </h1>
      </div>

      <SettingsToggle
        enabled={isTrackingEnabled}
        onToggle={handleToggleTracking}
      />

      <TrackingStats stats={todayStats} />

      <PlanUpgrade 
        currentPlan={currentPlan} 
        onUpgrade={handleUpgrade}
      />

      <div
        className="popup-footer"
        style={{
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <button
          onClick={() =>
            chrome.tabs.create({ url: "https://app.emailsuite.com/dashboard" })
          }
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#1a73e8",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Open Dashboard
        </button>
      </div>
    </div>
  );
};