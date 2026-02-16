import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './utils/pwa';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA support only in production and not in Codespaces preview
if (process.env.NODE_ENV === 'production' && !window.location.origin.includes('.app.github.dev')) {
  registerServiceWorker();
} else {
  // Skip service worker during development and Codespaces preview to avoid proxy/CORS issues
  console.info('[PWA] service worker registration skipped (dev or Codespaces)');
}

// Global error hook to surface uncaught errors (helps in production debugging)
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error || e.message, e);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason || e);
});
