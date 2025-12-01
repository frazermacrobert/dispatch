import React from "react";
import { ActiveBrief } from "../game/types";

const getBriefIcon = (brief: ActiveBrief): string => {
  const id = brief.id.toLowerCase();
  const name = brief.name.toLowerCase();

  if (id.includes("behaviour") || id.includes("culture")) return "👥";
  if (id.includes("learning") || id.includes("development")) return "📘";
  if (id.includes("design") || id.includes("motion") || name.includes("film"))
    return "✦";
  if (id.includes("audit") || id.includes("research") || id.includes("insights"))
    return "📊";
  if (id.includes("strategy") || id.includes("brand")) return "♟";

  if (brief.difficultyLabel === "High stakes") return "!";
  if (brief.difficultyLabel === "Standard") return "●";
  return "○";
};

export const MarkerLayer: React.FC<{
  briefs: ActiveBrief[];
  onMarkerClick: (id: string) => void;
}> = ({ briefs, onMarkerClick }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
      }}
    >
      {briefs.map((brief) => {
        const timeRemainingSec = brief.remainingMs / 1000;
        const hasTimer = brief.timeLimitMs !== Infinity;
        const isUrgent = hasTimer && timeRemainingSec < 4;

        const progress = hasTimer
          ? (brief.remainingMs / brief.timeLimitMs) * 100
          : 100;

        const icon = getBriefIcon(brief);

        return (
          <div
            key={brief.id}
            className="marker-wrapper"
            style={{
              position: "absolute",
              left: `${brief.mapX}%`,
              top: `${brief.mapY}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "auto",
              textAlign: "center",
            }}
          >
            {/* pulsing outer ring */}
            <div
              style={{
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
              }}
            />

            {/* shared container for ring + button */}
            <div
              style={{
                position: "relative",
                width: "60px",
                height: "60px",
                margin: "0 auto",
              }}
            >
              {/* progress ring around the outside */}
              {hasTimer && (
                <svg
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: "rotate(-90deg)",
                    width: "60px",
                    height: "60px",
                    pointerEvents: "none",
                  }}
                >
                  {/* track */}
                  <circle
                    cx="30"
                    cy="30"
                    r="28"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeWidth="3"
                  />
                  {/* progress arc */}
                  <circle
                    cx="30"
                    cy="30"
                    r="28"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 28 * (1 - progress / 100)
                    }`}
                    style={{
                      transition: "stroke-dashoffset 0.1s linear",
                    }}
                  />
                </svg>
              )}

              {/* main marker button slightly inset so ring is visible */}
              <button
                onClick={() => onMarkerClick(brief.id)}
                title={`${brief.name} – ${brief.clientName}`}
                style={{
                  position: "absolute",
                  inset: "6px",
                  borderRadius: "50%",
                  background: isUrgent
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                  border: "3px solid white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
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
                <span
                  style={{
                    fontSize: "1.4rem",
                    lineHeight: 1,
                    textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                  }}
                >
                  {icon}
                </span>
              </button>
            </div>

            {/* timer text below */}
            {hasTimer && (
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                }}
              >
                {Math.ceil(timeRemainingSec)}s
              </div>
            )}
          </div>
        );
      })}

      {/* keep keyframes here if not already in global CSS */}
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
