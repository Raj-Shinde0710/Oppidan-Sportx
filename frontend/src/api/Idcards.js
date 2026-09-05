import axios from "axios";

const API = "http://localhost:3000/api";

export const getIdCardsByTournament = (tournamentId) =>
  axios.get(`${API}/id-cards/tournament/${tournamentId}`).then(res => res.data);
