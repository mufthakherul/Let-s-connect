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
    localStorage.setItem('theme-mode', newMode);
    return { mode: newMode };
  }),
  setMode: (mode) => {
    localStorage.setItem('theme-mode', mode);
    set({ mode });
  }
}));
