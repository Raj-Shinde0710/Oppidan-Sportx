import axios from 'axios';

const API = 'http://localhost:3000/api';

export const getPlayers = () =>
  axios.get(`${API}/players`).then(res => res.data);

export const createPlayer = (data) =>
  axios.post(`${API}/players`, data).then(res => res.data);

export const getAllPlayers = async () => {
  const res = await axios.get("http://localhost:3000/api/players");
  return res.data;
};