import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData) => api.put('/users/profile', userData),
  changePassword: (passwordData) => api.put('/users/change-password', passwordData),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAccount: (password) => api.delete('/users/account', { data: { password } }),
  getStats: () => api.get('/users/stats'),
};

// Chat API
export const chatAPI = {
  getChats: (params = {}) => api.get('/chats', { params }),
  getChat: (id) => api.get(`/chats/${id}`),
  createChat: (chatData) => api.post('/chats', chatData),
  updateChat: (id, chatData) => api.put(`/chats/${id}`, chatData),
  deleteChat: (id) => api.delete(`/chats/${id}`),
  archiveChat: (id) => api.put(`/chats/${id}/archive`),
  unarchiveChat: (id) => api.put(`/chats/${id}/unarchive`),
  pinChat: (id) => api.put(`/chats/${id}/pin`),
  unpinChat: (id) => api.put(`/chats/${id}/unpin`),
  searchChats: (query, params = {}) => api.get('/chats/search', { 
    params: { q: query, ...params } 
  }),
};

// Message API
export const messageAPI = {
  getMessages: (chatId, params = {}) => api.get(`/messages/chat/${chatId}`, { params }),
  sendMessage: (messageData) => api.post('/messages', messageData),
  sendMultiLLMMessage: (messageData) => api.post('/messages/multi', messageData),
  editMessage: (id, content) => api.put(`/messages/${id}`, { content }),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  addReaction: (id, reaction) => api.post(`/messages/${id}/reaction`, { reaction }),
  removeReaction: (id) => api.delete(`/messages/${id}/reaction`),
  getReactions: (id) => api.get(`/messages/${id}/reactions`),
  getProviders: () => api.get('/messages/providers'),
  getProviderStatus: () => api.get('/messages/providers/status'),
  testProviderConnections: () => api.get('/messages/providers/test'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
