import axios from 'axios';

let token: string | null = null;

export function setToken(newToken: string | null) {
  token = newToken;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
});

api.interceptors.request.use((config) => {
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }
  return config;
});
