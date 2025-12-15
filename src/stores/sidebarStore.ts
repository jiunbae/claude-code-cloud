import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isOpen: boolean;
  isMobileOpen: boolean;
  isCollapsed: boolean;
  searchQuery: string;
  expandedGroups: string[];

  // Actions
  setOpen: (open: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  toggleCollapsed: () => void;
  setSearchQuery: (query: string) => void;
  toggleGroup: (groupId: string) => void;
  setExpandedGroups: (groups: string[]) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: true,
      isMobileOpen: false,
      isCollapsed: false,
      searchQuery: '',
      expandedGroups: ['active', 'recent'],

      setOpen: (open) => set({ isOpen: open }),
      setMobileOpen: (open) => set({ isMobileOpen: open }),
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
      toggleMobileSidebar: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleGroup: (groupId) =>
        set((state) => ({
          expandedGroups: state.expandedGroups.includes(groupId)
            ? state.expandedGroups.filter((id) => id !== groupId)
            : [...state.expandedGroups, groupId],
        })),
      setExpandedGroups: (groups) => set({ expandedGroups: groups }),
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({
        isOpen: state.isOpen,
        isCollapsed: state.isCollapsed,
        expandedGroups: state.expandedGroups,
      }),
    }
  )
);
