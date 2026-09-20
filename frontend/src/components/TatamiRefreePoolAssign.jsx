import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  UserCheck,
  ChevronRight,
  Info,
  Zap,
  Table as TableIcon,
  Weight,
  CalendarDays,
  VenusAndMars,
  CheckCircle2,
  Settings,
} from "lucide-react";

import { getAllTournaments } from "../api/tournaments";
import {
  getTatamisByTournament,
  assignPoolsToTatamis,
  assignCategoryManually,
} from "../api/tatami";
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

  const [assignmentType, setAssignmentType] = useState("AUTO");

const [selectedCategoryId, setSelectedCategoryId] = useState("");
const [selectedTatamiId, setSelectedTatamiId] = useState("");
const [manualAssigning, setManualAssigning] = useState(false);

const [categories, setCategories] = useState([]);
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

        const tournamentCategories = Array.isArray(
  poolData?.categories
)
  ? poolData.categories
  : [];

setCategories(tournamentCategories);

        const flattenedPools = [];

tournamentCategories.forEach((category) => {
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

      category,
    });
  });
});

setPools(flattenedPools);

const existingAssignments =
  tournamentCategories
    .filter((category) => category.tatamiId)
    .map((category) => {
      const tatami = tatamiList.find(
        (item) =>
          item.id === category.tatamiId
      );

      return {
        categoryId: category.id,
        categoryName: category.name,

        tatamiId: category.tatamiId,
        tatamiNumber: tatami?.number,

        gender: category.gender,

        minAge: category.minAge,
        maxAge: category.maxAge,

        totalPools:
          category.pools?.length || 0,

        pools:
          category.pools || [],
      };
    });

