import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  UserCheck,
  ChevronRight,
  Info,
  Zap,
  Table as TableIcon,
  Users,
  Weight,
  CalendarDays,
  VenusAndMars,
  CheckCircle2,
  Settings,
} from "lucide-react";

import { getAllTournaments } from "../api/tournaments";
import { getTatamisByTournament, assignPoolsToTatamis } from "../api/tatami";
import { getAllReferees } from "../api/referees";
import { getPoolData } from "../api/pools";

const AssignmentForm = () => {
  // ============================================================
  // TOURNAMENT
  // ============================================================

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  // ============================================================
  // ASSIGNMENT OPTIONS
  // ============================================================

  const [mode, setMode] = useState("MIX");
  const [sequence, setSequence] = useState("SENIOR_FIRST");

  // ============================================================
  // BACKEND DATA
  // ============================================================

  const [tatamis, setTatamis] = useState([]);
  const [pools, setPools] = useState([]);
  const [refereeCount, setRefereeCount] = useState(0);

  // ============================================================
  // ASSIGNMENT RESULT
  // ============================================================

  const [assignments, setAssignments] = useState([]);
  const [isAssigned, setIsAssigned] = useState(false);

  // ============================================================
  // LOADING STATES
  // ============================================================

  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // ============================================================
  // LOAD ALL TOURNAMENTS
  // ============================================================

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setLoadingTournaments(true);

        const data = await getAllTournaments();

        const tournamentList = Array.isArray(data) ? data : [];

        setTournaments(tournamentList);
      } catch (error) {
        console.error("Failed to load tournaments:", error);
        setTournaments([]);
      } finally {
        setLoadingTournaments(false);
      }
    };

    loadTournaments();
  }, []);

  // ============================================================
  // LOAD DATA WHEN TOURNAMENT CHANGES
  // ============================================================

  useEffect(() => {
    if (!selectedTournamentId) {
      setTatamis([]);
      setPools([]);
      setRefereeCount(0);
      setAssignments([]);
      setIsAssigned(false);
      return;
    }

    const loadTournamentData = async () => {
      try {
        setLoadingData(true);
        setIsAssigned(false);
        setAssignments([]);

        const [tatamiRes, poolData, refereeRes] = await Promise.all([
          getTatamisByTournament(selectedTournamentId),
          getPoolData(selectedTournamentId),
          getAllReferees(),
        ]);

        // --------------------------------------------------------
        // TATAMIS
        // --------------------------------------------------------

        const tatamiList = Array.isArray(tatamiRes?.data)
          ? tatamiRes.data
          : Array.isArray(tatamiRes)
          ? tatamiRes
          : [];

        setTatamis(tatamiList);

        // --------------------------------------------------------
        // POOLS
        //
        // getPoolData returns:
        //
        // {
        //   categories: [
        //      {
        //        pools: [...]
        //      }
        //   ]
        // }
        // --------------------------------------------------------

        const categories = Array.isArray(poolData?.categories)
          ? poolData.categories
          : [];

        const flattenedPools = [];

        categories.forEach((category) => {
          const categoryPools = Array.isArray(category?.pools)
            ? category.pools
            : [];

          categoryPools.forEach((pool) => {
            flattenedPools.push({
              ...pool,
              categoryName:
                category?.name ||
                category?.categoryName ||
                "Unknown Category",
            });
          });
        });

        setPools(flattenedPools);

        // --------------------------------------------------------
        // REFEREES
        // --------------------------------------------------------

        const refereeList = Array.isArray(refereeRes?.data)
          ? refereeRes.data
          : Array.isArray(refereeRes)
          ? refereeRes
          : [];

        setRefereeCount(refereeList.length);
      } catch (error) {
        console.error("Failed to load tournament data:", error);

        setTatamis([]);
        setPools([]);
        setRefereeCount(0);
      } finally {
        setLoadingData(false);
      }
    };

    loadTournamentData();
  }, [selectedTournamentId]);

  // ============================================================
  // ASSIGN POOLS
  // ============================================================

  const handleAssign = async () => {
    if (!selectedTournamentId) {
      alert("Please select a tournament.");
      return;
    }

    if (tatamis.length === 0) {
      alert("No Tatamis have been created for this tournament.");
      return;
    }

    if (pools.length === 0) {
      alert("No pools have been generated for this tournament.");
      return;
    }

    try {
      setAssigning(true);

      const result = await assignPoolsToTatamis(
        selectedTournamentId,
        mode,
        sequence
      );

      console.log("Pool assignment result:", result);

      const resultAssignments = Array.isArray(result?.assignments)
        ? result.assignments
        : [];

      setAssignments(resultAssignments);
      setIsAssigned(true);

      alert(
        `Successfully assigned ${result?.totalPools ?? resultAssignments.length} pools to ${result?.totalTatamis ?? tatamis.length} Tatamis.`
      );
    } catch (error) {
      console.error("Pool assignment failed:", error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to assign pools."
      );
    } finally {
      setAssigning(false);
    }
  };

  // ============================================================
  // ANIMATION VARIANTS
  // ============================================================

  const containerVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.95,
    },

    visible: {
      opacity: 1,
      y: 0,
      scale: 1,

      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(4px)",
    },

    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",

      transition: {
        duration: 0.5,
      },
    },
  };
  // ============================================================
