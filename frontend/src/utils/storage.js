/**
 * Safe localStorage helpers.
 * Workstream B baseline: centralized persistence utilities for frontend stores.
 */

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
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const setJSON = (key, value) => {
  try {
    return setString(key, JSON.stringify(value));
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
