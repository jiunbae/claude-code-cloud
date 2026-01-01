'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  SettingsLayout,
  GeneralSettings,
  ApiKeysSettings,
  SkillsSettings,
  AdminSettings,
  ClaudeArgsSettings,
  ClaudeConfigManager,
  type SettingsTab,
} from '@/components/Settings';
import type { ClaudeArgsConfig } from '@/types/settings';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Claude args state
  const [claudeArgsConfig, setClaudeArgsConfig] = useState<ClaudeArgsConfig | null>(null);
  const [claudeArgsEffective, setClaudeArgsEffective] = useState<ClaudeArgsConfig | undefined>(undefined);
  const [claudeArgsLoading, setClaudeArgsLoading] = useState(false);

  // Fetch Claude args config
  const fetchClaudeArgs = useCallback(async () => {
    try {
      setClaudeArgsLoading(true);
      const response = await fetch('/api/settings/claude-args', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setClaudeArgsConfig(data.userConfig);
        setClaudeArgsEffective(data.effectiveConfig);
      }
    } catch (error) {
      console.error('Failed to fetch Claude args:', error);
    } finally {
      setClaudeArgsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'claude-args') {
      fetchClaudeArgs();
    }
  }, [isAuthenticated, activeTab, fetchClaudeArgs]);

  // Redirect to general tab if non-admin tries to access admin tab
  useEffect(() => {
    if (activeTab === 'admin' && user?.role !== 'admin') {
      setActiveTab('general');
    }
  }, [activeTab, user?.role]);

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleClaudeArgsSave = async (config: ClaudeArgsConfig): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/settings/claude-args', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to save' };
      }

      const data = await response.json();
      setClaudeArgsConfig(data.userConfig);
      setClaudeArgsEffective(data.effectiveConfig);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const handleClaudeArgsReset = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/settings/claude-args', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to reset' };
      }

      const data = await response.json();
      setClaudeArgsConfig(null);
      setClaudeArgsEffective(data.effectiveConfig);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'api-keys':
        return <ApiKeysSettings />;
      case 'skills':
        return <SkillsSettings />;
      case 'claude-args':
        return (
          <ClaudeArgsSettings
            isAdmin={false}
            initialConfig={claudeArgsConfig}
            effectiveConfig={claudeArgsEffective}
            onSave={handleClaudeArgsSave}
            onReset={handleClaudeArgsReset}
            isLoading={claudeArgsLoading}
          />
        );
      case 'claude-config':
        return <ClaudeConfigManager />;
      case 'admin':
        // Only render admin settings if user is admin
        if (user?.role === 'admin') {
          return <AdminSettings />;
        }
        // Fall back to general if somehow navigated here without admin role
        return <GeneralSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </SettingsLayout>
  );
}
