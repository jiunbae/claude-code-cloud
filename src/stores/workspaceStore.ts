import { create } from 'zustand';
import type { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,

  setWorkspaces: (workspaces) => set({ workspaces }),

  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [workspace, ...state.workspaces],
    })),

  updateWorkspace: (id, updates) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      currentWorkspace:
        state.currentWorkspace?.id === id
          ? { ...state.currentWorkspace, ...updates }
          : state.currentWorkspace,
    })),

  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspace: state.currentWorkspace?.id === id ? null : state.currentWorkspace,
    })),

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
}));
