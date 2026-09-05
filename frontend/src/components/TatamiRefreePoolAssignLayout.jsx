import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import AssignmentForm from "./TatamiRefreePoolAssign";

export default function TatamiRefereePoolAssignLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <DashboardSidebar active="Tatami & Referee Assign" />

      {/* Page Content */}
      <div className="ml-64 w-full">
        <AssignmentForm />
      </div>
    </div>
  );
}
