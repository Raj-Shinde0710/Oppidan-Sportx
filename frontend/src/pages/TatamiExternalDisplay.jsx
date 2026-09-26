import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, Trophy } from "lucide-react";
import { getTatamiUser, getTatamiDashboard, getTatamiMatch } from "../api/tatami";

// Format time as m:ss.t matching stadium timer format
const formatTimeWithTenths = (totalSec) => {
  const s = Math.max(0, Number(totalSec) || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const tenths = Math.floor((s % 1) * 10);
  return `${mins}:${String(secs).padStart(2, "0")}.${tenths}`;
};

export default function TatamiExternalDisplay() {
  const params = useParams();
  const [sessionUser] = useState(getTatamiUser());

  // Tatami ID from route param or authenticated session
  const activeTatamiId = params.tatamiId || sessionUser?.id || null;

  const [tatamiNumber, setTatamiNumber] = useState(sessionUser?.number || 1);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Presentation swap state (Synced from operator: AKA/RED right, AO/BLUE left)
  const [isShuffled, setIsShuffled] = useState(false);

  // Score & Timer states
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(90);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Penalty / Status indicators (Red for AKA, Blue for AO)
  const [warningsA, setWarningsA] = useState({ C1: false, C2: false, C3: false, HC: false, H: false });
  const [warningsB, setWarningsB] = useState({ C1: false, C2: false, C3: false, HC: false, H: false });
  const [senshu, setSenshu] = useState(null); // 'A', 'B', or null

  // Event Popup Notification State (Full-screen overlay for scoring, warnings & VR)
  const [activePopup, setActivePopup] = useState(null);
  const popupTimeoutRef = useRef(null);

  // New Match Transition Overlay State
  const [matchTransition, setMatchTransition] = useState(null);
  const transitionTimeoutRef = useRef(null);

  const timerIntervalRef = useRef(null);
  const channelRef = useRef(null);
  const activeMatchIdRef = useRef(null);

  // Trigger full-screen event popup (scores / warnings / VR)
  const triggerEventPopup = (popupData) => {
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }
    const popupObj = { id: Date.now(), ...popupData };
    setActivePopup(popupObj);

    // Auto-dismiss: VR stays slightly longer (1.8s) for visibility; points/warnings auto-dismiss in 1.3s
    const dismissDuration = popupData.type === "VR" ? 1800 : 1300;
    popupTimeoutRef.current = setTimeout(() => {
      setActivePopup(null);
      popupTimeoutRef.current = null;
    }, dismissDuration);
  };

  // Handler: External VR Button clicked
  const handleTriggerVR = () => {
    const vrPopup = {
      id: Date.now(),
      type: "VR",
      title: "VR",
      subtitle: "VIDEO REVIEW",
      playerSide: "NEUTRAL",
      playerName: "REFEREE REVIEW REQUESTED",
    };
    triggerEventPopup(vrPopup);
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "TRIGGER_EVENT_POPUP",
        popup: vrPopup,
      });
    }
  };

  // Apply state update safely
  const applyLiveState = (state) => {
    if (!state) return;
    if (state.match) {
      // Check if match switched to a new match
      if (activeMatchIdRef.current && state.match.id !== activeMatchIdRef.current) {
        // Reset old match states cleanly to prevent stale data carry-over
        setActivePopup(null);
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

        // Trigger short clean new match transition banner (1.5 seconds)
        const newA = state.match.playerA?.name || "Competitor 1";
        const newB = state.match.playerB?.name || "Competitor 2";
        setMatchTransition({
          tatami: state.match.tatami || tatamiNumber,
          playerA: newA,
          playerB: newB,
          category: state.match.categoryName || state.match.category?.name || "",
          round: state.match.round || 1,
        });

        transitionTimeoutRef.current = setTimeout(() => {
          setMatchTransition(null);
          transitionTimeoutRef.current = null;
        }, 1500);
      }
      activeMatchIdRef.current = state.match.id;
      setCurrentMatch(state.match);
      if (state.match.tatami) setTatamiNumber(state.match.tatami);
    }
    if (typeof state.scoreA === "number") setScoreA(state.scoreA);
    if (typeof state.scoreB === "number") setScoreB(state.scoreB);
    if (typeof state.remainingSeconds === "number") setRemainingSeconds(state.remainingSeconds);
    if (typeof state.isTimerRunning === "boolean") setIsTimerRunning(state.isTimerRunning);
    if (typeof state.isTimeUp === "boolean") setIsTimeUp(state.isTimeUp);
    if (state.warningsA) setWarningsA(state.warningsA);
    if (state.warningsB) setWarningsB(state.warningsB);
    if (state.senshu !== undefined) setSenshu(state.senshu);
    if (typeof state.isShuffled === "boolean") setIsShuffled(state.isShuffled);
  };

  // Timer ticker hook
  useEffect(() => {
    if (isTimerRunning && remainingSeconds > 0) {
      const startTime = Date.now();
      const initialRemaining = remainingSeconds;

      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const nextRem = Math.max(0, initialRemaining - elapsed);
        setRemainingSeconds(nextRem);

        if (nextRem <= 0) {
          setIsTimerRunning(false);
          setIsTimeUp(true);
          clearInterval(timerIntervalRef.current);
        }
      }, 100);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  // Main Tatami Match Discovery & Polling
  const discoverActiveMatch = async () => {
    try {
      // 1. Check local storage for active state broadcasted from operator laptop
      const stored = localStorage.getItem(`tatami_live_state_${activeTatamiId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.match) {
            applyLiveState(parsed);
            setLoading(false);
            return;
          }
        } catch {
          // ignore error
        }
      }

      // 2. Fetch Tatami Dashboard data
      const dashboard = await getTatamiDashboard();
      if (dashboard?.tatami) {
        setTatamiNumber(dashboard.tatami.number || 1);
      }

      // Scan all pools and matches for this Tatami
      const allMatches = [];
      dashboard?.categories?.forEach((cat) => {
        cat.pools?.forEach((p) => {
          p.matches?.forEach((m) => {
            allMatches.push({
              ...m,
              categoryName: cat.name,
              categoryType: cat.type,
              poolName: p.name,
            });
          });
        });
      });

      if (allMatches.length === 0) {
        setLoading(false);
        return;
      }

      // Priority 1: Any match that is currently LIVE
      const liveMatch = allMatches.find((m) => m.status === "LIVE");
      if (liveMatch) {
        const fullMatch = await getTatamiMatch(liveMatch.id);
        setCurrentMatch(fullMatch);
        activeMatchIdRef.current = fullMatch.id;
        setScoreA(fullMatch.scoreA ?? 0);
        setScoreB(fullMatch.scoreB ?? 0);
        const elapsed = fullMatch.startedAt
          ? Math.floor((Date.now() - new Date(fullMatch.startedAt).getTime()) / 1000)
          : 0;
        const dur = fullMatch.durationSeconds || 90;
        const rem = Math.max(0, dur - elapsed);
        setRemainingSeconds(rem);
        setIsTimerRunning(rem > 0);
        setIsTimeUp(rem <= 0);

        try {
          const s = localStorage.getItem(`tatami_shuffle_${fullMatch.id}`);
          if (s !== null) setIsShuffled(s === "true");
        } catch {}

        setLoading(false);
        return;
      }

      // Priority 2: Next scheduled PENDING match
      const pendingMatch = allMatches.find((m) => m.status === "PENDING");
      if (pendingMatch) {
        const fullMatch = await getTatamiMatch(pendingMatch.id);
        setCurrentMatch(fullMatch);
        activeMatchIdRef.current = fullMatch.id;
        setScoreA(0);
        setScoreB(0);
        setRemainingSeconds(fullMatch.durationSeconds || 90);
        setIsTimerRunning(false);
        setIsTimeUp(false);

        try {
          const s = localStorage.getItem(`tatami_shuffle_${fullMatch.id}`);
          if (s !== null) setIsShuffled(s === "true");
        } catch {}

        setLoading(false);
        return;
      }

      // Priority 3: Latest completed match
      const completedMatches = allMatches.filter((m) => m.status === "COMPLETED");
      if (completedMatches.length > 0) {
        const lastMatch = completedMatches[completedMatches.length - 1];
        const fullMatch = await getTatamiMatch(lastMatch.id);
        setCurrentMatch(fullMatch);
        activeMatchIdRef.current = fullMatch.id;
        setScoreA(fullMatch.scoreA ?? 0);
        setScoreB(fullMatch.scoreB ?? 0);
        setRemainingSeconds(0);
        setIsTimerRunning(false);
        setIsTimeUp(false);

        try {
          const s = localStorage.getItem(`tatami_shuffle_${fullMatch.id}`);
          if (s !== null) setIsShuffled(s === "true");
        } catch {}
      }
    } catch (err) {
      console.warn("External display match discovery error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial Match Discovery
    discoverActiveMatch();

    // 2. Set up BroadcastChannel tied to this specific TATAMI
    if (activeTatamiId && typeof BroadcastChannel !== "undefined") {
      try {
        const ch = new BroadcastChannel(`tatami_arena_${activeTatamiId}`);
        channelRef.current = ch;

        ch.onmessage = (event) => {
          const msg = event.data;
          if (!msg) return;

          if (msg.type === "MATCH_SYNC" || msg.type === "ACTIVE_MATCH_SYNC") {
            applyLiveState(msg);
          } else if (msg.type === "TRIGGER_EVENT_POPUP" && msg.popup) {
            triggerEventPopup(msg.popup);
          } else if (msg.type === "SHUFFLE_TOGGLE" && typeof msg.isShuffled === "boolean") {
            setIsShuffled(msg.isShuffled);
          } else if (msg.type === "TIMER_START") {
            setIsTimerRunning(true);
            if (typeof msg.remainingSeconds === "number") {
              setRemainingSeconds(msg.remainingSeconds);
            }
          } else if (msg.type === "TIMER_STOP") {
            setIsTimerRunning(false);
            if (typeof msg.remainingSeconds === "number") {
              setRemainingSeconds(msg.remainingSeconds);
            }
          } else if (msg.type === "RESET_MATCH") {
            setIsTimerRunning(false);
            setIsTimeUp(false);
            setRemainingSeconds(msg.remainingSeconds || 90);
            setScoreA(0);
            setScoreB(0);
            setWarningsA({ C1: false, C2: false, C3: false, HC: false, H: false });
            setWarningsB({ C1: false, C2: false, C3: false, HC: false, H: false });
            setSenshu(null);
            setActivePopup(null);
          } else if (msg.type === "SCORE_CHANGE") {
            if (typeof msg.scoreA === "number") setScoreA(msg.scoreA);
            if (typeof msg.scoreB === "number") setScoreB(msg.scoreB);
          } else if (msg.type === "WARNING_CHANGE") {
            if (msg.warningsA) setWarningsA(msg.warningsA);
            if (msg.warningsB) setWarningsB(msg.warningsB);
          }
        };
      } catch (e) {
        console.warn("Broadcast setup error:", e);
      }
    }

    // 3. Fallback Poll: Check every 3.5 seconds
    const pollInterval = setInterval(() => {
      discoverActiveMatch();
    }, 3500);

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (channelRef.current) channelRef.current.close();
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [activeTatamiId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Match derived properties
  const matchObj = currentMatch?.match || currentMatch || {};
  const status = matchObj.status || currentMatch?.status || "WAITING";
  const playerA = currentMatch?.playerA || matchObj.playerA;
  const playerB = currentMatch?.playerB || matchObj.playerB;
  const categoryName = currentMatch?.categoryName || currentMatch?.category?.name || "";
  const poolName = currentMatch?.poolName || currentMatch?.pool?.name || "";
  const round = matchObj.round || currentMatch?.round || 1;
  const winnerId = matchObj.winnerId || currentMatch?.winnerId;

  const isCompleted = status === "COMPLETED";
  const isLive = status === "LIVE";

  const winningPlayer =
    winnerId === playerA?.id
      ? playerA
      : winnerId === playerB?.id
      ? playerB
      : null;

  // Render Warning Indicator Box
  const renderWarningBox = (label, active, side) => {
    const isA = side === "A";
    return (
      <div
        key={label}
        className={`h-11 sm:h-12 w-20 sm:w-24 flex items-center justify-center font-mono font-black text-base sm:text-lg rounded border transition-all ${
          active
            ? "bg-white text-slate-950 font-black border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.9)] scale-105"
            : isA
            ? "bg-red-950/70 text-red-300 border-red-900"
            : "bg-blue-950/70 text-blue-300 border-blue-900"
        }`}
      >
        {label}
      </div>
    );
  };

  // Render Left/Right AKA (Red) Card
  const renderAkaCard = () => (
    <div
      className={`flex items-center justify-between border-2 rounded-3xl p-4 sm:p-8 h-full transition-all relative overflow-hidden ${
        winningPlayer?.id === playerA?.id
          ? "border-amber-400 bg-gradient-to-b from-[#7f0000] via-[#520909] to-[#1f0303] shadow-[0_0_60px_rgba(251,191,36,0.4)]"
          : "border-red-600/80 bg-gradient-to-b from-[#7f0000] via-[#480909] to-[#180303] shadow-[0_0_50px_rgba(255,23,68,0.3)]"
      }`}
    >
      {/* Vertical Penalty Stack (C1, C2, C3, HC, H) */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {renderWarningBox("C1", warningsA.C1, "A")}
        {renderWarningBox("C2", warningsA.C2, "A")}
        {renderWarningBox("C3", warningsA.C3, "A")}
        {renderWarningBox("HC", warningsA.HC, "A")}
        {renderWarningBox("H", warningsA.H, "A")}
      </div>

      {/* Competitor Identity & Giant Score */}
      <div className="flex-1 flex flex-col justify-between items-center text-center pl-4 sm:pl-8 h-full py-2">
        {/* Header Badge */}
        <div className="w-full flex items-center justify-between border-b border-red-900/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="border border-white bg-white text-red-900 px-3.5 py-0.5 font-mono font-black text-sm uppercase rounded shadow">
              AKA
            </span>
            <span className="text-xs font-mono font-bold text-red-300 uppercase hidden sm:inline">
              RED
            </span>
          </div>
          {senshu === "A" && (
            <span className="border border-white bg-white text-red-900 px-2.5 py-0.5 font-mono font-black text-xs uppercase tracking-widest rounded shadow">
              SENSHU
            </span>
          )}
        </div>

        {/* Giant Score Digit */}
        <div className="my-auto">
          <span className="font-mono font-black text-white text-8xl sm:text-[10rem] md:text-[12rem] lg:text-[14rem] leading-none tracking-tight drop-shadow-[0_0_40px_rgba(255,23,68,0.8)]">
            {scoreA}
          </span>
        </div>

        {/* Player Name & Info */}
        <div className="w-full border-t border-red-900/60 pt-2 text-left">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-mono font-black text-white uppercase tracking-wider truncate drop-shadow">
            {playerA?.name || "Player A"}
          </h3>
          <p className="text-xs font-mono text-red-300 uppercase mt-0.5 truncate">
            {playerA?.club || "Dojo"} {playerA?.weight ? `• ${playerA.weight} KG` : ""}{" "}
            {playerA?.belt ? `• ${playerA.belt}` : ""}
          </p>
        </div>
      </div>
    </div>
  );

  // Render Left/Right AO (Blue) Card
  const renderAoCard = () => (
    <div
      className={`flex items-center justify-between border-2 rounded-3xl p-4 sm:p-8 h-full transition-all relative overflow-hidden ${
        winningPlayer?.id === playerB?.id
          ? "border-amber-400 bg-gradient-to-b from-[#003b73] via-[#09355b] to-[#031422] shadow-[0_0_60px_rgba(251,191,36,0.4)]"
          : "border-blue-600/80 bg-gradient-to-b from-[#003b73] via-[#062c4d] to-[#021320] shadow-[0_0_50px_rgba(41,121,255,0.3)]"
      }`}
    >
      {/* Competitor Identity & Giant Score */}
      <div className="flex-1 flex flex-col justify-between items-center text-center pr-4 sm:pr-8 h-full py-2">
        {/* Header Badge */}
        <div className="w-full flex items-center justify-between border-b border-blue-900/60 pb-2">
          {senshu === "B" && (
            <span className="border border-white bg-white text-blue-900 px-2.5 py-0.5 font-mono font-black text-xs uppercase tracking-widest rounded shadow">
              SENSHU
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-mono font-bold text-blue-300 uppercase hidden sm:inline">
              BLUE
            </span>
            <span className="border border-white bg-white text-blue-950 font-mono font-black text-sm px-3.5 py-0.5 rounded uppercase shadow">
              AO
            </span>
          </div>
        </div>

        {/* Giant Score Digit */}
        <div className="my-auto">
          <span className="font-mono font-black text-white text-8xl sm:text-[10rem] md:text-[12rem] lg:text-[14rem] leading-none tracking-tight drop-shadow-[0_0_40px_rgba(41,121,255,0.8)]">
            {scoreB}
          </span>
        </div>

        {/* Player Name & Info */}
        <div className="w-full border-t border-blue-900/60 pt-2 text-right">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-mono font-black text-white uppercase tracking-wider truncate drop-shadow">
            {playerB?.name || "Player B"}
          </h3>
          <p className="text-xs font-mono text-blue-300 uppercase mt-0.5 truncate">
            {playerB?.club || "Dojo"} {playerB?.weight ? `• ${playerB.weight} KG` : ""}{" "}
            {playerB?.belt ? `• ${playerB.belt}` : ""}
          </p>
        </div>
      </div>

      {/* Vertical Penalty Stack (C1, C2, C3, HC, H) */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {renderWarningBox("C1", warningsB.C1, "B")}
        {renderWarningBox("C2", warningsB.C2, "B")}
        {renderWarningBox("C3", warningsB.C3, "B")}
        {renderWarningBox("HC", warningsB.HC, "B")}
        {renderWarningBox("H", warningsB.H, "B")}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 select-none flex flex-col justify-between overflow-hidden p-4 sm:p-6 lg:p-8 font-sans relative">
      {/* ================= FULL-SCREEN EVENT NOTIFICATION OVERLAY (POINT / WARNING / VR POPUP) ================= */}
      <AnimatePresence>
        {activePopup && (
          <motion.div
            key={activePopup.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md pointer-events-none"
          >
            {activePopup.type === "VR" ? (
              <div className="p-8 sm:p-14 rounded-3xl border-4 shadow-2xl text-center min-w-[320px] sm:min-w-[550px] bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950 border-amber-400 shadow-[0_0_120px_rgba(251,191,36,0.6)]">
                <span className="font-mono text-xl sm:text-2xl font-black uppercase tracking-[0.25em] text-amber-400 block mb-2">
                  REFEREE VIDEO REVIEW
                </span>
                <h1 className="text-7xl sm:text-9xl font-mono font-black text-white tracking-widest my-2 drop-shadow-[0_0_35px_rgba(251,191,36,0.8)]">
                  VR
                </h1>
                <div className="text-3xl sm:text-5xl font-mono font-black text-amber-300 uppercase tracking-widest my-2 drop-shadow-lg">
                  VIDEO REVIEW
                </div>
                <p className="text-base sm:text-lg font-mono text-slate-300 tracking-wider mt-3">
                  {activePopup.playerName || "REVIEW IN PROGRESS"}
                </p>
              </div>
            ) : (
              <div
                className={`p-8 sm:p-14 rounded-3xl border-4 shadow-2xl text-center min-w-[320px] sm:min-w-[550px] ${
                  activePopup.playerSide === "A"
                    ? "bg-gradient-to-br from-[#7f0000] via-[#c62828] to-[#ff1744] border-white/95 shadow-[0_0_120px_rgba(255,23,68,0.85)]"
                    : "bg-gradient-to-br from-[#003b73] via-[#1565c0] to-[#2979ff] border-white/95 shadow-[0_0_120px_rgba(41,121,255,0.85)]"
                }`}
              >
                <span className="font-mono text-xl sm:text-3xl font-black uppercase tracking-[0.25em] text-white/90 block">
                  {activePopup.playerSide === "A" ? "AKA (RED)" : "AO (BLUE)"}
                </span>

                <h1 className="text-6xl sm:text-8xl font-mono font-black text-white tracking-wider my-2 drop-shadow-xl">
                  {activePopup.title}
                </h1>

                <div className="text-7xl sm:text-9xl font-mono font-black text-white my-1 drop-shadow-2xl">
                  {activePopup.subtitle}
                </div>

                <p className="text-2xl sm:text-3xl font-mono font-bold text-white/95 uppercase tracking-wide truncate max-w-lg mx-auto mt-2">
                  {activePopup.playerName}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= NEW MATCH TRANSITION OVERLAY ================= */}
      <AnimatePresence>
        {matchTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-[#07090e]/95 backdrop-blur-lg pointer-events-none"
          >
            <div className="text-center space-y-4 max-w-3xl">
              <span className="font-mono text-amber-400 text-xl sm:text-2xl font-black uppercase tracking-[0.3em] block">
                TATAMI {matchTransition.tatami} {matchTransition.round ? `• ROUND ${matchTransition.round}` : ""}
              </span>
              <div className="inline-block border-2 border-white/60 bg-white/10 px-8 py-2.5 rounded-full font-mono font-black text-sm sm:text-base tracking-widest uppercase text-white shadow-xl">
                NEW MATCH COMMENCING
              </div>
              <div className="flex items-center justify-center gap-6 text-3xl sm:text-6xl font-mono font-black text-white pt-3">
                <span className="text-red-400 truncate max-w-sm drop-shadow-[0_0_20px_rgba(255,23,68,0.6)]">
                  {matchTransition.playerA}
                </span>
                <span className="text-slate-500 text-2xl sm:text-4xl">VS</span>
                <span className="text-blue-400 truncate max-w-sm drop-shadow-[0_0_20px_rgba(41,121,255,0.6)]">
                  {matchTransition.playerB}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= 1. TOP HEADER (TATAMI & PRESET TIME BANNER & VR BUTTON) ================= */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-3">
        {/* Tatami Identification */}
        <div className="flex items-center gap-3">
          <div className="border border-slate-700 bg-slate-900/90 text-amber-300 px-5 py-1.5 font-mono font-black text-lg sm:text-xl tracking-widest uppercase rounded shadow-inner">
            TATAMI {tatamiNumber}
          </div>

          {categoryName && (
            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider font-mono">
              <span>{categoryName}</span>
              {poolName && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>{poolName}</span>
                </>
              )}
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">ROUND {round}</span>
            </div>
          )}
        </div>

        {/* Status / VR Button / Fullscreen */}
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 font-mono text-xs sm:text-sm font-bold tracking-widest uppercase rounded border ${
              isLive
                ? "bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse"
                : isCompleted
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {isTimeUp && isLive ? "TIME UP" : status}
          </span>

          {/* NON-INTRUSIVE VR BUTTON ON EXTERNAL SCOREBOARD */}
          <button
            onClick={handleTriggerVR}
            id="external-vr-btn"
            title="Video Review (VR)"
            className="px-3.5 py-1.5 border border-amber-400 bg-amber-400/20 hover:bg-amber-400 hover:text-slate-950 text-amber-300 font-mono font-black text-xs uppercase tracking-widest rounded-lg transition cursor-pointer shadow-md flex items-center gap-1"
          >
            <span>VR</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="p-2 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* ================= 2. EMPTY / WAITING STATE ================= */}
      {!currentMatch ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
          <div className="border border-slate-800 bg-[#0d121f] p-8 max-w-md w-full space-y-3 rounded-3xl shadow-2xl">
            <h2 className="text-3xl font-mono font-black tracking-widest uppercase text-amber-400">
              TATAMI {tatamiNumber}
            </h2>
            <p className="text-sm font-mono text-slate-300 uppercase tracking-widest font-bold">
              WAITING FOR NEXT BOUT
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Scoreboard connects automatically when match begins.
            </p>
          </div>
        </div>
      ) : (
        /* ================= 3. ACTIVE KUMITE SCOREBOARD (RED & BLUE GRADIENTS WITH SMOOTH SHUFFLE) ================= */
        <div className="flex-1 flex flex-col justify-between my-2">
          {/* Top Center: Timer Display */}
          <div className="flex flex-col items-center justify-center pt-1 pb-4">
            <div
              className={`font-mono font-black tracking-tight select-none text-center drop-shadow-[0_0_35px_rgba(255,255,255,0.25)] ${
                isTimeUp
                  ? "text-rose-500 animate-pulse text-7xl sm:text-8xl md:text-9xl lg:text-[11rem]"
                  : "text-white text-7xl sm:text-8xl md:text-9xl lg:text-[11rem]"
              }`}
            >
              {formatTimeWithTenths(remainingSeconds)}
            </div>

            {/* Time Up Alert Banner */}
            {isTimeUp && isLive && (
              <div className="mt-1 px-8 py-2 bg-rose-600 text-white font-mono font-black text-xl sm:text-2xl tracking-[0.25em] uppercase border-2 border-white rounded-full shadow-2xl animate-bounce">
                TIME UP
              </div>
            )}

            {/* Winner Announcement when Completed */}
            {isCompleted && winningPlayer && (
              <div className="mt-2 px-8 py-2 border-2 border-amber-400 bg-amber-400 text-slate-950 font-mono font-black text-lg sm:text-2xl uppercase tracking-widest rounded-full shadow-2xl flex items-center gap-3">
                <Trophy size={26} className="text-slate-950" />
                <span>WINNER: {winningPlayer.name}</span>
              </div>
            )}
          </div>

          {/* Three-Column Arena Layout with Deterministic Shuffle Slide Transition */}
          <div className="grid grid-cols-12 gap-3 sm:gap-6 items-center flex-1 max-h-[55vh]">
            {isShuffled ? (
              <>
                {/* AO (BLUE) on LEFT */}
                <motion.div
                  key="ext-ao"
                  layout
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="col-span-5 h-full"
                >
                  {renderAoCard()}
                </motion.div>

                {/* CENTER STATUS BANNER */}
                <motion.div
                  key="ext-center"
                  layout
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="col-span-2 flex flex-col items-center justify-center space-y-4 text-center"
                >
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
                    WKF KUMITE
                  </span>
                  <div className="border border-slate-700 bg-slate-900/90 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-amber-300 rounded-xl shadow-md">
                    {isLive ? "LIVE BOUT" : isCompleted ? "FINAL" : "READY"}
                  </div>
                </motion.div>

                {/* AKA (RED) on RIGHT */}
                <motion.div
                  key="ext-aka"
                  layout
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="col-span-5 h-full"
                >
                  {renderAkaCard()}
                </motion.div>
              </>
            ) : (
              <>
                {/* AKA (RED) on LEFT */}
                <motion.div
                  key="ext-aka"
                  layout
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="col-span-5 h-full"
                >
                  {renderAkaCard()}
                </motion.div>

                {/* CENTER STATUS BANNER */}
                <motion.div
                  key="ext-center"
                  layout
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="col-span-2 flex flex-col items-center justify-center space-y-4 text-center"
                >
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
                    WKF KUMITE
                  </span>
                  <div className="border border-slate-700 bg-slate-900/90 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-amber-300 rounded-xl shadow-md">
                    {isLive ? "LIVE BOUT" : isCompleted ? "FINAL" : "READY"}
                  </div>
                </motion.div>

                {/* AO (BLUE) on RIGHT */}
                <motion.div
                  key="ext-ao"
                  layout
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="col-span-5 h-full"
                >
                  {renderAoCard()}
                </motion.div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= 4. MINIMAL BOTTOM BAR ================= */}
      <footer className="border-t border-slate-800/80 pt-2 flex items-center justify-between font-mono text-xs text-slate-500">
        <div>
          TATAMI {tatamiNumber} • SPECTATOR SCOREBOARD {isShuffled ? "(SHUFFLED)" : ""}
        </div>
        <div>NO OPERATOR CONTROLS • DYNAMIC ARENA SYNC</div>
      </footer>
    </div>
  );
}
