import { create } from 'zustand';

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
  try {
    const savedMode = localStorage.getItem('theme-mode');
    const useSystemTheme = localStorage.getItem('use-system-theme') === 'true';

    if (useSystemTheme) {
      return getSystemTheme();
    }

    return savedMode || 'light';
  } catch {
    return 'light';
  }
};

// Initialize accent color
const initializeAccentColor = () => {
  try {
    const savedColor = localStorage.getItem('accent-color');
    return savedColor ? JSON.parse(savedColor) : null;
  } catch {
    return null;
  }
};

// Initialize accessibility settings
const initializeAccessibilitySettings = () => {
  try {
    const saved = localStorage.getItem('accessibility-settings');
    return saved ? JSON.parse(saved) : {
      highContrast: false,
      largeText: false,
      textScale: 1.0,
      colorBlindSupport: null, // null, 'deuteranopia', 'protanopia', 'tritanopia'
      magnification: 1.0,
      reducedMotion: false,
      fontFamily: 'default', // 'default', 'dyslexic', 'high-legibility'
    };
  } catch {
    return {
      highContrast: false,
      largeText: false,
      textScale: 1.0,
      colorBlindSupport: null,
      magnification: 1.0,
      reducedMotion: false,
      fontFamily: 'default',
    };
  }
};

export const useThemeStore = create((set, get) => ({
  mode: initializeThemeMode(),
  useSystemTheme: (() => {
    try {
      return localStorage.getItem('use-system-theme') === 'true';
    } catch {
      return false;
    }
  })(),
  accentColor: initializeAccentColor(),
  accessibility: initializeAccessibilitySettings(),

  toggleTheme: () => set((state) => {
    const newMode = state.mode === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('theme-mode', newMode);
      // Disable system theme when manually toggling
      localStorage.setItem('use-system-theme', 'false');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    return { mode: newMode, useSystemTheme: false };
  }),

  setMode: (mode) => {
    try {
      localStorage.setItem('theme-mode', mode);
      localStorage.setItem('use-system-theme', 'false');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    set({ mode, useSystemTheme: false });
  },

  // Accessibility settings
  updateAccessibilitySetting: (key, value) => set((state) => {
    const newAccessibility = { ...state.accessibility, [key]: value };
    try {
      localStorage.setItem('accessibility-settings', JSON.stringify(newAccessibility));
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
    };
    try {
      localStorage.setItem('accessibility-settings', JSON.stringify(defaultSettings));
    } catch (error) {
      console.error('Failed to reset accessibility settings:', error);
    }
    set({ accessibility: defaultSettings });
  },

  setUseSystemTheme: (useSystem) => {
    try {
      localStorage.setItem('use-system-theme', useSystem.toString());
      if (useSystem) {
        const systemMode = getSystemTheme();
        localStorage.setItem('theme-mode', systemMode);
        set({ useSystemTheme: useSystem, mode: systemMode });
      } else {
        set({ useSystemTheme: useSystem });
      }
    } catch (error) {
      console.error('Failed to save system theme preference:', error);
    }
  },

  setAccentColor: (color) => {
    try {
      if (color) {
        localStorage.setItem('accent-color', JSON.stringify(color));
      } else {
        localStorage.removeItem('accent-color');
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
          localStorage.setItem('theme-mode', newMode);
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
