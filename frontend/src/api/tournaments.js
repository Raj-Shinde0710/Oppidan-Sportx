import axios from 'axios';

const API = 'http://localhost:3000/api';

export const getTournaments = () =>
  axios.get(`${API}/tournaments`).then(res => res.data);

export const createTournament = async (formData) => {
  const res = await fetch("http://localhost:3000/api/tournaments", {
    method: "POST",
    body: formData,          // ✅ FormData (NOT JSON)
    credentials: "include",  // if using auth cookies
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create tournament");
  }

  return res.json();
};
export const getAllTournaments = async () => {
  const res = await axios.get("http://localhost:3000/api/tournaments");
  return res.data;
};


export const getTournamentById = (id) =>
  axios.get(`${API}/tournaments/${id}`).then(res => res.data);

export const generatePools = async (tournamentId) => {
  const res = await axios.post(
    `http://localhost:3000/api/tournaments/${tournamentId}/generate-pools`
  );
  return res.data;
};

export const deleteTournament = async (id) => {
  const res = await axios.delete(`${API}/tournaments/${id}`);
  return res.data;
};