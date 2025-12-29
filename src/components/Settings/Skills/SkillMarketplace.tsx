'use client';

import type { UserSkillWithDetails, SkillCategory } from '@/types/skill';
import SkillGrid from './SkillGrid';

interface SkillMarketplaceProps {
  skills: UserSkillWithDetails[];
  searchQuery: string;
  selectedCategory: SkillCategory | 'all';
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: SkillCategory | 'all') => void;
  onInstall: (skillName: string) => void;
  onViewDetails: (skill: UserSkillWithDetails) => void;
  loadingSkill: string | null;
  isLoading: boolean;
}

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

export default function SkillMarketplace({
  skills,
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  onInstall,
  onViewDetails,
  loadingSkill,
  isLoading,
}: SkillMarketplaceProps) {
  // Filter to show only non-installed skills
  const availableSkills = skills.filter((s) => !s.isInstalled);

  // Apply search and category filters
  const filteredSkills = availableSkills.filter((skill) => {
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

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as SkillCategory | 'all')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : (
        <SkillGrid
          skills={filteredSkills}
          onInstall={onInstall}
          onUninstall={() => {}}
          onToggle={() => {}}
          onViewDetails={onViewDetails}
          loadingSkill={loadingSkill}
          emptyMessage={
            searchQuery
              ? 'No skills match your search'
              : 'No skills available in marketplace'
          }
          emptyHint="Try syncing to discover new skills from ~/.claude/skills/"
        />
      )}
    </div>
  );
}
