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
import Intercom from "./components/Intercom";

type GamePhase = "intro" | "playing" | "ended";

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
  const [dialogue, setDialogue] = useState<{
    consultantId: string;
    text: string;
  } | null>(null);

  const [showExtras, setShowExtras] = useState(false);
  const [randomiseTeam, setRandomiseTeam] = useState(false);
  const [briefsExpire, setBriefsExpire] = useState(true);

  const timerIntervalRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const dialogueTimeoutRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  const activeBriefCount = useMemo(() => {
    return briefs.filter((b) => b.status === "pending").length;
  }, [briefs]);

  const isFirstBriefPending = useMemo(() => {
    if (briefs.length === 0) return false;
    const firstBrief = briefs.find((b) => b.instanceIndex === 0);
    return firstBrief ? firstBrief.status === "pending" : false;
  }, [briefs]);

  useEffect(() => {
    const initial: Consultant[] = consultantsData.map((c) => ({
      ...c,
      state: "available" as ConsultantState,
      status: "normal" as ConsultantStatus,
      cooldownMs: 0,
    }));
    setConsultants(initial);
  }, []);

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
  };

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

  useEffect(() => {
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);

    if (phase !== "playing") return;
    if (isPaused) return;
    if (isBriefModalOpen) return;
    if (isFirstBriefPending) return;

    if (briefsSpawned === 0) {
      spawnBrief(1);
      return;
    }

    if (briefsSpawned >= spawnConfig.totalBriefs) return;

    const maxConcurrentBriefs = 2;

    if (activeBriefCount >= maxConcurrentBriefs) return;

    const availableSlots = maxConcurrentBriefs - activeBriefCount;
    const remainingBriefs = spawnConfig.totalBriefs - briefsSpawned;
    
    let spawnCount = 1;
    let delayMs = 4000;

    if (briefsSpawned <= 5) {
      spawnCount = 1;
      delayMs = 5000;
    } else if (briefsSpawned <= 12) {
      spawnCount = Math.random() < 0.3 ? 2 : 1;
      delayMs = 4000;
    } else if (briefsSpawned <= 18) {
      spawnCount = Math.random() < 0.4 ? 2 : 1;
      delayMs = 3000;
    } else {
      spawnCount = 1;
      delayMs = 3000;
    }

    spawnCount = Math.min(spawnCount, availableSlots, remainingBriefs);

    if (spawnCount > 0) {
      spawnTimeoutRef.current = window.setTimeout(() => {
        spawnBrief(spawnCount);
      }, delayMs);
    }

    return () => {
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
      }
    };
  }, [briefsSpawned, activeBriefCount, phase, isPaused, isBriefModalOpen, isFirstBriefPending]);

  const triggerDialogue = () => {
    if (isPaused || isBriefModalOpen || dialogue) return;

    let dialogueType: "gameStart" | "success" | "failure" | null = null;
    let eligibleConsultants: string[] = [];

    if (briefsSpawned === 1 && successCount === 0 && failCount === 0) {
      dialogueType = "gameStart";
      eligibleConsultants = consultants
        .filter((c) => c.status !== "out")
        .map((c) => c.id);
    } else if (successCount > 0) {
      if (Math.random() < 0.4) {
        dialogueType = "success";
        const availableConsultants = consultants.filter((c) => c.status !== "out");
        const shuffled = [...availableConsultants].sort(() => Math.random() - 0.5);
        eligibleConsultants = shuffled.slice(0, 3).map((c) => c.id);
      }
    }
    if (failCount > 0 && !dialogueType) {
      if (Math.random() < 0.4) {
        dialogueType = "failure";
        const availableConsultants = consultants.filter((c) => c.status !== "out");
        const shuffled = [...availableConsultants].sort(() => Math.random() - 0.5);
        eligibleConsultants = shuffled.slice(0, 3).map((c) => c.id);
      }
    }

    if (!dialogueType || eligibleConsultants.length === 0) return;

    const consultantId = eligibleConsultants[Math.floor(Math.random() * eligibleConsultants.length)];
    const consultant = consultants.find((c) => c.id === consultantId);
    if (!consultant) return;

    const dialogueContent = (dialogueData as any)[dialogueType];
    if (!dialogueContent) return;

    let text: string;
    
    if (dialogueType === "gameStart") {
      const lines = dialogueContent[consultantId];
      if (!lines || lines.length === 0) return;
      text = lines[Math.floor(Math.random() * lines.length)];
    } else {
      const consultantDialogue = dialogueContent[consultantId];
      if (!consultantDialogue) return;

      const statusKey = consultant.status === "injured" ? "injured" : "normal";
      const lines = consultantDialogue[statusKey];
      if (!lines || lines.length === 0) return;
      
      text = lines[Math.floor(Math.random() * lines.length)];
    }

    setDialogue({ consultantId, text });
  };

  useInterval(
    triggerDialogue,
    isPaused || isBriefModalOpen ? null : 8000
  );

  useEffect(() => {
    if (dialogue) {
      if (dialogueTimeoutRef.current) {
        clearTimeout(dialogueTimeoutRef.current);
      }
      dialogueTimeoutRef.current = window.setTimeout(() => {
        setDialogue(null);
      }, 5000);
    }
  }, [dialogue]);

  useEffect(() => {
    if (phase !== "playing") return;

    timerIntervalRef.current = window.setInterval(() => {
      if (isPausedRef.current || isPaused || isBriefModalOpen || isFirstBriefPending) return;

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

  useEffect(() => {
    if (phase !== "playing") return;

    const allResolved = briefs.every((b) => b.status !== "pending");

    if (briefsSpawned >= spawnConfig.totalBriefs && allResolved) {
      setPhase("ended");
    }
  }, [briefs, briefsSpawned, phase]);

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
      setConsultants((prev) =>
        prev.map((c) => {
          if (!selectedConsultantIds.includes(c.id)) {
            return c;
          }

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
      setConsultants((prev) => {
        const isAlexSoloFail =
          selectedConsultantIds.length === 1 && selectedConsultantIds[0] === "alex";
        const alexSoloFailVictimIds = ["frazer", "jo", "lucy"];

        return prev.map((c) => {
          const wasOnMission = selectedConsultantIds.includes(c.id);
          const isCollateralVictim =
            isAlexSoloFail && alexSoloFailVictimIds.includes(c.id);

          if (!wasOnMission && !isCollateralVictim) {
            return c;
          }

          if (c.status === "out") {
            return c;
          }
          if (c.status === "injured") {
            return { ...c, status: "out", state: "available", cooldownMs: 0 };
          }
          let cooldownMs = spawnConfig.cooldownMs;

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
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleQuit = () => {
    setIsPaused(false);
    setPhase("intro");
  };

  const selectedBrief = briefs.find((b) => b.id === selectedBriefId);

  // RENDER ONLY ONE PHASE AT A TIME - CLEAN SEPARATION
  if (phase === "intro") {
    return (
      <div className="game-container phase-intro">
        <div className="start-screen">
          <div className="start-screen__gradient" />
          
          <div className="start-screen__title-block">
            <div className="start-screen__presenter">Scarletabbott presents</div>
            <h1 className="start-screen__title">DISPATCH</h1>
            <div className="start-screen__edition">Agency Edition</div>
          </div>

          <div className="start-screen__actions">
            <button className="start-screen__button-play" onClick={startGame}>
              Play
            </button>
            <button
              className="start-screen__button-extras"
              onClick={() => setShowExtras(true)}
            >
              Extras
            </button>
          </div>

          {showExtras && (
            <div className="extras-overlay">
              <div className="extras-modal">
                <div className="extras-header">
                  <div className="extras-title">Extras</div>
                  <button
                    onClick={() => setShowExtras(false)}
                    className="extras-close"
                  >
                    Close
                  </button>
                </div>

                <div className="extras-content">
                  <div className="extras-option">
                    <div>
                      <div>Randomise team</div>
                      <div className="extras-description">
                        Unlock secret guests and wild teams.
                      </div>
                    </div>
                    <button
                      onClick={() => setRandomiseTeam((v) => !v)}
                      className={`extras-toggle ${randomiseTeam ? 'active' : ''}`}
                    >
                      {randomiseTeam ? "On" : "Off"}
                    </button>
                  </div>

                  <div className="extras-option">
                    <div>
                      <div>Briefs expire</div>
                      <div className="extras-description">
                        Turn off timers for a slower planning session.
                      </div>
                    </div>
                    <button
                      onClick={() => setBriefsExpire((v) => !v)}
                      className={`extras-toggle ${briefsExpire ? 'active' : ''}`}
                    >
                      {briefsExpire ? "On" : "Off"}
                    </button>
                  </div>

                  <div className="extras-option extras-divider">
                    <div>
                      <div>Patchwork hub</div>
                      <div className="extras-description">
                        Visit other games and resources.
                      </div>
                    </div>
                    <button
                      onClick={() => alert("Patchwork hub coming soon")}
                      className="extras-button-primary"
                    >
                      Visit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "playing") {
    return (
      <div className="game-container phase-playing">
        <div className="world-map" />
        <div className="world-grid-overlay" />

        {isPaused && <PauseMenu onResume={handleResume} onQuit={handleQuit} />}

        <div className="game-header">
          <div className="game-header__briefs">
            Briefs: {briefsSpawned} / {spawnConfig.totalBriefs}
          </div>
          <div className="game-header__right">
            <div className="game-header__score">
              <span className="score-success">✓ {successCount}</span>
              <span className="score-fail">✗ {failCount}</span>
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

        <Intercom dialogue={dialogue} consultants={consultants} />
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
      </div>
    );
  }

  // phase === "ended"
  return (
    <div className="game-container phase-ended">
      <div className="world-map" />
      
      <div className="end-screen">
        <h1 className="end-screen__title">Game Complete</h1>
        <div className="end-screen__stat">
          <span className="stat-success">{successCount}</span>
          {" successful missions"}
        </div>
        <div className="end-screen__stat">
          <span className="stat-fail">{failCount}</span>
          {" failed missions"}
        </div>
        <div className="end-screen__rate">
          Success rate:{" "}
          {((successCount / spawnConfig.totalBriefs) * 100).toFixed(1)}%
        </div>
        <button onClick={startGame} className="end-screen__button">
          Play Again
        </button>
      </div>
    </div>
  );
};

export default App;