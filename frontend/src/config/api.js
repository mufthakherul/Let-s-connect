// Centralized API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const MESSAGING_SERVICE_URL = process.env.REACT_APP_MESSAGING_URL || 'http://localhost:8003';
const MEDIA_SERVICE_URL = process.env.REACT_APP_MEDIA_URL || 'http://localhost:8005';

// Normalize URLs (remove trailing slashes)
export const config = {
  API_BASE_URL: API_BASE_URL.replace(/\/+$/, ''),
  MESSAGING_SERVICE_URL: MESSAGING_SERVICE_URL.replace(/\/+$/, ''),
  MEDIA_SERVICE_URL: MEDIA_SERVICE_URL.replace(/\/+$/, ''),
};

export default config;
