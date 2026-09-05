import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ShieldCheck ,User} from "lucide-react";

/* ================= BACKEND APIS ================= */
import { getAllTournaments } from "../api/tournaments";
import { getPoolData, generatePools } from "../api/pools";

const TournamentPoolTree = () => {

  /* ============================================================
     🔹 BACKEND-RELATED STATES
     ============================================================ */

  // All tournaments for dropdown
  const [tournaments, setTournaments] = useState([]);

  // Selected tournament ID
  const [tournamentId, setTournamentId] = useState("");

  // Categories returned from backend
  const [categories, setCategories] = useState([]);

  // Has pool generation completed?
  const [generated, setGenerated] = useState(false);

  // Loading state for generate button
  const [loading, setLoading] = useState(false);


  /* ============================================================
     🔹 ORIGINAL UI STATES (UNCHANGED)
     ============================================================ */

  const [openCategoryIndex, setOpenCategoryIndex] = useState(null);
  const [activePool, setActivePool] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [kataPlayers, setKataPlayers] = useState(null);

  /* ============================================================
     🔹 FETCH TOURNAMENTS ON PAGE LOAD
     ============================================================ */

  useEffect(() => {
    async function loadTournaments() {
      const data = await getAllTournaments();
      setTournaments(data || []);
    }
    loadTournaments();
  }, []);


  /* ============================================================
     🔹 GENERATE POOLS (BACKEND)
     ============================================================ */

  const handleGenerate = async () => {
    if (!tournamentId) return;

    setLoading(true);

    try {
      // Trigger backend pool generation
      await generatePools(tournamentId);
    } catch (err) {
      // 400 means already generated → still fetch
      if (err?.response?.status !== 400) {
        alert("Pool generation failed");
        setLoading(false);
        return;
      }
    }

    // Fetch generated pool structure
    const data = await getPoolData(tournamentId);
    setCategories(data?.categories || []);
    setGenerated(true);
    setLoading(false);
  };


  /* ============================================================
     🔹 CORE BRACKET LOGIC (UNCHANGED)
     🔹 Supports 2 / 4 / 8 / 16 / 32 players dynamically
     ============================================================ */

  const generateBracket = (players) => {
    if (!players || players.length === 0) {
      setRounds([]);
      return;
    }

    // Ensure power of 2, at least 2 slots
    const nextPowerOfTwo = Math.max(
      2,
      Math.pow(2, Math.ceil(Math.log2(players.length)))
    );

    // Pad players with BYE
    const paddedPlayers = [...players];
    while (paddedPlayers.length < nextPowerOfTwo) {
      paddedPlayers.push("BYE");
    }

    const totalRounds = Math.log2(nextPowerOfTwo);
    const bracketRounds = [];

    let matchCount = nextPowerOfTwo / 2;

    for (let r = 0; r < totalRounds; r++) {
      const seeds = [];

      for (let m = 0; m < matchCount; m++) {
        seeds.push({
          id: `${r}-${m}`,
          players:
            r === 0
              ? [
                  paddedPlayers[m * 2],
                  paddedPlayers[m * 2 + 1],
                ]
              : ["TBD", "TBD"],
        });
      }

      bracketRounds.push({
        title: r === totalRounds - 1 ? "Final" : `Round ${r + 1}`,
        seeds,
      });

      matchCount = matchCount / 2;
    }

    setRounds(bracketRounds);
  };


  /* ============================================================
     🔹 BUILD PLAYER LIST FROM BACKEND MATCH DATA
     ============================================================ */

  const buildBracketFromPool = (pool) => {
    const players = new Set();

    pool.matches?.forEach((match) => {
      if (match.playerA?.name) players.add(match.playerA.name);
      if (match.playerB?.name) players.add(match.playerB.name);
    });

    generateBracket(Array.from(players));
  };


  /* ============================================================
     🔹 GROUP POOLS BY AI GROUP KEY (MATCHES SCREENSHOT)
     ============================================================ */

  const groupByAIKey = (pools = []) =>
    pools.reduce((acc, pool) => {
      if (!pool.aiGroupKey) return acc;
      if (!acc[pool.aiGroupKey]) acc[pool.aiGroupKey] = [];
      acc[pool.aiGroupKey].push(pool);
      return acc;
    }, {});


  /* ============================================================
     🔹 UI (UNCHANGED)
     ============================================================ */

  return (
    <div className="min-h-screen ml-[260px] bg-[#f1f5f9] p-4 md:p-10 flex flex-col items-center">

      {/* ================= HEADER ================= */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <ShieldCheck className="text-[#3f4191]" size={28} />
          <h1 className="text-4xl font-black text-[#1e266d] uppercase">
            Tournament Pools
          </h1>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
          Bracket Preview
        </p>
      </motion.div>


      {/* ================= GENERATE CARD ================= */}
      {!generated && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl bg-white/80 backdrop-blur-xl rounded-[2.5rem]
                     shadow-[0_30px_80px_rgba(0,0,0,0.15)]
                     px-12 py-14 text-center mb-16"
        >
          <h2 className="text-3xl font-black text-[#1e266d] mb-10">
            Generate Tournament Pools
          </h2>

          <select
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            className="w-full h-16 rounded-2xl border border-slate-200
                       px-6 text-lg mb-10"
          >
            <option value="">Select Tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            disabled={!tournamentId || loading}
            onClick={handleGenerate}
            className="w-full h-16 rounded-2xl bg-[#a6a6c9]
                       text-white font-extrabold text-lg
                       shadow-lg disabled:opacity-50"
          >
            {loading ? "Generating Pools..." : "Generate Pools"}
          </button>
        </motion.div>
      )}


      {/* ================= CATEGORY LIST ================= */}
      <div className="w-full max-w-6xl">
        {categories.map((category, idx) => {
          const isOpen = openCategoryIndex === idx;
          const aiGroups = groupByAIKey(category.pools);

          return (
            <div key={idx} className="mb-4 bg-white rounded-2xl shadow">

              {/* CATEGORY HEADER */}
              <div
                onClick={() => {
                  setOpenCategoryIndex(isOpen ? null : idx);
                  setActivePool(null);
                  setRounds([]);
                  setKataPlayers(null);
                }}
                className="flex justify-between items-center px-6 py-4 cursor-pointer"
              >
                <span className="font-semibold text-[#1e266d]">
                  {category.name}
                </span>
                <span>{isOpen ? "▾" : "▸"}</span>
              </div>

              {/* CATEGORY CONTENT */}
              {isOpen && (
                <div className="px-6 pb-4 border-t">

                  {Object.entries(aiGroups).map(([aiKey, pools]) => (
                    <div key={aiKey} className="mt-6">

                      {/* AI GROUP TITLE */}
                      <div className="font-bold text-[#1e266d] tracking-wide">
                        {aiKey}
                      </div>

                      {/* POOLS */}
                      {pools.map((pool) => (
                        <div key={pool.id} className="ml-4">

                          <div
                            onClick={() => {
                              setActivePool(pool.id);
                              setRounds([]);
                              setKataPlayers(null);
                            // 🆕 KATA ONLY: show player list instead of bracket
                              if (category.type === "KATA") {
                                const players = new Set();
                                pool.matches?.forEach(m => {
                                  if (m.playerA?.name) players.add(m.playerA.name);
                                  if (m.playerB?.name) players.add(m.playerB.name);
                                });
                                setKataPlayers(Array.from(players));
                              } 
                             else {
                              buildBracketFromPool(pool); // Kumite bracket view
                            }
                            }}
                            className="mt-2 text-sm text-slate-600 cursor-pointer hover:text-[#3f4191]"
                          >
                            {pool.name}
                          </div>

                          {/* BRACKET UI */}
                          {activePool === pool.id && !kataPlayers && (
                            <div className="mt-6">
                              <div className="flex pb-20">

                                <AnimatePresence>
                                  {rounds.map((round, roundIndex) => (
                                    <motion.div
                                      key={round.title}
                                      initial={{ opacity: 0, x: 30 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: roundIndex * 0.15 }}
                                      className="flex flex-col w-64"
                                    >
                                      <h2 className="text-center text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-8">
                                        {round.title}
                                      </h2>

                                      <div className="flex flex-col justify-around flex-grow">
                                        {round.seeds.map((seed) => (
                                          <div key={seed.id} className="flex flex-col items-center py-6">
                                            {seed.players.map((player, i) => (
                                              <div
                                                key={i}
                                                className={`w-44 h-14 rounded-[1.25rem]
                                                  flex items-center justify-center
                                                  font-bold text-xs shadow-xl mb-2 ${
                                                  player === "BYE"
                                                    ? "bg-slate-300 text-slate-600"
                                                    : "bg-[#2e3b7e] text-white"
                                                }`}
                                              >
                                                {player}
                                              </div>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                                {/* WINNER CARD */}
                                <div className="flex items-center ml-16">
                                  <motion.div
                                    initial={{ scale: 0.85, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-60 h-80 bg-white/40 backdrop-blur-2xl
                                               border-2 border-white/60
                                               rounded-[3rem]
                                               flex flex-col items-center
                                               justify-center gap-6 shadow-2xl"
                                  >
                                    <Trophy size={48} className="text-[#3f4191]" />
                                    <span className="text-[#1e266d] font-black uppercase tracking-[0.2em] text-xl">
                                      Winner
                                    </span>
                                  </motion.div>
                                </div>

                              </div>
                            </div>
                          )}
                          {/* ================= KATA SCOREBOARD ================= */}
{activePool === pool.id && kataPlayers && (
                            <div className="mt-6 bg-white rounded-2xl shadow p-6 max-w-2xl">
                              <h2 className="font-black text-[#1e266d] mb-4 text-lg">Kata Players</h2>
                              {kataPlayers.map((name, i) => (
                                <div key={i} className="flex items-center gap-3 border-b py-3">
                                  <div className="bg-[#e0e7ff] text-[#3f4191] w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm">{i + 1}</div>
                                  <User size={14} className="text-slate-400" />
                                  <span className="font-bold text-[#1e266d]">{name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default TournamentPoolTree;