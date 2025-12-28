'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  UserSkillWithDetails,
  UserSkillListResponse,
  SkillInstallResponse,
  SkillSyncResult,
  SkillSyncResponse,
} from '@/types/skill';

const API_BASE = '/api/skills';

interface UseSkillsReturn {
  skills: UserSkillWithDetails[];
  isLoading: boolean;
  error: string | null;
  installSkill: (skillName: string, config?: Record<string, unknown>) => Promise<boolean>;
  uninstallSkill: (skillName: string) => Promise<boolean>;
  toggleSkill: (skillName: string, enabled: boolean) => Promise<boolean>;
  updateSkillConfig: (skillName: string, config: Record<string, unknown>) => Promise<boolean>;
  syncSkills: () => Promise<SkillSyncResult | null>;
  refreshSkills: () => Promise<void>;
}

export function useSkills(): UseSkillsReturn {
  const [skills, setSkills] = useState<UserSkillWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's skills with details
  const fetchSkills = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/my`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch skills');
      }

      const data: UserSkillListResponse = await response.json();
      setSkills(data.skills);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Install a skill
  const installSkill = useCallback(
    async (skillName: string, config?: Record<string, unknown>): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch(`${API_BASE}/install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillName, config }),
          credentials: 'include',
        });

        const data: SkillInstallResponse = await response.json();

        if (!response.ok) {
          throw new Error((data as unknown as { error: string }).error || 'Failed to install skill');
        }

        // Refresh skills list
        await fetchSkills();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to install skill');
        return false;
      }
    },
    [fetchSkills]
  );

  // Uninstall a skill
  const uninstallSkill = useCallback(
    async (skillName: string): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch(`${API_BASE}/${encodeURIComponent(skillName)}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to uninstall skill');
        }

        // Refresh skills list
        await fetchSkills();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to uninstall skill');
        return false;
      }
    },
    [fetchSkills]
  );

  // Toggle skill enabled/disabled
  const toggleSkill = useCallback(
    async (skillName: string, enabled: boolean): Promise<boolean> => {
      try {
        setError(null);

        // Optimistic update
        setSkills((prev) =>
          prev.map((s) =>
            s.name === skillName ? { ...s, isEnabled: enabled } : s
          )
        );

        const response = await fetch(`${API_BASE}/${encodeURIComponent(skillName)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isEnabled: enabled }),
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to toggle skill');
        }

        return true;
      } catch (err) {
        // Revert optimistic update
        await fetchSkills();
        setError(err instanceof Error ? err.message : 'Failed to toggle skill');
        return false;
      }
    },
    [fetchSkills]
  );

  // Update skill config
  const updateSkillConfig = useCallback(
    async (skillName: string, config: Record<string, unknown>): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch(`${API_BASE}/${encodeURIComponent(skillName)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config }),
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update skill config');
        }

        // Refresh skills list
        await fetchSkills();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update skill config');
        return false;
      }
    },
    [fetchSkills]
  );

  // Sync skills from filesystem
  const syncSkills = useCallback(async (): Promise<SkillSyncResult | null> => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sync skills');
      }

      const data: SkillSyncResponse = await response.json();

      // Refresh skills list
      await fetchSkills();

      return data.result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync skills');
      return null;
    }
  }, [fetchSkills]);

  return {
    skills,
    isLoading,
    error,
    installSkill,
    uninstallSkill,
    toggleSkill,
    updateSkillConfig,
    syncSkills,
    refreshSkills: fetchSkills,
  };
}
