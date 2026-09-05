import { useEffect, useState } from "react";
import {
  getAllTournaments,
  getTournamentById,
} from "../api/tournaments";

export default function AppliedTournament() {
  const [tournaments, setTournaments] = useState([]);

  const [selectedTournament, setSelectedTournament] =
    useState(null);

  const [participants, setParticipants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] =
    useState(false);

  const [search, setSearch] = useState("");

  // ============================================
  // LOAD ALL TOURNAMENTS
  // ============================================
  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);

      const data = await getAllTournaments();

      setTournaments(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Failed to fetch tournaments:",
        error
      );

      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // OPEN TOURNAMENT
  // ============================================
  const handleTournamentClick = async (tournament) => {
    try {
      setSelectedTournament(tournament);
      setParticipants([]);
      setSearch("");
      setLoadingParticipants(true);

      const data = await getTournamentById(
        tournament.id
      );

      setParticipants(
        Array.isArray(data?.players)
          ? data.players
          : []
      );
    } catch (error) {
      console.error(
        "Failed to fetch tournament participants:",
        error
      );

      alert(
        "Failed to load participants for this tournament."
      );
    } finally {
      setLoadingParticipants(false);
    }
  };

  // ============================================
  // CLOSE PARTICIPANT VIEW
  // ============================================
  const handleBack = () => {
    setSelectedTournament(null);
    setParticipants([]);
    setSearch("");
  };

  // ============================================
  // FORMAT DATE
  // ============================================
  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-IN"
    );
  };

  // ============================================
  // FORMAT AGE
  // ============================================
  const calculateAge = (dob) => {
    if (!dob) return "-";

    const birthDate = new Date(dob);
    const today = new Date();

    let age =
      today.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < birthDate.getDate()
      )
    ) {
      age--;
    }

    return age;
  };

  // ============================================
  // SEARCH PARTICIPANTS
  // ============================================
  const filteredParticipants =
    participants.filter((player) => {
      const searchValue =
        search.toLowerCase().trim();

      if (!searchValue) return true;

      const profile = player.profile || {};

      return (
        player.name
          ?.toLowerCase()
          .includes(searchValue) ||

        profile.club
          ?.toLowerCase()
          .includes(searchValue) ||

        profile.branch
          ?.toLowerCase()
          .includes(searchValue) ||

        profile.email
          ?.toLowerCase()
          .includes(searchValue) ||

        profile.phone
          ?.toLowerCase()
          .includes(searchValue)
      );
    });

  // ============================================
  // PARTICIPANT DETAILS VIEW
  // ============================================
  if (selectedTournament) {
    return (
      <div className="p-5 bg-gray-50 min-h-screen">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">

          <div>
            <button
              onClick={handleBack}
              className="text-blue-600 hover:text-blue-800 font-semibold mb-2"
            >
              ← Back to Tournaments
            </button>

            <h1 className="text-[28px] font-semibold text-slate-800">
              {selectedTournament.name}
            </h1>

            <p className="text-gray-500 mt-1">
              {selectedTournament.level} •{" "}
              {selectedTournament.venue}
            </p>
          </div>

          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
            Participants: {participants.length}
          </div>

        </div>

        {/* TOURNAMENT DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">
              VENUE
            </p>

            <p className="text-lg font-semibold">
              {selectedTournament.venue || "-"}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">
              START DATE
            </p>

            <p className="text-lg font-semibold">
              {formatDate(
                selectedTournament.startDate
              )}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-500 font-semibold">
              END DATE
            </p>

            <p className="text-lg font-semibold">
              {formatDate(
                selectedTournament.endDate
              )}
            </p>
          </div>

        </div>

        {/* SEARCH */}
        <div className="bg-white rounded-xl shadow p-4 mb-5">

          <input
            type="text"
            placeholder="Search participant by name, club, branch, email or phone"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

        </div>

        {/* PARTICIPANTS TABLE */}
        <div className="overflow-x-auto bg-white rounded-xl shadow">

          <table className="min-w-[1400px] w-full">

            <thead className="bg-blue-950 text-white">

              <tr>

                <th className="px-4 py-3 text-left">
                  Name
                </th>

                <th className="px-4 py-3 text-left">
                  DOB
                </th>

                <th className="px-4 py-3 text-left">
                  Age
                </th>

                <th className="px-4 py-3 text-left">
                  Gender
                </th>

                <th className="px-4 py-3 text-left">
                  Weight (kg)
                </th>

                <th className="px-4 py-3 text-left">
                  Belt
                </th>

                <th className="px-4 py-3 text-left">
                  Club
                </th>

                <th className="px-4 py-3 text-left">
                  Branch
                </th>

                <th className="px-4 py-3 text-left">
                  Email ID
                </th>

                <th className="px-4 py-3 text-left">
                  Phone
                </th>

                <th className="px-4 py-3 text-left">
                  State
                </th>

                <th className="px-4 py-3 text-left">
                  City
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-200">

              {loadingParticipants && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Loading participants...
                  </td>
                </tr>
              )}

              {!loadingParticipants &&
                filteredParticipants.map(
                  (player) => {

                    const profile =
                      player.profile || {};

                    return (
                      <tr
                        key={player.id}
                        className="hover:bg-gray-50"
                      >

                        <td className="px-4 py-3 font-medium">
                          {player.name || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(player.dob)}
                        </td>

                        <td className="px-4 py-3">
                          {calculateAge(player.dob)}
                        </td>

                        <td className="px-4 py-3">
                          {player.gender || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {player.weight != null
                            ? String(player.weight)
                            : "-"}
                        </td>

                        <td className="px-4 py-3">
                          {player.belt || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {profile.club || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {profile.branch || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {profile.email || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {profile.phone || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {profile.state || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {profile.city || "-"}
                        </td>

                      </tr>
                    );
                  }
                )}

              {!loadingParticipants &&
                filteredParticipants.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {search
                        ? "No participants match your search."
                        : "No participants registered for this tournament."}
                    </td>
                  </tr>
                )}

            </tbody>

          </table>

        </div>

      </div>
    );
  }

  // ============================================
  // TOURNAMENT LIST VIEW
  // ============================================
  return (
    <div className="p-5 bg-gray-50 min-h-screen">

      <h1 className="mb-5 text-[28px] font-semibold text-slate-800">
        Applied Tournaments
      </h1>

      {loading && (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Loading tournaments...
        </div>
      )}

      {!loading && tournaments.length === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          No tournaments have been created yet.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">

        {!loading &&
          tournaments.map((tournament) => (

            <div
              key={tournament.id}
              className="bg-white rounded-xl shadow-md p-5 hover:shadow-xl transition-all"
            >

              <div className="flex flex-col md:flex-row justify-between gap-4">

                <div>

                  <h2 className="text-xl font-semibold text-slate-800">
                    {tournament.name}
                  </h2>

                  <p className="text-gray-500 mt-1">
                    {tournament.level} •{" "}
                    {tournament.venue}
                  </p>

                  <p className="text-sm text-gray-500 mt-2">
                    {formatDate(
                      tournament.startDate
                    )}{" "}
                    -{" "}
                    {formatDate(
                      tournament.endDate
                    )}
                  </p>

                </div>

                <button
                  onClick={() =>
                    handleTournamentClick(
                      tournament
                    )
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  View Participants →
                </button>

              </div>

            </div>

          ))}

      </div>

    </div>
  );
}