import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  createTatamis,getTatamisByTournament,deleteTatami,} from "../api/tatami";
import { getTournaments } from "../api/tournaments";

const TatamiPage = () => {
  const [no_of_tatamis, setNoOfTatamis] = useState("");
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [tatamis, setTatamis] = useState([]);
const [loadingTatamis, setLoadingTatamis] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await getTournaments();

        // 🔥 adapt to axios-style or direct array response
        const data = Array.isArray(res) ? res : res?.data;

        if (Array.isArray(data)) {
          setTournaments(data);
        } else {
          setTournaments([]); // safety fallback
        }
      } catch (err) {
        console.error(err);
        setTournaments([]);
      }
    };
    fetchTournaments();
  }, []);

  useEffect(() => {
  const fetchTatamis = async () => {
    if (!selectedTournament) {
      setTatamis([]);
      return;
    }

    try {
      setLoadingTatamis(true);

      const res = await getTatamisByTournament(
        selectedTournament
      );

      const data = Array.isArray(res)
        ? res
        : res?.data;

      setTatamis(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Failed to load Tatamis:",
        err
      );

      setTatamis([]);
    } finally {
      setLoadingTatamis(false);
    }
  };

  fetchTatamis();
}, [selectedTournament]);

  const handleChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setNoOfTatamis(value);
    }
  };
  const handleDeleteTatami = async (tatami) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete Tatami ${tatami.number}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteTatami(tatami.id);

    // Refresh list
    const res =
      await getTatamisByTournament(
        selectedTournament
      );

    const data = Array.isArray(res)
      ? res
      : res?.data;

    setTatamis(
      Array.isArray(data)
        ? data
        : []
    );

    alert(
      `Tatami ${tatami.number} deleted successfully`
    );
  } catch (error) {
    console.error(
      "Failed to delete Tatami:",
      error
    );

    alert(
      error?.response?.data?.message ||
        "Failed to delete Tatami"
    );
  }
};
  const handleConfirm = async () => {
    if (!selectedTournament) {
      alert("Please select a tournament");
      return;
    }

    if (!no_of_tatamis || Number(no_of_tatamis) <= 0) {
      alert("Please enter a valid number of tatamis");
      return;
    }

    try {
      setLoading(true);
      const res = await createTatamis(
  selectedTournament,
  Number(no_of_tatamis)
);

setCredentials({
  tatamis: res.data.tatamis,
});

// Refresh existing Tatami list
const updatedRes =
  await getTatamisByTournament(
    selectedTournament
  );

const updatedData = Array.isArray(updatedRes)
  ? updatedRes
  : updatedRes?.data;

setTatamis(
  Array.isArray(updatedData)
    ? updatedData
    : []
);

alert(
  `✅ ${no_of_tatamis} new Tatami(s) created successfully`
);

setNoOfTatamis("");
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          "Something went wrong while creating tatamis"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] bg-[radial-gradient(at_top_left,_#e2e8f0_0%,_transparent_50%),_radial-gradient(at_top_right,_#cbd5e1_0%,_transparent_50%)] p-6">

      <div className="max-w-5xl mx-auto">
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        whileHover={{ y: -8, scale: 1.02 }}
        className="w-full max-w-xl mx-auto bg-white/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] p-10 border border-white/70"
      >
        {/* 🔄 SHOW CREDENTIALS AFTER CREATION */}
        {credentials ? (
          <>
            <motion.h1
              className="text-2xl font-black mb-6 text-[#1e266d] text-center"
            >
              Tatami Login Credentials
            </motion.h1>

           <p className="text-center text-sm mb-4 text-slate-600">
              Each tatami has a unique password. Save them securely.
            </p>

            <div className="space-y-3">
              {credentials.tatamis.map((t) => (
                <div
                  key={t.number}
                  className="flex flex-col bg-white/70 rounded-xl p-3 shadow-sm"
                >
                  <span className="font-semibold">Tatami {t.number}</span>
                  <span className="text-[#3f4191] font-bold">
                    Username: {t.username}
                  </span>
                  <span className="text-[#3f4191] font-bold">
                    Password: {t.password}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-center text-red-500">
              ⚠️ Save these credentials. Passwords will not be shown again.
            </p>

            <motion.button
              onClick={() => setCredentials(null)}
              className="mt-6 w-full bg-[#3f4191] text-white py-2 rounded-xl"
            >
              Back
            </motion.button>
          </>
        ) : (
        <>
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-black mb-8 text-[#1e266d] text-center tracking-wide"
        >
          Add Tatamis
        </motion.h1>

        {/* Tournament Dropdown */}
        <motion.select
          value={selectedTournament}
          onChange={(e) => setSelectedTournament(e.target.value)}
          whileFocus={{ scale: 1.02 }}
          className="w-full border border-slate-300 rounded-2xl p-4 text-lg text-slate-700 mb-6
                     focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 
                     transition-all duration-300 shadow-sm"
        >
          <option value="">Select Tournament</option>
          {Array.isArray(tournaments) &&
            tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </motion.select>
           


        {/* Input */}
        <motion.input
          type="text"
          value={no_of_tatamis}
          onChange={handleChange}
          placeholder="Enter number of new tatamis"
          whileFocus={{ scale: 1.02 }}
          className="w-full border border-slate-300 rounded-2xl p-4 text-lg text-slate-700 placeholder-slate-400 
                     focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 
                     transition-all duration-300 shadow-sm"
        />

        {/* Display */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-slate-600 text-center text-lg"
        >
          New Tatamis to add:{" "}
          <span className="font-bold text-[#3f4191]">
            {no_of_tatamis || "0"}
          </span>
        </motion.p>

        {/* Button */}
        <motion.button
          onClick={handleConfirm}
          disabled={loading}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 18,
          }}
          className="mt-8 w-full bg-[#3f4191] hover:bg-[#2e3b7e] text-white font-black py-3 rounded-2xl shadow-lg shadow-indigo-200 uppercase tracking-wider"
        >
          {loading ? "Creating..." : "Confirm"}
        </motion.button>
      </>
        )}
      </motion.div>


      {/* ============================================================
          EXISTING TATAMIS
      ============================================================ */}

      {selectedTournament && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mt-8"
        >

          <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/70 shadow-xl p-8">

            <div className="flex items-center justify-between mb-6">

              <div>
                <h2 className="text-2xl font-black text-[#1e266d]">
                  Tatamis
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Tatamis created for this tournament
                </p>
              </div>

              <div className="bg-indigo-50 text-[#3f4191] px-4 py-2 rounded-xl font-black">
                {tatamis.length}
              </div>

            </div>


            {loadingTatamis ? (

              <div className="py-10 text-center text-slate-500">
                Loading Tatamis...
              </div>

            ) : tatamis.length === 0 ? (

              <div className="py-10 text-center bg-slate-50 rounded-2xl">

                <p className="font-bold text-slate-500">
                  No Tatamis created for this tournament.
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Create Tatamis using the form above.
                </p>

              </div>

            ) : (

              <div className="space-y-3">

                {tatamis.map((tatami) => (

                  <motion.div
                    key={tatami.id}
                    initial={{
                      opacity: 0,
                      x: -10,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-5 transition-all"
                  >

                    <div className="flex items-center gap-4">

                      <div className="w-12 h-12 rounded-xl bg-[#3f4191] text-white flex items-center justify-center font-black text-lg">
                        {tatami.number}
                      </div>

                      <div>

                        <h3 className="font-black text-[#1e266d]">
                          Tatami {tatami.number}
                        </h3>

                        <p className="text-sm text-slate-500">
                          Username:{" "}
                          <span className="font-bold text-slate-700">
                            {tatami.username}
                          </span>
                        </p>

                      </div>

                    </div>


                    <div className="flex items-center gap-3">

                      <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest">
                        Active
                      </span>

                      <button
                        onClick={() =>
                          handleDeleteTatami(tatami)
                        }
                        className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-black text-sm transition-all"
                      >
                        Delete
                      </button>

                    </div>

                  </motion.div>

                ))}

              </div>

            )}

          </div>

        </motion.div>
      )}

    </div>
  </div>
  );
};

export default TatamiPage;
