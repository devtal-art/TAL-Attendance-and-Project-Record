import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Login is OFF unless VITE_AUTH_ENABLED=true at build time. Must match the
// server's AUTH_ENABLED setting.
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

const TOKEN_KEY = 'tal_auth_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable - session will just not persist across reloads
  }
};

// Called by AuthContext when any API call comes back 401 (expired/invalid
// token) so the app can drop the session and send the user to /login.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

// Every service module uses the default axios instance, so these global
// interceptors cover all API calls.
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = error.config?.url?.endsWith('/auth/login');
    if (error.response?.status === 401 && !isLoginCall) {
      setToken(null);
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export const loginRequest = async (username, password) => {
  const { data } = await axios.post(`${API_URL}/auth/login`, { username, password });
  return data;
};

export const fetchMe = async () => {
  const { data } = await axios.get(`${API_URL}/auth/me`);
  return data.user;
};

// Downloads a file from an authenticated endpoint (a plain <a href> can't
// send the Authorization header).
export const downloadFile = async (url) => {
  const response = await axios.get(url, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : 'download.xlsx';

  const blobUrl = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
};
