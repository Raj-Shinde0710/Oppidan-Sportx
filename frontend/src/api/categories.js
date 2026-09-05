import axios from "axios";

/**
 * Axios instance
 * (adjust baseURL only if your backend port is different)
 */
const api = axios.create({
  baseURL: "http://localhost:3000/api", // NestJS backend
});

/**
 * ✅ Create category
 * Core logic unchanged
 */
export const createCategory = async (tournamentId, data) => {
  const res = await api.post(
    `/tournaments/${tournamentId}/categories`,
    data
  );
  return res.data;
};

/**
 * ✅ Get categories for a tournament
 * Core logic unchanged
 */
export const getCategories = async (tournamentId) => {
  const res = await api.get(
    `/tournaments/${tournamentId}/categories`
  );
  return res.data;
};

export const updateCategory = async (tournamentId, categoryId, data) => {
  const res = await api.put(
    `/tournaments/${tournamentId}/categories/${categoryId}`,
    data
  );
  return res.data;
};

export const deleteCategory = async (tournamentId, categoryId) => {
  const res = await api.delete(
    `/tournaments/${tournamentId}/categories/${categoryId}`
  );
  return res.data;
};

/**
 * ✅ Add a new category
 * Core logic unchanged
 */
export const addCategory = async (tournamentId, data) => {
  const res = await api.post(
    `/tournaments/${tournamentId}/categories`,
    {
      name: data.name,
      minAge: data.minAge,
      maxAge: data.maxAge,
      minWeight: data.minWeight ?? 0,
      maxWeight: data.maxWeight ?? 0,
      gender: data.gender,          // MALE / FEMALE
      type: data.type,              // KATA / KUMITE
      playersPerPool: data.playersPerPool,
      level: data.level ?? "",
    }
  );

  return res.data;
};
