import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import MatchScheduling from "./MatchScheduling";

export default function MatchSchedulingLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <DashboardSidebar active="Match Scheduling" />

      {/* Page Content */}
      <div className="ml-64 w-full">
        <MatchScheduling />
      </div>
    </div>
  );
}
