import { create } from 'zustand';
import { api, User } from '@/lib/api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(email, password);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      return false;
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.register(email, password, name);
      const loginSuccess = await get().login(email, password);
      return loginSuccess;
    } catch (err: unknown) {
      const error = err as { message?: string };
      set({
        error: error.message || 'Registration failed',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.logout();
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  fetchUser: async () => {
    if (!get().isHydrated) {
      return;
    }

    set({ isLoading: true });
    try {
      const response = await api.getMe();
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