setAssignments(existingAssignments);
setIsAssigned(existingAssignments.length > 0);
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

    // --------------------------------------------------------
    // ASSIGN CATEGORIES TO TATAMIS
    // --------------------------------------------------------

    const result = await assignPoolsToTatamis(
      selectedTournamentId,
      mode,
      sequence
    );

    console.log("Category assignment result:", result);

    // --------------------------------------------------------
    // RE-FETCH POOL DATA
    // This gives us complete category/pool/match/player data
    // after the Tatami assignment has been saved.
    // --------------------------------------------------------

    const refreshedPoolData = await getPoolData(
      selectedTournamentId
    );

    const refreshedCategories = Array.isArray(
      refreshedPoolData?.categories
    )
      ? refreshedPoolData.categories
      : [];

    // Update categories state
    setCategories(refreshedCategories);

    // --------------------------------------------------------
    // FLATTEN POOLS
    // --------------------------------------------------------

    const refreshedPools = [];

    refreshedCategories.forEach((category) => {
      const categoryPools = Array.isArray(category?.pools)
        ? category.pools
        : [];

      categoryPools.forEach((pool) => {
        refreshedPools.push({
          ...pool,
          categoryName:
            category?.name ||
            category?.categoryName ||
            "Unknown Category",
          category,
        });
      });
    });

    setPools(refreshedPools);

    // --------------------------------------------------------
    // BUILD ASSIGNMENTS FROM FRESH DATABASE DATA
    // --------------------------------------------------------

    const refreshedAssignments = refreshedCategories
      .filter((category) => category.tatamiId)
      .map((category) => {
        const tatami = tatamis.find(
          (item) => item.id === category.tatamiId
        );

        return {
          categoryId: category.id,
          categoryName: category.name,

          tatamiId: category.tatamiId,
          tatamiNumber: tatami?.number,

          gender: category.gender,

          minAge: category.minAge,
          maxAge: category.maxAge,

          totalPools: category.pools?.length || 0,

          // IMPORTANT:
          // These pools contain the match/player information
          // required for athlete counting.
          pools: category.pools || [],
        };
      });

    console.log(
      "Refreshed category assignments:",
      refreshedAssignments
    );

    setAssignments(refreshedAssignments);
    setIsAssigned(refreshedAssignments.length > 0);

    // --------------------------------------------------------
    // CORRECT TOTALS
    // --------------------------------------------------------

    const totalAssignedPools = refreshedAssignments.reduce(
      (total, category) =>
        total + (category.totalPools || 0),
      0
    );

    alert(
      `Successfully assigned ${totalAssignedPools} pools to ${tatamis.length} Tatamis.`
    );

  } catch (error) {
    console.error(
      "Category assignment failed:",
      error
    );

    alert(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to assign categories."
    );
  } finally {
    setAssigning(false);
  }
};
  const handleManualAssign = async () => {
  if (!selectedTournamentId) {
    alert("Please select a tournament.");
    return;
  }

  if (!selectedCategoryId) {
    alert("Please select a category.");
    return;
  }

  if (!selectedTatamiId) {
    alert("Please select a Tatami.");
    return;
  }

  try {
    setManualAssigning(true);

    const result = await assignCategoryManually(
      selectedCategoryId,
      selectedTatamiId
    );

    console.log(
      "Manual category assignment result:",
      result
    );

    const selectedCategory = categories.find(
      (category) =>
        category.id === selectedCategoryId
    );

    const selectedTatami = tatamis.find(
      (tatami) =>
        tatami.id === selectedTatamiId
    );

    if (selectedCategory && selectedTatami) {
      const categoryAssignment = {
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,

        tatamiId: selectedTatami.id,
        tatamiNumber: selectedTatami.number,

        gender: selectedCategory.gender,

        minAge: selectedCategory.minAge,
        maxAge: selectedCategory.maxAge,

        totalPools:
          selectedCategory.pools?.length || 0,

        pools:
          selectedCategory.pools || [],
      };

      setAssignments((prev) => {
        const filtered = prev.filter(
          (assignment) =>
            assignment.categoryId !==
            selectedCategory.id
        );

        return [
          ...filtered,
          categoryAssignment,
        ];
      });
    }

    setIsAssigned(true);

    alert(
      result?.message ||
        "Category assigned successfully."
    );

    setSelectedCategoryId("");
    setSelectedTatamiId("");
  } catch (error) {
    console.error(
      "Manual category assignment failed:",
      error
    );

    alert(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to assign category."
    );
  } finally {
    setManualAssigning(false);
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

const getPoolWeightRange = (pool) => {
  if (!pool) {
    return {
      minWeight: null,
      maxWeight: null,
    };
  }


  const getPoolWeightValue = (pool) => {
  const {
    minWeight,
    maxWeight,
  } = getPoolWeightRange(pool);

  if (
    minWeight !== null &&
    minWeight !== undefined
  ) {
    return Number(minWeight);
  }

  if (
    maxWeight !== null &&
    maxWeight !== undefined
  ) {
    return Number(maxWeight);
  }

  return Number.POSITIVE_INFINITY;
};


  // If the API already provides weight values
  if (
    pool.minWeight !== undefined &&
    pool.minWeight !== null &&
    pool.maxWeight !== undefined &&
    pool.maxWeight !== null
  ) {
    return {
      minWeight: pool.minWeight,
      maxWeight: pool.maxWeight,
    };
  }

  // Otherwise extract from aiGroupKey
  // Example:
  // MALE | 7-7 | 36-40
  // MALE | 7-7 | 51-80
  if (pool.aiGroupKey) {
    const parts = pool.aiGroupKey
      .split("|")
      .map((part) => part.trim());

    const weightPart = parts[parts.length - 1];

    const match = weightPart?.match(
      /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/
    );

    if (match) {
      return {
        minWeight: Number(match[1]),
        maxWeight: Number(match[2]),
      };
    }
  }

  return {
    minWeight: null,
    maxWeight: null,
  };
};

const getPoolWeightValue = (pool) => {
  const { minWeight, maxWeight } =
    getPoolWeightRange(pool);

  if (
    minWeight !== null &&
    minWeight !== undefined
  ) {
    return Number(minWeight);
  }

  if (
    maxWeight !== null &&
    maxWeight !== undefined
  ) {
    return Number(maxWeight);
  }

  return Number.POSITIVE_INFINITY;
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
  const tatamiCategories = assignments.filter(
    (assignment) =>
      assignment.tatamiId === tatami.id ||
      assignment.tatamiNumber === tatami.number
  );

  return {
    ...tatami,
    categories: tatamiCategories,
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


{/* ====================================================
    AUTO / MANUAL ASSIGNMENT
==================================================== */}

<motion.div
  variants={itemVariants}
  className="bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm"
>
  <label className="block text-[11px] font-black uppercase tracking-widest text-[#3f4191] mb-4">
    Assignment Type
  </label>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    <button
      type="button"
      onClick={() => setAssignmentType("AUTO")}
      className={`
        p-4 rounded-2xl border-2 font-black uppercase tracking-widest
        transition-all
        ${
          assignmentType === "AUTO"
            ? "bg-[#3f4191] text-white border-[#3f4191] shadow-lg"
            : "bg-white/70 text-slate-500 border-slate-200 hover:border-[#3f4191]"
        }
      `}
    >
      Auto Assign
    </button>

    <button
      type="button"
      onClick={() => setAssignmentType("MANUAL")}
      className={`
        p-4 rounded-2xl border-2 font-black uppercase tracking-widest
        transition-all
        ${
          assignmentType === "MANUAL"
            ? "bg-[#3f4191] text-white border-[#3f4191] shadow-lg"
            : "bg-white/70 text-slate-500 border-slate-200 hover:border-[#3f4191]"
        }
      `}
    >
      Manual Assign
    </button>

  </div>
</motion.div>
{assignmentType === "MANUAL" && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm"
  >
    <label className="block text-[11px] font-black uppercase tracking-widest text-[#3f4191] mb-4">
      Select Category
    </label>

    <select
      value={selectedCategoryId}
      onChange={(e) =>
        setSelectedCategoryId(e.target.value)
      }
      className="w-full bg-white/70 border border-slate-200 rounded-2xl p-4 text-base font-bold text-[#1e266d] outline-none"
      disabled={
        loadingData || categories.length === 0
      }
    >
      <option value="">
        Select Category
      </option>

      {categories.map((category) => (
        <option
          key={category.id}
          value={category.id}
        >
          {category.name} — {category.gender} —{" "}
          {category.minAge === category.maxAge
            ? `${category.minAge} Years`
            : `${category.minAge}–${category.maxAge} Years`}
        </option>
      ))}
    </select>

    <label className="block text-[11px] font-black uppercase tracking-widest text-[#3f4191] mb-4 mt-6">
      Select Tatami
    </label>

    <select
      value={selectedTatamiId}
      onChange={(e) =>
        setSelectedTatamiId(e.target.value)
      }
      className="w-full bg-white/70 border border-slate-200 rounded-2xl p-4 text-base font-bold text-[#1e266d] outline-none"
      disabled={
        loadingData || tatamis.length === 0
      }
    >
      <option value="">
        Select Tatami
      </option>

      {tatamis.map((tatami) => (
        <option
          key={tatami.id}
          value={tatami.id}
        >
          Tatami {tatami.number}
        </option>
      ))}
    </select>
  </motion.div>
)}

{assignmentType === "AUTO" && (
  <>
            {/* BOYS / GIRLS / MIX */}

            <motion.div
              variants={itemVariants}
              className="bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm"
            >
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#3f4191] mb-4">
                AAssign Categories To
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
                Category Sequence
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

  </>
)}
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
  onClick={
    assignmentType === "AUTO"
      ? handleAssign
      : handleManualAssign
  }
  disabled={
    assignmentType === "AUTO"
      ? (
          assigning ||
          loadingData ||
          !selectedTournamentId ||
          tatamis.length === 0 ||
          pools.length === 0
        )
      : (
          manualAssigning ||
          loadingData ||
          !selectedTournamentId ||
          !selectedCategoryId ||
          !selectedTatamiId
        )
  }
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="bg-[#3f4191] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-14 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 transition-all"
>
  {assignmentType === "AUTO"
    ? assigning
      ? "Assigning..."
      : "Auto Assign"
    : manualAssigning
  ? "Assigning..."
  : "Assign Category"
  }

  {!assigning &&
    !manualAssigning && (
      <ChevronRight size={20} />
    )}
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
  {assignments.reduce(
    (total, category) =>
      total + (category.totalPools || 0),
    0
  )} pools across {assignments.length} categories assigned successfully.
</p>
      </div>

      {/* TATAMI CARDS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {groupedTatamis.map((tatami, index) => {
          const colors =
            tatamiColors[index % tatamiColors.length];

          const totalCategories =
  tatami.categories.length;

const totalPools =
  tatami.categories.reduce(
    (total, category) =>
      total + (category.totalPools || 0),
    0
  );

  const totalAthletes =
  tatami.categories.reduce(
    (total, categoryAssignment) => {
      const categoryPools = Array.isArray(
        categoryAssignment.pools
      )
        ? categoryAssignment.pools
        : [];

      const athleteIds = new Set();

      categoryPools.forEach((pool) => {
        if (!pool?.matches) {
          return;
        }

        pool.matches.forEach((match) => {
          if (match.playerA?.id) {
            athleteIds.add(match.playerA.id);
          }

          if (match.playerB?.id) {
            athleteIds.add(match.playerB.id);
          }
        });
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

                {tatami.categories.length === 0 ? (

                  <div className="bg-slate-50 rounded-2xl p-6 text-center">
                    <p className="text-sm font-semibold text-slate-400">
                      No pools assigned
                    </p>
                  </div>

                ) : (

<div className="space-y-4">
  {[...(tatami.categories || [])]
    .sort((a, b) => {
      if (a.minAge !== b.minAge) {
        return a.minAge - b.minAge;
      }

      if (a.maxAge !== b.maxAge) {
        return a.maxAge - b.maxAge;
      }

      return a.categoryName.localeCompare(
        b.categoryName
      );
    })
    .map((categoryAssignment) => (
      <div
        key={categoryAssignment.categoryId}
        className={`
          border
          rounded-2xl
          p-5
          ${colors.pool}
        `}
      
    >
      {/* CATEGORY HEADER */}

      <div className="flex items-center justify-between mb-4">
        <div>
          <p
            className={`
              text-xl
              font-black
              ${colors.accent}
            `}
          >
            {categoryAssignment.categoryName}
          </p>

          <p className="text-xs text-slate-400 font-semibold mt-1">
            {categoryAssignment.gender} •{" "}
            {formatAge(
              categoryAssignment.minAge,
              categoryAssignment.maxAge
            )}
          </p>
        </div>

        <span className="text-xs font-bold bg-white px-3 py-1.5 rounded-full text-slate-500 border border-slate-100">
          {categoryAssignment.totalPools} Pools
        </span>
      </div>

      {/* POOLS INSIDE CATEGORY */}

<div className="space-y-3">
  {[...(categoryAssignment.pools || [])]
    .sort(
      (a, b) =>
        getPoolWeightValue(a) -
        getPoolWeightValue(b)
    )
    .map((pool, poolIndex) => (
      <div
        key={pool.id}
        className="bg-white rounded-xl p-4 border border-slate-100"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-[#1e266d]">
              Pool {poolIndex + 1}
            </p>

            {pool.aiGroupKey && (
              <p className="text-xs text-slate-400 mt-1">
                {pool.aiGroupKey}
              </p>
            )}
          </div>

          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            Pool
          </span>
        </div>
      </div>
    ))}
</div>
    </div>
  )
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