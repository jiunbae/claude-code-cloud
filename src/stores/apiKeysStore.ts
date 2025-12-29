'use client';

import { create } from 'zustand';
import type { ApiKey, ApiKeyProvider } from '@/types/settings';
import type { CredentialMode } from '@/types/auth';

interface ApiKeysState {
  // State
  apiKeys: ApiKey[];
  isLoading: boolean;
  error: string | null;
  credentialMode: CredentialMode;
  isUpdatingMode: boolean;
  filter: ApiKeyProvider | 'all';

  // Actions
  setApiKeys: (keys: ApiKey[]) => void;
  addApiKey: (key: ApiKey) => void;
  removeApiKey: (id: string) => void;
  updateApiKey: (id: string, updates: Partial<ApiKey>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCredentialMode: (mode: CredentialMode) => void;
  setUpdatingMode: (updating: boolean) => void;
  setFilter: (filter: ApiKeyProvider | 'all') => void;
  reset: () => void;

  // Async actions
  fetchApiKeys: () => Promise<void>;
  deleteApiKey: (id: string) => Promise<boolean>;
  toggleApiKeyActive: (id: string, isActive: boolean) => Promise<boolean>;
}

export const useApiKeysStore = create<ApiKeysState>((set, get) => ({
  // Initial state
  apiKeys: [],
  isLoading: false,
  error: null,
  credentialMode: 'global',
  isUpdatingMode: false,
  filter: 'all',

  // Setters
  setApiKeys: (apiKeys) => set({ apiKeys, error: null }),

  addApiKey: (key) => set((state) => ({
    apiKeys: [key, ...state.apiKeys],
    error: null
  })),

  removeApiKey: (id) => set((state) => ({
    apiKeys: state.apiKeys.filter((key) => key.id !== id)
  })),

  updateApiKey: (id, updates) => set((state) => ({
    apiKeys: state.apiKeys.map((key) =>
      key.id === id ? { ...key, ...updates } : key
    )
  })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCredentialMode: (credentialMode) => set({ credentialMode }),
  setUpdatingMode: (isUpdatingMode) => set({ isUpdatingMode }),
  setFilter: (filter) => set({ filter }),

  reset: () => set({
    apiKeys: [],
    isLoading: false,
    error: null,
    credentialMode: 'global',
    isUpdatingMode: false,
    filter: 'all',
  }),

  // Async actions
  fetchApiKeys: async () => {
    const { setLoading, setApiKeys, setError } = get();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings/api-keys', {
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setApiKeys(data.apiKeys || []);
      } else {
        setError(data.error || 'Failed to load API keys');
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  },

  deleteApiKey: async (id: string) => {
    const { removeApiKey, setError } = get();

    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        removeApiKey(id);
        return true;
      } else {
        setError(data.error || 'Failed to delete API key');
        return false;
      }
    } catch (err) {
      console.error('Failed to delete API key:', err);
      setError('Failed to delete API key');
      return false;
    }
  },

  toggleApiKeyActive: async (id: string, isActive: boolean) => {
    const { fetchApiKeys, setError } = get();

    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        // Refetch all keys since activating one may deactivate others
        await fetchApiKeys();
        return true;
      } else {
        setError(data.error || 'Failed to update API key');
        return false;
      }
    } catch (err) {
      console.error('Failed to update API key:', err);
      setError('Failed to update API key');
      return false;
    }
  },
}));

// Selectors
export const selectFilteredApiKeys = (state: ApiKeysState) => {
  if (state.filter === 'all') {
    return state.apiKeys;
  }
  return state.apiKeys.filter((key) => key.provider === state.filter);
};

export const selectKeyCountsByProvider = (state: ApiKeysState) => {
  const counts: Record<ApiKeyProvider | 'all', number> = {
    anthropic: 0,
    openai: 0,
    google: 0,
    all: state.apiKeys.length,
  };

  for (const key of state.apiKeys) {
    counts[key.provider]++;
  }

  return counts;
};

export const selectActiveKeyForProvider = (state: ApiKeysState, provider: ApiKeyProvider) => {
  return state.apiKeys.find((key) => key.provider === provider && key.isActive);
};

export const selectHasActiveKey = (state: ApiKeysState, provider: ApiKeyProvider) => {
  return state.apiKeys.some((key) => key.provider === provider && key.isActive);
};
