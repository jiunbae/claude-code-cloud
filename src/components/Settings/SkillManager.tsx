'use client';

import { useState, useCallback } from 'react';
import SkillCard from './SkillCard';
import { useSkills } from '@/hooks/useSkills';
import type { SkillCategory } from '@/types/skill';

const categories: { value: SkillCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'git', label: 'Git' },
  { value: 'code', label: 'Code' },
  { value: 'ai', label: 'AI/ML' },
  { value: 'utility', label: 'Utility' },
  { value: 'devops', label: 'DevOps' },
  { value: 'docs', label: 'Docs' },
  { value: 'test', label: 'Testing' },
  { value: 'general', label: 'General' },
];

type FilterTab = 'all' | 'installed' | 'available';

export default function SkillManager() {
  const {
    skills,
    isLoading,
    error,
    installSkill,
    uninstallSkill,
    toggleSkill,
    syncSkills,
    refreshSkills,
  } = useSkills();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter skills based on search, category, and tab
  const filteredSkills = skills.filter((skill) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        skill.name.toLowerCase().includes(query) ||
        skill.displayName.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.keywords.some((k) => k.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && skill.category !== selectedCategory) {
      return false;
    }

    // Tab filter
    if (filterTab === 'installed' && !skill.isInstalled) return false;
    if (filterTab === 'available' && skill.isInstalled) return false;

    return true;
  });

  const handleInstall = useCallback(async (skillName: string) => {
    setActionLoading(skillName);
    try {
      await installSkill(skillName);
    } finally {
      setActionLoading(null);
    }
  }, [installSkill]);

  const handleUninstall = useCallback(async (skillName: string) => {
    if (!confirm(`Are you sure you want to uninstall "${skillName}"?`)) {
      return;
    }
    setActionLoading(skillName);
    try {
      await uninstallSkill(skillName);
    } finally {
      setActionLoading(null);
    }
  }, [uninstallSkill]);

  const handleToggle = useCallback(async (skillName: string, enabled: boolean) => {
    setActionLoading(skillName);
    try {
      await toggleSkill(skillName, enabled);
    } finally {
      setActionLoading(null);
    }
  }, [toggleSkill]);

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
            text: 'Sync completed: No changes detected',
          });
        }
        // Auto-hide message after 5 seconds
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

  // Stats
  const installedCount = skills.filter((s) => s.isInstalled).length;
  const enabledCount = skills.filter((s) => s.isInstalled && s.isEnabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Skills</h2>
          <p className="text-sm text-gray-400 mt-1">
            {installedCount} installed, {enabledCount} enabled
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
              className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
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
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <button
            onClick={() => setSyncMessage(null)}
            className="ml-2 hover:opacity-70"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

      {/* Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['all', 'installed', 'available'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterTab === tab
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as SkillCategory | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-12 h-12 text-gray-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-gray-400">
            {searchQuery
              ? 'No skills match your search'
              : filterTab === 'installed'
              ? 'No skills installed yet'
              : 'No skills available'}
          </p>
          {!searchQuery && filterTab !== 'installed' && (
            <p className="text-sm text-gray-500 mt-2">
              Try syncing to discover new skills from ~/.claude/skills/
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onToggle={handleToggle}
              loading={actionLoading === skill.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
