'use client';

import { create } from 'zustand';
import type { PublicUser } from '@/types/auth';

interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authChecked: boolean;
  isCheckingAuth: boolean; // Prevents race condition during initial auth check
  authDisabled: boolean | null; // null = not yet fetched
  authStatusFetched: boolean;

  // Actions
  setUser: (user: PublicUser | null) => void;
  setLoading: (loading: boolean) => void;
  setCheckingAuth: (checking: boolean) => void;
  setAuthDisabled: (disabled: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authChecked: false,
  isCheckingAuth: false,
  authDisabled: null,
  authStatusFetched: false,

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

  setAuthDisabled: (disabled) =>
    set({
      authDisabled: disabled,
      authStatusFetched: true,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authChecked: true,
      isCheckingAuth: false,
    }),
}));
