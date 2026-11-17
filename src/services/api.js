import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Attach JWT token to outgoing requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('ac_token') || localStorage.getItem('ac_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired/invalid tokens globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const hasToken = localStorage.getItem('ac_token') || sessionStorage.getItem('ac_token');
      if (hasToken && !error.config.url?.includes('/auth/login')) {
        localStorage.removeItem('ac_token');
        sessionStorage.removeItem('ac_token');
        window.dispatchEvent(new CustomEvent('ac:auth-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
