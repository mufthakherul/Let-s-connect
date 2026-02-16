import axios from 'axios';

const resolveRuntimeApiBase = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const origin = window.location.origin;

  if (process.env.NODE_ENV === 'production') {
    return origin;
  }

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

// Debug: show resolved API base (development only)
if (process.env.NODE_ENV === 'development') {
  try {
    console.info('[API] resolved base:', API_BASE_URL, 'apiPath:', API_BASE_PATH);
  } catch (e) {
    /* no-op in non-browser environments */
  }
}

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
    const status = error.response?.status;
    const reqId = `${error.config?.method || 'UNKNOWN'} ${error.config?.url || ''}`;

    // In development, log failing requests for easier debugging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[API] response error (${status}) for ${reqId}`, error?.response?.data || error.message);
    }

    // If the request explicitly opted-out of automatic auth-redirects, skip redirect behavior
    try {
      const cfg = error.config || {};
      const skipFlag = cfg.skipAuthRedirect || (cfg.headers && cfg.headers['X-Skip-Auth-Redirect']);
      if (skipFlag) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.debug('[API] skipping automatic auth-redirect for request (skipAuthRedirect flag)');
        }
        return Promise.reject(error);
      }
    } catch (ex) {
      // swallow
    }

    // Allow a short grace period after login/register where a transient 401
    // (race-condition between auth state propagation and background requests)
    // should not immediately kick the user back to the login screen.
    try {
      const suppressUntil = Number(window.__suppressAuthRedirectUntil || 0);
      if (status === 401 && Date.now() < suppressUntil) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.debug('[API] suppressed automatic redirect-to-login (grace period active)');
        }
        return Promise.reject(error);
      }
    } catch (ex) {
      // ignore errors reading the suppression flag
    }

    if (status === 401) {
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
