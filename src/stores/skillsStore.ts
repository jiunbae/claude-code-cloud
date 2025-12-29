'use client';

import { create } from 'zustand';
import type {
  UserSkillWithDetails,
  SkillCategory,
  SkillSyncResult,
} from '@/types/skill';

// Filter tab types
export type SkillFilterTab = 'marketplace' | 'installed';

// Skills Store State
interface SkillsState {
  // Data
  skills: UserSkillWithDetails[];
  selectedSkill: UserSkillWithDetails | null;

  // Filters
  searchQuery: string;
  selectedCategory: SkillCategory | 'all';
  filterTab: SkillFilterTab;

  // UI State
  isLoading: boolean;
  isSyncing: boolean;
  actionLoading: string | null; // skill name being acted upon
  error: string | null;
  syncMessage: { type: 'success' | 'error'; text: string } | null;

  // Modal State
  isDetailModalOpen: boolean;
  isConfigModalOpen: boolean;

  // Computed
  installedCount: number;
  enabledCount: number;

  // Actions - Data
  setSkills: (skills: UserSkillWithDetails[]) => void;
  updateSkill: (skillName: string, updates: Partial<UserSkillWithDetails>) => void;
  setSelectedSkill: (skill: UserSkillWithDetails | null) => void;

  // Actions - Filters
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: SkillCategory | 'all') => void;
  setFilterTab: (tab: SkillFilterTab) => void;

  // Actions - UI State
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setActionLoading: (skillName: string | null) => void;
  setError: (error: string | null) => void;
  setSyncMessage: (message: { type: 'success' | 'error'; text: string } | null) => void;

  // Actions - Modals
  openDetailModal: (skill: UserSkillWithDetails) => void;
  closeDetailModal: () => void;
  openConfigModal: (skill: UserSkillWithDetails) => void;
  closeConfigModal: () => void;

  // Actions - Reset
  reset: () => void;
}

// Initial state
const initialState = {
  skills: [],
  selectedSkill: null,
  searchQuery: '',
  selectedCategory: 'all' as const,
  filterTab: 'marketplace' as SkillFilterTab,
  isLoading: false,
  isSyncing: false,
  actionLoading: null,
  error: null,
  syncMessage: null,
  isDetailModalOpen: false,
  isConfigModalOpen: false,
  installedCount: 0,
  enabledCount: 0,
};

export const useSkillsStore = create<SkillsState>((set, get) => ({
  ...initialState,

  // Data actions
  setSkills: (skills) => {
    const installedCount = skills.filter((s) => s.isInstalled).length;
    const enabledCount = skills.filter((s) => s.isInstalled && s.isEnabled).length;
    set({ skills, installedCount, enabledCount, error: null });
  },

  updateSkill: (skillName, updates) => {
    const skills = get().skills.map((s) =>
      s.name === skillName ? { ...s, ...updates } : s
    );
    const installedCount = skills.filter((s) => s.isInstalled).length;
    const enabledCount = skills.filter((s) => s.isInstalled && s.isEnabled).length;
    set({ skills, installedCount, enabledCount });

    // Update selected skill if it's the one being updated
    const selectedSkill = get().selectedSkill;
    if (selectedSkill?.name === skillName) {
      set({ selectedSkill: { ...selectedSkill, ...updates } });
    }
  },

  setSelectedSkill: (skill) => set({ selectedSkill: skill }),

  // Filter actions
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setFilterTab: (filterTab) => set({ filterTab }),

  // UI State actions
  setLoading: (isLoading) => set({ isLoading }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setActionLoading: (actionLoading) => set({ actionLoading }),
  setError: (error) => set({ error }),
  setSyncMessage: (syncMessage) => set({ syncMessage }),

  // Modal actions
  openDetailModal: (skill) => set({ selectedSkill: skill, isDetailModalOpen: true }),
  closeDetailModal: () => set({ isDetailModalOpen: false }),
  openConfigModal: (skill) => set({ selectedSkill: skill, isConfigModalOpen: true }),
  closeConfigModal: () => set({ isConfigModalOpen: false }),

  // Reset
  reset: () => set(initialState),
}));

// Selector hooks for filtered skills
export const useFilteredSkills = () => {
  const skills = useSkillsStore((state) => state.skills);
  const searchQuery = useSkillsStore((state) => state.searchQuery);
  const selectedCategory = useSkillsStore((state) => state.selectedCategory);
  const filterTab = useSkillsStore((state) => state.filterTab);

  return skills.filter((skill) => {
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
    if (filterTab === 'marketplace' && skill.isInstalled) return false;

    return true;
  });
};

// Get installed skills only
export const useInstalledSkills = () => {
  const skills = useSkillsStore((state) => state.skills);
  const searchQuery = useSkillsStore((state) => state.searchQuery);
  const selectedCategory = useSkillsStore((state) => state.selectedCategory);

  return skills.filter((skill) => {
    if (!skill.isInstalled) return false;

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
};

// Get marketplace skills (not installed)
export const useMarketplaceSkills = () => {
  const skills = useSkillsStore((state) => state.skills);
  const searchQuery = useSkillsStore((state) => state.searchQuery);
  const selectedCategory = useSkillsStore((state) => state.selectedCategory);

  return skills.filter((skill) => {
    if (skill.isInstalled) return false;

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
};
