import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Consultant,
  ActiveBrief,
  ConsultantState,
  ConsultantStatus,
} from "./game/types";
import { evaluateMissionOutcome, createBriefInstance } from "./game/scoring";
import { useInterval } from "./game/useInterval";
import consultantsData from "./data/consultants.json";
import briefsData from "./data/brief_archetypes.json";
import spawnConfig from "./data/spawn_config.json";
import dialogueData from "./data/dialogue.json";
import { ConsultantBar } from "./components/ConsultantBar";
import { MarkerLayer } from "./components/MarkerLayer";
import { BriefModal } from "./components/BriefModal";
import PauseMenu from "./components/PauseMenu";
import SpeechBubble from "./components/SpeechBubble";

type GamePhase = "intro" | "playing" | "ended";

// Type for dialogue data structure
type DialogueData = {
  [consultantId: string]: {
    normal: string[];
    injured: string[];
    cooldown: string[];
  };
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [isPaused, setIsPaused] = useState(false);
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [briefs, setBriefs] = useState<ActiveBrief[]>([]);
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [briefsSpawned, setBriefsSpawned] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);
  const [isFinalBriefPending, setIsFinalBriefPending] = useState(false);
  const [dialogue, setDialogue] = useState<{
    consultantId: string;
    text: string;
  } | null>(null);

  // extras / options (logic not wired in yet)
  const [showExtras, setShowExtras] = useState(false);
  const [randomiseTeam, setRandomiseTeam] = useState(false);
  const [briefsExpire, setBriefsExpire] = useState(true);

  const timerIntervalRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const dialogueTimeoutRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  const isFirstBriefPending = useMemo(() => {
    if (briefs.length === 0) return false;
    const firstBrief = briefs.find((b) => b.instanceIndex === 0);
    return firstBrief ? firstBrief.status === "pending" : false;
  }, [briefs]);

  // initialise consultants
  useEffect(() => {
    const initial: Consultant[] = consultantsData.map((c) => ({
      ...c,
      state: "available" as ConsultantState,
      status: "normal" as ConsultantStatus,
      cooldownMs: 0,
    }));
    setConsultants(initial);
  }, []);

  // start game
  const startGame = () => {
    const initialConsultants: Consultant[] = consultantsData.map((c) => ({
      ...c,
      state: "available" as ConsultantState,
      status: "normal" as ConsultantStatus,
      cooldownMs: 0,
    }));
    setConsultants(initialConsultants);

    setPhase("playing");
    setIsPaused(false);
    isPausedRef.current = false;
    setShowExtras(false);

    setBriefsSpawned(0);
    setSuccessCount(0);
    setFailCount(0);
    setBriefs([]);
    setSelectedBriefId(null);
    setSelectedConsultantIds([]);
    setOutcomeMessage(null);

    // The main useEffect hook will handle the initial spawn.
  };

  // spawn a new brief
  const spawnBrief = (count = 1) => {
    if (briefsSpawned >= spawnConfig.totalBriefs) {
      return;
    }

    const newBriefs: ActiveBrief[] = [];
    const numToSpawn = Math.min(count, spawnConfig.totalBriefs - briefsSpawned);

    for (let i = 0; i < numToSpawn; i++) {
      const briefIndex = briefsSpawned + i;
      const archetype =
        briefsData[Math.floor(Math.random() * briefsData.length)];
      const newBrief = createBriefInstance(archetype, briefIndex);

      // The very first brief has no timer.
      if (briefIndex === 0) {
        newBrief.timeLimitMs = Infinity;
        newBrief.remainingMs = Infinity;
      }
      newBriefs.push(newBrief);
    }

    if (newBriefs.length > 0) {
      setBriefs((prev) => [...prev, ...newBriefs]);
      setBriefsSpawned((prev) => prev + newBriefs.length);
    }
  };

  // Main spawn scheduling effect
  useEffect(() => {
    // clear any existing timer on effect entry
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);

    // Don't spawn if paused, modal is open, or first brief is still pending
    if (phase !== "playing" || isPaused || isBriefModalOpen || isFirstBriefPending) {
      return;
    }

    // Initial spawn is always a single brief.
    if (briefsSpawned === 0) {
      spawnBrief(1);
      return;
    }

    // Smart pacing: Check how many briefs are currently active
    const activeBriefs = briefs.filter((b) => b.status === "pending");
    const maxConcurrentBriefs = 2; // Don't let more than 2 briefs be active at once

    // Stop spawning if we've spawned all briefs (except the final one handled separately)
    if (briefsSpawned >= spawnConfig.totalBriefs - 1) {
      return;
    }

    // If we already have the max number of active briefs, wait
    if (activeBriefs.length >= maxConcurrentBriefs) {
      return;
    }

    // Calculate how many briefs we can spawn
    const availableSlots = maxConcurrentBriefs - activeBriefs.length;
    const remainingBriefs = spawnConfig.totalBriefs - 1 - briefsSpawned; // -1 because final is special
    
    // Determine spawn count and delay based on game progression
    let spawnCount = 1;
    let delayMs = 4000; // Base delay of 4 seconds

    // Early game (briefs 1-5): Gentle introduction, spawn 1 at a time
    if (briefsSpawned <= 5) {
      spawnCount = 1;
      delayMs = 5000; // 5 second delay for early game
    }
    // Mid game (briefs 6-12): Ramp up slightly, occasional pairs
    else if (briefsSpawned <= 12) {
      spawnCount = Math.random() < 0.3 ? 2 : 1; // 30% chance of 2 briefs
      delayMs = 4000;
    }
    // Late game (briefs 13-18): More challenging, but still fair
    else if (briefsSpawned <= 18) {
      spawnCount = Math.random() < 0.4 ? 2 : 1; // 40% chance of 2 briefs
      delayMs = 3000;
    }
    // Final push (briefs 19+): Final challenge
    else {
      spawnCount = 1;
      delayMs = 3000;
    }

    // Respect available slots and remaining briefs
    spawnCount = Math.min(spawnCount, availableSlots, remainingBriefs);

    // Only spawn if we have slots available and briefs left to spawn
    if (spawnCount > 0) {
      spawnTimeoutRef.current = window.setTimeout(() => {
        spawnBrief(spawnCount);
      }, delayMs);
    }

    // cleanup on unmount or when dependencies change.
    return () => {
      if (spawnTimeoutRef.current && !isFinalBriefPending) {
        clearTimeout(spawnTimeoutRef.current);
      }
    };
  }, [briefsSpawned, briefs, phase, isPaused, isBriefModalOpen, isFirstBriefPending, isFinalBriefPending]);

  // dialogue system
  const triggerDialogue = () => {
    if (isPaused || isBriefModalOpen || dialogue) return;

    // 15% chance to trigger dialogue (increased from 10% for better frequency)
    if (Math.random() > 0.15) return;

    // Filter consultants who are available to speak
    const availableConsultants = consultants.filter((c) => c.status !== "out");
    if (availableConsultants.length === 0) return;

    // Pick a random consultant
    const consultant =
      availableConsultants[
        Math.floor(Math.random() * availableConsultants.length)
      ];

    // Get the consultant-specific dialogue based on their current state
    const consultantDialogue = (dialogueData as DialogueData)[consultant.id];
    if (!consultantDialogue) return;

    // Determine which set of lines to use based on consultant state
    let lines: string[];
    if (consultant.state === "cooldown") {
      lines = consultantDialogue.cooldown || consultantDialogue.normal;
    } else if (consultant.status === "injured") {
      lines = consultantDialogue.injured || consultantDialogue.normal;
    } else {
      lines = consultantDialogue.normal;
    }

    if (!lines || lines.length === 0) return;

    // Pick a random line from the appropriate set
    const text = lines[Math.floor(Math.random() * lines.length)];
    setDialogue({ consultantId: consultant.id, text });
  };

  useInterval(
    triggerDialogue,
    isPaused || isBriefModalOpen ? null : 8000
  );

  // auto-clear dialogue
  useEffect(() => {
    if (dialogue) {
      if (dialogueTimeoutRef.current) {
        clearTimeout(dialogueTimeoutRef.current);
      }
      dialogueTimeoutRef.current = window.setTimeout(() => {
        setDialogue(null);
      }, 4000);
    }
  }, [dialogue]);

  // timer tick (100ms)
  useEffect(() => {
    if (phase !== "playing") return;

    timerIntervalRef.current = window.setInterval(() => {
      // Pause all timers when paused, modal is open, or first brief is pending
      if (isPausedRef.current || isPaused || isBriefModalOpen || isFirstBriefPending) return;

      // brief timers
      setBriefs((prev) =>
        prev.map((b) => {
          if (b.status !== "pending") return b;
          if (!briefsExpire || b.remainingMs === Infinity) return b;

          const newRemaining = Math.max(0, b.remainingMs - 100);

          if (newRemaining === 0 && b.remainingMs > 0) {
            setFailCount((c) => c + 1);
            return { ...b, remainingMs: 0, status: "failed" as const };
          }

          return { ...b, remainingMs: newRemaining };
        })
      );

      // consultant cooldowns
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
  }, [phase, isPaused, briefsExpire, isBriefModalOpen, isFirstBriefPending]);

  // end condition
  useEffect(() => {
    if (phase !== "playing") return;

    const allResolved = briefs.every((b) => b.status !== "pending");

    // all briefs are resolved, and we've spawned all but the last one.
    if (
      briefs.length > 0 &&
      allResolved &&
      briefsSpawned === spawnConfig.totalBriefs - 1
    ) {
      // pause dramatically, then spawn the last one
      setIsFinalBriefPending(true);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = window.setTimeout(() => {
        spawnBrief(1);
        setIsFinalBriefPending(false);
      }, spawnConfig.finalBriefDelayMs);
    }

    if (briefsSpawned >= spawnConfig.totalBriefs && allResolved) {
      setPhase("ended");
    }
  }, [briefs, briefsSpawned, phase]);

  // marker click
  const handleMarkerClick = (briefId: string) => {
    setSelectedBriefId(briefId);
    setSelectedConsultantIds([]);
    setOutcomeMessage(null);
    setIsBriefModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedBriefId(null);
    setSelectedConsultantIds([]);
    setOutcomeMessage(null);
    setIsBriefModalOpen(false);
  };

  const handleToggleConsultant = (consultantId: string) => {
    if (outcomeMessage) return;

    const consultant = consultants.find((c) => c.id === consultantId);
    if (
      !consultant ||
      consultant.state === "cooldown" ||
      consultant.status === "out"
    )
      return;

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

  const handleDispatch = () => {
    if (!selectedBriefId || selectedConsultantIds.length === 0) return;

    const brief = briefs.find((b) => b.id === selectedBriefId);
    if (!brief) return;

    if (selectedConsultantIds.length < brief.minConsultants) {
      setOutcomeMessage(`Need at least ${brief.minConsultants} consultant(s).`);
      return;
    }

    const team = consultants.filter((c) => selectedConsultantIds.includes(c.id));

    // later: hook in randomiseTeam behaviour here
    const outcome = evaluateMissionOutcome(brief, team);

    setBriefs((prev) =>
      prev.map((b) =>
        b.id === selectedBriefId
          ? { ...b, status: outcome.success ? "success" : "failed" }
          : b
      )
    );

    if (outcome.success) {
      setSuccessCount((c) => c + 1);
      // on success, consultants just go on cooldown
      setConsultants((prev) =>
        prev.map((c) => {
          if (!selectedConsultantIds.includes(c.id)) {
            return c;
          }

          // Special character logic for success
          let cooldownMs = spawnConfig.cooldownMs;
          if (c.id === "frazer") {
            cooldownMs /= 2;
          }
          if (c.id === "gonzalo") {
            cooldownMs *= 2;
          }

          if (c.id === "craig" && c.status === "injured") {
            return { ...c, status: "normal", state: "cooldown", cooldownMs };
          }

          if (c.id === "alex" && selectedConsultantIds.length === 1) {
            return { ...c, stats: { ...c.stats, Tenure: 8 }, state: "cooldown", cooldownMs };
          }

          return { ...c, state: "cooldown", cooldownMs };
        })
      );
    } else {
      setFailCount((c) => c + 1);
      // on fail, peril system kicks in
      setConsultants((prev) => {
        const isAlexSoloFail =
          selectedConsultantIds.length === 1 && selectedConsultantIds[0] === "alex";
        const alexSoloFailVictimIds = ["frazer", "jo", "lucy"];

        return prev.map((c) => {
          const wasOnMission = selectedConsultantIds.includes(c.id);
          const isCollateralVictim =
            isAlexSoloFail && alexSoloFailVictimIds.includes(c.id);

          if (!wasOnMission && !isCollateralVictim) {
            return c; // No change
          }

          // --- Peril System Logic ---
          // This applies to dispatched consultants AND collateral victims.

          // already out--no change
          if (c.status === "out") {
            return c;
          }
          // injured--now out
          if (c.status === "injured") {
            return { ...c, status: "out", state: "available", cooldownMs: 0 };
          }
          // normal--now injured
          let cooldownMs = spawnConfig.cooldownMs;

          // Special character cooldown logic for failure (only for those on the mission)
          if (wasOnMission) {
            if (c.id === "frazer") {
              cooldownMs *= 3;
            }
            if (c.id === "gonzalo") {
              cooldownMs *= 2;
            }
          }

          return {
            ...c,
            status: "injured",
            state: "cooldown",
            cooldownMs,
          };
        });
      });
    }

    setOutcomeMessage(
      outcome.success
        ? `✅ SUCCESS! ${outcome.explanation}`
        : `❌ FAILED. ${outcome.explanation}`
    );

    // Don't automatically close the modal - let the user click "Continue"
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleQuit = () => {
    setIsPaused(false);
    setPhase("intro");
  };

  const selectedBrief = briefs.find((b) => b.id === selectedBriefId);

  return (
    <div
      id="app-root"
      className={
        phase === "intro"
          ? "phase-intro"
          : phase === "playing"
          ? "phase-playing"
          : "phase-ended"
      }
    >
      {/* world map only after intro */}
      {phase !== "intro" && (
        <>
          <div className="world-map" />
          <div className="world-grid-overlay" />
        </>
      )}

      {/* INTRO / TITLE SCREEN */}
      {phase === "intro" && (
        <>
          {/* subtle dark gradient at bottom for menu */}
          <div
            style={{
              position: "absolute",
              inset: "55% 0 0 0",
              background:
                "linear-gradient(to top, rgba(15,23,42,0.95), transparent)",
            }}
          />

          {/* title block bottom left */}
          <div
            style={{
              position: "absolute",
              left: "3rem",
              bottom: "7rem",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: "0.9rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                opacity: 0.8,
                marginBottom: "0.25rem",
              }}
            >
              Scarletabbott presents
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "2.6rem",
                fontWeight: 800,
                letterSpacing: "0.4em",
              }}
            >
              DISPATCH
            </h1>
            <div
              style={{
                fontSize: "1rem",
                marginTop: "0.3rem",
                opacity: 0.85,
              }}
            >
              Agency Edition
            </div>
          </div>

          {/* main menu buttons bottom left */}
          <div
            style={{
              position: "absolute",
              left: "3rem",
              bottom: "2.5rem",
              display: "flex",
              gap: "1rem",
            }}
          >
            <button
              onClick={startGame}
              style={{
                minWidth: "140px",
                padding: "0.9rem 1.8rem",
                borderRadius: "999px",
                border: "1px solid rgba(59,130,246,0.8)",
                background:
                  "linear-gradient(to bottom, #3b82f6, #2563eb)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(15,23,42,0.7)",
              }}
            >
              Play
            </button>

            <button
              onClick={() => setShowExtras(true)}
              style={{
                minWidth: "140px",
                padding: "0.9rem 1.6rem",
                borderRadius: "999px",
                border: "1px solid rgba(148,163,184,0.7)",
                background: "rgba(15,23,42,0.85)",
                color: "#e5e7eb",
                fontWeight: 500,
                fontSize: "0.9rem",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(15,23,42,0.7)",
              }}
            >
              Extras
            </button>
          </div>

          {/* extras popup */}
          {showExtras && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15,23,42,0.7)",
                backdropFilter: "blur(4px)",
                zIndex: 20,
              }}
            >
              <div
                style={{
                  width: "380px",
                  maxWidth: "90vw",
                  borderRadius: "1rem",
                  background:
                    "radial-gradient(circle at top, rgba(148,163,184,0.2), transparent), rgba(15,23,42,0.98)",
                  border: "1px solid rgba(148,163,184,0.4)",
                  boxShadow: "0 18px 50px rgba(15,23,42,0.9)",
                  padding: "1.25rem 1.3rem",
                  color: "#e5e7eb",
                  fontSize: "0.9rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: "#9ca3af",
                    }}
                  >
                    Extras
                  </div>
                  <button
                    onClick={() => setShowExtras(false)}
                    style={{
                      borderRadius: "999px",
                      border: "1px solid rgba(148,163,184,0.6)",
                      background: "rgba(15,23,42,0.9)",
                      color: "#e5e7eb",
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.6rem",
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.7rem",
                  }}
                >
                  {/* randomise team */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div>Randomise team</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                        }}
                      >
                        Unlock secret guests and wild teams.
                      </div>
                    </div>
                    <button
                      onClick={() => setRandomiseTeam((v) => !v)}
                      style={{
                        padding: "0.35rem 0.9rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(148,163,184,0.7)",
                        background: randomiseTeam
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(15,23,42,0.9)",
                        color: randomiseTeam ? "#4ade80" : "#e5e7eb",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      {randomiseTeam ? "On" : "Off"}
                    </button>
                  </div>

                  {/* briefs expire */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div>Briefs expire</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                        }}
                      >
                        Turn off timers for a slower planning session.
                      </div>
                    </div>
                    <button
                      onClick={() => setBriefsExpire((v) => !v)}
                      style={{
                        padding: "0.35rem 0.9rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(148,163,184,0.7)",
                        background: briefsExpire
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(15,23,42,0.9)",
                        color: briefsExpire ? "#4ade80" : "#e5e7eb",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      {briefsExpire ? "On" : "Off"}
                  </button>
                  </div>

                  {/* patchwork hub */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid rgba(31,41,55,0.9)",
                      paddingTop: "0.7rem",
                      marginTop: "0.2rem",
                    }}
                  >
                    <div>
                      <div>Patchwork hub</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                        }}
                      >
                        Visit other games and resources.
                      </div>
                    </div>
                    <button
                      onClick={() => alert("Patchwork hub coming soon")}
                      style={{
                        padding: "0.35rem 0.9rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(59,130,246,0.8)",
                        background:
                          "linear-gradient(to bottom, #3b82f6, #2563eb)",
                        color: "white",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      Visit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* PLAYING */}
      {phase === "playing" && (
        <>
          {isPaused && <PauseMenu onResume={handleResume} onQuit={handleQuit} />}

          <div
            style={{
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
            }}
          >
            <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
              Briefs: {briefsSpawned} / {spawnConfig.totalBriefs}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
              <div style={{ display: "flex", gap: "2rem", fontSize: "1.1rem" }}>
                <span style={{ color: "#10b981" }}>✓ {successCount}</span>
                <span style={{ color: "#ef4444" }}>✗ {failCount}</span>
              </div>
              <button onClick={() => setIsPaused(true)} className="button">
                Pause
              </button>
            </div>
          </div>

          <MarkerLayer
            briefs={briefs.filter((b) => b.status === "pending")}
            onMarkerClick={handleMarkerClick}
          />

          <SpeechBubble dialogue={dialogue} consultants={consultants} />
          <ConsultantBar consultants={consultants} />

          {selectedBrief && (
            <BriefModal
              brief={selectedBrief}
              consultants={consultants}
              selectedIds={selectedConsultantIds}
              onToggleConsultant={handleToggleConsultant}
              onDispatch={handleDispatch}
              onClose={handleCloseModal}
              outcomeMessage={outcomeMessage}
              showPassCriteria={true}
            />
          )}
        </>
      )}

      {/* ENDED */}
      {phase === "ended" && (
        <div
          style={{
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
          }}
        >
          <h1
            style={{
              fontSize: "2.5rem",
              marginBottom: "2rem",
              fontWeight: 700,
            }}
          >
            Game Complete
          </h1>
          <div style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            <span style={{ color: "#10b981", fontWeight: 600 }}>
              {successCount}
            </span>
            {" successful missions"}
          </div>
          <div style={{ fontSize: "1.5rem", marginBottom: "2rem" }}>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>
              {failCount}
            </span>
            {" failed missions"}
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              marginBottom: "2rem",
              opacity: 0.7,
            }}
          >
            Success rate:{" "}
            {((successCount / spawnConfig.totalBriefs) * 100).toFixed(1)}%
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
