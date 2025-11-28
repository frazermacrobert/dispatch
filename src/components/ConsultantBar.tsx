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
        const avatarFile = getAvatarFile(c.id);
        const avatarSrc = `${import.meta.env.BASE_URL}avatars/${avatarFile}`;
        const tooltip = `${c.name} — ${c.tag}`;

        return (
          <div
            key={c.id}
            title={tooltip}
            style={{
              padding: "0.5rem 0.75rem",
              background: isCooldown
                ? "rgba(100, 116, 139, 0.3)"
                : "rgba(59, 130, 246, 0.2)",
              border: isCooldown
                ? "2px solid rgba(100, 116, 139, 0.5)"
                : "2px solid rgba(59, 130, 246, 0.5)",
              borderRadius: "0.5rem",
              color: isCooldown ? "#94a3b8" : "white",
              minWidth: "96px",
              textAlign: "center",
              opacity: isCooldown ? 0.6 : 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
              }}
            />

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
