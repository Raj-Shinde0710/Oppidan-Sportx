import axios from "axios";

const BASE_URL = "http://localhost:3000/api/assignment";

// Fetch tatami + referee count
export const getAssignmentStats = (tournamentId) => {
  return axios.get(`${BASE_URL}/stats?tournamentId=${tournamentId}`);
};

// Save assignment config
export const saveAssignmentConfig = (tournamentId, totalPools) => {
  return axios.post(`${BASE_URL}/configure`, {
    tournamentId,
    totalPools,
  });
};
