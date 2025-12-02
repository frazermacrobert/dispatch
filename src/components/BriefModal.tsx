import React, { useMemo, useState, useEffect, useRef } from "react";
import { ActiveBrief, Consultant } from "../game/types";
import { STAT_KEYS, STAT_LABELS, StatKey } from "../game/constants";

type Props = {
  brief: ActiveBrief;
  consultants: Consultant[];
  selectedIds: string[];
  onToggleConsultant: (id: string) => void;
  onDispatch: () => void;
  onClose: () => void;
  outcomeMessage: string | null;
  showPassCriteria: boolean;
};

const getAvatarFile = (id: string): string => {
  switch (id) {
    case "craig":
      return "craig-design-1.png";
    case "miles":
      return "miles-motion-1.png";
    case "ste":
      return "ste-content-1.png";
    default:
      return `${id}-consultant-1.png`;
  }
};

const RadarChart: React.FC<{
  required: Record<StatKey, number>;
  team: Record<StatKey, number>;
  outcomeMessage: string | null;
  showPassCriteria: boolean;
  isAnimating: boolean;
  animationComplete: boolean;
  animationScale: number;
  pulseCount: number;
}> = ({ required, team, outcomeMessage, showPassCriteria, isAnimating, animationComplete, animationScale, pulseCount }) => {
  const centerX = 50;
  const centerY = 50;
  const radius = 40;

  const outcomeIsSuccess = outcomeMessage?.startsWith("✅") ?? false;
  const outcomeIsFail = outcomeMessage?.startsWith("❌") ?? false;
  const showRequirements = showPassCriteria || isAnimating || animationComplete;

  // Determine color based on animation state
  let requirementStroke = "#e5e7eb";
  let requirementFill = "rgba(148,163,184,0.2)";
  
  if (animationComplete) {
    if (outcomeIsSuccess) {
      requirementStroke = "#22c55e";
      requirementFill = "rgba(34, 197, 94, 0.3)";
    } else if (outcomeIsFail) {
      requirementStroke = "#ef4444";
      requirementFill = "rgba(239, 68, 68, 0.3)";
    }
  }

  const teamStroke = outcomeIsSuccess
    ? "#22c55e"
    : outcomeIsFail
    ? "#ef4444"
    : "#3b82f6";

  const teamFill = outcomeIsSuccess
    ? "rgba(34, 197, 94, 0.35)"
    : outcomeIsFail
    ? "rgba(248, 113, 113, 0.35)"
    : "rgba(59, 130, 246, 0.25)";

  const maxValue = Math.max(
    ...STAT_KEYS.map((key) => Math.max(required[key], team[key] || 0)),
    10 // Ensure max is at least 10 for animation
  );

  const toPoint = (value: number, index: number): string => {
    const angle = (2 * Math.PI * index) / STAT_KEYS.length - Math.PI / 2;
    const r = (value / maxValue) * radius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return `${x},${y}`;
  };

  // During animation, scale from max (10) down to actual requirement
  const animatedRequired = STAT_KEYS.reduce((acc, key) => {
    const maxVal = 10;
    const targetVal = required[key];
    const currentVal = maxVal - (maxVal - targetVal) * animationScale;
    acc[key] = currentVal;
    return acc;
  }, {} as Record<StatKey, number>);

  const requiredPoints = STAT_KEYS.map((k, i) => 
    toPoint(isAnimating ? animatedRequired[k] : required[k], i)
  ).join(" ");
  
  const teamPoints = STAT_KEYS.map((k, i) => toPoint(team[k] || 0, i)).join(" ");

  // Calculate pulse scale (1.0 to 1.1 and back)
  const pulseScale = isAnimating && pulseCount < 3 
    ? 1 + Math.sin(pulseCount * Math.PI) * 0.05
    : 1;

  return (
    <svg viewBox="0 0 100 100">
      {[0.25, 0.5, 0.75, 1].map((f, idx) => (
        <polygon
          key={idx}
          fill="none"
          stroke="#1f2937"
          strokeWidth={0.3}
          points={STAT_KEYS.map((_, i) =>
            (() => {
              const angle =
                (2 * Math.PI * i) / STAT_KEYS.length - Math.PI / 2;
              const x = centerX + radius * f * Math.cos(angle);
              const y = centerY + radius * f * Math.sin(angle);
              return `${x},${y}`;
            })()
          ).join(" ")}
        />
      ))}

      {STAT_KEYS.map((_, i) => {
        const angle = (2 * Math.PI * i) / STAT_KEYS.length - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="#1f2937"
            strokeWidth={0.4}
          />
        );
      })}

      {showRequirements && (
        <g transform={`translate(${centerX}, ${centerY}) scale(${pulseScale}) translate(${-centerX}, ${-centerY})`}>
          <polygon
            points={requiredPoints}
            fill={requirementFill}
            stroke={requirementStroke}
            strokeWidth={isAnimating ? 1.2 : 0.7}
            style={{
              opacity: isAnimating || animationComplete ? 1 : 0,
              transition: animationComplete ? "stroke 0.3s ease, fill 0.3s ease" : "opacity 0.5s ease"
            }}
          />
        </g>
      )}

      <polygon
        points={teamPoints}
        fill={teamFill}
        stroke={teamStroke}
        strokeWidth={0.8}
      />

      {STAT_KEYS.map((k, i) => {
        const angle = (2 * Math.PI * i) / STAT_KEYS.length - Math.PI / 2;
        const x = centerX + (radius + 7) * Math.cos(angle);
        const y = centerY + (radius + 7) * Math.sin(angle);
        return (
          <text
            key={k}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="4"
            fill="#9ca3af"
          >
            {STAT_LABELS[k]}
          </text>
        );
      })}
    </svg>
  );
};

