import React from "react";

interface SettingsToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <div
      className="settings-toggle"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <span style={{ fontSize: "14px", fontWeight: "500" }}>
        Email Tracking
      </span>
      <label className="switch">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ display: "none" }}
        />
        <span
          className="slider"
          style={{
            position: "relative",
            display: "inline-block",
            width: "40px",
            height: "20px",
            backgroundColor: enabled ? "#1a73e8" : "#ccc",
            borderRadius: "20px",
            transition: "background-color 0.3s",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              position: "absolute",
              content: '""',
              height: "16px",
              width: "16px",
              left: enabled ? "22px" : "2px",
              top: "2px",
              backgroundColor: "white",
              borderRadius: "50%",
              transition: "left 0.3s",
            }}
          />
        </span>
      </label>
    </div>
  );
};
