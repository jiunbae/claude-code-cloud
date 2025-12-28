'use client';

import { create } from 'zustand';
import type { UserSettings, GlobalSettings } from '@/types/settings';

// User Settings Store
interface UserSettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSettings: (settings: UserSettings | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useUserSettingsStore = create<UserSettingsState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  setSettings: (settings) => set({ settings, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ settings: null, isLoading: false, error: null }),
}));

// Global Settings Store (Admin)
interface GlobalSettingsState {
  settings: GlobalSettings | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSettings: (settings: GlobalSettings | null, lastUpdated?: Date | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useGlobalSettingsStore = create<GlobalSettingsState>((set) => ({
  settings: null,
  lastUpdated: null,
  isLoading: false,
  error: null,

  setSettings: (settings, lastUpdated = null) => set({ settings, lastUpdated, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ settings: null, lastUpdated: null, isLoading: false, error: null }),
}));
