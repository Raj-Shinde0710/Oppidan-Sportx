import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import KaratePolicyForm from "./KaratePolicy";

export default function KaratePolicyLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <DashboardSidebar active="Create Karate Policy" />

      {/* Page Content */}
      <div className="ml-64 w-full">
        <KaratePolicyForm />
      </div>
    </div>
  );
}
