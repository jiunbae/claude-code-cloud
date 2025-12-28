'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUserSettingsStore, useGlobalSettingsStore } from '@/stores/settingsStore';
import type { UserSettings, UserSettingsUpdate, GlobalSettings } from '@/types/settings';

const API_BASE = '/api/settings';

/**
 * Hook for managing user settings
 */
export function useSettings() {
  const { settings, isLoading, error, setSettings, setLoading, setError } = useUserSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to fetch settings');
      }
    } catch {
      setError('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, [setSettings, setLoading, setError]);

  // Fetch on mount
  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, [fetchSettings, settings]);

  // Update user settings
  const updateSettings = useCallback(
    async (updates: UserSettingsUpdate): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsSaving(true);
        const response = await fetch(`${API_BASE}/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
          credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
          setSettings(data.settings);
          return { success: true };
        }

        return { success: false, error: data.error || 'Failed to update settings' };
      } catch {
        return { success: false, error: 'Failed to update settings' };
      } finally {
        setIsSaving(false);
      }
    },
    [setSettings]
  );

  return {
    settings,
    isLoading,
    error,
    isSaving,
    fetchSettings,
    updateSettings,
  };
}

/**
 * Hook for managing global settings (admin only)
 */
export function useGlobalSettings() {
  const { settings, lastUpdated, isLoading, error, setSettings, setLoading, setError } = useGlobalSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch global settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings, data.lastUpdated ? new Date(data.lastUpdated) : null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to fetch settings');
      }
    } catch {
      setError('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, [setSettings, setLoading, setError]);

  // Fetch on mount
  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, [fetchSettings, settings]);

  // Update global settings
  const updateSettings = useCallback(
    async (updates: Partial<GlobalSettings>): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsSaving(true);
        const response = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
          credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
          setSettings(data.settings, data.lastUpdated ? new Date(data.lastUpdated) : null);
          return { success: true };
        }

        return { success: false, error: data.error || 'Failed to update settings' };
      } catch {
        return { success: false, error: 'Failed to update settings' };
      } finally {
        setIsSaving(false);
      }
    },
    [setSettings]
  );

  return {
    settings,
    lastUpdated,
    isLoading,
    error,
    isSaving,
    fetchSettings,
    updateSettings,
  };
}
