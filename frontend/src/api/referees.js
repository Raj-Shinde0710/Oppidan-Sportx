import axios from "axios";

const API_URL = "http://localhost:3000/api/referees";

export const getAllReferees = async () => {
  const res = await axios.get(API_URL);
  return res.data;
};

export const createReferee = async (name) => {
  const res = await axios.post(API_URL, {
    name,
  });

  return res.data;
};

export const deleteReferee = async (id) => {
  const res = await axios.delete(`${API_URL}/${id}`);
  return res.data;
};