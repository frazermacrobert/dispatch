import React, { useEffect, useState, useRef } from "react";
import { Consultant, ActiveBrief, ConsultantState } from "./game/types";
import { evaluateMissionOutcome, createBriefInstance } from "./game/scoring";
import consultantsData from "./data/consultants.json";
import briefsData from "./data/brief_archetypes.json";
import spawnConfig from "./data/spawn_config.json";
import { ConsultantBar } from "./components/ConsultantBar";
import { MarkerLayer } from "./components/MarkerLayer";
import { BriefModal } from "./components/BriefModal";

type GamePhase = "intro" | "playing" | "ended";

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [briefs, setBriefs] = useState<ActiveBrief[]>([]);
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [briefsSpawned, setBriefsSpawned] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);
  
  const timerIntervalRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  // Initialize consultants
  useEffect(() => {
    const initial: Consultant[] = consultantsData.map((c) => ({
      ...c,
      state: "available" as ConsultantState,
      cooldownMs: 0,
    }));
    setConsultants(initial);
  }, []);

  // Start game
  const startGame = () => {
    setPhase("playing");
    setBriefsSpawned(0);
    setSuccessCount(0);
    setFailCount(0);
    setBriefs([]);
    setSelectedBriefId(null);
    setSelectedConsultantIds([]);
    setOutcomeMessage(null);
    
    // Spawn first brief after initial delay
    spawnTimeoutRef.current = window.setTimeout(() => {
      spawnBrief(true);
    }, spawnConfig.initialDelayMs);
  };

  // Spawn a new brief
  const spawnBrief = (isFirst: boolean = false) => {
    if (briefsSpawned >= spawnConfig.totalBriefs) {
      return;
    }

    const archetype = briefsData[Math.floor(Math.random() * briefsData.length)];
    const newBrief = createBriefInstance(archetype, briefsSpawned);
    
    // First brief has no timer, others do
    if (isFirst) {
      newBrief.timeLimitMs = Infinity;
      newBrief.remainingMs = Infinity;
    }

    setBriefs((prev) => [...prev, newBrief]);
    setBriefsSpawned((prev) => prev + 1);

    // Schedule next spawn
    if (briefsSpawned + 1 < spawnConfig.totalBriefs) {
      const [min, max] = spawnConfig.intervalRangeMs;
      const delay = min + Math.random() * (max - min);
      spawnTimeoutRef.current = window.setTimeout(() => spawnBrief(), delay);
    }
  };

  // Timer tick (100ms intervals)
  useEffect(() => {
    if (phase !== "playing") return;

    timerIntervalRef.current = window.setInterval(() => {
      if (isPausedRef.current) return;

      // Update brief timers
      setBriefs((prev) =>
        prev.map((b) => {
          if (b.status !== "pending") return b;
          if (b.remainingMs === Infinity) return b;

          const newRemaining = Math.max(0, b.remainingMs - 100);
          
          // Timer expired
          if (newRemaining === 0 && b.remainingMs > 0) {
            setFailCount((c) => c + 1);
            return { ...b, remainingMs: 0, status: "failed" as const };
          }

          return { ...b, remainingMs: newRemaining };
        })
      );

      // Update consultant cooldowns
      setConsultants((prev) =>
        prev.map((c) => {
          if (c.state !== "cooldown") return c;
          const newCooldown = Math.max(0, (c.cooldownMs || 0) - 100);
          
          if (newCooldown === 0) {
            return { ...c, state: "available", cooldownMs: 0 };
          }
          
          return { ...c, cooldownMs: newCooldown };
        })
      );
    }, 100);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phase]);

  // Check if game should end
  useEffect(() => {
    if (phase !== "playing") return;
    
    const allResolved = briefs.every((b) => b.status !== "pending");
    if (briefsSpawned >= spawnConfig.totalBriefs && allResolved) {
      setPhase("ended");
    }
  }, [briefs, briefsSpawned, phase]);

  // Open brief modal
  const handleMarkerClick = (briefId: string) => {
    setSelectedBriefId(briefId);
    setSelectedConsultantIds([]);
    setOutcomeMessage(null);
    isPausedRef.current = true; // Pause all timers
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedBriefId(null);
    setSelectedConsultantIds([]);
    setOutcomeMessage(null);
    isPausedRef.current = false; // Resume timers
  };

  // Toggle consultant selection
  const handleToggleConsultant = (consultantId: string) => {
    if (outcomeMessage) return; // Can't change after dispatch

    const consultant = consultants.find((c) => c.id === consultantId);
    if (!consultant || consultant.state === "cooldown") return;

    const brief = briefs.find((b) => b.id === selectedBriefId);
    if (!brief) return;

    const isSelected = selectedConsultantIds.includes(consultantId);
    
    if (isSelected) {
      setSelectedConsultantIds((prev) => prev.filter((id) => id !== consultantId));
    } else {
      if (selectedConsultantIds.length >= brief.maxConsultants) return;
      setSelectedConsultantIds((prev) => [...prev, consultantId]);
    }
  };

  // Dispatch team
  const handleDispatch = () => {
    if (!selectedBriefId || selectedConsultantIds.length === 0) return;

    const brief = briefs.find((b) => b.id === selectedBriefId);
    if (!brief) return;

    if (selectedConsultantIds.length < brief.minConsultants) {
      setOutcomeMessage(`Need at least ${brief.minConsultants} consultant(s).`);
      return;
    }

    const team = consultants.filter((c) => selectedConsultantIds.includes(c.id));
    const outcome = evaluateMissionOutcome(brief, team);

    // Update brief status
    setBriefs((prev) =>
      prev.map((b) =>
        b.id === selectedBriefId
          ? { ...b, status: outcome.success ? "success" : "failed" }
          : b
      )
    );

    // Update counts
    if (outcome.success) {
      setSuccessCount((c) => c + 1);
    } else {
      setFailCount((c) => c + 1);
    }

    // Put consultants on cooldown
    setConsultants((prev) =>
      prev.map((c) =>
        selectedConsultantIds.includes(c.id)
          ? { ...c, state: "cooldown", cooldownMs: spawnConfig.cooldownMs }
          : c
      )
    );

    setOutcomeMessage(
      outcome.success
        ? `✅ SUCCESS! ${outcome.explanation}`
        : `❌ FAILED. ${outcome.explanation}`
    );

    // Auto-close after 3 seconds
    setTimeout(() => {
      handleCloseModal();
    }, 3000);
  };

  const selectedBrief = briefs.find((b) => b.id === selectedBriefId);

  return (
    <div style={{ 
      width: "100vw", 
      height: "100vh", 
      position: "relative",
      background: "linear-gradient(to bottom, #0f172a, #1e293b)",
      overflow: "hidden",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {phase === "intro" && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          color: "white",
        }}>
          <h1 style={{ fontSize: "3rem", marginBottom: "1rem", fontWeight: 700 }}>
            DISPATCH
          </h1>
          <p style={{ fontSize: "1.2rem", marginBottom: "2rem", opacity: 0.8 }}>
            Agency Edition
          </p>
          <button
            onClick={startGame}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.2rem",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Start Game
          </button>
        </div>
      )}

      {phase === "playing" && (
        <>
          {/* Status bar */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "1rem 2rem",
            background: "rgba(15, 23, 42, 0.9)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 100,
          }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
              Briefs: {briefsSpawned} / {spawnConfig.totalBriefs}
            </div>
            <div style={{ display: "flex", gap: "2rem", fontSize: "1.1rem" }}>
              <span style={{ color: "#10b981" }}>✓ {successCount}</span>
              <span style={{ color: "#ef4444" }}>✗ {failCount}</span>
            </div>
          </div>

          {/* Map with markers */}
          <MarkerLayer
            briefs={briefs.filter((b) => b.status === "pending")}
            onMarkerClick={handleMarkerClick}
          />

          {/* Consultant bar */}
          <ConsultantBar consultants={consultants} />

          {/* Modal */}
          {selectedBrief && (
            <BriefModal
              brief={selectedBrief}
              consultants={consultants}
              selectedIds={selectedConsultantIds}
              onToggleConsultant={handleToggleConsultant}
              onDispatch={handleDispatch}
              onClose={handleCloseModal}
              outcomeMessage={outcomeMessage}
            />
          )}
        </>
      )}

      {phase === "ended" && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          color: "white",
          background: "rgba(15, 23, 42, 0.95)",
          padding: "3rem",
          borderRadius: "1rem",
          minWidth: "400px",
        }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "2rem", fontWeight: 700 }}>
            Game Complete
          </h1>
          <div style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            <span style={{ color: "#10b981", fontWeight: 600 }}>{successCount}</span>
            {" successful missions"}
          </div>
          <div style={{ fontSize: "1.5rem", marginBottom: "2rem" }}>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>{failCount}</span>
            {" failed missions"}
          </div>
          <div style={{ fontSize: "1.2rem", marginBottom: "2rem", opacity: 0.7 }}>
            Success rate: {((successCount / spawnConfig.totalBriefs) * 100).toFixed(1)}%
          </div>
          <button
            onClick={startGame}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
