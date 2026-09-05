import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import TournamentForm from "./TournamentForm";

export default function CreateTournamentLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <DashboardSidebar active="Create Tournament" />

      {/* Main Content */}
      <div className="ml-64 w-full">
        <TournamentForm />
      </div>
    </div>
  );
}
