import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isTatamiAuthenticated } from "../api/tatami";

export default function TatamiProtectedRoute({ children }) {
  const location = useLocation();
  const authenticated = isTatamiAuthenticated();

  if (!authenticated) {
    return <Navigate to="/tatami/login" state={{ from: location }} replace />;
  }

  return children;
}
