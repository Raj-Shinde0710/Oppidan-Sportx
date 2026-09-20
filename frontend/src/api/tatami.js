import axios from "axios";

const BASE_URL = "http://localhost:3000/api/tatami";

export const createTatamis = (tournamentId, count) => {
  return axios.post(BASE_URL, {
    tournamentId,
    count,
  });
};

export const getTatamisByTournament = (tournamentId) => {
  return axios.get(`${BASE_URL}?tournamentId=${tournamentId}`);
};

export const assignPoolsToTatamis = async (
  tournamentId,
  mode,
  sequence
) => {
  const res = await axios.post(
    "http://localhost:3000/api/tatami/assign-pools",
    {
      tournamentId,
      mode,
      sequence,
    }
  );

  return res.data;
};

export const deleteTatami = async (tatamiId) => {
  const res = await axios.delete(
    `http://localhost:3000/api/tatami/${tatamiId}`
  );

  return res.data;
};

// ============================================================
// MANUAL ASSIGN CATEGORY TO TATAMI
// ============================================================

export const assignCategoryManually = async (
  categoryId,
  tatamiId
) => {
  const res = await axios.post(
    `${BASE_URL}/assign-category`,
    {
      categoryId,
      tatamiId,
    }
  );

  return res.data;
};