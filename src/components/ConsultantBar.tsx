import React from "react";
import { Consultant } from "../game/types";

const getAvatarFile = (id: string): string => {
  switch (id) {
    case "craig":
      return "craig-design-1.png";
    case "miles":
      return "miles-motion-1.png";
    case "ste":
      return "ste-content-1.png";
    default:
      // default pattern
      return `${id}-consultant-1.png`;
  }
};

export const ConsultantBar: React.FC<{
  consultants: Consultant[];
}> = ({ consultants }) => {
  return (
    <div
      style={{
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
      }}
    >
      {consultants.map((c) => {
        const isCooldown = c.state === "cooldown";
        const isInjured = c.status === "injured";
        const isOut = c.status === "out";
        const avatarFile = getAvatarFile(c.id);
        const avatarSrc = `${import.meta.env.BASE_URL}avatars/${avatarFile}`;

        let tooltip = `${c.name} — ${c.tag}`;
        if (isInjured)
          tooltip += "\nInjured: one more failure and they're out.";
        if (isOut) tooltip += "\nOut for the rest of the game.";

        const style: React.CSSProperties = {
          padding: "0.5rem 0.75rem",
          background: "rgba(59, 130, 246, 0.2)",
          border: "2px solid rgba(59, 130, 246, 0.5)",
          borderRadius: "0.5rem",
          color: "white",
          minWidth: "96px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        };

        if (isCooldown) {
          style.background = "rgba(100, 116, 139, 0.3)";
          style.border = "2px solid rgba(100, 116, 139, 0.5)";
          style.color = "#94a3b8";
          style.opacity = 0.6;
        }

        if (isOut) {
          style.background = "rgba(55, 65, 81, 0.3)";
          style.border = "2px solid rgba(75, 85, 99, 0.5)";
          style.color = "#9ca3af";
          style.opacity = 0.5;
        }

        return (
          <div key={c.id} title={tooltip} style={style}>
            <div style={{ position: "relative" }}>
              <img
                src={avatarSrc}
                alt={tooltip}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "999px",
                  objectFit: "cover",
                  display: "block",
                  marginBottom: isCooldown ? "0.25rem" : 0,
                  filter: isOut ? "grayscale(100%)" : "none",
                }}
              />
              {isInjured && !isOut && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: "999px",
                    background: "rgba(239, 68, 68, 0.4)",
                    zIndex: 1,
                  }}
                />
              )}
            </div>

            {isCooldown && (
              <div
                style={{
                  fontSize: "0.75rem",
                  marginTop: "0.1rem",
                  color: "#f59e0b",
                }}
              >
                {((c.cooldownMs || 0) / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
