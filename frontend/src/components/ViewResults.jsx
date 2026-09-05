import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";

const sampleResults = [
  { country: "India", state: "Maharashtra", club: "Shivaji Karate Academy", gold: 8, silver: 5, bronze: 3 },
  { country: "India", state: "Haryana", club: "Rohtak Warriors", gold: 6, silver: 4, bronze: 6 },
  { country: "India", state: "Tamil Nadu", club: "Chennai Fighters", gold: 7, silver: 3, bronze: 2 },
  { country: "India", state: "Gujarat", club: "Ahmedabad Dojo", gold: 5, silver: 6, bronze: 4 },
  { country: "India", state: "Delhi", club: "Capital Combat Club", gold: 6, silver: 3, bronze: 3 },
  { country: "India", state: "Karnataka", club: "Bangalore Budokai", gold: 4, silver: 7, bronze: 5 },
  { country: "India", state: "Kerala", club: "Malabar Martial Arts", gold: 5, silver: 2, bronze: 6 },
  { country: "India", state: "Punjab", club: "Ludhiana Lions", gold: 3, silver: 5, bronze: 7 },
  { country: "India", state: "Rajasthan", club: "Jaipur Warriors", gold: 4, silver: 4, bronze: 4 },
  { country: "India", state: "Uttar Pradesh", club: "Lucknow Champs", gold: 6, silver: 2, bronze: 1 },
  { country: "Japan", state: "Tokyo", club: "Tokyo Shotokan", gold: 9, silver: 2, bronze: 1 },
  { country: "Japan", state: "Osaka", club: "Osaka Karate Club", gold: 7, silver: 4, bronze: 2 },
  { country: "South Korea", state: "Seoul", club: "Seoul Tigers", gold: 8, silver: 3, bronze: 2 },
  { country: "Iran", state: "Tehran", club: "Persian Fighters", gold: 6, silver: 5, bronze: 3 },
  { country: "Turkey", state: "Istanbul", club: "Anatolia Dojo", gold: 5, silver: 5, bronze: 5 },
  { country: "France", state: "Paris", club: "Paris Combat", gold: 4, silver: 6, bronze: 2 },
  { country: "Italy", state: "Rome", club: "Roman Gladiators", gold: 3, silver: 4, bronze: 6 },
  { country: "Spain", state: "Madrid", club: "Madrid Martial Club", gold: 4, silver: 3, bronze: 5 },
  { country: "Germany", state: "Berlin", club: "Berlin Bushido", gold: 2, silver: 6, bronze: 7 },
  { country: "USA", state: "California", club: "LA Karate Center", gold: 5, silver: 4, bronze: 3 }
];

const ViewResults = () => {
  const [search, setSearch] = useState("");

  const sortedResults = useMemo(() => {
    return [...sampleResults]
      .map((r) => ({
        ...r,
        total: r.gold + r.silver + r.bronze
      }))
      .filter(
        (r) =>
          r.country.toLowerCase().includes(search.toLowerCase()) ||
          r.state.toLowerCase().includes(search.toLowerCase()) ||
          r.club.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        return b.bronze - a.bronze;
      });
  }, [search]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Tournament Results</h1>
        <p className="text-slate-500">Medal tally sorted by performance</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow mb-6 max-w-md">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search country, state or club..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full outline-none text-slate-700"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full border-collapse">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-left">State</th>
              <th className="px-4 py-3 text-left">Club</th>
              <th className="px-4 py-3 text-center">🥇 Gold</th>
              <th className="px-4 py-3 text-center">🥈 Silver</th>
              <th className="px-4 py-3 text-center">🥉 Bronze</th>
              <th className="px-4 py-3 text-center">Total</th>
            </tr>
          </thead>

          <tbody>
            {sortedResults.map((r, index) => (
              <tr
                key={index}
                className="border-b hover:bg-slate-50 transition"
              >
                <td className="px-4 py-3 font-semibold">{index + 1}</td>
                <td className="px-4 py-3">{r.country}</td>
                <td className="px-4 py-3">{r.state}</td>
                <td className="px-4 py-3 font-medium">{r.club}</td>
                <td className="px-4 py-3 text-center text-yellow-600 font-semibold">{r.gold}</td>
                <td className="px-4 py-3 text-center text-slate-500 font-semibold">{r.silver}</td>
                <td className="px-4 py-3 text-center text-amber-700 font-semibold">{r.bronze}</td>
                <td className="px-4 py-3 text-center font-bold">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewResults;