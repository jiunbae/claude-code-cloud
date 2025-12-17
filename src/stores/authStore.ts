'use client';

import { create } from 'zustand';
import type { PublicUser } from '@/types/auth';

interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authChecked: boolean;

  // Actions
  setUser: (user: PublicUser | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthChecked: (checked: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authChecked: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      authChecked: true,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setAuthChecked: (checked) => set({ authChecked: checked }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authChecked: true,
    }),
}));
