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

// ============================================================
// TATAMI AUTHENTICATION & SESSION STORAGE
// ============================================================

const TATAMI_TOKEN_KEY = "tatami_access_token";
const TATAMI_USER_KEY = "tatami_user";

export const getTatamiToken = () => {
  return localStorage.getItem(TATAMI_TOKEN_KEY) || null;
};

export const getTatamiUser = () => {
  try {
    const raw = localStorage.getItem(TATAMI_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setTatamiSession = (token, tatamiUser) => {
  if (token) {
    localStorage.setItem(TATAMI_TOKEN_KEY, token);
  }
  if (tatamiUser) {
    localStorage.setItem(TATAMI_USER_KEY, JSON.stringify(tatamiUser));
  }
};

export const clearTatamiSession = () => {
  localStorage.removeItem(TATAMI_TOKEN_KEY);
  localStorage.removeItem(TATAMI_USER_KEY);

  // Clear Tatami-specific cached context without touching organizer/admin keys
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("tatami_last_cat_") ||
          key.startsWith("tatami_last_pool_") ||
          key.startsWith("tatami_live_state_") ||
          key.startsWith("tatami_shuffle_"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // Non-fatal if localStorage iteration is restricted
  }
};

export const isTatamiAuthenticated = () => {
  const token = getTatamiToken();
  if (!token) return false;

  // Validate JWT expiration safely
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      clearTatamiSession();
      return false;
    }
    return payload.role === "TATAMI";
  } catch {
    return Boolean(token);
  }
};

// ============================================================
// TATAMI LOGIN, RESET PASSWORD & DASHBOARD API CALLS
// ============================================================

export const tatamiLogin = async (username, password, tournamentId) => {
  // Clear any existing Tatami session before attempting login
  clearTatamiSession();

  const payload = {
    username: username?.trim(),
    password,
  };
  if (tournamentId) {
    payload.tournamentId = tournamentId;
  }

  const res = await axios.post(`${BASE_URL}/login`, payload, {
    headers: {
      Authorization: undefined,
    },
  });

  return res.data;
};

export const resetTatamiPassword = async (tatamiId, newPassword) => {
  const payload = newPassword ? { newPassword: newPassword.trim() } : {};
  const res = await axios.post(`${BASE_URL}/${tatamiId}/reset-password`, payload);
  return res.data;
};

export const getTatamiDashboard = async () => {
  const token = getTatamiToken();
  const res = await axios.get(`${BASE_URL}/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

// ============================================================
// TATAMI MATCH CONTROL APIS
// ============================================================

export const getTatamiMatch = async (matchId) => {
  const token = getTatamiToken();
  const res = await axios.get(`${BASE_URL}/matches/${matchId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const startTatamiMatch = async (matchId, durationSeconds) => {
  const token = getTatamiToken();
  const res = await axios.post(
    `${BASE_URL}/matches/${matchId}/start`,
    { durationSeconds: Number(durationSeconds) },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const updateTatamiScore = async (matchId, payload) => {
  const token = getTatamiToken();
  const res = await axios.post(`${BASE_URL}/matches/${matchId}/score`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const submitTatamiResult = async (matchId, winnerId) => {
  const token = getTatamiToken();
  const res = await axios.post(
    `${BASE_URL}/matches/${matchId}/result`,
    { winnerId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const rematchTatamiMatch = async (matchId) => {
  const token = getTatamiToken();
  const res = await axios.post(
    `${BASE_URL}/matches/${matchId}/rematch`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};
