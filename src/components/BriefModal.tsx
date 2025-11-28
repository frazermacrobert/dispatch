import React, { useMemo } from "react";
import { ActiveBrief, Consultant } from "../game/types";

type Props = {
  brief: ActiveBrief;
  consultants: Consultant[];
  selectedIds: string[];
  onToggleConsultant: (id: string) => void;
  onDispatch: () => void;
  onClose: () => void;
  outcomeMessage: string | null;
};

const STAT_KEYS = ["charisma", "intelligence", "speed", "strategy", "innovation"] as const;
type StatKey = (typeof STAT_KEYS)[number];

const STAT_LABELS: Record<StatKey, string> = {
  charisma: "Ch",
  intelligence: "In",
  speed: "Sp",
  strategy: "St",
  innovation: "Inno",
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
}> = ({ required, team, outcomeMessage }) => {
  const centerX = 50;
  const centerY = 50;
  const radius = 40;

  // derive colours based on outcome
  const outcomeIsSuccess = outcomeMessage?.startsWith("✅") ?? false;
  const outcomeIsFail = outcomeMessage?.startsWith("❌") ?? false;

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

  // normalise values so both shapes fit nicely
  const maxValue = STAT_KEYS.reduce((max, key) => {
    return Math.max(
      max,
      required[key],
      team[key] || 0
    );
  }, 1);

  const toPoint = (value: number, index: number, total: number): string => {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const r = (value / maxValue) * radius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return `${x},${y}`;
  };

  const requiredPoints = STAT_KEYS.map((k, i) =>
    toPoint(required[k], i, STAT_KEYS.length)
  ).join(" ");
  const teamPoints = STAT_KEYS.map((k, i) =>
    toPoint(team[k] || 0, i, STAT_KEYS.length)
  ).join(" ");

  return (
    <svg viewBox="0 0 100 100">
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((fraction, idx) => (
        <polygon
          key={idx}
          fill="none"
          stroke="#1f2937"
          strokeWidth={0.3}
          points={STAT_KEYS.map((_, i) => {
            const angle = (2 * Math.PI * i) / STAT_KEYS.length - Math.PI / 2;
            const r = radius * fraction;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            return `${x},${y}`;
          }).join(" ")}
        />
      ))}

      {/* spokes */}
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

      {/* mission polygon */}
      <polygon
        points={requiredPoints}
        fill="rgba(148, 163, 184, 0.2)"
        stroke="#e5e7eb"
        strokeWidth={0.7}
      />

      {/* team polygon */}
      <polygon
        points={teamPoints}
        fill={teamFill}
        stroke={teamStroke}
        strokeWidth={0.8}
      />

      {/* labels */}
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

const BriefModal: React.FC<Props> = ({
  brief,
  consultants,
  selectedIds,
  onToggleConsultant,
  onDispatch,
  onClose,
  outcomeMessage,
}) => {
  const selectedTeam = useMemo(
    () => consultants.filter((c) => selectedIds.includes(c.id)),
    [consultants, selectedIds]
  );

  const requiredStats = brief.requirements as Record<StatKey, number>;

  const teamStats = useMemo(() => {
    const base: Record<StatKey, number> = {
      charisma: 0,
      intelligence: 0,
      speed: 0,
      strategy: 0,
      innovation: 0,
    };
    for (const c of selectedTeam) {
      base.charisma += c.stats.charisma;
      base.intelligence += c.stats.intelligence;
      base.speed += c.stats.speed;
      base.strategy += c.stats.strategy;
      base.innovation += c.stats.innovation;
    }
    return base;
  }, [selectedTeam]);

  const teamSizeText =
    brief.minConsultants === brief.maxConsultants
      ? `${brief.minConsultants} consultant${brief.minConsultants > 1 ? "s" : ""}`
      : `${brief.minConsultants}–${brief.maxConsultants} consultants`;

  const disableDispatch =
    selectedIds.length < brief.minConsultants ||
    selectedIds.length > brief.maxConsultants ||
    selectedIds.length === 0;

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
        {/* left column – brief and team selection */}
        <div
          style={{
            padding: "1.4rem 1.4rem 1rem 1.4rem",
            borderRight: "1px solid rgba(30,64,175,0.75)",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.4rem",
                  fontWeight: 600,
                }}
              >
                {brief.name}
              </h2>
              <div
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.85rem",
                  color: "#9ca3af",
                }}
              >
                {brief.clientName} • {brief.difficultyLabel}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "0.35rem 0.7rem",
                fontSize: "0.8rem",
                borderRadius: "999px",
                border: "1px solid rgba(248,113,113,0.8)",
                background: "rgba(127,29,29,0.9)",
                color: "#fee2e2",
                cursor: "pointer",
              }}
            >
              Close
            </button>
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

          {/* required skills panel */}
          <div
            style={{
              marginTop: "0.5rem",
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
                  <span style={{ color: "#9ca3af" }}>
                    {STAT_LABELS[key]}:
                  </span>{" "}
                  <span>{requiredStats[key]}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: "0.4rem",
                color: "#9ca3af",
              }}
            >
              Team size: {teamSizeText}
            </div>
          </div>

          {/* select team via avatars */}
          <div style={{ marginTop: "0.5rem" }}>
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
                const disabled = c.state === "cooldown";
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
                        display: "block",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* footer */}
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
              onClick={onDispatch}
              disabled={disableDispatch}
              style={{
                padding: "0.55rem 1.3rem",
                borderRadius: "999px",
                border: "1px solid transparent",
                background: disableDispatch
                  ? "rgba(30,64,175,0.5)"
                  : "linear-gradient(to right, #22c55e, #16a34a)",
                color: disableDispatch ? "#cbd5f5" : "#022c22",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: disableDispatch ? "default" : "pointer",
              }}
            >
              Dispatch team ({selectedIds.length}/{brief.maxConsultants})
            </button>
          </div>

          {outcomeMessage && (
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                color: outcomeMessage.startsWith("✅")
                  ? "#4ade80"
                  : "#fecaca",
              }}
            >
              {outcomeMessage}
            </div>
          )}
        </div>

        {/* right column – radar */}
        <div
          style={{
            padding: "1.4rem 1.2rem 1.2rem 1.0rem",
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
            Fit to brief
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#9ca3af",
              marginBottom: "0.2rem",
            }}
          >
            Build a team whose shape overlaps the mission polygon as much as
            possible. Green means a success, red means a miss.
          </div>
          <div
            style={{
              flexGrow: 1,
              minHeight: 0,
              borderRadius: "0.9rem",
              border: "1px solid rgba(30,64,175,0.8)",
              background: "radial-gradient(circle at center, #020617, #020617)",
              padding: "0.35rem",
            }}
          >
            <RadarChart
              required={requiredStats}
              team={teamStats}
              outcomeMessage={outcomeMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BriefModal;
