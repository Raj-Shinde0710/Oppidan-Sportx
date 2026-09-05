import React, { useEffect, useState } from "react";
import {
  getAllReferees,
  createReferee,
  deleteReferee,
} from "../api/referees";

export default function RefereeView() {
  const [search, setSearch] = useState("");
  const [referees, setReferees] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [refereeName, setRefereeName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ============================================
  // LOAD REFEREES FROM DATABASE
  // ============================================
  const loadReferees = async () => {
    try {
      setLoading(true);

      const data = await getAllReferees();

      setReferees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load referees:", error);

      alert(
        error?.response?.data?.message ||
          "Failed to load referees"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // LOAD ON PAGE OPEN
  // ============================================
  useEffect(() => {
    loadReferees();
  }, []);

  // ============================================
  // ADD REFEREE
  // ============================================
  const handleAddReferee = async (e) => {
    e.preventDefault();

    const name = refereeName.trim();

    if (!name) {
      alert("Please enter referee name.");
      return;
    }

    try {
      setSaving(true);

      await createReferee(name);

      setRefereeName("");
      setShowAddForm(false);

      await loadReferees();

      alert("Referee added successfully.");
    } catch (error) {
      console.error("Failed to add referee:", error);

      alert(
        error?.response?.data?.message ||
          "Failed to add referee"
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // DELETE REFEREE
  // ============================================
  const handleDeleteReferee = async (id, name) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete referee "${name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      await deleteReferee(id);

      setReferees((prev) =>
        prev.filter((referee) => referee.id !== id)
      );

      alert("Referee deleted successfully.");
    } catch (error) {
      console.error("Failed to delete referee:", error);

      alert(
        error?.response?.data?.message ||
          "Failed to delete referee"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================
  // SEARCH
  // ============================================
  const filteredReferees = referees.filter((referee) =>
    referee.name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* ========================================
          HEADER
      ======================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">

        {/* Search */}
        <input
          type="text"
          placeholder="Search referee by name"
          className="border border-gray-300 rounded-lg p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full md:w-1/2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Add Referee Button */}
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold shadow-sm transition-colors"
        >
          + Add Referee
        </button>
      </div>

      {/* ========================================
          ADD REFEREE FORM
      ======================================== */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">

          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold text-blue-950">
              Add New Referee
            </h2>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setRefereeName("");
              }}
              className="text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleAddReferee}>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Referee Name
              </label>

              <input
                type="text"
                placeholder="Enter referee full name"
                value={refereeName}
                onChange={(e) =>
                  setRefereeName(e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            </div>

            <div className="flex gap-3">

              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-5 py-2.5 rounded-lg font-semibold"
              >
                {saving ? "Adding..." : "Add Referee"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setRefereeName("");
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-semibold"
              >
                Cancel
              </button>

            </div>

          </form>
        </div>
      )}

      {/* ========================================
          REFEREE TABLE
      ======================================== */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">

        <table className="min-w-full divide-y divide-gray-200">

          <thead className="bg-blue-950 text-white">
            <tr>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Full Name
              </th>

              <th className="px-4 py-3 text-center text-sm font-semibold">
                Action
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">

            {/* Loading */}
            {loading && (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Loading referees...
                </td>
              </tr>
            )}

            {/* Referees */}
            {!loading &&
              filteredReferees.map((referee) => (
                <tr
                  key={referee.id}
                  className="hover:bg-gray-100 transition-colors duration-200"
                >

                  <td className="px-4 py-3 font-medium">
                    {referee.name}
                  </td>

                  <td className="px-4 py-3 text-center">

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteReferee(
                          referee.id,
                          referee.name
                        )
                      }
                      disabled={deletingId === referee.id}
                      className="bg-red-100 hover:bg-red-200 disabled:bg-gray-200 text-red-600 px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      {deletingId === referee.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>

                  </td>

                </tr>
              ))}

            {/* No referees */}
            {!loading &&
              filteredReferees.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {search
                      ? "No referees found"
                      : "No referees have been added yet"}
                  </td>
                </tr>
              )}

          </tbody>

        </table>

      </div>

    </div>
  );
}