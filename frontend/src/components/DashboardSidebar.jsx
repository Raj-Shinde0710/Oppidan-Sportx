import { useNavigate } from "react-router-dom";

export default function DashboardSidebar({ active }) {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Dashboard", path: "/" },
    { label: "Create Tournament", path: "/create-tournament" },
    { label: "Applied Tournaments", path: "/applied-tournament" },
    { label: "Create Karate Policy", path: "/create-karate-policy" },
    { label: "View Participants", path: "/view-participants" },
    { label: "View Referee", path: "/view-referee" },
    { label: "Create Tatami", path: "/create-tatami" },
    { label: "Tatami & Referee Assign", path: "/tatami-referee-assign" },
    { label: "Pool Generation", path: "/pool-generation" },
    { label: "Match Scheduling", path: "/match-scheduling" },
    { label: "View Results", path: "/view-results" },
    { label: "Generate IDs", path:"/generate-id"},
  ];

  return (
    <aside className="w-64 bg-[#0a1f44] text-white fixed h-screen flex flex-col pointer-events-none">
      <div className="px-6 py-5 border-b border-white/10 pointer-events-auto">
        <h2 className="text-lg font-semibold">Organizer Dashboard</h2>
      </div>

      <nav className="flex-1 py-4 text-[13px] pointer-events-auto">
        {menuItems.map((item, i) => (
          <div
            key={i}
            onClick={() => item.path && navigate(item.path)}
            className={`px-6 py-2 cursor-pointer transition-all duration-200
              ${
                active === item.label
                  ? "bg-[#1e3a8a] text-[#93c5fd]"
                  : "hover:bg-[#1e3a8a] hover:text-[#93c5fd]"
              }`}
          >
            {item.label}
          </div>
        ))}
      </nav>
    </aside>
  );
}
