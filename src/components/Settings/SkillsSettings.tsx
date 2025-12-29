'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSkillsStore, type SkillFilterTab } from '@/stores/skillsStore';
import { useSkills } from '@/hooks/useSkills';
import {
  SkillMarketplace,
  InstalledSkills,
  SkillDetailModal,
  SkillConfigModal,
} from './Skills';
import type { UserSkillWithDetails, SkillCategory, SkillConfig } from '@/types/skill';

export function SkillsSettings() {
  // Use the custom hook for data fetching
  const {
    skills,
    isLoading,
    error,
    installSkill,
    uninstallSkill,
    toggleSkill,
    updateSkillConfig,
    syncSkills,
    refreshSkills,
  } = useSkills();

  // Local UI state
  const [activeTab, setActiveTab] = useState<SkillFilterTab>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state
  const [selectedSkill, setSelectedSkill] = useState<UserSkillWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Stats
  const installedCount = skills.filter((s) => s.isInstalled).length;
  const enabledCount = skills.filter((s) => s.isInstalled && s.isEnabled).length;

  // Handlers
  const handleInstall = useCallback(
    async (skillName: string) => {
      setActionLoading(skillName);
      try {
        await installSkill(skillName);
        setIsDetailModalOpen(false);
      } finally {
        setActionLoading(null);
      }
    },
    [installSkill]
  );

  const handleUninstall = useCallback(
    async (skillName: string) => {
      if (!confirm(`"${skillName}" skill will be removed. Continue?`)) {
        return;
      }
      setActionLoading(skillName);
      try {
        await uninstallSkill(skillName);
        setIsDetailModalOpen(false);
      } finally {
        setActionLoading(null);
      }
    },
    [uninstallSkill]
  );

  const handleToggle = useCallback(
    async (skillName: string, enabled: boolean) => {
      setActionLoading(skillName);
      try {
        await toggleSkill(skillName, enabled);
      } finally {
        setActionLoading(null);
      }
    },
    [toggleSkill]
  );

  const handleConfigSave = useCallback(
    async (skillName: string, config: SkillConfig) => {
      setActionLoading(skillName);
      try {
        await updateSkillConfig(skillName, config);
        setIsConfigModalOpen(false);
      } finally {
        setActionLoading(null);
      }
    },
    [updateSkillConfig]
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncSkills();
      if (result) {
        const { added, updated, removed, errors } = result;
        const messages: string[] = [];
        if (added.length > 0) messages.push(`${added.length} added`);
        if (updated.length > 0) messages.push(`${updated.length} updated`);
        if (removed.length > 0) messages.push(`${removed.length} removed`);

        if (errors.length > 0) {
          setSyncMessage({
            type: 'error',
            text: `Sync completed with ${errors.length} error(s). ${messages.join(', ')}`,
          });
        } else if (messages.length > 0) {
          setSyncMessage({
            type: 'success',
            text: `Sync completed: ${messages.join(', ')}`,
          });
        } else {
          setSyncMessage({
            type: 'success',
            text: 'Sync completed: no changes',
          });
        }
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: `Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setSyncing(false);
    }
  }, [syncSkills]);

  const handleViewDetails = useCallback((skill: UserSkillWithDetails) => {
    setSelectedSkill(skill);
    setIsDetailModalOpen(true);
  }, []);

  const handleConfigure = useCallback((skill: UserSkillWithDetails) => {
    setSelectedSkill(skill);
    setIsConfigModalOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Skills</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage installed skills and discover new ones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
            title="Scan filesystem and sync skill registry"
          >
            <svg
              className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <button
            onClick={refreshSkills}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh list"
          >
            <svg
              className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center justify-between ${
            syncMessage.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <span>{syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} className="ml-2 hover:opacity-70">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex -mb-px space-x-8">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'marketplace'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            Marketplace
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'installed'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            Installed
            {installedCount > 0 && (
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === 'installed'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {installedCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'marketplace' ? (
        <SkillMarketplace
          skills={skills}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
          onInstall={handleInstall}
          onViewDetails={handleViewDetails}
          loadingSkill={actionLoading}
          isLoading={isLoading}
        />
      ) : (
        <InstalledSkills
          skills={skills}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
          onUninstall={handleUninstall}
          onToggle={handleToggle}
          onViewDetails={handleViewDetails}
          onConfigure={handleConfigure}
          loadingSkill={actionLoading}
          isLoading={isLoading}
        />
      )}

      {/* Detail Modal */}
      <SkillDetailModal
        skill={selectedSkill}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onToggle={handleToggle}
        onConfigure={handleConfigure}
        isLoading={actionLoading === selectedSkill?.name}
      />

      {/* Config Modal */}
      <SkillConfigModal
        skill={selectedSkill}
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleConfigSave}
        isLoading={actionLoading === selectedSkill?.name}
      />
    </div>
  );
}
