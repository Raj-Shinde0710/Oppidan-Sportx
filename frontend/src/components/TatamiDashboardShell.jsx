import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ShieldCheck,
  Trophy,
  Layers,
  CheckCircle2,
  Users,
  Swords,
  Award,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  Tv,
  Lock,
  Unlock,
} from "lucide-react";
import {
  getTatamiUser,
  clearTatamiSession,
  getTatamiDashboard,
} from "../api/tatami";
import logo from "../assets/logo/oppidanlogo-removebg-preview.png";

// Belt styling helper
const getBeltStyle = (belt = "") => {
  const b = belt?.trim().toLowerCase();
  switch (b) {
    case "black":
      return "bg-slate-900 text-white border-slate-800";
    case "brown":
      return "bg-amber-900 text-amber-100 border-amber-800";
    case "blue":
      return "bg-blue-600 text-white border-blue-500";
    case "green":
      return "bg-emerald-600 text-white border-emerald-500";
    case "orange":
      return "bg-orange-500 text-white border-orange-400";
    case "yellow":
      return "bg-amber-400 text-slate-900 border-amber-300";
    case "purple":
      return "bg-purple-600 text-white border-purple-500";
    case "white":
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
};

export default function TatamiDashboardShell() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionUser, setSessionUser] = useState(getTatamiUser());
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Category and Pool state
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedPoolId, setSelectedPoolId] = useState(null);

  // Admin Override state: Category IDs unlocked via 'admin123' password in this session
  const [unlockedCategoryIds, setUnlockedCategoryIds] = useState(() => {
    try {
      const raw = sessionStorage.getItem("tatami_unlocked_categories");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Admin password unlock modal state
  const [lockModal, setLockModal] = useState(null); // { category, prevCategory, targetPoolId }
  const [overridePassword, setOverridePassword] = useState("");
  const [overrideError, setOverrideError] = useState("");

  // Helper: check if a pool is complete (all matches completed)
  const isPoolCompleted = (pool) => {
    if (!pool || !Array.isArray(pool.matches) || pool.matches.length === 0) return false;
    return pool.matches.every((m) => m.status === "COMPLETED");
  };

  // Helper: check if an entire category is completed (all assigned pools and matches completed)
  const isCategoryCompleted = (category) => {
    if (!category || !Array.isArray(category.pools) || category.pools.length === 0) return false;
    return category.pools.every((p) => isPoolCompleted(p));
  };

  // Helper: check if a category is sequentially locked
  const isCategoryLocked = (category, catIndex) => {
    if (catIndex === 0) return false; // First category is always unlocked
    if (unlockedCategoryIds.includes(category.id)) return false; // Unlocked via Admin Override in this session

    // Check all previous categories in assigned sequence: all must be completed
    for (let i = 0; i < catIndex; i++) {
      const prev = dashboardData?.categories?.[i];
      if (!isCategoryCompleted(prev)) {
        return true;
      }
    }
    return false;
  };

  // Helper: find previous incomplete category name
  const getPreviousIncompleteCategory = (catIndex) => {
    for (let i = 0; i < catIndex; i++) {
      const prev = dashboardData?.categories?.[i];
      if (!isCategoryCompleted(prev)) {
        return prev;
      }
    }
    return dashboardData?.categories?.[catIndex - 1] || null;
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getTatamiDashboard();
      setDashboardData(data);

      if (data?.tatami) {
        setSessionUser(data.tatami);
      }

      if (data?.categories?.length > 0) {
        const urlCatId = searchParams.get("categoryId");
        const urlPoolId = searchParams.get("poolId");
        const tId = data.tatami?.id || sessionUser?.id;

        const savedCatId =
          urlCatId ||
          selectedCategoryId ||
          (tId ? localStorage.getItem(`tatami_last_cat_${tId}`) : null);

        const savedPoolId =
          urlPoolId ||
          selectedPoolId ||
          (tId ? localStorage.getItem(`tatami_last_pool_${tId}`) : null);

        let targetCat = data.categories.find((c) => c.id === savedCatId);
        if (!targetCat) {
          // Fallback to first available category
          targetCat = data.categories[0];
        }

        setSelectedCategoryId(targetCat.id);

        const targetPool =
          targetCat.pools?.find((p) => p.id === savedPoolId) ||
          targetCat.pools?.[0] ||
          null;

        if (targetPool) {
          setSelectedPoolId(targetPool.id);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.response?.data?.message || "Failed to load dashboard data");
      if (err.response?.status === 401) {
        clearTatamiSession();
        navigate("/tatami/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [navigate]);

  const handleLogout = () => {
    clearTatamiSession();
    navigate("/tatami/login", { replace: true });
  };

  // Find currently selected category & pool
  const currentCategory =
    dashboardData?.categories?.find((c) => c.id === selectedCategoryId) ||
    dashboardData?.categories?.[0] ||
    null;

  const currentCategoryIndex =
    dashboardData?.categories?.findIndex((c) => c.id === currentCategory?.id) ?? 0;

  const isCurrentCategoryLocked =
    currentCategory && isCategoryLocked(currentCategory, currentCategoryIndex);

  const currentPool =
    currentCategory?.pools?.find((p) => p.id === selectedPoolId) ||
    currentCategory?.pools?.[0] ||
    null;

  // Derive unique participants for the selected pool
  const getParticipants = (pool) => {
    if (!pool || !Array.isArray(pool.matches)) return [];
    const map = new Map();

    pool.matches.forEach((m) => {
      if (m.playerA?.id && !map.has(m.playerA.id)) {
        map.set(m.playerA.id, m.playerA);
      }
      if (m.playerB?.id && !map.has(m.playerB.id)) {
        map.set(m.playerB.id, m.playerB);
      }
    });

    return Array.from(map.values());
  };

  const currentParticipants = currentPool ? getParticipants(currentPool) : [];

  const totalPoolsCount =
    dashboardData?.categories?.reduce(
      (sum, cat) => sum + (cat.pools?.length || 0),
      0
    ) || 0;

  // Handler: Selecting category and pool with persistence
  const handleSelectCategory = (category, catIndex, poolId = null) => {
    if (isCategoryLocked(category, catIndex)) {
      const prevIncomplete = getPreviousIncompleteCategory(catIndex);
      setLockModal({
        category,
        prevCategory: prevIncomplete,
        targetPoolId: poolId || category.pools?.[0]?.id || null,
      });
      setOverridePassword("");
      setOverrideError("");
      return;
    }

    // Category is unlocked
    setSelectedCategoryId(category.id);
    const chosenPoolId = poolId || category.pools?.[0]?.id || null;
    if (chosenPoolId) {
      setSelectedPoolId(chosenPoolId);
    }

    // Update URL query parameters and local storage so context survives refresh and returns
    const tId = dashboardData?.tatami?.id || sessionUser?.id;
    try {
      if (tId) {
        localStorage.setItem(`tatami_last_cat_${tId}`, category.id);
        if (chosenPoolId) localStorage.setItem(`tatami_last_pool_${tId}`, chosenPoolId);
      }
    } catch {}

    setSearchParams(
      chosenPoolId
        ? { categoryId: category.id, poolId: chosenPoolId }
        : { categoryId: category.id },
      { replace: true }
    );
  };

  // Handler: Admin Password Override Unlock
  const handleAdminUnlock = (e) => {
    e?.preventDefault();
    if (overridePassword.trim() === "admin123") {
      const catId = lockModal.category.id;
      const updated = [...new Set([...unlockedCategoryIds, catId])];
      setUnlockedCategoryIds(updated);
      try {
        sessionStorage.setItem("tatami_unlocked_categories", JSON.stringify(updated));
      } catch {}

      // Select the unlocked category
      setSelectedCategoryId(catId);
      if (lockModal.targetPoolId) {
        setSelectedPoolId(lockModal.targetPoolId);
      }

      const tId = dashboardData?.tatami?.id || sessionUser?.id;
      try {
        if (tId) {
          localStorage.setItem(`tatami_last_cat_${tId}`, catId);
          if (lockModal.targetPoolId) {
            localStorage.setItem(`tatami_last_pool_${tId}`, lockModal.targetPoolId);
          }
        }
      } catch {}

      setSearchParams(
        lockModal.targetPoolId
          ? { categoryId: catId, poolId: lockModal.targetPoolId }
          : { categoryId: catId },
        { replace: true }
      );

      setLockModal(null);
      setOverridePassword("");
      setOverrideError("");
    } else {
      setOverrideError("Invalid admin password. Access denied.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#1f2937] font-sans flex flex-col">
      {/* ================= ADMIN OVERRIDE PASSWORD MODAL ================= */}
      <AnimatePresence>
        {lockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 max-w-md w-full space-y-5 text-center"
            >
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                <Lock size={28} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  CATEGORY LOCKED
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  This category is locked because the previous category{" "}
                  <span className="font-bold text-slate-700">
                    ({lockModal.prevCategory?.name || "previous category"})
                  </span>{" "}
                  is not completed.
                </p>
              </div>

              <form onSubmit={handleAdminUnlock} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    value={overridePassword}
                    onChange={(e) => {
                      setOverridePassword(e.target.value);
                      if (overrideError) setOverrideError("");
                    }}
                    placeholder="Enter Admin Password"
                    autoFocus
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-sm font-medium outline-none transition"
                  />
                  {overrideError && (
                    <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle size={13} />
                      <span>{overrideError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLockModal(null);
                      setOverridePassword("");
                      setOverrideError("");
                    }}
                    className="flex-1 py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
                  >
                    UNLOCK
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= HEADER ================= */}
      <header className="bg-[#0a1f44] text-white px-6 sm:px-8 py-4 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Oppidan Logo" className="h-9 sm:h-10 object-contain" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Tatami {sessionUser?.number || dashboardData?.tatami?.number || ""} Arena
              </h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={11} />
                Live Session
              </span>
            </div>
            <p className="text-xs text-slate-400">
              User: <span className="font-semibold text-slate-300">{sessionUser?.username || dashboardData?.tatami?.username}</span>
              {" • "}
              <span className="text-slate-300">{dashboardData?.tatami?.tournamentName || sessionUser?.tournamentName || "Tournament"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const tId = sessionUser?.id || dashboardData?.tatami?.id;
              window.open(`/tatami/display/${tId}`, `tatami_display_${tId}`, "noopener,noreferrer");
            }}
            id="extend-screen-dashboard-btn"
            title="Open persistent Tatami scoreboard on HDMI TV/Projector"
            className="flex items-center gap-1.5 bg-white text-slate-900 font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-slate-200 transition-all shadow-sm cursor-pointer"
          >
            <Tv size={14} />
            <span>Extend Screen</span>
          </button>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            title="Refresh Data"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleLogout}
            id="tatami-logout-btn"
            className="flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Loading State */}
        {loading && !dashboardData && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-16 text-center">
            <div className="inline-block animate-spin text-[#1e3a8a] mb-4">
              <RefreshCw size={36} />
            </div>
            <h3 className="text-lg font-bold text-[#1e266d]">Loading Tatami Dashboard</h3>
            <p className="text-xs text-slate-400 mt-1">
              Fetching assigned categories, pools, and participants...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 flex items-start gap-4">
            <AlertCircle size={24} className="shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm">Error Loading Dashboard</h4>
              <p className="text-xs text-rose-600 mt-1">{error}</p>
              <button
                onClick={fetchDashboard}
                className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && (!dashboardData?.categories || dashboardData.categories.length === 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Layers size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#1e266d]">No Categories Assigned</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
              There are currently no tournament categories assigned to Tatami {dashboardData?.tatami?.number || sessionUser?.number}.
              Categories assigned by the tournament organizer will appear here automatically.
            </p>
          </div>
        )}

        {/* Real Content When Categories Exist */}
        {dashboardData?.categories && dashboardData.categories.length > 0 && (
          <div className="space-y-6">
            {/* Top Stat Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Tatami
                </span>
                <p className="text-xl sm:text-2xl font-black text-[#1e266d] mt-1">
                  Tatami {dashboardData?.tatami?.number}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ID: {dashboardData?.tatami?.username}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Categories
                </span>
                <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
                  {dashboardData?.categories?.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assigned to this Tatami
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Pools
                </span>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                  {totalPoolsCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Across all categories
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Selected Pool
                </span>
                <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1 truncate">
                  {currentPool?.name || "None"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {currentCategory?.name} • {currentParticipants.length} Athletes
                </p>
              </div>
            </div>

            {/* SECTION: ASSIGNED CATEGORIES & SEQUENTIAL LOCK STATUS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
              <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-[#1e266d] flex items-center gap-2">
                    <Layers size={20} className="text-indigo-600" />
                    Assigned Categories & Sequential Progression
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Categories unlock sequentially as preceding categories conclude. Click on any pool chip to open its schedule.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {dashboardData.categories.length} Categories • {totalPoolsCount} Pools
                </span>
              </div>

              {/* Grid of Categories with Locking & Completed States */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {dashboardData.categories.map((category, catIdx) => {
                  const isCatSelected = category.id === currentCategory?.id;
                  const isCompleted = isCategoryCompleted(category);
                  const isLocked = isCategoryLocked(category, catIdx);
                  const prevIncomplete = getPreviousIncompleteCategory(catIdx);

                  return (
                    <div
                      key={category.id}
                      className={`rounded-2xl p-5 border transition-all duration-200 ${
                        isLocked
                          ? "border-amber-200 bg-amber-50/20"
                          : isCatSelected
                          ? "border-indigo-300 bg-indigo-50/20 shadow-sm"
                          : "border-slate-200/90 bg-white hover:border-slate-300"
                      }`}
                    >
                      {/* Category Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-black text-[#1e266d]">
                              {category.name}
                            </span>
                            <span
                              className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full ${
                                category.type === "KATA"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {category.type}
                            </span>

                            {/* Completed Status */}
                            {isCompleted && (
                              <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 size={11} />
                                COMPLETED
                              </span>
                            )}

                            {/* Locked Status */}
                            {isLocked && (
                              <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Lock size={11} />
                                LOCKED
                              </span>
                            )}
                          </div>

                          {isLocked ? (
                            <p className="text-xs text-amber-700 font-bold mt-1 flex items-center gap-1">
                              <span>Complete {prevIncomplete?.name || "previous category"} first</span>
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {category.gender === "MALE"
                                ? "Male"
                                : category.gender === "FEMALE"
                                ? "Female"
                                : "Mixed"}
                              {" • "}
                              Age {category.minAge}-{category.maxAge}
                              {category.level && ` • ${category.level}`}
                            </p>
                          )}
                        </div>

                        {/* Open / Unlock Action Button */}
                        <div className="flex items-center gap-2">
                          {isLocked ? (
                            <button
                              onClick={() => handleSelectCategory(category, catIdx)}
                              className="shrink-0 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1"
                              title="Category locked. Click to enter admin password to unlock."
                            >
                              <Lock size={12} />
                              <span>UNLOCK</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSelectCategory(category, catIdx)}
                              className={`shrink-0 text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                                isCatSelected
                                  ? "bg-[#1e266d] text-white shadow-sm"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              <span>OPEN</span>
                            </button>
                          )}
                          <span className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                            {category.pools?.length || 0} Pools
                          </span>
                        </div>
                      </div>

                      {/* Pools Chip List */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Pools in {category.name}:
                        </span>

                        <div className="flex flex-wrap gap-2">
                          {category.pools?.map((pool, poolIdx) => {
                            const isPoolSelected =
                              pool.id === currentPool?.id &&
                              category.id === currentCategory?.id;

                            return (
                              <button
                                key={pool.id}
                                onClick={() => handleSelectCategory(category, catIdx, pool.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isLocked
                                    ? "bg-slate-100 text-slate-400 border border-slate-200 hover:border-amber-300 hover:text-amber-800"
                                    : isPoolSelected
                                    ? "bg-[#1e266d] text-white shadow-md ring-2 ring-indigo-400 scale-[1.02]"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
                                }`}
                              >
                                {isLocked && <Lock size={11} className="text-amber-600" />}
                                <span>
                                  {pool.name.startsWith("POOL_")
                                    ? `POOL ${poolIdx + 1}`
                                    : pool.name}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                    isPoolSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {getParticipants(pool).length}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION: SELECTED POOL DETAILS & PARTICIPANTS */}
            {isCurrentCategoryLocked ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                  <Lock size={28} />
                </div>
                <h3 className="text-xl font-bold text-amber-950">
                  {currentCategory?.name} is Locked
                </h3>
                <p className="text-xs text-amber-800 max-w-md mx-auto">
                  This category is locked because the previous category is not yet completed. Complete all pools and matches in the earlier category or use the Admin Override.
                </p>
                <button
                  onClick={() => {
                    const prev = getPreviousIncompleteCategory(currentCategoryIndex);
                    setLockModal({
                      category: currentCategory,
                      prevCategory: prev,
                      targetPoolId: currentPool?.id,
                    });
                    setOverridePassword("");
                    setOverrideError("");
                  }}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
                >
                  Enter Admin Override Password
                </button>
              </div>
            ) : currentPool ? (
              <motion.div
                key={currentPool.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6"
              >
                {/* Pool Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl sm:text-2xl font-black text-[#1e266d]">
                        {currentCategory?.name} • {currentPool.name}
                      </h3>
                      <span
                        className={`text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                          currentCategory?.type === "KATA"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {currentCategory?.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Category: <span className="font-semibold text-slate-700">{currentCategory?.name}</span>
                      {" • "}
                      Gender: <span className="font-semibold text-slate-700">{currentCategory?.gender}</span>
                      {" • "}
                      Age: <span className="font-semibold text-slate-700">{currentCategory?.minAge}-{currentCategory?.maxAge}</span>
                      {currentPool.aiGroupKey && (
                        <span className="text-slate-400">
                          {" • "}
                          Group: {currentPool.aiGroupKey}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                      <Users size={14} />
                      {currentParticipants.length} Participants
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200">
                      {currentPool.matches?.length || 0} Matches
                    </span>
                  </div>
                </div>

                {/* PARTICIPANTS LIST */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <Users size={16} className="text-indigo-600" />
                      Pool Participants ({currentParticipants.length})
                    </h4>
                    <span className="text-xs text-slate-400">
                      Real competitor profiles from registered matches
                    </span>
                  </div>

                  {currentParticipants.length === 0 ? (
                    <div className="p-8 bg-slate-50 rounded-xl text-center text-slate-400 text-sm">
                      No participants found for this pool.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Athlete Name</th>
                            <th className="px-4 py-3">Belt</th>
                            <th className="px-4 py-3">Weight</th>
                            <th className="px-4 py-3">Club / Dojo</th>
                            <th className="px-4 py-3">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {currentParticipants.map((athlete, idx) => (
                            <tr
                              key={athlete.id || idx}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="px-4 py-3.5 text-xs font-bold text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="font-bold text-[#1e266d] block">
                                  {athlete.name}
                                </span>
                                <span className="text-[11px] text-slate-400 capitalize">
                                  {athlete.gender?.toLowerCase() || "Athlete"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getBeltStyle(
                                    athlete.belt
                                  )}`}
                                >
                                  {athlete.belt || "White"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                                {athlete.weight ? `${athlete.weight} kg` : "—"}
                              </td>
                              <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                                {athlete.club || "—"}
                              </td>
                              <td className="px-4 py-3.5 text-xs text-slate-500">
                                {[athlete.city, athlete.state].filter(Boolean).join(", ") || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SCHEDULED ROUND 1 MATCHES PREVIEW */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <Swords size={16} className="text-indigo-600" />
                      Scheduled Round 1 Matches ({currentPool.matches?.length || 0})
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">
                      {currentCategory?.type === "KATA"
                        ? "Individual Performance Order"
                        : "Head-to-head Kumite pairings"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentPool.matches?.map((match, mIdx) => {
                      const isBye = match.playerA?.id === match.playerB?.id && currentCategory?.type !== "KATA";

                      return (
                        <div
                          key={match.id}
                          className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3">
                            <span>
                              {currentCategory?.type === "KATA"
                                ? `Run #${match.round || mIdx + 1}`
                                : `Match #${mIdx + 1} (Round ${match.round})`}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isBye
                                  ? "bg-amber-100 text-amber-800"
                                  : match.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {isBye ? "BYE" : match.status}
                            </span>
                          </div>

                          {currentCategory?.type === "KATA" ? (
                            /* KATA SOLO RUN */
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <span className="text-xs font-bold text-[#1e266d] block">
                                {match.playerA?.name || "Competitor"}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {match.playerA?.club || "Dojo"} • Belt: {match.playerA?.belt || "—"}
                              </span>
                            </div>
                          ) : isBye ? (
                            /* KUMITE BYE */
                            <div className="bg-white rounded-lg p-3 border border-amber-200 space-y-2">
                              <div>
                                <span className="text-xs font-bold text-amber-900 block">
                                  {match.playerA?.name}
                                </span>
                                <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block">
                                  BYE / ADVANCES AUTOMATICALLY
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  navigate(
                                    `/tatami/matches/${match.id}?categoryId=${currentCategory?.id}&poolId=${currentPool?.id}`
                                  )
                                }
                                className="w-full py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>View Bye Details</span>
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          ) : (
                            /* KUMITE BOUT (Player A vs Player B) */
                            <div className="space-y-2">
                              {/* Player A (Red / AKA) */}
                              <div className="bg-white rounded-lg p-2.5 border-l-4 border-rose-500 border border-slate-200 flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-bold text-slate-800 block">
                                    {match.playerA?.name || "Player A"}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {match.playerA?.club || "Club"} • {match.playerA?.belt || "Belt"}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                  AKA
                                </span>
                              </div>

                              {/* Player B (Blue / AO) */}
                              <div className="bg-white rounded-lg p-2.5 border-l-4 border-blue-500 border border-slate-200 flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-bold text-slate-800 block">
                                    {match.playerB?.name || "Player B"}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {match.playerB?.club || "Club"} • {match.playerB?.belt || "Belt"}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  AO
                                </span>
                              </div>

                              {/* Open Match Control Button */}
                              <div className="pt-2">
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/tatami/matches/${match.id}?categoryId=${currentCategory?.id}&poolId=${currentPool?.id}`
                                    )
                                  }
                                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                                    match.status === "LIVE"
                                      ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                                      : match.status === "COMPLETED"
                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                      : "bg-[#1e266d] hover:bg-[#151c50] text-white"
                                  }`}
                                >
                                  <span>
                                    {match.status === "LIVE"
                                      ? "LIVE MATCH CONTROL"
                                      : match.status === "COMPLETED"
                                      ? "VIEW MATCH DETAILS"
                                      : "OPEN MATCH CONTROL"}
                                  </span>
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
