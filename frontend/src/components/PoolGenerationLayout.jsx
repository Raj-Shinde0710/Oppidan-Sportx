import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import PoolGeneration from "./PoolGeneration";

export default function PoolGenerationLayout() {
  return (
    <div className="flex">
      <DashboardSidebar active="Pool Generation" />

      <div className="flex-1">
        <PoolGeneration />
      </div>
    </div>
  );
}
