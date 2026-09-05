import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import CreateTatami from "./CreateTatami";

export default function KaratePolicyLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <DashboardSidebar active="Create Tatami" />

      {/* Page Content */}
      <div className="ml-64 w-full">
        <CreateTatami />
      </div>
    </div>
  );
}
