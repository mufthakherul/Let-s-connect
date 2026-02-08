import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  mode: (() => {
    try {
      return localStorage.getItem('theme-mode') || 'light';
    } catch {
      return 'light';
    }
  })(),
  toggleTheme: () => set((state) => {
    const newMode = state.mode === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('theme-mode', newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    return { mode: newMode };
  }),
  setMode: (mode) => {
    try {
      localStorage.setItem('theme-mode', mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    set({ mode });
  }
}));
