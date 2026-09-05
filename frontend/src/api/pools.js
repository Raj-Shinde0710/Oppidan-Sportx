import axios from "axios";

/* ---------- FETCH GENERATED POOLS ---------- */
export async function getPoolData(tournamentId) {
  const response = await axios.get(
    `http://localhost:3000/api/tournaments/${tournamentId}/pools`
  );
  return response.data;
}

/* ---------- TRIGGER AI POOL GENERATION ---------- */
export async function generatePools(tournamentId) {
  const response = await axios.post(
    `http://localhost:3000/api/tournaments/${tournamentId}/pools/generate`
  );
  return response.data;
}
