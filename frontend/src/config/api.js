import { getApiBaseUrl } from '../utils/api';

const normalizeUrl = (value) => String(value || '').replace(/\/+$/, '');

const resolveServiceUrl = (overrideUrl, defaultPort) => {
  if (overrideUrl) {
    return normalizeUrl(overrideUrl);
  }

  if (typeof window === 'undefined') {
    return `http://localhost:${defaultPort}`;
  }

  const runtimeApiBase = getApiBaseUrl();
  const candidate = runtimeApiBase || window.location.origin;

  try {
    const resolved = new URL(candidate, window.location.origin);

    // Default dev frontend port is 3000. API gateway is 8000. We derive direct
    // service ports from either one to avoid falling back to the frontend host.
    if (!resolved.port || resolved.port === '3000' || resolved.port === '8000') {
      resolved.port = String(defaultPort);
    }

    return `${resolved.protocol}//${resolved.host}`;
  } catch (error) {
    return `http://localhost:${defaultPort}`;
  }
};

// Centralized API configuration — prefer runtime-resolved base when available.
const RUNTIME_API = (typeof window !== 'undefined' && getApiBaseUrl()) || '';
const API_BASE_URL = RUNTIME_API || process.env.REACT_APP_API_URL || 'http://localhost:8000';
const MESSAGING_SERVICE_URL = resolveServiceUrl(process.env.REACT_APP_MESSAGING_URL, 8003);
const MEDIA_SERVICE_URL = resolveServiceUrl(process.env.REACT_APP_MEDIA_URL, 8005);

// Normalize URLs (remove trailing slashes)
export const config = {
  API_BASE_URL: normalizeUrl(API_BASE_URL),
  MESSAGING_SERVICE_URL: normalizeUrl(MESSAGING_SERVICE_URL),
  MEDIA_SERVICE_URL: normalizeUrl(MEDIA_SERVICE_URL),
};

export default config;
