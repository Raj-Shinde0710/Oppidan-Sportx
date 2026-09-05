import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getAllTournaments } from "../api/tournaments";
import { getPoolData } from "../api/pools";

const slotStyles = {
  "1A": "bg-indigo-100 text-[#1e266d]",
  "1B": "bg-slate-200 text-slate-700",
  "1C": "bg-emerald-100 text-emerald-700",
  "2A": "bg-indigo-100 text-[#1e266d]",
  "2B": "bg-slate-200 text-slate-700",
};

const tableContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04 },
  }),
};

const formatTime = (date) =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const addMinutes = (baseDate, minutes) => {
  const next = new Date(baseDate);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

const toTitleCase = (value = "") =>
  String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const getTatamiLabel = (tatami, allTatamis) => {
  if (tatami == null || tatami === "") return "TBD";
  const numericTatami = Number(tatami);
  if (!Number.isNaN(numericTatami)) {
    const list = Array.isArray(allTatamis) ? allTatamis : [];
    return list[numericTatami - 1]?.name || `Tatami ${numericTatami}`;
  }

  return String(tatami);
};

const getAgeLabel = (categoryName = "") => {
  const match = String(categoryName).match(/(under\s*\d+)/i);
  return match ? match[1].toLowerCase() : "";
};

const getEventType = (categoryName = "", categoryType = "") => {
  const lowered = String(categoryName).toLowerCase();
  if (lowered.includes("kata")) return "kata";
  if (lowered.includes("kumite")) return "kumite";
  return String(categoryType || "").toLowerCase() || "event";
};

const getGenderLabel = (gender = "") => {
  const normalized = String(gender || "").trim().toLowerCase();
  if (normalized.includes("female") || normalized === "f") return "girls";
  if (normalized.includes("male") || normalized === "m") return "boys";
  return "mixed";
};

const SchedulePage = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [title, setTitle] = useState("MATCH SCHEDULE");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");

  const selectedTournament = useMemo(
    () => tournaments.find((t) => t.id === selectedTournamentId) || null,
    [tournaments, selectedTournamentId]
  );

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const data = await getAllTournaments();
        const tournamentList = Array.isArray(data) ? data : [];
        setTournaments(tournamentList);
        if (tournamentList[0]) {
          setSelectedTournamentId(tournamentList[0].id);
        }
      } catch (error) {
        console.error("Failed to load tournaments", error);
      }
    };

    loadTournaments();
  }, []);

  useEffect(() => {
    if (!selectedTournamentId) {
      setSchedule([]);
      setLoading(false);
      return;
    }

    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const tournamentData = await getPoolData(selectedTournamentId);
        const categories = Array.isArray(tournamentData?.categories) ? tournamentData.categories : [];
        const tatamis = Array.isArray(tournamentData?.tatamis) ? tournamentData.tatamis : [];

        const rows = [];
        const startBase = new Date();
        startBase.setHours(9, 0, 0, 0);

        rows.push({
          time: "09:00 AM",
          category: "INAUGURATION",
          remark: "Opening ceremony",
          slot: "",
        });

        let currentMinutes = 9 * 60 + 45;

        categories.forEach((categoryItem, index) => {
          const pools = Array.isArray(categoryItem?.pools) ? categoryItem.pools : [];
          const durationMinutes = pools.length * 3;
          const startTime = addMinutes(startBase, currentMinutes);
          const endTime = addMinutes(startTime, durationMinutes);

          const titleName = categoryItem?.name || `Category ${index + 1}`;
          const ageLabel = getAgeLabel(titleName);
          const discipline = getEventType(titleName, categoryItem?.type);
          const tatamiLabel = getTatamiLabel(pools[0]?.matches?.[0]?.tatami ?? pools[0]?.tatami, tatamis);

          const genderGroups = pools.reduce((acc, pool) => {
            const gender = pool?.gender || "Mixed";
            const key = getGenderLabel(gender);
            if (!acc[key]) acc[key] = [];
            acc[key].push(pool);
            return acc;
          }, {});

          Object.entries(genderGroups)
            .filter(([genderKey]) => genderKey === "boys" || genderKey === "girls")
            .forEach(([genderKey]) => {
              const genderLabel = genderKey === "boys" ? "boys" : "girls";
              const poolLabel = `${ageLabel ? `${ageLabel} ` : ""}${genderLabel} ${discipline}`.trim();
              const remark = `Tatami: ${tatamiLabel}`;

              rows.push({
                time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
                category: poolLabel,
                remark,
                slot: index % 2 === 0 ? "1A" : "1B",
              });
            });

          currentMinutes += durationMinutes + 15;
        });

        setTitle("MATCH SCHEDULE");
        setDate(selectedTournament?.name || "Tournament Schedule");
        setCategory("POOL BASED TIMETABLE");
        setSchedule(rows);
      } catch (error) {
        console.error("Failed to fetch schedule", error);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [selectedTournamentId, selectedTournament?.name]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] bg-[radial-gradient(at_top_left,_#e2e8f0_0%,_transparent_50%),_radial-gradient(at_top_right,_#cbd5e1_0%,_transparent_50%)] p-6 flex justify-center">
      <motion.div
        variants={tableContainerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl bg-white/70 backdrop-blur-xl border border-slate-300 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="text-center border-b border-slate-300">
          <h1 className="text-3xl font-black text-[#1e266d] py-4">{title}</h1>
          <p className="text-slate-600 font-semibold pb-4">
            {date} – {category}
          </p>
        </div>

        <div className="flex flex-col gap-3 p-4 border-b border-slate-300 print:hidden md:flex-row md:items-center md:justify-between">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold outline-none"
          >
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#3f4191] hover:bg-[#2e3b7e] text-white font-semibold rounded-lg transition"
          >
            Print / Download PDF
          </button>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-indigo-100 text-[#1e266d] font-bold">
              <th className="p-3 border border-slate-300 w-28">TIMING</th>
              <th className="p-3 border border-slate-300">CATEGORY</th>
              <th className="p-3 border border-slate-300 w-32">REMARK</th>
              <th className="p-3 border border-slate-300 w-24 text-center">SLOT</th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              schedule?.map((row, index) => (
                <motion.tr
                  key={`${row.category}-${index}`}
                  custom={index}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  className="hover:bg-slate-100 transition-colors"
                >
                  <td className="p-3 border border-slate-300 text-center font-semibold text-slate-700">
                    {row?.time || "-"}
                  </td>

                  <td
                    className={`p-3 border border-slate-300 font-medium ${
                      row?.category?.includes("INAUGURATION")
                        ? "text-center font-bold text-[#1e266d]"
                        : "text-slate-700"
                    }`}
                  >
                    {row?.category || "-"}
                  </td>

                  <td className="p-3 border border-slate-300">
                    {row?.remark || ""}
                  </td>

                  <td
                    className={`p-3 border border-slate-300 text-center font-black ${
                      slotStyles[row?.slot] || ""
                    }`}
                  >
                    <motion.span whileHover={{ scale: 1.1 }}>
                      {row?.slot || ""}
                    </motion.span>
                  </td>
                </motion.tr>
              ))}
          </tbody>
        </table>

        {loading && (
          <div className="p-6 text-center text-slate-500 font-semibold">
            Loading schedule...
          </div>
        )}

        {!loading && schedule.length === 0 && (
          <div className="p-6 text-center text-slate-500 font-semibold">
            No pool data is available for the selected tournament yet.
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SchedulePage;
