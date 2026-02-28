import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, senha: string) =>
    api.post('/auth/login', { email, senha }),
  
  register: (nome: string, email: string, senha: string) =>
    api.post('/auth/register', { nome, email, senha }),
};

// Songs API
export const songsAPI = {
  getAll: () => api.get('/songs'),
  getById: (id: string) => api.get(`/songs/${id}`),
  toggleFavorite: (id: string) => api.post(`/songs/${id}/favorite`),
  delete: (id: string) => api.delete(`/songs/${id}`),
  download: (id: string) => `${API_URL}/download/${id}?token=${useAuthStore.getState().token}`,
};

// Convert API
export const convertAPI = {
  convert: (url: string, enableStems: boolean) =>
    api.post('/convert', { url, enableStems }),
  getStatus: (id: string) => api.get(`/history/${id}/status`),
};

// Stems API
export const stemsAPI = {
  getBySongId: (songId: string) => api.get(`/songs/${songId}/stems`),
  updateVolume: (stemId: string, volume: number) =>
    api.patch(`/stems/${stemId}/volume`, { volume }),
};

// History API
export const historyAPI = {
  getAll: () => api.get('/history'),
  delete: (id: string) => api.delete(`/history/${id}`),
};

// Stats API
export const statsAPI = {
  getStats: () => api.get('/stats'),
};
