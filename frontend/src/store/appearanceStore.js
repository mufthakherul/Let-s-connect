import { create } from 'zustand';

// Font options
const FONT_FAMILIES = {
  default: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  roboto: "'Roboto', sans-serif",
  openSans: "'Open Sans', sans-serif",
  lato: "'Lato', sans-serif",
  montserrat: "'Montserrat', sans-serif",
  poppins: "'Poppins', sans-serif",
  nunito: "'Nunito', sans-serif",
  raleway: "'Raleway', sans-serif",
  ubuntu: "'Ubuntu', sans-serif",
  playfair: "'Playfair Display', serif"
};

// Navbar icon styles
const NAVBAR_ICON_STYLES = {
  outlined: 'outlined',
  filled: 'filled',
  rounded: 'rounded',
  sharp: 'sharp',
  twoTone: 'two-tone'
};

// Background animation options
const BACKGROUND_ANIMATIONS = {
  none: 'none',
  particles: 'particles',
  waves: 'waves',
  gradient: 'gradient',
  geometric: 'geometric',
  floating: 'floating',
  constellation: 'constellation',
  aurora: 'aurora'
};

// Theme presets
const THEME_PRESETS = {
  default: { name: 'Default', primary: '#1976d2', secondary: '#dc004e', background: 'default' },
  ocean: { name: 'Ocean', primary: '#006994', secondary: '#0097A7', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  sunset: { name: 'Sunset', primary: '#FF6B6B', secondary: '#FFE66D', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  forest: { name: 'Forest', primary: '#2d5016', secondary: '#88ab75', background: 'linear-gradient(135deg, #0f9b0f 0%, #00693e 100%)' },
  midnight: { name: 'Midnight', primary: '#191970', secondary: '#4B0082', background: 'linear-gradient(135deg, #2c3e50 0%, #000428 100%)' },
  cherry: { name: 'Cherry Blossom', primary: '#FF69B4', secondary: '#FFB6C1', background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  arctic: { name: 'Arctic', primary: '#00CED1', secondary: '#4682B4', background: 'linear-gradient(135deg, #e0e5ec 0%, #a8d8ea 100%)' },
  autumn: { name: 'Autumn', primary: '#D2691E', secondary: '#FF8C00', background: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)' },
  lavender: { name: 'Lavender', primary: '#9370DB', secondary: '#BA55D3', background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  emerald: { name: 'Emerald', primary: '#50C878', secondary: '#2E8B57', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }
};

// Default appearance settings
const DEFAULT_APPEARANCE = {
  // Theme
  theme: 'default',
  customColors: null,
  
  // Typography
  fontFamily: 'default',
  fontSize: 14,
  fontWeight: 400,
  fontStyle: 'normal',
  lineHeight: 1.5,
  letterSpacing: 'normal',
  textShadow: 'none',
  
  // Navbar
  navbarIconStyle: 'outlined',
  navbarPosition: 'top',
  navbarIconSize: 24,
  navbarCompact: false,
  
  // Animations
  backgroundAnimation: 'none',
  pageTransitions: true,
  hoverEffects: true,
  scrollAnimations: true,
  loadingAnimation: 'circular',
  
  // Effects
  backgroundGradient: null,
  cardShadow: 2,
  borderRadius: 12,
  glassEffect: false,
  blur: 0,
  
  // Auto-scroll
  autoScroll: false,
  scrollSpeed: 1,
  scrollDirection: 'down',
  pauseOnHover: true
};

// Load saved appearance from localStorage
const loadSavedAppearance = () => {
  try {
    const saved = localStorage.getItem('appearance-settings');
    if (saved) {
      return { ...DEFAULT_APPEARANCE, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load appearance settings:', error);
  }
  return DEFAULT_APPEARANCE;
};

// Appearance store
export const useAppearanceStore = create((set, get) => ({
  ...loadSavedAppearance(),
  
  // Update any appearance setting
  updateSetting: (key, value) => {
    const newState = { [key]: value };
    set(newState);
    
    // Save to localStorage
    const currentState = { ...get(), ...newState };
    try {
      localStorage.setItem('appearance-settings', JSON.stringify(currentState));
    } catch (error) {
      console.error('Failed to save appearance settings:', error);
    }
  },
  
  // Apply theme preset
  applyThemePreset: (presetName) => {
    const preset = THEME_PRESETS[presetName];
    if (preset) {
      set({
        theme: presetName,
        customColors: {
          primary: preset.primary,
          secondary: preset.secondary
        }
      });
      get().saveSettings();
    }
  },
  
  // Apply custom theme
  applyCustomTheme: (colors) => {
    set({
      theme: 'custom',
      customColors: colors
    });
    get().saveSettings();
  },
  
  // Reset to defaults
  resetAppearance: () => {
    set(DEFAULT_APPEARANCE);
    try {
      localStorage.setItem('appearance-settings', JSON.stringify(DEFAULT_APPEARANCE));
    } catch (error) {
      console.error('Failed to reset appearance settings:', error);
    }
  },
  
  // Export settings
  exportSettings: () => {
    const settings = get();
    return JSON.stringify(settings, null, 2);
  },
  
  // Import settings
  importSettings: (settingsJson) => {
    try {
      const settings = JSON.parse(settingsJson);
      set({ ...DEFAULT_APPEARANCE, ...settings });
      get().saveSettings();
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  },
  
  // Save current settings
  saveSettings: () => {
    const currentState = get();
    try {
      localStorage.setItem('appearance-settings', JSON.stringify(currentState));
    } catch (error) {
      console.error('Failed to save appearance settings:', error);
    }
  },
  
  // Toggle auto-scroll
  toggleAutoScroll: () => {
    set((state) => {
      const newAutoScroll = !state.autoScroll;
      const newState = { autoScroll: newAutoScroll };
      try {
        const currentState = { ...state, ...newState };
        localStorage.setItem('appearance-settings', JSON.stringify(currentState));
      } catch (error) {
        console.error('Failed to save auto-scroll setting:', error);
      }
      return newState;
    });
  }
}));

// Export constants for use in components
export { FONT_FAMILIES, NAVBAR_ICON_STYLES, BACKGROUND_ANIMATIONS, THEME_PRESETS };