// TATAMI CARD COLORS
// ============================================================

const tatamiColors = [
  {
    border: "border-blue-500",
    accent: "text-blue-700",
    light: "bg-blue-50",
    pool: "bg-blue-50 border-blue-100",
  },
  {
    border: "border-pink-500",
    accent: "text-pink-700",
    light: "bg-pink-50",
    pool: "bg-pink-50 border-pink-100",
  },
  {
    border: "border-orange-500",
    accent: "text-orange-700",
    light: "bg-orange-50",
    pool: "bg-orange-50 border-orange-100",
  },
  {
    border: "border-green-500",
    accent: "text-green-700",
    light: "bg-green-50",
    pool: "bg-green-50 border-green-100",
  },
  {
    border: "border-purple-500",
    accent: "text-purple-700",
    light: "bg-purple-50",
    pool: "bg-purple-50 border-purple-100",
  },
  {
    border: "border-cyan-500",
    accent: "text-cyan-700",
    light: "bg-cyan-50",
    pool: "bg-cyan-50 border-cyan-100",
  },
];

// ============================================================
// FORMAT HELPERS
// ============================================================

const formatAge = (minAge, maxAge) => {
  if (minAge === undefined || minAge === null) {
    return "Age not available";
  }

  if (minAge === maxAge) {
    return `${minAge} Years`;
  }

  return `${minAge}–${maxAge} Years`;
};

const formatWeight = (assignment) => {
  if (!assignment) {
    return "Weight not available";
  }

  const minWeight = assignment.minWeight;
  const maxWeight = assignment.maxWeight;

  if (
    minWeight !== undefined &&
    minWeight !== null &&
    maxWeight !== undefined &&
    maxWeight !== null
  ) {
    return `${minWeight}–${maxWeight} kg`;
  }

  return "Weight not available";
};

