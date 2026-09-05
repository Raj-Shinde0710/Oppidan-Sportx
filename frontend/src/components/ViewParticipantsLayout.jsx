import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import ViewParticipants from "./ViewParticipants";

export default function ViewParticipantsLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <DashboardSidebar active="View Participants" />

      {/* Page Content */}
      <div className="ml-64 w-full">
        <ViewParticipants />
      </div>
    </div>
  );
}
