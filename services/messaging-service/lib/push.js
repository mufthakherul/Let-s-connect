'use strict';

/**
 * VAPID / Web Push setup. Loaded once; Node's module cache ensures
 * a single initialisation shared across server.js and route modules.
 */
const webpush = require('web-push');

const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || '').trim();

function looksLikePlaceholder(value = '') {
  const normalized = String(value).trim().toLowerCase();
  return !normalized || normalized === 'dummy' || normalized.includes('placeholder');
}

let pushNotificationsEnabled = false;

if (!looksLikePlaceholder(VAPID_PUBLIC_KEY) && !looksLikePlaceholder(VAPID_PRIVATE_KEY)) {
  try {
    webpush.setVapidDetails(
      'mailto:support@milonexa.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    pushNotificationsEnabled = true;
  } catch (error) {
    console.warn('[Push] Invalid VAPID configuration. Push notifications disabled.');
    console.warn(`[Push] ${error.message}`);
  }
} else {
  console.warn('[Push] VAPID keys missing/placeholder. Push notifications disabled.');
}

module.exports = { pushNotificationsEnabled, webpush, VAPID_PUBLIC_KEY };
