import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import ViewReferee from "./ViewReferee";

export default function ViewParticipantsLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <DashboardSidebar active="View Referee" />

      {/* Page Content */}
      <div className="ml-64 w-full">
        <ViewReferee />
      </div>
    </div>
  );
}
