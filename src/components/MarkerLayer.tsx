import React from "react";
import { ActiveBrief } from "../game/types";

export const MarkerLayer: React.FC<{
  briefs: ActiveBrief[];
  onMarkerClick: (id: string) => void;
}> = ({ briefs, onMarkerClick }) => {
  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none",
    }}>
      {briefs.map((brief) => {
        const timeRemainingSec = brief.remainingMs / 1000;
        const isUrgent = timeRemainingSec < 4 && brief.timeLimitMs !== Infinity;
        const progress = brief.timeLimitMs === Infinity 
          ? 100 
          : (brief.remainingMs / brief.timeLimitMs) * 100;
        
        return (
          <div
            key={brief.id}
            style={{
              position: "absolute",
              left: `${brief.mapX}%`,
              top: `${brief.mapY}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "auto",
            }}
          >
            {/* Pulsing outer ring */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: isUrgent 
                ? "radial-gradient(circle, rgba(239, 68, 68, 0.4), transparent)"
                : "radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent)",
              animation: "pulse 2s ease-in-out infinite",
            }} />
            
            {/* Main marker button */}
            <button
              onClick={() => onMarkerClick(brief.id)}
              style={{
                position: "relative",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: isUrgent 
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "3px solid white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 600,
                fontSize: "0.75rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{ fontSize: "0.7rem", opacity: 0.9 }}>
                {brief.difficultyLabel}
              </div>
              {brief.timeLimitMs !== Infinity && (
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>
                  {Math.ceil(timeRemainingSec)}s
                </div>
              )}
            </button>
            
            {/* Progress ring */}
            {brief.timeLimitMs !== Infinity && (
              <svg
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-90deg)",
                  width: "70px",
                  height: "70px",
                  pointerEvents: "none",
                }}
              >
                <circle
                  cx="35"
                  cy="35"
                  r="32"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="3"
                />
                <circle
                  cx="35"
                  cy="35"
                  r="32"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - progress / 100)}`}
                  style={{
                    transition: "stroke-dashoffset 0.1s linear",
                  }}
                />
              </svg>
            )}
          </div>
        );
      })}
      
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 0.6;
              transform: translate(-50%, -50%) scale(1);
            }
            50% {
              opacity: 0.3;
              transform: translate(-50%, -50%) scale(1.3);
            }
          }
        `}
      </style>
    </div>
  );
};
