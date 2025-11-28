import React from "react";
import { ActiveBrief, Consultant } from "../game/types";

export const BriefModal: React.FC<{
  brief: ActiveBrief;
  consultants: Consultant[];
  selectedIds: string[];
  onToggleConsultant: (id: string) => void;
  onDispatch: () => void;
  onClose: () => void;
  outcomeMessage: string | null;
}> = ({ brief, consultants, selectedIds, onToggleConsultant, onDispatch, onClose, outcomeMessage }) => {
  const canDispatch = selectedIds.length >= brief.minConsultants && 
                      selectedIds.length <= brief.maxConsultants &&
                      !outcomeMessage;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "2rem",
    }}>
      <div style={{
        background: "linear-gradient(to bottom, #1e293b, #0f172a)",
        borderRadius: "1rem",
        padding: "2rem",
        maxWidth: "800px",
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        color: "white",
        border: "2px solid rgba(59, 130, 246, 0.3)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
      }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700 }}>
              {brief.name}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "2px solid rgba(239, 68, 68, 0.5)",
                color: "#ef4444",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Close
            </button>
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
            {brief.clientName} • {brief.difficultyLabel}
          </div>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
            {brief.description}
          </p>
        </div>

        {/* Requirements */}
        <div style={{ 
          background: "rgba(59, 130, 246, 0.1)", 
          padding: "1rem", 
          borderRadius: "0.5rem",
          marginBottom: "1.5rem",
          border: "1px solid rgba(59, 130, 246, 0.3)",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            Required Skills:
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {Object.entries(brief.requirements).map(([key, value]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ textTransform: "capitalize", opacity: 0.8, fontSize: "0.85rem" }}>
                  {key}:
                </span>
                <span style={{ fontWeight: 600, color: "#3b82f6" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", opacity: 0.7 }}>
            Team size: {brief.minConsultants}–{brief.maxConsultants} consultant{brief.maxConsultants > 1 ? 's' : ''}
          </div>
        </div>

        {/* Consultant selection */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "1rem", fontSize: "1.1rem" }}>
            Select Your Team:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
            {consultants.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              const isAvailable = c.state === "available";
              const isCooldown = c.state === "cooldown";
              const canSelect = isAvailable || isSelected;

              return (
                <button
                  key={c.id}
                  onClick={() => canSelect && onToggleConsultant(c.id)}
                  disabled={!canSelect || !!outcomeMessage}
                  style={{
                    padding: "1rem",
                    background: isSelected 
                      ? "rgba(16, 185, 129, 0.2)"
                      : isCooldown 
                      ? "rgba(100, 116, 139, 0.2)"
                      : "rgba(59, 130, 246, 0.1)",
                    border: isSelected
                      ? "2px solid #10b981"
                      : isCooldown
                      ? "2px solid rgba(100, 116, 139, 0.5)"
                      : "2px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "0.5rem",
                    color: isCooldown ? "#94a3b8" : "white",
                    cursor: canSelect && !outcomeMessage ? "pointer" : "not-allowed",
                    textAlign: "left",
                    opacity: isCooldown ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                    {c.name}
                    {isSelected && " ✓"}
                  </div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                    {c.tag}
                  </div>
                  {isCooldown && (
                    <div style={{ fontSize: "0.75rem", color: "#f59e0b" }}>
                      Cooldown: {((c.cooldownMs || 0) / 1000).toFixed(1)}s
                    </div>
                  )}
                  {isAvailable && (
                    <div style={{ fontSize: "0.7rem", marginTop: "0.5rem", opacity: 0.6 }}>
                      Ch:{c.stats.charisma} In:{c.stats.intelligence} Sp:{c.stats.speed} St:{c.stats.strategy} Iv:{c.stats.innovation}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Outcome message */}
        {outcomeMessage && (
          <div style={{
            padding: "1rem",
            background: outcomeMessage.startsWith("✅") 
              ? "rgba(16, 185, 129, 0.2)"
              : "rgba(239, 68, 68, 0.2)",
            border: outcomeMessage.startsWith("✅")
              ? "2px solid #10b981"
              : "2px solid #ef4444",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}>
            {outcomeMessage}
          </div>
        )}

        {/* Dispatch button */}
        {!outcomeMessage && (
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              onClick={onDispatch}
              disabled={!canDispatch}
              style={{
                flex: 1,
                padding: "1rem",
                fontSize: "1.1rem",
                fontWeight: 700,
                background: canDispatch 
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "rgba(100, 116, 139, 0.3)",
                color: canDispatch ? "white" : "#64748b",
                border: "none",
                borderRadius: "0.5rem",
                cursor: canDispatch ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              Dispatch Team ({selectedIds.length}/{brief.maxConsultants})
            </button>
            <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
              {selectedIds.length < brief.minConsultants && (
                <span>Need {brief.minConsultants - selectedIds.length} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
