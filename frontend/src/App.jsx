import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminDashboard from "./components/AdminDashboard";
import CreateTournamentLayout from "./components/CreateTournamentLayout";
import KaratePolicyLayout from "./components/KaratePolicyLayout";
import AppliedTournamentLayout from "./components/AppliedTournamentLayout";
import ViewParticipantsLayout from "./components/ViewParticipantsLayout";
import ViewRefereeLayout from "./components/ViewRefereeLayout";
import CreateTatamiLayout from "./components/CreateTatamiLayout";
import TatamiRefereePoolAssignLayout from "./components/TatamiRefreePoolAssignLayout";
import PoolGenerationLayout from "./components/PoolGenerationLayout";
import MatchSchedulingLayout from "./components/MatchSchedulingLayout";
import ViewResults from "./components/ViewResults";
import TournamentDetails from "./pages/TournamentDetails";
import KaratePolicy from "./components/KaratePolicy";
import GenerateID from "./components/GenerateID";
import TatamiLogin from "./pages/TatamiLogin";
import TatamiProtectedRoute from "./components/TatamiProtectedRoute";
import TatamiDashboardShell from "./components/TatamiDashboardShell";
import TatamiMatchControl from "./pages/TatamiMatchControl";
import TatamiExternalDisplay from "./pages/TatamiExternalDisplay";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/create-tournament" element={<CreateTournamentLayout />} />

        {/* ✅ FIXED ROUTE */}
        <Route path="/create-karate-policy" element={<KaratePolicyLayout> <KaratePolicy /> </KaratePolicyLayout>}/>
        <Route path="/applied-tournament" element={<AppliedTournamentLayout />} />
        <Route path="/view-participants" element={<ViewParticipantsLayout />} />
        <Route path="/view-referee" element={<ViewRefereeLayout />} />
        <Route path="/create-tatami" element={<CreateTatamiLayout />} />
        <Route path="/tatami-referee-assign" element={<TatamiRefereePoolAssignLayout />} />
        <Route path="/pool-generation" element={<PoolGenerationLayout />} />
        <Route path="/match-scheduling" element={<MatchSchedulingLayout />} />
        <Route path="/view-results" element={<ViewResults />} />
        <Route path="/tournament/:id" element={<TournamentDetails />} />
        <Route path="/generate-id" element={<GenerateID/>}/>

        {/* 🥋 TATAMI ARENA ROUTES */}
        <Route path="/tatami/login" element={<TatamiLogin />} />
        <Route
          path="/tatami/dashboard"
          element={
            <TatamiProtectedRoute>
              <TatamiDashboardShell />
            </TatamiProtectedRoute>
          }
        />
        <Route
          path="/tatami/matches/:matchId"
          element={
            <TatamiProtectedRoute>
              <TatamiMatchControl />
            </TatamiProtectedRoute>
          }
        />
        <Route
          path="/tatami/matches/:matchId/display"
          element={
            <TatamiProtectedRoute>
              <TatamiExternalDisplay />
            </TatamiProtectedRoute>
          }
        />
        {/* 📺 PERSISTENT TATAMI-LEVEL EXTERNAL DISPLAY */}
        <Route
          path="/tatami/display/:tatamiId"
          element={
            <TatamiProtectedRoute>
              <TatamiExternalDisplay />
            </TatamiProtectedRoute>
          }
        />
        <Route
          path="/tatami/display"
          element={
            <TatamiProtectedRoute>
              <TatamiExternalDisplay />
            </TatamiProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

  