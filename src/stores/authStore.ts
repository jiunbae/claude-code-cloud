'use client';

import { create } from 'zustand';
import type { PublicUser } from '@/types/auth';

interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authChecked: boolean;
  isCheckingAuth: boolean; // Prevents race condition during initial auth check

  // Actions
  setUser: (user: PublicUser | null) => void;
  setLoading: (loading: boolean) => void;
  setCheckingAuth: (checking: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authChecked: false,
  isCheckingAuth: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      authChecked: true,
      isCheckingAuth: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setCheckingAuth: (checking) => set({ isCheckingAuth: checking }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authChecked: true,
      isCheckingAuth: false,
    }),
}));
