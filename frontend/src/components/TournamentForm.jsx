import React, { useEffect, useRef, useState } from "react";import { motion } from "framer-motion";
import {
  Upload,
  MapPin,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Trash2,
} from "lucide-react";
import {
  createTournament,
  getAllTournaments,
  deleteTournament,
} from "../api/tournaments";
import { useNavigate } from "react-router-dom";

const TournamentForm = () => {
  const navigate = useNavigate();

  // 🔹 form ref (NO UI EFFECT)
  const formRef = useRef(null);

  // 🔹 upload refs
  const logoInputRef = useRef(null);
  const brochureInputRef = useRef(null);

  // 🔹 file state ONLY
  const [logo, setLogo] = useState(null);
  const [brochure, setBrochure] = useState(null);

  const [tournaments, setTournaments] = useState([]);
const [loadingTournaments, setLoadingTournaments] = useState(false);
const [deletingTournament, setDeletingTournament] = useState(null);

const loadTournaments = async () => {
  try {
    setLoadingTournaments(true);

    const data = await getAllTournaments();

    setTournaments(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Failed to load tournaments:", err);
    setTournaments([]);
  } finally {
    setLoadingTournaments(false);
  }
};

useEffect(() => {
  loadTournaments();
}, []);

  // 🔹 submit handler (backend bridge only)
 const handleSubmit = async () => {
  try {
    const formData = new FormData(formRef.current);

    // DEBUG
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    await createTournament(formData);

    alert("Tournament created successfully");

    // Refresh tournament list
    await loadTournaments();

    // Reset form
    formRef.current.reset();
    setLogo(null);
    setBrochure(null);

  } catch (err) {
    console.error(err);
    alert("Tournament creation failed");
  }
};

const handleDeleteTournament = async (tournamentId, tournamentName) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${tournamentName}"?`
  );

  if (!confirmed) return;

  try {
    setDeletingTournament(tournamentId);

    await deleteTournament(tournamentId);

    setTournaments((prev) =>
      prev.filter((tournament) => tournament.id !== tournamentId)
    );

    alert("Tournament deleted successfully");

  } catch (err) {
    console.error("Failed to delete tournament:", err);

    alert(
      err?.response?.data?.message ||
      "Failed to delete tournament"
    );
  } finally {
    setDeletingTournament(null);
  }
};

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-300 p-4 md:p-8">
    <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
      <div className="font-sans text-slate-700 flex justify-center items-center">
        <motion.div
          initial="hidden"
          animate="visible"
          className="w-full max-w-4xl bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl shadow-slate-400/30 overflow-hidden"
        >
          {/* HEADER */}
          <div className="p-8 border-b border-white/20">
            <motion.h1 className="text-3xl font-black text-[#1e266d]">
              Create Tournament
            </motion.h1>
            <motion.p className="text-slate-500 text-sm mt-2 font-medium">
              Please fill in the tournament details below.
            </motion.p>
          </div>

          {/* BODY */}
          <div className="p-8 space-y-8">
            {/* LOGO UPLOAD */}
            <motion.div
              className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-white/20 transition-all cursor-pointer"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="bg-white/80 p-4 rounded-2xl shadow-sm mb-4"
              >
                <Upload className="text-[#3f4191]" size={28} />
              </motion.div>

              <p className="text-sm text-slate-500 mb-2 text-center font-medium">
                Drag and Drop tournament logo or{" "}
                <span className="text-[#3f4191] font-bold underline">browse</span>
              </p>

              <motion.button
                type="button"
                onClick={() => logoInputRef.current.click()}
                className="bg-[#3f4191] text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg"
              >
                Upload Logo / Banner
              </motion.button>

              {logo && (
                <p className="mt-3 text-xs text-slate-600 font-medium">
                  Selected: {logo.name}
                </p>
              )}
            </motion.div>

            {/* FORM GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">
                  Tournament Name
                </label>
                <input
                  name="name"
                  className="w-full bg-white/40 border-b-2 border-slate-200 py-3 outline-none text-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">
                  Level
                </label>
                <div className="relative">
                  <select
                    name="level"
                    className="w-full bg-white/40 border border-slate-200 rounded-2xl p-4 appearance-none font-medium"
                  >
                    <option value="">Select Level</option>
                    <option value="Inter-club">Inter-club</option>
                    <option value="State">State</option>
                    <option value="National">National</option>
                    <option value="International">International</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-5 text-slate-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">
                  Venue Location
                </label>
                <div className="relative">
                  <input
                    name="venue"
                    className="w-full bg-white/40 border border-slate-200 rounded-2xl p-4 pl-12 font-medium"
                  />
                  <MapPin className="absolute left-4 top-5 text-[#3f4191]" size={20} />
                </div>
              </div>

              {/* START */}
              <div className="space-y-4 bg-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-[#3f4191]">
                  <Calendar size={16} />
                  <span className="text-[10px] font-black uppercase">Start Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" name="startDate" className="bg-white/50 rounded-xl p-3 text-xs" />
                  <input type="time" name="startTime" className="bg-white/50 rounded-xl p-3 text-xs" />
                </div>
              </div>

              {/* END */}
              <div className="space-y-4 bg-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-[#3f4191]">
                  <Clock size={16} />
                  <span className="text-[10px] font-black uppercase">End Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" name="endDate" className="bg-white/50 rounded-xl p-3 text-xs" />
                  <input type="time" name="endTime" className="bg-white/50 rounded-xl p-3 text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">
                  Registration Opens
                </label>
                <input
                  type="datetime-local"
                  name="registrationOpen"
                  className="w-full bg-white/40 rounded-2xl p-4"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">
                  Registration Closes
                </label>
                <input
                  type="datetime-local"
                  name="registrationClose"
                  className="w-full bg-white/40 rounded-2xl p-4"
                />
              </div>

              {/* BROCHURE */}
              <div className="md:col-span-2">
                <motion.button
                  type="button"
                  onClick={() => brochureInputRef.current.click()}
                  className="flex items-center gap-2 text-[#3f4191] bg-white/30 px-6 py-4 rounded-2xl text-sm font-bold"
                >
                  <Upload size={18} />
                  Brochure (PDF)
                </motion.button>

                {brochure && (
                  <p className="mt-2 text-xs text-slate-600 font-medium">
                    Selected: {brochure.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-8 border-t border-white/20 flex justify-end bg-white/20">
            <motion.button
              type="button"
              onClick={handleSubmit}
              className="bg-[#3f4191] text-white px-12 py-4 rounded-2xl text-sm font-black uppercase tracking-widest"
            >
              Create
              <ChevronRight size={18} />
            </motion.button>
          </div>

          {/* HIDDEN FILE INPUTS */}
          <input
            type="file"
            name="logo"
            accept="image/*"
            ref={logoInputRef}
            style={{ display: "none" }}
            onChange={(e) => setLogo(e.target.files[0])}
          />
          <input
            type="file"
            name="brochure"
            accept=".pdf"
            ref={brochureInputRef}
            style={{ display: "none" }}
            onChange={(e) => setBrochure(e.target.files[0])}
          />
        </motion.div>
      </div>
    </form>
    <div className="w-full max-w-4xl mx-auto mt-10 pb-10">

  <h2 className="text-2xl font-black text-[#1e266d] mb-6">
    Created Tournaments
  </h2>

  {loadingTournaments ? (
    <div className="bg-white rounded-2xl p-8 text-center shadow">
      Loading tournaments...
    </div>
  ) : tournaments.length === 0 ? (
    <div className="bg-white rounded-2xl p-8 text-center shadow">
      No tournaments created yet.
    </div>
  ) : (
    <div className="space-y-5">

      {tournaments.map((tournament) => (

        <div
          key={tournament.id}
          className="bg-white rounded-2xl shadow-md p-6"
        >

          <div className="flex justify-between items-center mb-5">

            <div>
              <h3 className="text-xl font-bold text-[#1e266d]">
                {tournament.name}
              </h3>

              <p className="text-sm text-gray-500">
                {tournament.level || "Level not specified"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                handleDeleteTournament(
                  tournament.id,
                  tournament.name
                )
              }
              disabled={deletingTournament === tournament.id}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-sm"
            >
              <Trash2 size={16} />

              {deletingTournament === tournament.id
                ? "Deleting..."
                : "Delete"}
            </button>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold">
                VENUE
              </p>
              <p className="font-semibold">
                {tournament.venue || "-"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold">
                LEVEL
              </p>
              <p className="font-semibold">
                {tournament.level || "-"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold">
                START DATE
              </p>
              <p className="font-semibold">
                {tournament.startDate
                  ? new Date(
                      tournament.startDate
                    ).toLocaleDateString()
                  : "-"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold">
                END DATE
              </p>
              <p className="font-semibold">
                {tournament.endDate
                  ? new Date(
                      tournament.endDate
                    ).toLocaleDateString()
                  : "-"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold">
                REGISTRATION OPENS
              </p>
              <p className="font-semibold">
                {tournament.registrationOpen
                  ? new Date(
                      tournament.registrationOpen
                    ).toLocaleString()
                  : "-"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold">
                REGISTRATION CLOSES
              </p>
              <p className="font-semibold">
                {tournament.registrationClose
                  ? new Date(
                      tournament.registrationClose
                    ).toLocaleString()
                  : "-"}
              </p>
            </div>

          </div>

        </div>

      ))}

    </div>
  )}

</div>
</div>
  );
};

export default TournamentForm;
