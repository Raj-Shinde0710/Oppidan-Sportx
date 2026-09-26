import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  RefreshCw,
  Maximize2,
  Minimize2,
  Tv,
  LogOut,
  Trophy,
  ChevronRight,
  Plus,
  Minus,
  AlertCircle,
  Award,
  Clock,
  Play,
  Pause,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";
import {
  getTatamiUser,
  clearTatamiSession,
  getTatamiMatch,
  startTatamiMatch,
  updateTatamiScore,
  submitTatamiResult,
  rematchTatamiMatch,
} from "../api/tatami";

// Format time as m:ss.t matching stadium timer format
const formatTimeWithTenths = (totalSec) => {
  const s = Math.max(0, Number(totalSec) || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const tenths = Math.floor((s % 1) * 10);
  return `${mins}:${String(secs).padStart(2, "0")}.${tenths}`;
};

export default function TatamiMatchControl() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessionUser] = useState(getTatamiUser());

  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [notFoundError, setNotFoundError] = useState(false);

  // Time presets: 1:00 (60s), 1:30 (90s), 2:00 (120s), 3:00 (180s)
  const [durationInput, setDurationInput] = useState(90);
  const [remainingSeconds, setRemainingSeconds] = useState(90);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Presentation / Side Assignment: isShuffled swaps AKA/RED to Right and AO/BLUE to Left
  const [isShuffled, setIsShuffled] = useState(() => {
    try {
      return localStorage.getItem(`tatami_shuffle_${matchId}`) === "true";
    } catch {
      return false;
    }
  });

  // Video Review (VR) flags for AKA and AO
  const [vrA, setVrA] = useState(false);
  const [vrB, setVrB] = useState(false);

  // Penalty / Warnings states
  const [warningsA, setWarningsA] = useState({ C1: false, C2: false, C3: false, HC: false, H: false });
  const [warningsB, setWarningsB] = useState({ C1: false, C2: false, C3: false, HC: false, H: false });

  // Senshu (first uncontested point)
  const [senshu, setSenshu] = useState(null); // 'A', 'B', or null

  // In-flight action locks & results
  const [isSubmittingWinner, setIsSubmittingWinner] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [resultState, setResultState] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Event Popup Notification State (Full-screen overlay for scoring, warnings & VR)
  const [activePopup, setActivePopup] = useState(null);
  const popupTimeoutRef = useRef(null);

  const timerIntervalRef = useRef(null);
  const channelRef = useRef(null);

  const activeTatamiId =
    sessionUser?.id || matchData?.category?.tatamiId || matchData?.pool?.category?.tatamiId || null;

  // Trigger full-screen event popup (scores / warnings / VR)
  const triggerEventPopup = (popupData) => {
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }
    const popupObj = { id: Date.now(), ...popupData };
    setActivePopup(popupObj);

    // Broadcast popup event to persistent External HDMI display
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "TRIGGER_EVENT_POPUP",
        popup: popupObj,
      });
    }

    // Auto-dismiss: VR stays slightly longer (1.8s) for visibility; points/warnings auto-dismiss in 1.3s
    const dismissDuration = popupData.type === "VR" ? 1800 : 1300;
    popupTimeoutRef.current = setTimeout(() => {
      setActivePopup(null);
      popupTimeoutRef.current = null;
    }, dismissDuration);
  };

  // Helper: Return to Dashboard preserving exact Category and Pool context
  const handleBackToDashboard = () => {
    const targetCategoryId =
      searchParams.get("categoryId") ||
      matchData?.category?.id ||
      matchData?.match?.category?.id ||
      matchData?.pool?.categoryId ||
      (activeTatamiId ? localStorage.getItem(`tatami_last_cat_${activeTatamiId}`) : null) ||
      "";

    const targetPoolId =
      searchParams.get("poolId") ||
      matchData?.poolId ||
      matchData?.pool?.id ||
      matchData?.match?.poolId ||
      (activeTatamiId ? localStorage.getItem(`tatami_last_pool_${activeTatamiId}`) : null) ||
      "";

    if (targetCategoryId && targetPoolId) {
      navigate(`/tatami/dashboard?categoryId=${targetCategoryId}&poolId=${targetPoolId}`);
    } else if (targetCategoryId) {
      navigate(`/tatami/dashboard?categoryId=${targetCategoryId}`);
    } else {
      navigate("/tatami/dashboard");
    }
  };

  // Broadcast current state to persistent Tatami external display
  const broadcastLiveState = (extra = {}) => {
    if (!activeTatamiId) return;

    const payload = {
      tatamiId: activeTatamiId,
      match: matchData,
      scoreA: matchData?.scoreA ?? 0,
      scoreB: matchData?.scoreB ?? 0,
      remainingSeconds,
      isTimerRunning,
      isTimeUp,
      warningsA,
      warningsB,
      senshu,
      isShuffled: extra.isShuffled !== undefined ? extra.isShuffled : isShuffled,
      ...extra,
    };

    try {
      localStorage.setItem(`tatami_live_state_${activeTatamiId}`, JSON.stringify(payload));
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: "ACTIVE_MATCH_SYNC",
          ...payload,
        });
      }
    } catch (e) {
      console.warn("Broadcast error:", e);
    }
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
          broadcastLiveState({ remainingSeconds: 0, isTimerRunning: false, isTimeUp: true });
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

  // Fetch match details
  const fetchMatch = async () => {
    try {
      setLoading(true);
      setError("");
      setAuthError("");
      setNotFoundError(false);

      const data = await getTatamiMatch(matchId);
      setMatchData(data);

      const currentStatus = data.status || data.match?.status;
      const currentDuration = data.durationSeconds || data.match?.durationSeconds || 90;
      const startedAt = data.startedAt || data.match?.startedAt;

      setDurationInput(currentDuration);

      if (currentStatus === "LIVE" && startedAt) {
        const startMs = new Date(startedAt).getTime();
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        const rem = Math.max(0, currentDuration - elapsed);
        setRemainingSeconds(rem);
        const running = rem > 0;
        setIsTimerRunning(running);
        setIsTimeUp(rem <= 0);
      } else if (currentStatus === "COMPLETED") {
        setRemainingSeconds(0);
        setIsTimerRunning(false);
        setIsTimeUp(false);
      } else {
        setRemainingSeconds(currentDuration);
        setIsTimerRunning(false);
        setIsTimeUp(false);
      }

      broadcastLiveState({ match: data });
    } catch (err) {
      console.error("Fetch match error:", err);
      if (err.response?.status === 403) {
        setAuthError("You are not authorized to control this match.");
      } else if (err.response?.status === 404) {
        setNotFoundError(true);
      } else if (err.response?.status === 401) {
        clearTatamiSession();
        navigate("/tatami/login", { replace: true });
      } else {
        setError(err.response?.data?.message || "Failed to load match details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (channelRef.current) channelRef.current.close();
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, [matchId]);

  // Preserve category and pool context in localStorage when match data resolves
  useEffect(() => {
    if (matchData && activeTatamiId) {
      const catId =
        searchParams.get("categoryId") ||
        matchData?.category?.id ||
        matchData?.match?.category?.id ||
        matchData?.pool?.categoryId;
      const poolId =
        searchParams.get("poolId") ||
        matchData?.poolId ||
        matchData?.pool?.id ||
        matchData?.match?.poolId;

      try {
        if (catId) localStorage.setItem(`tatami_last_cat_${activeTatamiId}`, catId);
        if (poolId) localStorage.setItem(`tatami_last_pool_${activeTatamiId}`, poolId);
      } catch {}
    }
  }, [matchData, activeTatamiId]);

  // Setup broadcast channel when tatamiId is ready
  useEffect(() => {
    if (activeTatamiId && typeof BroadcastChannel !== "undefined") {
      try {
        const ch = new BroadcastChannel(`tatami_arena_${activeTatamiId}`);
        channelRef.current = ch;

        ch.onmessage = (event) => {
          const msg = event.data;
          if (!msg) return;

          if (msg.type === "TRIGGER_EVENT_POPUP" && msg.popup) {
            triggerEventPopup(msg.popup);
          } else if (msg.type === "SHUFFLE_TOGGLE" && typeof msg.isShuffled === "boolean") {
            setIsShuffled(msg.isShuffled);
          }
        };
      } catch (e) {
        console.warn("Channel setup error:", e);
      }
    }
  }, [activeTatamiId]);

  // Broadcast state changes whenever scores, warnings, or senshu change
  useEffect(() => {
    if (matchData) {
      broadcastLiveState();
    }
  }, [matchData?.scoreA, matchData?.scoreB, warningsA, warningsB, senshu]);

  // EXTEND SCREEN: Opens the persistent TATAMI-level external display
  const handleExtendScreen = () => {
    const tId = activeTatamiId || "default";
    window.open(`/tatami/display/${tId}`, `tatami_display_${tId}`, "noopener,noreferrer");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Handler: TOGGLE AKA / AO SHUFFLE (Deterministic visual side swap)
  const handleToggleShuffle = () => {
    const next = !isShuffled;
    setIsShuffled(next);
    try {
      localStorage.setItem(`tatami_shuffle_${matchId}`, String(next));
    } catch {}
    broadcastLiveState({ isShuffled: next });
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "SHUFFLE_TOGGLE",
        isShuffled: next,
      });
    }
  };

  // Handler: START / STOP TIMER (The STOP button pauses without resetting)
  const handleToggleTimer = async () => {
    const currentStatus = matchData?.status || matchData?.match?.status || "PENDING";

    // 1. If timer is running, STOP it (pause countdown)
    if (isTimerRunning) {
      setIsTimerRunning(false);
      broadcastLiveState({ isTimerRunning: false, remainingSeconds });
      return;
    }

    // 2. If stopped and already LIVE in backend, RESUME countdown
    if (currentStatus === "LIVE") {
      if (remainingSeconds <= 0) return;
      setIsTimerRunning(true);
      setIsTimeUp(false);
      broadcastLiveState({ isTimerRunning: true, remainingSeconds });
      return;
    }

    // 3. If PENDING, start match on backend
    try {
      setError("");
      const duration = Number(durationInput) || 90;
      const updated = await startTatamiMatch(matchId, duration);
      setMatchData(updated);
      setRemainingSeconds(duration);
      setIsTimerRunning(true);
      setIsTimeUp(false);
      broadcastLiveState({ match: updated, isTimerRunning: true, remainingSeconds: duration });
    } catch (err) {
      console.error("Start match error:", err);
      setError(err.response?.data?.message || "Failed to start match.");
    }
  };

  // Handler: RESET MATCH (During live or preparation)
  const handleResetMatch = async () => {
    setIsTimerRunning(false);
    setIsTimeUp(false);
    const dur = Number(durationInput) || 90;
    setRemainingSeconds(dur);

    // Reset warnings and senshu
    setWarningsA({ C1: false, C2: false, C3: false, HC: false, H: false });
    setWarningsB({ C1: false, C2: false, C3: false, HC: false, H: false });
    setSenshu(null);
    setVrA(false);
    setVrB(false);
    setActivePopup(null);

    const currentStatus = matchData?.status || matchData?.match?.status;
    if (currentStatus === "LIVE") {
      try {
        const updated = await updateTatamiScore(matchId, { scoreA: 0, scoreB: 0 });
        setMatchData(updated);
        broadcastLiveState({ match: updated, scoreA: 0, scoreB: 0, remainingSeconds: dur, isTimerRunning: false });
      } catch (err) {
        console.warn("Reset score error:", err);
      }
    } else {
      broadcastLiveState({ scoreA: 0, scoreB: 0, remainingSeconds: dur, isTimerRunning: false });
    }
  };

  // Handler: REMATCH AFTER MATCH COMPLETION (Resets the same match in backend)
  const handleRematch = async () => {
    if (isRematching) return;
    try {
      setIsRematching(true);
      setError("");
      const updated = await rematchTatamiMatch(matchId);
      setMatchData(updated);

      const dur = Number(durationInput) || 90;
      setRemainingSeconds(dur);
      setIsTimerRunning(false);
      setIsTimeUp(false);
      setWarningsA({ C1: false, C2: false, C3: false, HC: false, H: false });
      setWarningsB({ C1: false, C2: false, C3: false, HC: false, H: false });
      setSenshu(null);
      setVrA(false);
      setVrB(false);
      setActivePopup(null);
      setResultState(null);
      setIsSubmittingWinner(false);

      broadcastLiveState({
        match: updated,
        scoreA: 0,
        scoreB: 0,
        remainingSeconds: dur,
        isTimerRunning: false,
        isTimeUp: false,
        warningsA: { C1: false, C2: false, C3: false, HC: false, H: false },
        warningsB: { C1: false, C2: false, C3: false, HC: false, H: false },
        senshu: null,
      });

      if (channelRef.current) {
        channelRef.current.postMessage({
          type: "RESET_MATCH",
          remainingSeconds: dur,
        });
      }
    } catch (err) {
      console.error("Rematch error:", err);
      setError(err.response?.data?.message || "Failed to reset match for rematch.");
    } finally {
      setIsRematching(false);
    }
  };

  // Adjust time by delta (+1s or -1s)
  const handleAdjustTime = (delta) => {
    const next = Math.max(0, remainingSeconds + delta);
    setRemainingSeconds(next);
    broadcastLiveState({ remainingSeconds: next });
  };

  // Handler: WKF Score Update (+1 Yuko, +2 Waza-ari, +3 Ippon, -1, -2, -3) with Animated Full-Screen Popup
  const handleScoreChange = async (player, delta, pointLabel = "") => {
    const currentStatus = matchData?.status || matchData?.match?.status;
    if (currentStatus !== "LIVE") return;

    const currentScoreA = matchData?.scoreA ?? matchData?.match?.scoreA ?? 0;
    const currentScoreB = matchData?.scoreB ?? matchData?.match?.scoreB ?? 0;

    let targetScore = player === "A" ? currentScoreA + delta : currentScoreB + delta;
    if (targetScore < 0) return; // Disallow negative scores

    // Trigger full-screen point scoring popup if point was added
    if (delta > 0) {
      const playerName = player === "A" ? (playerA?.name || "AKA") : (playerB?.name || "AO");
      triggerEventPopup({
        type: "POINT",
        title: pointLabel || (delta === 1 ? "YUKO" : delta === 2 ? "WAZA-ARI" : "IPPON"),
        subtitle: `+${delta}`,
        playerSide: player,
        playerName,
      });
    }

    try {
      setError("");
      const updated = await updateTatamiScore(matchId, {
        player,
        score: targetScore,
      });
      setMatchData(updated);
      broadcastLiveState({
        match: updated,
        scoreA: updated.scoreA ?? currentScoreA,
        scoreB: updated.scoreB ?? currentScoreB,
      });
    } catch (err) {
      console.error("Score update error:", err);
      setError(err.response?.data?.message || "Failed to update score.");
    }
  };

  // Handler: Toggle penalty warning (C1, C2, C3, HC, H) with Animated Full-Screen Popup
  const toggleWarning = (player, code) => {
    const currentWarnings = player === "A" ? warningsA : warningsB;
    const willBeActive = !currentWarnings[code];

    if (player === "A") {
      const next = { ...warningsA, [code]: willBeActive };
      setWarningsA(next);
      broadcastLiveState({ warningsA: next });
    } else {
      const next = { ...warningsB, [code]: willBeActive };
      setWarningsB(next);
      broadcastLiveState({ warningsB: next });
    }

    // Trigger warning popup when a penalty is activated
    if (willBeActive) {
      const playerName = player === "A" ? (playerA?.name || "AKA") : (playerB?.name || "AO");
      triggerEventPopup({
        type: "WARNING",
        title: "WARNING",
        subtitle: code,
        playerSide: player,
        playerName,
      });
    }
  };

  // Handler: Toggle Senshu
  const toggleSenshu = (player) => {
    const next = senshu === player ? null : player;
    setSenshu(next);
    broadcastLiveState({ senshu: next });
    if (next) {
      const playerName = player === "A" ? (playerA?.name || "AKA") : (playerB?.name || "AO");
      triggerEventPopup({
        type: "SENSHU",
        title: "SENSHU",
        subtitle: "FIRST POINT",
        playerSide: player,
        playerName,
      });
    }
  };

  // Handler: Trigger Referee VR Popup
  const handleTriggerVR = (side = "NEUTRAL") => {
    const pName =
      side === "A"
        ? (playerA?.name || "AKA")
        : side === "B"
        ? (playerB?.name || "AO")
        : "REFEREE REVIEW REQUESTED";

    triggerEventPopup({
      type: "VR",
      title: "VR",
      subtitle: "VIDEO REVIEW",
      playerSide: side,
      playerName: pName,
    });
  };

  // Handler: Select Winner
  const handleSelectWinner = async (winnerId) => {
    if (isSubmittingWinner || !winnerId) return;
    const currentStatus = matchData?.status || matchData?.match?.status;
    if (currentStatus !== "LIVE") return;

    try {
      setIsSubmittingWinner(true);
      setError("");
      setIsTimerRunning(false);

      const result = await submitTatamiResult(matchId, winnerId);
      setResultState(result);
      if (result.match) {
        setMatchData(result.match);
        broadcastLiveState({ match: result.match, isTimerRunning: false });
      }
    } catch (err) {
      console.error("Winner submission error:", err);
      setError(err.response?.data?.message || "Failed to submit winner.");
    } finally {
      setIsSubmittingWinner(false);
    }
  };

  // Derived properties
  const matchObj = matchData?.match || matchData || {};
  const status = matchObj.status || "PENDING";
  const playerA = matchData?.playerA || matchObj.playerA;
  const playerB = matchData?.playerB || matchObj.playerB;
  const categoryType = matchData?.categoryType || matchData?.category?.type || "KUMITE";
  const categoryName = matchData?.categoryName || matchData?.category?.name || "Category";
  const poolName = matchData?.poolName || matchData?.pool?.name || "Pool";
  const round = matchObj.round || 1;
  const tatamiNumber = matchObj.tatami || sessionUser?.number || 1;

  const scoreA = matchObj.scoreA ?? 0;
  const scoreB = matchObj.scoreB ?? 0;
  const winnerId = matchObj.winnerId;

  const isBye =
    categoryType === "KUMITE" &&
    playerA?.id &&
    playerB?.id &&
    playerA.id === playerB.id;

  const isCompleted = status === "COMPLETED";
  const isLive = status === "LIVE";

  const winningPlayer =
    winnerId === playerA?.id
      ? playerA
      : winnerId === playerB?.id
      ? playerB
      : resultState?.winner || null;

  const nextMatch = resultState?.nextMatch || null;
  const poolComplete = resultState?.poolComplete || false;

  // Render AKA (Red) Competitor Box
  const renderAkaCard = () => (
    <div
      className={`rounded-3xl border-2 p-4 sm:p-5 flex flex-col justify-between transition-all relative overflow-hidden h-full ${
        winningPlayer?.id === playerA?.id
          ? "border-amber-400 bg-gradient-to-b from-[#7f0000] via-[#520909] to-[#1f0303] shadow-[0_0_50px_rgba(251,191,36,0.35)]"
          : "border-red-600/80 bg-gradient-to-b from-[#7f0000] via-[#480909] to-[#180303] shadow-[0_0_40px_rgba(255,23,68,0.25)]"
      }`}
    >
      {/* Competitor Header */}
      <div className="flex items-center justify-between border-b border-red-900/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="border border-white bg-white text-red-900 font-mono font-black text-sm px-3.5 py-0.5 rounded uppercase shadow">
            AKA
          </span>
          <span className="text-xs font-mono font-bold text-red-300 uppercase">RED</span>
        </div>
        <div className="text-right text-xs font-mono font-bold text-red-200">
          {playerA?.belt || "White"} {playerA?.weight ? `• ${playerA.weight} KG` : ""}
        </div>
      </div>

      {/* Score & Warning Indicators Stack */}
      <div className="flex items-center justify-between my-auto py-4">
        {/* Vertical Penalty Stack (C1, C2, C3, HC, H) */}
        <div className="flex flex-col gap-1.5">
          {["C1", "C2", "C3", "HC", "H"].map((code) => (
            <button
              key={code}
              onClick={() => toggleWarning("A", code)}
              className={`w-16 h-9 font-mono font-black text-sm rounded border transition cursor-pointer ${
                warningsA[code]
                  ? "bg-white text-red-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.9)] scale-105"
                  : "bg-red-950/70 text-red-300 border-red-900 hover:border-red-500 hover:text-white"
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        {/* Giant Score Digit */}
        <div className="flex-1 text-center">
          <span className="font-mono font-black text-white text-7xl sm:text-8xl md:text-9xl leading-none drop-shadow-[0_0_30px_rgba(255,23,68,0.7)]">
            {scoreA}
          </span>
        </div>
      </div>

      {/* Player Name & VR Box */}
      <div className="border-t border-red-900/60 pt-2 flex items-center justify-between">
        <div className="truncate max-w-[200px]">
          <h3 className="text-lg sm:text-xl font-mono font-black text-white uppercase truncate drop-shadow">
            {playerA?.name || "Player A"}
          </h3>
          <p className="text-xs font-mono text-red-300 uppercase truncate">
            {playerA?.club || "Dojo"}
          </p>
        </div>

        {/* Video Review VR trigger */}
        <button
          onClick={() => {
            setVrA(!vrA);
            handleTriggerVR("A");
          }}
          className={`px-3 py-1 font-mono font-black text-xs border rounded transition cursor-pointer ${
            vrA
              ? "bg-white text-red-950 border-white shadow"
              : "bg-red-950/70 text-red-400 border-red-900 hover:text-white"
          }`}
        >
          VR
        </button>
      </div>
    </div>
  );

  // Render AO (Blue) Competitor Box
  const renderAoCard = () => (
    <div
      className={`rounded-3xl border-2 p-4 sm:p-5 flex flex-col justify-between transition-all relative overflow-hidden h-full ${
        winningPlayer?.id === playerB?.id
          ? "border-amber-400 bg-gradient-to-b from-[#003b73] via-[#09355b] to-[#031422] shadow-[0_0_50px_rgba(251,191,36,0.35)]"
          : "border-blue-600/80 bg-gradient-to-b from-[#003b73] via-[#062c4d] to-[#021320] shadow-[0_0_40px_rgba(41,121,255,0.25)]"
      }`}
    >
      {/* Competitor Header */}
      <div className="flex items-center justify-between border-b border-blue-900/60 pb-2">
        <div className="text-left text-xs font-mono font-bold text-blue-200">
          {playerB?.belt || "White"} {playerB?.weight ? `• ${playerB.weight} KG` : ""}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-blue-300 uppercase">BLUE</span>
          <span className="border border-white bg-white text-blue-950 font-mono font-black text-sm px-3.5 py-0.5 rounded uppercase shadow">
            AO
          </span>
        </div>
      </div>

      {/* Score & Warning Indicators Stack */}
      <div className="flex items-center justify-between my-auto py-4">
        {/* Giant Score Digit */}
        <div className="flex-1 text-center">
          <span className="font-mono font-black text-white text-7xl sm:text-8xl md:text-9xl leading-none drop-shadow-[0_0_30px_rgba(41,121,255,0.7)]">
            {scoreB}
          </span>
        </div>

        {/* Vertical Penalty Stack (C1, C2, C3, HC, H) */}
        <div className="flex flex-col gap-1.5">
          {["C1", "C2", "C3", "HC", "H"].map((code) => (
            <button
              key={code}
              onClick={() => toggleWarning("B", code)}
              className={`w-16 h-9 font-mono font-black text-sm rounded border transition cursor-pointer ${
                warningsB[code]
                  ? "bg-white text-blue-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.9)] scale-105"
                  : "bg-blue-950/70 text-blue-300 border-blue-900 hover:border-blue-500 hover:text-white"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Player Name & VR Box */}
      <div className="border-t border-blue-900/60 pt-2 flex items-center justify-between">
        {/* Video Review VR trigger */}
        <button
          onClick={() => {
            setVrB(!vrB);
            handleTriggerVR("B");
          }}
          className={`px-3 py-1 font-mono font-black text-xs border rounded transition cursor-pointer ${
            vrB
              ? "bg-white text-blue-950 border-white shadow"
              : "bg-blue-950/70 text-blue-400 border-blue-900 hover:text-white"
          }`}
        >
          VR
        </button>

        <div className="text-right truncate max-w-[200px]">
          <h3 className="text-lg sm:text-xl font-mono font-black text-white uppercase truncate drop-shadow">
            {playerB?.name || "Player B"}
          </h3>
          <p className="text-xs font-mono text-blue-300 uppercase truncate">
            {playerB?.club || "Dojo"}
          </p>
        </div>
      </div>
    </div>
  );

  // Keypad Column for AKA (Red)
  const renderAkaKeypadColumn = () => (
    <div className="space-y-1.5">
      <button
        onClick={() => toggleSenshu("A")}
        className={`w-full py-1.5 font-mono font-black text-xs rounded border transition cursor-pointer ${
          senshu === "A"
            ? "bg-white text-red-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
            : "bg-red-950/60 text-red-300 border-red-900 hover:text-white"
        }`}
      >
        SENSHU (AKA)
      </button>

      {/* YUKO (+1) and -1 */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => handleScoreChange("A", -1)}
          disabled={scoreA <= 0}
          className="py-2.5 border border-red-950 bg-red-950/80 hover:bg-red-900 disabled:opacity-30 text-white font-mono font-bold text-xs rounded"
        >
          -1
        </button>
        <button
          onClick={() => handleScoreChange("A", 1, "YUKO")}
          className="col-span-2 py-2.5 border border-red-600/80 bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 active:scale-95 text-white font-mono font-black text-xs rounded shadow-md"
        >
          YUKO
        </button>
      </div>

      {/* WAZA-ARI (+2) and -2 */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => handleScoreChange("A", -2)}
          disabled={scoreA < 2}
          className="py-2.5 border border-red-950 bg-red-950/80 hover:bg-red-900 disabled:opacity-30 text-white font-mono font-bold text-xs rounded"
        >
          -2
        </button>
        <button
          onClick={() => handleScoreChange("A", 2, "WAZA-ARI")}
          className="col-span-2 py-2.5 border border-red-500/80 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-mono font-black text-xs rounded shadow-md"
        >
          WAZA-ARI
        </button>
      </div>

      {/* IPPON (+3) and -3 */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => handleScoreChange("A", -3)}
          disabled={scoreA < 3}
          className="py-2.5 border border-red-950 bg-red-950/80 hover:bg-red-900 disabled:opacity-30 text-white font-mono font-bold text-xs rounded"
        >
          -3
        </button>
        <button
          onClick={() => handleScoreChange("A", 3, "IPPON")}
          className="col-span-2 py-2.5 border border-red-400 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 active:scale-95 text-white font-mono font-black text-xs rounded shadow-md"
        >
          IPPON
        </button>
      </div>
    </div>
  );

  // Keypad Column for AO (Blue)
  const renderAoKeypadColumn = () => (
    <div className="space-y-1.5">
      <button
        onClick={() => toggleSenshu("B")}
        className={`w-full py-1.5 font-mono font-black text-xs rounded border transition cursor-pointer ${
          senshu === "B"
            ? "bg-white text-blue-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
            : "bg-blue-950/60 text-blue-300 border-blue-900 hover:text-white"
        }`}
      >
        SENSHU (AO)
      </button>

      {/* YUKO (+1) and -1 */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => handleScoreChange("B", 1, "YUKO")}
          className="col-span-2 py-2.5 border border-blue-600/80 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 active:scale-95 text-white font-mono font-black text-xs rounded shadow-md"
        >
          YUKO
        </button>
        <button
          onClick={() => handleScoreChange("B", -1)}
          disabled={scoreB <= 0}
          className="py-2.5 border border-blue-950 bg-blue-950/80 hover:bg-blue-900 disabled:opacity-30 text-white font-mono font-bold text-xs rounded"
        >
          -1
        </button>
      </div>

      {/* WAZA-ARI (+2) and -2 */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => handleScoreChange("B", 2, "WAZA-ARI")}
          className="col-span-2 py-2.5 border border-blue-500/80 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 active:scale-95 text-white font-mono font-black text-xs rounded shadow-md"
        >
          WAZA-ARI
        </button>
        <button
          onClick={() => handleScoreChange("B", -2)}
          disabled={scoreB < 2}
          className="py-2.5 border border-blue-950 bg-blue-950/80 hover:bg-blue-900 disabled:opacity-30 text-white font-mono font-bold text-xs rounded"
        >
          -2
        </button>
      </div>

      {/* IPPON (+3) and -3 */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => handleScoreChange("B", 3, "IPPON")}
          className="col-span-2 py-2.5 border border-blue-400 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-400 hover:to-sky-400 active:scale-95 text-white font-mono font-black text-xs rounded shadow-md"
        >
          IPPON
        </button>
        <button
          onClick={() => handleScoreChange("B", -3)}
          disabled={scoreB < 3}
          className="py-2.5 border border-blue-950 bg-blue-950/80 hover:bg-blue-900 disabled:opacity-30 text-white font-mono font-bold text-xs rounded"
        >
          -3
        </button>
      </div>
    </div>
  );

  // Center Controls Box
  const renderCenterControls = () => (
    <div className="border border-slate-800 bg-[#0d121f] p-4 rounded-3xl flex flex-col justify-between space-y-3 shadow-2xl h-full">
      {/* Scoring Matrix (Symmetrical Keypad aligned with visual sides) */}
      <div className="grid grid-cols-2 gap-2.5">
        {isShuffled ? (
          <>
            {renderAoKeypadColumn()}
            {renderAkaKeypadColumn()}
          </>
        ) : (
          <>
            {renderAkaKeypadColumn()}
            {renderAoKeypadColumn()}
          </>
        )}
      </div>

      {/* Center START / STOP TIMER Button */}
      <div className="py-1">
        <button
          onClick={handleToggleTimer}
          id="toggle-timer-btn"
          className={`w-full py-4 border-2 font-mono font-black text-sm sm:text-base uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 ${
            isTimerRunning
              ? "bg-slate-900 text-rose-400 border-rose-500/80 hover:bg-rose-950"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400"
          }`}
        >
          {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
          <span>{isTimerRunning ? "STOP TIMER" : "START TIMER"}</span>
        </button>
      </div>

      {/* Action Buttons: SHUFFLE AKA/AO & RESET MATCH */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleToggleShuffle}
          id="shuffle-aka-ao-btn"
          title="Swap sides visually for both operator and external scoreboard"
          className="py-2.5 border border-indigo-600/80 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          <ArrowLeftRight size={14} />
          <span>SHUFFLE</span>
        </button>

        <button
          onClick={handleResetMatch}
          id="reset-match-btn"
          className="py-2.5 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
        >
          RESET
        </button>
      </div>

      {/* WINNER DECISION BAR (Matches visual side layout) */}
      {isLive && (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {isShuffled ? (
            <>
              <button
                onClick={() => handleSelectWinner(playerB?.id)}
                disabled={isSubmittingWinner}
                className="py-3 border border-blue-500 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-mono font-black text-xs uppercase rounded-xl transition cursor-pointer shadow-md"
              >
                AO WINS
              </button>
              <div className="py-3 border border-slate-700 bg-slate-900 text-slate-400 font-mono font-bold text-[11px] uppercase rounded-xl flex items-center justify-center">
                HANTEI
              </div>
              <button
                onClick={() => handleSelectWinner(playerA?.id)}
                disabled={isSubmittingWinner}
                className="py-3 border border-red-500 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-mono font-black text-xs uppercase rounded-xl transition cursor-pointer shadow-md"
              >
                AKA WINS
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleSelectWinner(playerA?.id)}
                disabled={isSubmittingWinner}
                className="py-3 border border-red-500 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-mono font-black text-xs uppercase rounded-xl transition cursor-pointer shadow-md"
              >
                AKA WINS
              </button>
              <div className="py-3 border border-slate-700 bg-slate-900 text-slate-400 font-mono font-bold text-[11px] uppercase rounded-xl flex items-center justify-center">
                HANTEI
              </div>
              <button
                onClick={() => handleSelectWinner(playerB?.id)}
                disabled={isSubmittingWinner}
                className="py-3 border border-blue-500 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-mono font-black text-xs uppercase rounded-xl transition cursor-pointer shadow-md"
              >
                AO WINS
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex flex-col justify-between select-none relative overflow-hidden">
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
                className={`p-8 sm:p-12 rounded-3xl border-4 shadow-2xl text-center min-w-[300px] sm:min-w-[500px] ${
                  activePopup.playerSide === "A"
                    ? "bg-gradient-to-br from-[#7f0000] via-[#c62828] to-[#ff1744] border-white/90 shadow-[0_0_100px_rgba(255,23,68,0.7)]"
                    : "bg-gradient-to-br from-[#003b73] via-[#1565c0] to-[#2979ff] border-white/90 shadow-[0_0_100px_rgba(41,121,255,0.7)]"
                }`}
              >
                <span className="font-mono text-xl sm:text-2xl font-black uppercase tracking-[0.25em] text-white/90 block">
                  {activePopup.playerSide === "A" ? "AKA (RED)" : "AO (BLUE)"}
                </span>

                <h1 className="text-5xl sm:text-7xl font-mono font-black text-white tracking-wider my-2 drop-shadow-lg">
                  {activePopup.title}
                </h1>

                <div className="text-6xl sm:text-8xl font-mono font-black text-white my-1 drop-shadow-2xl">
                  {activePopup.subtitle}
                </div>

                <p className="text-xl sm:text-2xl font-mono font-bold text-white/95 uppercase tracking-wide truncate max-w-md mx-auto mt-2">
                  {activePopup.playerName}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= 1. TOP HEADER & BAR ================= */}
      <header className="bg-[#0b0f19]/95 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-2xl backdrop-blur-md sticky top-0 z-40">
        {/* Left Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToDashboard}
            id="back-to-pool-btn"
            className="p-1.5 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white rounded cursor-pointer transition shadow-sm"
            title="Back to Dashboard"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={fetchMatch}
            disabled={loading}
            className="p-1.5 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white rounded cursor-pointer transition shadow-sm"
            title="Refresh Match"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <div className="flex items-center gap-2 border border-slate-700 bg-slate-900/90 px-3.5 py-1 font-mono font-black text-sm uppercase rounded shadow-inner text-amber-300">
            <span>TATAMI {tatamiNumber}</span>
          </div>

          <div className="hidden sm:block text-xs font-mono text-slate-400">
            {categoryName} • {poolName} • ROUND {round}
          </div>
        </div>

        {/* Center: Match Duration Presets & Shuffle Quick Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-700 bg-slate-900/90 rounded overflow-hidden shadow-inner">
            {[
              { label: "1:00", sec: 60 },
              { label: "1:30", sec: 90 },
              { label: "2:00", sec: 120 },
              { label: "3:00", sec: 180 },
            ].map((preset) => (
              <button
                key={preset.sec}
                type="button"
                disabled={isLive}
                onClick={() => {
                  if (isLive) return;
                  setDurationInput(preset.sec);
                  setRemainingSeconds(preset.sec);
                  broadcastLiveState({ remainingSeconds: preset.sec });
                }}
                className={`px-3.5 py-1 text-xs font-mono font-black transition cursor-pointer ${
                  durationInput === preset.sec
                    ? "bg-amber-400 text-slate-950 shadow-md"
                    : "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Quick SHUFFLE button in header */}
          <button
            onClick={handleToggleShuffle}
            id="shuffle-aka-ao-header-btn"
            title="Swap AKA / AO sides visually"
            className="hidden md:flex items-center gap-1.5 px-3 py-1 border border-indigo-700/80 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 font-mono font-black text-xs uppercase tracking-wider rounded transition cursor-pointer shadow-sm"
          >
            <ArrowLeftRight size={13} />
            <span>SHUFFLE AKA / AO</span>
          </button>
        </div>

        {/* Right: EXTEND SCREEN, Fullscreen, Logout */}
        <div className="flex items-center gap-2">
          {/* EXTEND SCREEN BUTTON (Opens persistent Tatami display ONCE) */}
          <button
            onClick={handleExtendScreen}
            id="extend-screen-btn"
            title="Open persistent Tatami scoreboard on HDMI TV/Projector"
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-amber-400 bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-xs uppercase tracking-wider rounded transition cursor-pointer shadow-lg shadow-amber-400/20"
          >
            <Tv size={14} />
            <span>EXTEND SCREEN</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded cursor-pointer transition shadow-sm"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            onClick={() => {
              clearTatamiSession();
              navigate("/tatami/login", { replace: true });
            }}
            className="p-1.5 border border-rose-900 bg-rose-950/60 hover:bg-rose-900 text-rose-200 rounded cursor-pointer transition shadow-sm"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ================= 2. MAIN OPERATOR ARENA BODY ================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 flex flex-col justify-between">
        {/* Loading Spinner */}
        {loading && !matchData && (
          <div className="border border-slate-800 bg-[#0d121f] p-12 text-center rounded-2xl my-auto">
            <RefreshCw size={32} className="animate-spin text-amber-400 mx-auto mb-3" />
            <span className="font-mono text-sm uppercase tracking-wider text-slate-400">
              Connecting to Arena Match Control...
            </span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="border border-rose-700 bg-rose-950/80 p-3 text-xs font-mono text-rose-200 flex items-center justify-between rounded-lg mb-2 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="font-bold cursor-pointer px-2">
              ✕
            </button>
          </div>
        )}

        {/* KATA PROTOCOL */}
        {!loading && categoryType === "KATA" && (
          <div className="border border-purple-800 bg-[#130d22] p-8 text-center space-y-4 max-w-lg mx-auto rounded-3xl my-auto shadow-2xl">
            <Award size={36} className="text-purple-400 mx-auto" />
            <h3 className="text-xl font-mono font-black uppercase text-purple-200">
              KATA Scoring Protocol
            </h3>
            <p className="text-xs font-mono text-purple-300">
              KATA matches use standard score-sheet evaluations. Kumite head-to-head match control is
              not applicable.
            </p>
            <button
              onClick={handleBackToDashboard}
              className="px-5 py-2 border border-purple-500 bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-xs uppercase rounded-xl transition shadow-lg"
            >
              ← Back to Pool Dashboard
            </button>
          </div>
        )}

        {/* KUMITE BYE PROTOCOL */}
        {!loading && isBye && (
          <div className="border border-amber-600/70 bg-[#161208] p-8 text-center space-y-4 max-w-lg mx-auto rounded-3xl my-auto shadow-2xl">
            <Trophy size={36} className="text-amber-400 mx-auto" />
            <span className="border border-amber-500/50 bg-amber-950/80 px-3 py-1 font-mono text-xs uppercase text-amber-300 rounded-full">
              AUTOMATIC BYE
            </span>
            <h2 className="text-3xl font-mono font-black text-white uppercase">{playerA?.name}</h2>
            <p className="text-xs font-mono text-amber-400 uppercase tracking-widest">
              ADVANCES AUTOMATICALLY
            </p>
            {nextMatch && (
              <button
                onClick={() => navigate(`/tatami/matches/${nextMatch.id}?categoryId=${searchParams.get("categoryId") || matchData?.category?.id || ""}&poolId=${searchParams.get("poolId") || matchData?.poolId || ""}`)}
                className="w-full py-3 border border-amber-400 bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-xs uppercase rounded-xl transition shadow-lg cursor-pointer"
              >
                OPEN NEXT MATCH →
              </button>
            )}
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 border border-slate-700 bg-transparent text-slate-400 hover:text-white font-mono text-xs uppercase rounded-xl"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}

        {/* ACTIVE KUMITE OPERATOR CONSOLE */}
        {!loading && matchData && categoryType === "KUMITE" && !isBye && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* Top Timer Display with +/- adjusters */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                onClick={() => handleAdjustTime(1)}
                className="w-10 h-10 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-mono font-black flex items-center justify-center rounded-xl cursor-pointer transition shadow-md"
                title="Add 1 second"
              >
                <Plus size={18} />
              </button>

              <div
                className={`font-mono font-black tracking-tight select-none text-center drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] ${
                  isTimeUp
                    ? "text-rose-500 animate-pulse text-6xl sm:text-7xl md:text-8xl"
                    : isLive
                    ? "text-white text-6xl sm:text-7xl md:text-8xl"
                    : "text-slate-400 text-6xl sm:text-7xl md:text-8xl"
                }`}
              >
                {formatTimeWithTenths(remainingSeconds)}
              </div>

              <button
                onClick={() => handleAdjustTime(-1)}
                className="w-10 h-10 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-mono font-black flex items-center justify-center rounded-xl cursor-pointer transition shadow-md"
                title="Subtract 1 second"
              >
                <Minus size={18} />
              </button>
            </div>

            {/* TIME UP Flash Alert */}
            {isTimeUp && isLive && (
              <div className="text-center">
                <span className="inline-block border-2 border-rose-500 bg-rose-600 text-white font-mono font-black text-sm px-6 py-1.5 tracking-widest uppercase rounded-full shadow-2xl animate-bounce">
                  TIME UP • SELECT WINNER BELOW
                </span>
              </div>
            )}

            {/* Main Scoreboard: Three Columns with Smooth Shuffle Transition */}
            <div className="grid grid-cols-12 gap-3 sm:gap-6 items-stretch flex-1">
              {isShuffled ? (
                <>
                  {/* AO (BLUE) on LEFT */}
                  <motion.div
                    key="ao-column"
                    layout
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="col-span-12 lg:col-span-4"
                  >
                    {renderAoCard()}
                  </motion.div>

                  {/* CENTER CONTROLS */}
                  <motion.div
                    key="center-column"
                    layout
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="col-span-12 lg:col-span-4"
                  >
                    {renderCenterControls()}
                  </motion.div>

                  {/* AKA (RED) on RIGHT */}
                  <motion.div
                    key="aka-column"
                    layout
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="col-span-12 lg:col-span-4"
                  >
                    {renderAkaCard()}
                  </motion.div>
                </>
              ) : (
                <>
                  {/* AKA (RED) on LEFT */}
                  <motion.div
                    key="aka-column"
                    layout
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="col-span-12 lg:col-span-4"
                  >
                    {renderAkaCard()}
                  </motion.div>

                  {/* CENTER CONTROLS */}
                  <motion.div
                    key="center-column"
                    layout
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="col-span-12 lg:col-span-4"
                  >
                    {renderCenterControls()}
                  </motion.div>

                  {/* AO (BLUE) on RIGHT */}
                  <motion.div
                    key="ao-column"
                    layout
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="col-span-12 lg:col-span-4"
                  >
                    {renderAoCard()}
                  </motion.div>
                </>
              )}
            </div>

            {/* ================= 3. COMPLETED MATCH & ADVANCEMENT CONTROLS ================= */}
            {isCompleted && (
              <div className="border-2 border-amber-400 bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-900 p-6 text-center space-y-4 rounded-3xl shadow-2xl">
                <span className="border border-emerald-500/50 bg-emerald-950/80 px-4 py-1 font-mono text-xs uppercase text-emerald-300 rounded-full font-bold">
                  MATCH CONCLUDED
                </span>
                <h3 className="text-2xl sm:text-4xl font-mono font-black text-white uppercase">
                  🏆 WINNER: {winningPlayer?.name || "Victor"}
                </h3>
                <p className="font-mono text-base font-bold text-slate-300">
                  FINAL SCORE: {scoreA} — {scoreB}
                </p>

                {/* REMATCH BUTTON: Resets this exact match to PENDING without altering bracket progression */}
                <div className="pt-2">
                  <button
                    onClick={handleRematch}
                    disabled={isRematching}
                    id="rematch-btn"
                    className="px-8 py-3.5 border-2 border-amber-400 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-mono font-black text-sm uppercase tracking-widest rounded-xl transition shadow-xl cursor-pointer flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                  >
                    <RotateCcw size={18} className={isRematching ? "animate-spin" : ""} />
                    <span>{isRematching ? "RESETTING MATCH..." : "REMATCH"}</span>
                  </button>
                </div>

                {nextMatch && (
                  <div className="pt-2 max-w-sm mx-auto">
                    <button
                      onClick={() =>
                        navigate(
                          `/tatami/matches/${nextMatch.id}?categoryId=${
                            searchParams.get("categoryId") || matchData?.category?.id || ""
                          }&poolId=${searchParams.get("poolId") || matchData?.poolId || ""}`
                        )
                      }
                      id="open-next-match-btn"
                      className="w-full py-3.5 border border-indigo-500 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>OPEN NEXT MATCH</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {poolComplete && (
                  <p className="font-mono text-sm text-amber-300 uppercase font-black pt-1">
                    🏆 ALL MATCHES IN THIS POOL ARE COMPLETE
                  </p>
                )}

                <div className="pt-1">
                  <button
                    onClick={handleBackToDashboard}
                    id="back-to-pool-dashboard-btn"
                    className="px-5 py-2.5 border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    ← Back to Pool Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================= 4. FOOTER ================= */}
      <footer className="border-t border-slate-800/80 px-4 py-2 flex items-center justify-between font-mono text-xs text-slate-500 bg-[#05070c]">
        <div>
          TATAMI {tatamiNumber} • KUMITE OPERATOR CONSOLE {isShuffled ? "(SHUFFLED)" : ""}
        </div>
        <div>WKF DYNAMIC STADIUM SCOREBOARD</div>
      </footer>
    </div>
  );
}
