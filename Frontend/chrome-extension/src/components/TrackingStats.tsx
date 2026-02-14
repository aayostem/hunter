import React from "react";

interface TrackingStatsProps {
  stats: {
    emailsSent: number;
    emailsOpened: number;
    linksClicked: number;
  };
}

export const TrackingStats: React.FC<TrackingStatsProps> = ({ stats }) => {
  return (
    <div className="tracking-stats" style={{ margin: "16px 0" }}>
      <h3 style={{ fontSize: "14px", margin: "0 0 12px 0" }}>
        Today's Activity
      </h3>
      <div
        className="stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        <div className="stat-item" style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "20px", fontWeight: "bold", color: "#1a73e8" }}
          >
            {stats.emailsSent}
          </div>
          <div style={{ fontSize: "12px", color: "#5f6368" }}>Sent</div>
        </div>
        <div className="stat-item" style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "20px", fontWeight: "bold", color: "#34a853" }}
          >
            {stats.emailsOpened}
          </div>
          <div style={{ fontSize: "12px", color: "#5f6368" }}>Opened</div>
        </div>
        <div className="stat-item" style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "20px", fontWeight: "bold", color: "#ea4335" }}
          >
            {stats.linksClicked}
          </div>
          <div style={{ fontSize: "12px", color: "#5f6368" }}>Clicks</div>
        </div>
      </div>
    </div>
  );
};
