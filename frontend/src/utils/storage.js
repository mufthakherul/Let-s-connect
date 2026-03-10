/**
 * Safe localStorage helpers.
 * Workstream B2: Enhanced centralized persistence utilities for frontend stores
 * Adds: key registry, expiration support, storage size tracking, and event listeners
 */

// Storage key registry for better organization and type safety
export const STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  AUTH_2FA_ENABLED: 'auth_2fa',
  
  // Theme & Appearance
  THEME_MODE: 'theme_mode',
  THEME_ACCENT: 'theme_accent',
  APPEARANCE_SETTINGS: 'appearance',
  ACCESSIBILITY_SETTINGS: 'accessibility',
  
  // User Preferences
  FEED_PREFERENCES: 'feed_prefs',
  NOTIFICATION_PREFERENCES: 'notification_prefs',
  LANGUAGE: 'language',
  
  // Session
  LAST_ROUTE: 'last_route',
  SESSION_ID: 'session_id',
  
  // Cache
  SEARCH_HISTORY: 'search_history',
  RECENT_ITEMS: 'recent_items',
  DRAFT_CONTENT: 'draft_content',
};

const canUseStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

export const getString = (key, fallback = null) => {
  if (!canUseStorage()) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

export const setString = (key, value) => {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const getBoolean = (key, fallback = false) => {
  const value = getString(key, null);
  if (value === null) return fallback;
  return value === 'true';
};

export const setBoolean = (key, value) => setString(key, value ? 'true' : 'false');

export const getJSON = (key, fallback = null) => {
  const value = getString(key, null);
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    
    // Check expiration if present
    if (parsed && typeof parsed === 'object' && parsed.__expires) {
      if (Date.now() > parsed.__expires) {
        removeItem(key);
        return fallback;
      }
      return parsed.value;
    }
    
    return parsed;
  } catch {
    return fallback;
  }
};

export const setJSON = (key, value, expiresInMs = null) => {
  try {
    let item = value;
    
    // Add expiration wrapper if needed
    if (expiresInMs) {
      item = {
        value,
        __expires: Date.now() + expiresInMs,
      };
    }
    
    return setString(key, JSON.stringify(item));
  } catch {
    return false;
  }
};

export const removeItem = (key) => {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

/**
 * Clear all localStorage items (Workstream B2 addition)
 */
export const clearAll = () => {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.clear();
    return true;
  } catch {
    return false;
  }
};

/**
 * Get storage size in bytes (Workstream B2 addition)
 */
export const getStorageSize = () => {
  if (!canUseStorage()) return { bytes: 0, readable: '0 B' };
  
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      total += (key?.length || 0) + (value?.length || 0);
    }
    
    const units = ['B', 'KB', 'MB'];
    let size = total;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return {
      bytes: total,
      readable: `${size.toFixed(2)} ${units[unitIndex]}`,
    };
  } catch {
    return { bytes: 0, readable: '0 B' };
  }
};

/**
 * Create a storage change listener (Workstream B2 addition)
 * Useful for syncing state across tabs
 */
export const createStorageListener = (key, callback) => {
  const handleStorageChange = (event) => {
    if (event.key === key) {
      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : null;
        callback(newValue);
      } catch {
        callback(event.newValue);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

// Export default object for convenient imports
export default {
  keys: STORAGE_KEYS,
  getString,
  setString,
  getBoolean,
  setBoolean,
  getJSON,
  setJSON,
  removeItem,
  clearAll,
  getStorageSize,
  createListener: createStorageListener,
};
