import logo from "../assets/logo/oppidanlogo-removebg-preview.png";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { getAllTournaments } from "../api/tournaments";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);

  const menuItems = [
    { label: "Dashboard", path: "/" },
    { label: "Create Tournament", path: "/create-tournament" },
    { label: "Applied Tournaments", path: "/applied-tournament" },
    { label: "Create Karate Policy", path: "/create-karate-policy" },
    { label: "View Participants", path: "/view-participants" },
    { label: "View Referee", path: "/view-referee" },
    { label: "Create Tatami", path: "/create-tatami" },
    { label: "Tatami & Referee Assign", path: "/tatami-referee-assign" },
    { label: "Pool Generation ", path: "/pool-generation" },
    { label: "Match Scheduling", path: "/match-scheduling" },
    { label: "View Results", path: "/view-results" },
    { label: "Generate IDs", path: "/generate-id" },
  ];

  useEffect(() => {
  const fetchTournaments = async () => {
    try {
      const data = await getAllTournaments(); // ✅ Uses backend base URL
      setTournaments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch tournaments", err);
      setTournaments([]);
    }
  };

  fetchTournaments();
}, []);

  const totalTournaments = tournaments.length;
  const completedTournaments = tournaments.filter(t => t.status === "CLOSED").length;
  const upcomingTournaments = tournaments.filter(t => t.status !== "CLOSED").length;

  return (
    <div className="min-h-screen flex bg-[#f4f6fb] text-[#1f2937] font-sans">
      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 bg-[#0a1f44] text-white flex flex-col fixed h-screen">
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-semibold">Organizer Dashboard</h2>
        </div>

        <nav className="flex-1 py-4">
          {menuItems.map((item, i) => (
            <div
              key={i}
              onClick={() => item.path && navigate(item.path)}
              className="px-6 py-2 text-[13px] cursor-pointer transition-all duration-200
                         hover:bg-[#1e3a8a] hover:text-[#93c5fd]"
            >
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="ml-64 flex-1 flex flex-col">
        {/* TOP BAR */}
        <header className="h-16 bg-white flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-xl font-semibold">
            Tournament Organizer Dashboard
          </h1>
          <img src={logo} alt="Oppidan" className="h-16 w-auto" />
        </header>

        {/* CONTENT */}
        <main className="p-8">

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

  {/* TOTAL TOURNAMENTS */}
  <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
    <p className="text-sm text-slate-500 mb-4">Total Tournaments</p>
    <div className="relative w-32 h-32 mx-auto rounded-full"
      style={{ background: "conic-gradient(from 180deg, #ec4899 0% 65%, #f1f5f9 65% 100%)" }}>
      <div className="absolute inset-[10px] bg-white rounded-full flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">{totalTournaments}</span>
        <span className="text-[11px] uppercase tracking-widest text-slate-400">Total</span>
      </div>
    </div>
  </div>

  {/* COMPLETED */}
  <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
    <p className="text-sm text-slate-500 mb-4">Completed Tournaments</p>
    <div className="relative w-32 h-32 mx-auto rounded-full"
      style={{ background: "conic-gradient(from 180deg, #6b21a8 0% 35%, #f1f5f9 35% 100%)" }}>
      <div className="absolute inset-[10px] bg-white rounded-full flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">{completedTournaments}</span>
        <span className="text-[11px] uppercase tracking-widest text-slate-400">Done</span>
      </div>
    </div>
  </div>

  {/* UPCOMING */}
  <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
    <p className="text-sm text-slate-500 mb-4">Upcoming Tournaments</p>
    <div className="relative w-32 h-32 mx-auto rounded-full"
      style={{ background: "conic-gradient(from 180deg, #fb923c 0% 50%, #f1f5f9 50% 100%)" }}>
      <div className="absolute inset-[10px] bg-white rounded-full flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">{upcomingTournaments}</span>
        <span className="text-[11px] uppercase tracking-widest text-slate-400">Soon</span>
      </div>
    </div>
  </div>

</div>

          {/* SELECT EVENT */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium mb-2">
              Select Event
            </label>
            <select className="w-full border rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option>Choose...</option>
              {tournaments.map(t => (
                <option key={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

        </main>
      </div>
    </div>
  );
}
