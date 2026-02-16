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

// Determine if we should register service worker
const isCodespaces = window.location.origin.includes('.app.github.dev');
const isDevelopment = process.env.NODE_ENV !== 'production';
const shouldRegisterSW = !isCodespaces && !isDevelopment;

console.info('[PWA] Config:', {
  origin: window.location.origin,
  isCodespaces,
  isDevelopment,
  shouldRegisterSW,
  nodeEnv: process.env.NODE_ENV
});

// Register service worker only in production on non-Codespaces environments
if (shouldRegisterSW) {
  console.info('[PWA] Registering service worker...');
  registerServiceWorker();
} else {
  console.info('[PWA] Service worker registration skipped', {
    reason: isCodespaces ? 'Codespaces environment detected' : 'Development mode',
  });
  // Explicitly unregister any existing service workers to prevent CORS issues
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => {
        console.info('[PWA] Unregistering existing service worker');
        reg.unregister();
      });
    }).catch(() => {
      // Silently fail if service workers aren't available
    });
  }
}

// Global error hook to surface uncaught errors (helps in production debugging)
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error || e.message, e);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason || e);
});
