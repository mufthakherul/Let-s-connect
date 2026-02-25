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
const shouldRegisterSW = true; // Enabled for testing push notifications

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
// filter out noisy websocket handshake failures produced by the development
// server when running in Codespaces (404 responses on /ws).  those are
// harmless and just clutter the console.
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (msg.includes('WebSocket connection to') && msg.includes('Unexpected response code: 404')) {
    // ignore dev-server websocket handshake noise
    return;
  }
  console.error('[Global Error]', e.error || msg, e);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason && e.reason.message ? e.reason.message : '';
  if (msg.includes('WebSocket connection to') && msg.includes('Unexpected response code: 404')) {
    return;
  }
  console.error('[Unhandled Rejection]', e.reason || e);
});

// Intercept console warnings/errors to suppress known deprecations and noise
(function () {
  const origWarn = console.warn;
  console.warn = (...args) => {
    const msg = args[0] || '';
    if (typeof msg === 'string') {
      if (msg.includes('motion() is deprecated') ||
        msg.includes('MUI Grid: The `item` prop has been removed') ||
        msg.includes('MUI Grid: The `xs` prop has been removed') ||
        msg.includes('MUI Grid: The `sm` prop has been removed') ||
        msg.includes('MUI Grid: The `md` prop has been removed') ||
        msg.includes('MUI Grid: The `lg` prop has been removed')) {
        return;
      }
    }
    origWarn.apply(console, args);
  };

  const origError = console.error;
  console.error = (...args) => {
    const msg = args[0] || '';
    if (typeof msg === 'string') {
      if (msg.includes('WebSocket connection to') && msg.includes('Unexpected response code: 404')) {
        return;
      }
      if (msg.includes('Request failed with status code 429') || msg.includes('Too Many Requests')) {
        // rate-limit errors are expected in dev (when the backend throttles); they
        // are already surfaced via toast in UI and don't need red console entries.
        return;
      }
    }
    origError.apply(console, args);
  };
})();
