import React from "react";
import { Consultant } from "../game/types";

export const ConsultantBar: React.FC<{
  consultants: Consultant[];
}> = ({ consultants }) => {
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(15, 23, 42, 0.95)",
      padding: "1rem 2rem",
      display: "flex",
      gap: "0.75rem",
      justifyContent: "center",
      alignItems: "center",
      borderTop: "2px solid rgba(59, 130, 246, 0.3)",
      zIndex: 100,
    }}>
      {consultants.map((c) => {
        const isAvailable = c.state === "available";
        const isCooldown = c.state === "cooldown";
        
        return (
          <div
            key={c.id}
            style={{
              padding: "0.75rem 1rem",
              background: isCooldown 
                ? "rgba(100, 116, 139, 0.3)" 
                : "rgba(59, 130, 246, 0.2)",
              border: isCooldown 
                ? "2px solid rgba(100, 116, 139, 0.5)"
                : "2px solid rgba(59, 130, 246, 0.5)",
              borderRadius: "0.5rem",
              color: isCooldown ? "#94a3b8" : "white",
              minWidth: "120px",
              textAlign: "center",
              opacity: isCooldown ? 0.6 : 1,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              {c.name}
            </div>
            <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              {c.tag}
            </div>
            {isCooldown && (
              <div style={{ 
                fontSize: "0.75rem", 
                marginTop: "0.25rem",
                color: "#f59e0b"
              }}>
                {((c.cooldownMs || 0) / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