export const BriefModal: React.FC<Props> = ({
  brief,
  consultants,
  selectedIds,
  onToggleConsultant,
  onDispatch,
  onClose,
  outcomeMessage,
  showPassCriteria,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [animationScale, setAnimationScale] = useState(0);
  const [pulseCount, setPulseCount] = useState(0);
  const animationFrameRef = useRef<number>();

  const selectedTeam = useMemo(
    () => consultants.filter((c) => selectedIds.includes(c.id)),
    [consultants, selectedIds]
  );

  const requiredStats = brief.requirements as Record<StatKey, number>;

  const teamStats = useMemo(() => {
    const base: Record<StatKey, number> = {
      Flamboyance: 0,
      Process: 0,
      Pace: 0,
      Tenure: 0,
      Madcap: 0,
    };
    for (const c of selectedTeam) {
      STAT_KEYS.forEach((key) => {
        base[key] += c.stats[key];
      });
    }
    return base;
  }, [selectedTeam]);

  // Animation effect when dispatch is clicked
  useEffect(() => {
    if (!outcomeMessage) {
      setIsAnimating(false);
      setAnimationComplete(false);
      setAnimationScale(0);
      setPulseCount(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    setIsAnimating(true);
    setAnimationComplete(false);
    setAnimationScale(0);
    setPulseCount(0);
    
    const pulseDuration = 600; // ms per pulse
    const shrinkDuration = 1800; // ms to shrink (during pulses)
    const totalDuration = 3 * pulseDuration; // 3 pulses total
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      
      // Calculate which pulse we're on
      const currentPulse = Math.floor((elapsed / pulseDuration) * 3);
      setPulseCount(currentPulse);
      
      // Shrink from max (0) to target size (1) over the full duration
      const shrinkProgress = Math.min(elapsed / shrinkDuration, 1);
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - shrinkProgress, 3);
      setAnimationScale(eased);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setIsAnimating(false);
        setAnimationComplete(true);
        setAnimationScale(1);
        setPulseCount(3);
      }
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [outcomeMessage]);

  const disableDispatch =
    selectedIds.length < brief.minConsultants ||
    selectedIds.length > brief.maxConsultants ||
    selectedIds.length === 0 ||
    isAnimating;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at center, rgba(15,23,42,0.9), rgba(2,6,23,0.96))",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          width: "100%",
          maxHeight: "90vh",
          background: "rgba(15,23,42,0.98)",
          borderRadius: "1rem",
          border: "1px solid rgba(148,163,184,0.35)",
          boxShadow: "0 24px 80px rgba(15,23,42,0.9)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          overflow: "hidden",
        }}
      >
        {/* LEFT SIDE */}
        <div
          style={{
            padding: "1.4rem",
            borderRight: "1px solid rgba(30,64,175,0.75)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 600 }}>
                {brief.name}
              </h2>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#9ca3af",
                  marginTop: "0.2rem",
                }}
              >
                {brief.clientName} • {brief.difficultyLabel}
              </div>
            </div>
            {!outcomeMessage && (
              <button
                onClick={onClose}
                disabled={isAnimating}
                style={{
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.8rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(248,113,113,0.8)",
                  background: "rgba(127,29,29,0.9)",
                  color: "#fee2e2",
                  cursor: isAnimating ? "not-allowed" : "pointer",
                  opacity: isAnimating ? 0.5 : 1,
                }}
              >
                Close
              </button>
            )}
          </header>

          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "#e5e7eb",
              lineHeight: 1.5,
            }}
          >
            {brief.description}
          </p>

          {/* REQUIRED SKILLS */}
          <div
            style={{
              padding: "0.8rem 0.9rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(30,64,175,0.8)",
              background: "rgba(15,23,42,0.85)",
              fontSize: "0.8rem",
              color: "#cbd5f5",
            }}
          >
            <div
              style={{
                marginBottom: "0.4rem",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#9ca3af",
              }}
            >
              Required skills
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              {STAT_KEYS.map((key) => (
                <div key={key}>
                  <span style={{ color: "#9ca3af" }}>{STAT_LABELS[key]}:</span>{" "}
                  <span>{requiredStats[key]}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "0.4rem", color: "#9ca3af" }}>
              Team size:{" "}
              {brief.minConsultants === brief.maxConsultants
                ? brief.minConsultants
                : `${brief.minConsultants}–${brief.maxConsultants}`}
            </div>
          </div>

          {/* SELECT TEAM – AVATARS ONLY */}
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#9ca3af",
                marginBottom: "0.4rem",
              }}
            >
              Select your team:
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.6rem",
              }}
            >
              {consultants.map((c) => {
                const disabled = c.state === "cooldown" || isAnimating;
                const selected = selectedIds.includes(c.id);
                const avatarSrc = `avatars/${getAvatarFile(c.id)}`;
                const tooltip = `${c.name} — ${c.tag}`;

                return (
                  <button
                    key={c.id}
                    onClick={() => onToggleConsultant(c.id)}
                    disabled={disabled}
                    title={tooltip}
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "999px",
                      padding: 0,
                      border: selected
                        ? "2px solid rgba(34,197,94,0.9)"
                        : "2px solid rgba(148,163,184,0.5)",
                      background: disabled
                        ? "rgba(15,23,42,0.4)"
                        : "rgba(15,23,42,0.9)",
                      opacity: disabled ? 0.4 : 1,
                      cursor: disabled ? "default" : "pointer",
                    }}
                  >
                    <img
                      src={avatarSrc}
                      alt={tooltip}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "999px",
                        objectFit: "cover",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* DISPATCH */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.8rem",
              color: "#9ca3af",
            }}
          >
            <div>
              Selected: <strong>{selectedIds.length}</strong> /{" "}
              {brief.maxConsultants}
            </div>

            <button
              onClick={outcomeMessage ? onClose : onDispatch}
              disabled={outcomeMessage ? isAnimating : disableDispatch}
              style={{
                padding: "0.55rem 1.3rem",
                borderRadius: "999px",
                border: "1px solid transparent",
                background: (outcomeMessage ? isAnimating : disableDispatch)
                  ? "rgba(30,64,175,0.5)"
                  : outcomeMessage
                  ? "linear-gradient(to right, #3b82f6, #2563eb)"
                  : "linear-gradient(to right, #22c55e, #16a34a)",
                color: (outcomeMessage ? isAnimating : disableDispatch) ? "#cbd5f5" : outcomeMessage ? "#fff" : "#022c22",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: (outcomeMessage ? isAnimating : disableDispatch) ? "default" : "pointer",
              }}
            >
              {isAnimating
                ? "Evaluating..."
                : outcomeMessage
                ? "Continue"
                : `Dispatch team (${selectedIds.length}/${brief.maxConsultants})`}
            </button>
          </div>

          {/* OUTCOME MESSAGE - only show after animation complete */}
          {animationComplete && outcomeMessage && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.8rem",
                borderRadius: "0.5rem",
                background: outcomeMessage.startsWith("✅")
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${
                  outcomeMessage.startsWith("✅")
                    ? "rgba(34, 197, 94, 0.5)"
                    : "rgba(239, 68, 68, 0.5)"
                }`,
                fontSize: "0.85rem",
                color: outcomeMessage.startsWith("✅") ? "#4ade80" : "#fca5a5",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              <div>{outcomeMessage}</div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE – RADAR */}
        <div
          style={{
            padding: "1.4rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            background:
              "radial-gradient(circle at top, rgba(34,197,94,0.07), transparent), rgba(15,23,42,0.98)",
          }}
        >
          <div
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "#9ca3af",
            }}
          >
            {isAnimating ? "Evaluating..." : "Fit to brief"}
          </div>

          <div
            style={{
              fontSize: "0.75rem",
              color: "#9ca3af",
              marginBottom: "0.2rem",
            }}
          >
            {isAnimating
              ? "Watch the requirements shrink to reveal the mission parameters..."
              : "This chart shows how well your team shape overlaps the mission shape."}
          </div>

          <div
            style={{
              flexGrow: 1,
              minHeight: 0,
              borderRadius: "0.9rem",
              border: "1px solid rgba(30,64,175,0.8)",
              background: "radial-gradient(circle at center, #020617, #020617)",
              padding: "0.4rem",
            }}
          >
            <RadarChart
              required={requiredStats}
              team={teamStats}
              outcomeMessage={outcomeMessage}
              showPassCriteria={showPassCriteria}
              isAnimating={isAnimating}
              animationComplete={animationComplete}
              animationScale={animationScale}
              pulseCount={pulseCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
