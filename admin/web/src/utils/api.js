import axios from 'axios';

const resolveRuntimeApiBase = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const origin = window.location.origin;

  // In development we prefer to rely on a relative path; a proxy configured in
  // `setupProxy.js` will forward requests to the backend.  This avoids CORS
  // problems in Codespaces or other remote dev environments.  If someone has
  // explicitly set REACT_APP_API_URL we still respect that, but the default
  // dev behaviour is to return an empty string so axios uses `/api`.
  if (process.env.NODE_ENV === 'development') {
    return '';
  }

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

let API_BASE_URL = process.env.REACT_APP_API_URL || resolveRuntimeApiBase();
// in development we don't want to use an absolute URL even if someone set
// REACT_APP_API_URL (the template often does).  stick with relative paths and
// rely on the proxy we configured above.
if (process.env.NODE_ENV === 'development') {
  API_BASE_URL = '';
}
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
    // include admin secret if provided (for admin panel running on separate port)
    if (process.env.REACT_APP_ADMIN_SECRET) {
      config.headers['x-admin-secret'] = process.env.REACT_APP_ADMIN_SECRET;
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

    // Provide a hint for rate-limit errors so the UI can handle gracefully or
    // developers aren't surprised by uncaught rejections.
    if (status === 429) {
      // eslint-disable-next-line no-console
      console.warn('[API] rate limit hit for', reqId);
      // we still reject so calling code can catch it, but it won't spam the
      // console as an error; our global handler already prints `console.error`
      // so we preemptively log at warning level.
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
