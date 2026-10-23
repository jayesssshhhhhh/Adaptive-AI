import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/token', formData);
  },
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

export const quizService = {
  generate: (data) => api.post('/quiz/generate', data),
  submit: (result) => api.post('/quiz/submit', result),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/quiz/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getExplanation: (params) => api.get('/quiz/explanation', { params }),
  getSummary: (attemptId) => api.get(`/quiz/summary/${attemptId}`),
  getHistory: () => api.get('/quiz/history'),
  getAttempt: (attemptId) => api.get(`/quiz/attempt/${attemptId}`),
};

export const tutorService = {
  chat: (message, history, fileContext = null) => api.post('/tutor/chat', { message, history, file_context: fileContext }),
};

export const profileService = {
  getProfile: () => api.get('/profile/'),
  getStats: () => api.get('/profile/stats'),
  getKnowledgeMap: () => api.get('/profile/knowledge-map'),
  getRecommendations: () => api.get('/profile/recommendations'),
  generateStudyMaterial: (data) => api.post('/profile/study-material', data),
  getStudyHistory: (limit = 3, offset = 0) => api.get('/profile/study-history', { params: { limit, offset } }),
};
