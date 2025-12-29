'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/Admin';
import {
  SessionStats,
  SessionFilters,
  SessionList,
  SessionDetailModal,
  BulkActions,
} from '@/components/Admin/Sessions';
import { useAdminSessionsStore } from '@/stores/adminSessionsStore';

export default function AdminSessionsPage() {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const {
    sessions,
    selectedSession,
    overallStats,
    page,
    pageSize,
    totalPages,
    total,
    filters,
    selectedIds,
    isLoading,
    isLoadingDetail,
    isLoadingStats,
    isTerminating,
    error,
    fetchSessions,
    fetchSessionDetail,
    fetchOverallStats,
    terminateSession,
    bulkTerminate,
    setPage,
    setFilters,
    clearFilters,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectedSession,
  } = useAdminSessionsStore();

  useEffect(() => {
    fetchSessions();
    fetchOverallStats();
  }, [fetchSessions, fetchOverallStats]);

  const handleViewDetail = async (sessionId: string) => {
    await fetchSessionDetail(sessionId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedSession(null);
  };

  const handleTerminateFromDetail = async () => {
    if (selectedSession) {
      const success = await terminateSession(selectedSession.sessionId);
      if (success) {
        handleCloseDetail();
        await fetchOverallStats();
      }
    }
  };

  const handleTerminate = async (sessionId: string) => {
    if (confirm('Are you sure you want to terminate this session?')) {
      await terminateSession(sessionId);
      await fetchOverallStats();
    }
  };

  const handleBulkTerminate = async () => {
    const count = selectedIds.size;
    if (confirm(`Are you sure you want to terminate ${count} session${count !== 1 ? 's' : ''}?`)) {
      const result = await bulkTerminate();
      if (result) {
        await fetchOverallStats();
        if (result.failed.length > 0) {
          alert(`${result.terminated.length} sessions terminated. ${result.failed.length} failed.`);
        }
      }
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchSessions(), fetchOverallStats()]);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Session Management</h1>
                <p className="text-gray-400 mt-1">
                  {total} session{total !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Stats Dashboard */}
          <SessionStats stats={overallStats} isLoading={isLoadingStats} />

          {/* Filters */}
          <SessionFilters
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={clearFilters}
          />

          {/* Bulk Actions */}
          <BulkActions
            selectedCount={selectedIds.size}
            totalCount={sessions.filter((s) => s.status !== 'terminated').length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkTerminate={handleBulkTerminate}
            isTerminating={isTerminating}
          />

          {/* Session List */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <SessionList
              sessions={sessions}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              onViewDetail={handleViewDetail}
              onTerminate={handleTerminate}
              isTerminating={isTerminating}
              isLoading={isLoading}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isLoading}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={isLoading}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || isLoading}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      <SessionDetailModal
        session={selectedSession}
        isOpen={isDetailModalOpen}
        isLoading={isLoadingDetail}
        onClose={handleCloseDetail}
        onTerminate={handleTerminateFromDetail}
        isTerminating={isTerminating}
      />
    </AdminGuard>
  );
}
