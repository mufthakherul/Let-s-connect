import axios from 'axios';

const resolveRuntimeApiBase = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const origin = window.location.origin;

  if (origin.includes('.app.github.dev') && origin.includes('-3000')) {
    return origin.replace('-3000.app.github.dev', '-8000.app.github.dev');
  }

  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    try {
      const url = new URL(origin);
      url.port = '8000';
      return url.toString().replace(/\/$/, '');
    } catch (error) {
      return 'http://localhost:8000';
    }
  }

  return origin;
};

const API_BASE_URL = process.env.REACT_APP_API_URL || resolveRuntimeApiBase();
const NORMALIZED_API_BASE_URL = API_BASE_URL.replace(/\/+$/, '');
const API_BASE_PATH = NORMALIZED_API_BASE_URL.endsWith('/api')
  ? NORMALIZED_API_BASE_URL
  : `${NORMALIZED_API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_PATH,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
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

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Export API URLs for direct fetch usage
export const getApiUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${NORMALIZED_API_BASE_URL}${cleanPath}`;
};

export const getApiBaseUrl = () => NORMALIZED_API_BASE_URL;

export default api;
