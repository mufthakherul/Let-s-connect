import { create } from 'zustand';
import { getBoolean, getJSON, getString, removeItem, setBoolean, setJSON, setString } from '../utils/storage';

// Default accent colors for each theme
const DEFAULT_ACCENT_COLORS = {
  light: {
    primary: '#1976d2',
    secondary: '#dc004e',
  },
  dark: {
    primary: '#90caf9',
    secondary: '#f48fb1',
  },
};

// Detect system theme preference
const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Initialize theme mode
const initializeThemeMode = () => {
  const savedMode = getString('theme-mode', null);
  const useSystemTheme = getBoolean('use-system-theme', false);

  if (useSystemTheme) {
    return getSystemTheme();
  }

  return savedMode || 'light';
};

// Initialize accent color
const initializeAccentColor = () => {
  return getJSON('accent-color', null);
};

// Initialize accessibility settings
const initializeAccessibilitySettings = () => {
  const defaults = {
    highContrast: false,
    largeText: false,
    textScale: 1.0,
    colorBlindSupport: null,
    magnification: 1.0,
    reducedMotion: false,
    fontFamily: 'default',
    glassmorphism: false,
  };

  const saved = getJSON('accessibility-settings', null);
  return saved ? { ...defaults, ...saved } : defaults;
};

export const useThemeStore = create((set, get) => ({
  mode: initializeThemeMode(),
  useSystemTheme: getBoolean('use-system-theme', false),
  accentColor: initializeAccentColor(),
  accessibility: initializeAccessibilitySettings(),

  toggleTheme: () => set((state) => {
    const newMode = state.mode === 'light' ? 'dark' : 'light';
    try {
      setString('theme-mode', newMode);
      // Disable system theme when manually toggling
      setBoolean('use-system-theme', false);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    return { mode: newMode, useSystemTheme: false };
  }),

  setMode: (mode) => {
    try {
      setString('theme-mode', mode);
      setBoolean('use-system-theme', false);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    set({ mode, useSystemTheme: false });
  },

  // Accessibility settings
  updateAccessibilitySetting: (key, value) => set((state) => {
    const newAccessibility = { ...state.accessibility, [key]: value };
    try {
      setJSON('accessibility-settings', newAccessibility);
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
    return { accessibility: newAccessibility };
  }),

  resetAccessibilitySettings: () => {
    const defaultSettings = {
      highContrast: false,
      largeText: false,
      textScale: 1.0,
      colorBlindSupport: null,
      magnification: 1.0,
      reducedMotion: false,
      fontFamily: 'default',
      glassmorphism: false,
    };
    try {
      setJSON('accessibility-settings', defaultSettings);
    } catch (error) {
      console.error('Failed to reset accessibility settings:', error);
    }
    set({ accessibility: defaultSettings });
  },
  setUseSystemTheme: (useSystem) => {
    try {
      setBoolean('use-system-theme', useSystem);
      if (useSystem) {
        const systemMode = getSystemTheme();
        setString('theme-mode', systemMode);
        set({ useSystemTheme: useSystem, mode: systemMode });
      } else {
        set({ useSystemTheme: useSystem });
      }
    } catch (error) {
      console.error('Failed to save system theme preference:', error);
    }
  },

  toggleGlassmorphism: () => set((state) => {
    // Glass mode has been retired in favor of standard design system surfaces.
    // Keep this action for backward compatibility, but always force false.
    const newAccessibility = { ...state.accessibility, glassmorphism: false };
    try {
      setJSON('accessibility-settings', newAccessibility);
    } catch (error) {
      console.error('Failed to save glassmorphism preference:', error);
    }
    return { accessibility: newAccessibility };
  }),

  setAccentColor: (color) => {
    try {
      if (color) {
        setJSON('accent-color', color);
      } else {
        removeItem('accent-color');
      }
    } catch (error) {
      console.error('Failed to save accent color:', error);
    }
    set({ accentColor: color });
  },

  getAccentColor: () => {
    const state = get();
    return state.accentColor || DEFAULT_ACCENT_COLORS[state.mode];
  },

  // Listen to system theme changes
  initSystemThemeListener: () => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const state = get();
      if (state.useSystemTheme) {
        const newMode = e.matches ? 'dark' : 'light';
        try {
          setString('theme-mode', newMode);
        } catch (error) {
          console.error('Failed to save theme preference:', error);
        }
        set({ mode: newMode });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  },
}));
