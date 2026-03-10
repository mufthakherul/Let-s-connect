import { create } from 'zustand';
import { getJSON, getString, setJSON, setString, removeItem } from '../utils/storage';

export const useAuthStore = create((set, get) => ({
  user: getJSON('user', null),
  token: getString('token', null),
  setUser: (user) => {
    if (user) {
      setJSON('user', user);
    } else {
      removeItem('user');
    }
    set({ user });
  },
  setToken: (token) => {
    if (token) {
      setString('token', token);
    } else {
      removeItem('token');
    }
    set({ token });
  },
  logout: () => {
    removeItem('token');
    removeItem('user');
    set({ user: null, token: null });
  },
  isAuthenticated: () => {
    const state = get();
    return !!(state.token && state.user);
  }
}));
