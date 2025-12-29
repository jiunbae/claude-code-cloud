import { create } from 'zustand';
import type {
  SessionStats,
  SessionDetail,
  OverallSessionStats,
  AdminSessionStatus,
  SessionFilters,
  PaginatedSessionsResponse,
  BulkTerminateResponse,
} from '@/types/adminSession';

interface AdminSessionsState {
  // Data
  sessions: SessionStats[];
  selectedSession: SessionDetail | null;
  overallStats: OverallSessionStats | null;

  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;

  // Filters
  filters: SessionFilters;

  // Selection for bulk actions
  selectedIds: Set<string>;

  // Loading states
  isLoading: boolean;
  isLoadingDetail: boolean;
  isLoadingStats: boolean;
  isTerminating: boolean;

  // Error
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  fetchSessionDetail: (sessionId: string) => Promise<void>;
  fetchOverallStats: () => Promise<void>;
  terminateSession: (sessionId: string) => Promise<boolean>;
  bulkTerminate: () => Promise<BulkTerminateResponse | null>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilters: (filters: Partial<SessionFilters>) => void;
  clearFilters: () => void;
  toggleSelection: (sessionId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectedSession: (session: SessionDetail | null) => void;
  refresh: () => Promise<void>;
}

export const useAdminSessionsStore = create<AdminSessionsState>((set, get) => ({
  // Initial data
  sessions: [],
  selectedSession: null,
  overallStats: null,

  // Pagination
  page: 1,
  pageSize: 20,
  totalPages: 0,
  total: 0,

  // Filters
  filters: {},

  // Selection
  selectedIds: new Set(),

  // Loading states
  isLoading: false,
  isLoadingDetail: false,
  isLoadingStats: false,
  isTerminating: false,

  // Error
  error: null,

  // Fetch sessions with pagination and filters
  fetchSessions: async () => {
    const { page, pageSize, filters } = get();
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (filters.userId) params.set('userId', filters.userId);
      if (filters.status) params.set('status', filters.status);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/admin/sessions?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch sessions');
      }

      const data = (await response.json()) as PaginatedSessionsResponse;

      set({
        sessions: data.sessions,
        total: data.total,
        totalPages: data.totalPages,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
        isLoading: false,
      });
    }
  },

  // Fetch session detail
  fetchSessionDetail: async (sessionId: string) => {
    set({ isLoadingDetail: true, error: null });

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch session detail');
      }

      const data = await response.json();
      set({ selectedSession: data.session, isLoadingDetail: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch session detail',
        isLoadingDetail: false,
      });
    }
  },

  // Fetch overall stats
  fetchOverallStats: async () => {
    set({ isLoadingStats: true });

    try {
      const response = await fetch('/api/admin/sessions/stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch stats');
      }

      const data = await response.json();
      set({ overallStats: data.stats, isLoadingStats: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        isLoadingStats: false,
      });
    }
  },

  // Terminate single session
  terminateSession: async (sessionId: string) => {
    set({ isTerminating: true, error: null });

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to terminate session');
      }

      // Refresh sessions list
      await get().fetchSessions();
      set({ isTerminating: false });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to terminate session',
        isTerminating: false,
      });
      return false;
    }
  },

  // Bulk terminate selected sessions
  bulkTerminate: async () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return null;

    set({ isTerminating: true, error: null });

    try {
      const response = await fetch('/api/admin/sessions/bulk-terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds: Array.from(selectedIds) }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to bulk terminate sessions');
      }

      const result = (await response.json()) as BulkTerminateResponse;

      // Clear selection and refresh
      set({ selectedIds: new Set(), isTerminating: false });
      await get().fetchSessions();

      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to bulk terminate sessions',
        isTerminating: false,
      });
      return null;
    }
  },

  // Pagination
  setPage: (page: number) => {
    set({ page });
    get().fetchSessions();
  },

  setPageSize: (pageSize: number) => {
    set({ pageSize, page: 1 });
    get().fetchSessions();
  },

  // Filters
  setFilters: (newFilters: Partial<SessionFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1,
    }));
    get().fetchSessions();
  },

  clearFilters: () => {
    set({ filters: {}, page: 1 });
    get().fetchSessions();
  },

  // Selection
  toggleSelection: (sessionId: string) => {
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(sessionId)) {
        newSelected.delete(sessionId);
      } else {
        newSelected.add(sessionId);
      }
      return { selectedIds: newSelected };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: new Set(
        state.sessions
          .filter((s) => s.status !== 'terminated')
          .map((s) => s.sessionId)
      ),
    }));
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  setSelectedSession: (session: SessionDetail | null) => {
    set({ selectedSession: session });
  },

  // Refresh all data
  refresh: async () => {
    await Promise.all([get().fetchSessions(), get().fetchOverallStats()]);
  },
}));
