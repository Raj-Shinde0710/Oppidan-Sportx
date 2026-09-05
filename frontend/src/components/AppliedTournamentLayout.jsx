import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import AppliedTournament from "./AppliedTournament.jsx";

export default function AppliedTournamentLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <DashboardSidebar active="Applied Tournaments" />

      {/* Page Content */}
      <div className="ml-64 w-full">
        <AppliedTournament />
      </div>
    </div>
  );
}