const groupedTatamis = tatamis.map((tatami) => {
  const tatamiAssignments = assignments.filter(
    (assignment) =>
      assignment.tatamiId === tatami.id ||
      assignment.tatamiNumber === tatami.number
  );

  return {
    ...tatami,
    assignments: tatamiAssignments,
  };
});

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-[#f1f5f9] bg-[radial-gradient(at_top_left,_#e2e8f0_0%,_transparent_50%),_radial-gradient(at_top_right,_#cbd5e1_0%,_transparent_50%)] p-4 md:p-10 font-sans text-slate-700 flex flex-col items-center">

      {/* ========================================================
          MAIN CARD
      ======================================================== */}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-5xl bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] overflow-hidden mb-10"
      >

        {/* HEADER */}

        <div className="p-10 border-b border-white/30 flex flex-col md:flex-row md:items-center gap-6">

          <motion.div
            variants={itemVariants}
            className="bg-[#3f4191] w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100"
          >
            <Zap size={36} />
          </motion.div>

          <div>
            <motion.h1
              variants={itemVariants}
              className="text-4xl font-black text-[#1e266d] tracking-tighter"
            >
              Assignment Engine
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black"
            >
              Tatami, Pool & Referee Allocation
            </motion.p>
          </div>
        </div>

        {/* ======================================================
            FORM
        ====================================================== */}

        <div className="p-10 space-y-10">

          {/* TOURNAMENT */}

          <motion.div
            variants={itemVariants}
            className="space-y-4"
          >
            <label className="text-[11px] font-black uppercase tracking-widest text-[#3f4191]">
              Select Tournament
            </label>

            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="w-full bg-white/70 border border-slate-200 rounded-2xl p-4 text-base font-bold text-[#1e266d] outline-none"
              disabled={loadingTournaments}
            >
              <option value="">
                {loadingTournaments
                  ? "Loading tournaments..."
                  : "Select Tournament"}
              </option>

              {tournaments.map((tournament) => (
                <option
                  key={tournament.id}
                  value={tournament.id}
                >
                  {tournament.name}
                </option>
              ))}
            </select>
          </motion.div>

          {/* ====================================================
              STATISTICS
          ==================================================== */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* TATAMIS */}

            <motion.div
              variants={itemVariants}
              className="space-y-4 bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#3f4191]">
                <LayoutGrid size={20} />

                <span className="text-[11px] font-black uppercase tracking-widest">
                  Total Tatami
                </span>
              </div>

              <div className="w-full bg-white/60 border border-slate-200 rounded-2xl p-4 text-xl font-black text-[#1e266d]">
                {loadingData ? "..." : tatamis.length}
              </div>
            </motion.div>

            {/* POOLS */}

            <motion.div
              variants={itemVariants}
              className="space-y-4 bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#3f4191]">
                <TableIcon size={20} />

                <span className="text-[11px] font-black uppercase tracking-widest">
                  Total Pools
                </span>
              </div>

              <div className="w-full bg-white/60 border border-slate-200 rounded-2xl p-4 text-xl font-black text-[#1e266d]">
                {loadingData ? "..." : pools.length}
              </div>
            </motion.div>

            {/* REFEREES */}

            <motion.div
              variants={itemVariants}
              className="space-y-4 bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#3f4191]">
                <UserCheck size={20} />

                <span className="text-[11px] font-black uppercase tracking-widest">
                  Total Referees
                </span>
              </div>

              <div className="w-full bg-white/60 border border-slate-200 rounded-2xl p-4 text-xl font-black text-[#1e266d]">
                {loadingData ? "..." : refereeCount}
              </div>
            </motion.div>

          </div>

          {/* ====================================================
              ASSIGNMENT MODE
          ==================================================== */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* BOYS / GIRLS / MIX */}

            <motion.div
              variants={itemVariants}
              className="bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm"
            >
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#3f4191] mb-4">
                Assign Pools To
              </label>

              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full bg-white/70 border border-slate-200 rounded-2xl p-4 text-base font-bold text-[#1e266d] outline-none"
              >
                <option value="BOYS">Boys</option>
                <option value="GIRLS">Girls</option>
                <option value="MIX">Mix</option>
              </select>
            </motion.div>

            {/* SEQUENCE */}

            <motion.div
              variants={itemVariants}
              className="bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm"
            >
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#3f4191] mb-4">
                Pool Sequence
              </label>

              <select
                value={sequence}
                onChange={(e) => setSequence(e.target.value)}
                className="w-full bg-white/70 border border-slate-200 rounded-2xl p-4 text-base font-bold text-[#1e266d] outline-none"
              >
                <option value="SENIOR_FIRST">
                  Senior → Junior
                </option>

                <option value="JUNIOR_FIRST">
                  Junior → Senior
                </option>
              </select>
            </motion.div>

          </div>

          {/* INFO */}

          <motion.div
            variants={itemVariants}
            className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-sm text-indigo-900"
          >
            <div className="flex gap-3">
              <Info size={20} className="flex-shrink-0" />

              <div>
                <p className="font-bold">
                  Assignment Rules
                </p>

                <p className="mt-1">
                  All generated pools for the selected tournament will
                  be assigned to the available Tatamis. Pools will not
                  be removed or skipped.
                </p>
              </div>
            </div>
          </motion.div>

        </div>

        {/* ======================================================
            FOOTER
        ======================================================= */}

        <div className="p-6 border-t border-white/30 flex justify-between items-center bg-white/10">

          <div className="flex items-center gap-2 text-slate-400 ml-4">
            <Info size={16} />

            <span className="text-[10px] font-black uppercase tracking-widest">
              Data fetched from backend
            </span>
          </div>

          <motion.button
            onClick={handleAssign}
            disabled={
              assigning ||
              loadingData ||
              !selectedTournamentId ||
              tatamis.length === 0 ||
              pools.length === 0
            }
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#3f4191] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-14 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 transition-all"
          >
            {assigning ? "Assigning..." : "Assign"}

            {!assigning && <ChevronRight size={20} />}
          </motion.button>

        </div>

      </motion.div>

      {/* ========================================================
          ASSIGNMENT RESULT
      ======================================================== */}

      {/* ========================================================
    ASSIGNMENT RESULT
======================================================== */}

<AnimatePresence>
  {isAssigned && (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
        scale: 0.95,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: 20,
      }}
      className="w-full max-w-7xl mb-20"
    >
      {/* RESULT HEADER */}
      <div className="mb-8 px-2">
        <h2 className="text-3xl font-black text-[#1e266d]">
          Tatami Assignments
        </h2>

        <p className="text-sm text-slate-500 mt-2">
          {assignments.length} pools assigned successfully.
        </p>
      </div>

      {/* TATAMI CARDS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {groupedTatamis.map((tatami, index) => {
          const colors =
            tatamiColors[index % tatamiColors.length];

          const totalPools =
            tatami.assignments.length;

          const totalAthletes =
  tatami.assignments.reduce(
    (total, assignment) => {
      const pool = pools.find(
        (p) => p.id === assignment.poolId
      );

      if (!pool?.matches) {
        return total;
      }

      const athleteIds = new Set();

      pool.matches.forEach((match) => {
        if (match.playerA?.id) {
          athleteIds.add(match.playerA.id);
        }

        if (match.playerB?.id) {
          athleteIds.add(match.playerB.id);
        }
      });

      return total + athleteIds.size;
    },
    0
  );

          return (
            <motion.div
              key={tatami.id}
              variants={itemVariants}
              className={`
                bg-white
                rounded-[2rem]
                border-t-4
                ${colors.border}
                shadow-lg
                overflow-hidden
                hover:shadow-xl
                transition-all
              `}
            >

              {/* -----------------------------------------
                  TATAMI HEADER
              ------------------------------------------ */}

              <div className="p-6">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div
                      className={`
                        w-3
                        h-10
                        rounded-full
                        ${colors.light}
                        border-2
                        ${colors.border}
                      `}
                    />

                    <div>
                      <h3
                        className={`
                          text-2xl
                          font-black
                          ${colors.accent}
                        `}
                      >
                        Tatami {tatami.number}
                      </h3>

                      <p className="text-xs text-slate-400 font-semibold mt-1">
                        Tatami Assignment
                      </p>
                    </div>

                  </div>

                  {/* ACTIVE BADGE */}

                  <div className="flex items-center gap-2">

                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100">
                      <CheckCircle2 size={14} />
                      Active
                    </span>

                    <button
                      type="button"
                      className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                      title="Tatami settings"
                    >
                      <Settings size={18} />
                    </button>

                  </div>

                </div>

                {/* -----------------------------------------
                    TATAMI SUMMARY
                ------------------------------------------ */}

                <div
                  className={`
                    mt-5
                    grid
                    grid-cols-2
                    gap-3
                    ${colors.light}
                    rounded-2xl
                    p-4
                  `}
                >

                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                      Total Pools
                    </p>

                    <p
                      className={`
                        text-xl
                        font-black
                        ${colors.accent}
                        mt-1
                      `}
                    >
                      {totalPools}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                      Total Athletes
                    </p>

                    <p
                      className={`
                        text-xl
                        font-black
                        ${colors.accent}
                        mt-1
                      `}
                    >
                      {totalAthletes}
                    </p>
                  </div>

                </div>

              </div>

              {/* -----------------------------------------
                  POOLS
              ------------------------------------------ */}

              <div className="px-6 pb-6">

                {tatami.assignments.length === 0 ? (

                  <div className="bg-slate-50 rounded-2xl p-6 text-center">
                    <p className="text-sm font-semibold text-slate-400">
                      No pools assigned
                    </p>
                  </div>

                ) : (

                  <div className="space-y-4">

                    {tatami.assignments.map(
                      (assignment) => {

                        const pool = pools.find(
                          (p) =>
                            p.id === assignment.poolId
                        );

                        return (
                          <div
                            key={assignment.poolId}
                            className={`
                              border
                              rounded-2xl
                              p-5
                              ${colors.pool}
                            `}
                          >

                            {/* POOL TITLE */}

                            <div className="flex items-center justify-between mb-4">

                              <div>

                                <p
                                  className={`
                                    text-lg
                                    font-black
                                    ${colors.accent}
                                  `}
                                >
                                  {assignment.poolName}
                                </p>

                                <p className="text-xs text-slate-400 font-semibold mt-1">
                                  {assignment.categoryName}
                                </p>

                              </div>

                              <span className="text-xs font-bold bg-white px-3 py-1.5 rounded-full text-slate-500 border border-slate-100">
                                Assigned
                              </span>

                            </div>

                            {/* DETAILS */}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                              {/* AGE */}

                              <div className="bg-white rounded-xl p-3 border border-white/80">

                                <div className="flex items-center gap-2 text-slate-400">

                                  <CalendarDays size={15} />

                                  <span className="text-[9px] uppercase tracking-widest font-black">
                                    Age
                                  </span>

                                </div>

                                <p className="text-sm font-black text-[#1e266d] mt-1">
                                  {formatAge(
                                    assignment.minAge,
                                    assignment.maxAge
                                  )}
                                </p>

                              </div>

                              {/* WEIGHT */}

                              <div className="bg-white rounded-xl p-3 border border-white/80">

                                <div className="flex items-center gap-2 text-slate-400">

                                  <Weight size={15} />

                                  <span className="text-[9px] uppercase tracking-widest font-black">
                                    Weight
                                  </span>

                                </div>

                                <p className="text-sm font-black text-[#1e266d] mt-1">
                                  {formatWeight(assignment)}
                                </p>

                              </div>

                              {/* GENDER */}

                              <div className="bg-white rounded-xl p-3 border border-white/80">

                                <div className="flex items-center gap-2 text-slate-400">

                                  <VenusAndMars size={15} />

                                  <span className="text-[9px] uppercase tracking-widest font-black">
                                    Gender
                                  </span>

                                </div>

                                <p className="text-sm font-black text-[#1e266d] mt-1">
                                  {assignment.gender || "—"}
                                </p>

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                )}

              </div>

            </motion.div>
          );
        })}

      </div>

    </motion.div>
  )}
</AnimatePresence>

    </div>
  );
};

export default AssignmentForm;