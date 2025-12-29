'use client';

import type { SessionDetail, SessionActionType } from '@/types/adminSession';

interface SessionDetailModalProps {
  session: SessionDetail | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onTerminate: () => void;
  isTerminating: boolean;
}

export default function SessionDetailModal({
  session,
  isOpen,
  isLoading,
  onClose,
  onTerminate,
  isTerminating,
}: SessionDetailModalProps) {
  if (!isOpen) return null;

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', className: 'text-green-400 bg-green-500/10' };
      case 'idle':
        return { label: 'Idle', className: 'text-yellow-400 bg-yellow-500/10' };
      case 'terminated':
        return { label: 'Terminated', className: 'text-red-400 bg-red-500/10' };
      default:
        return { label: status, className: 'text-gray-400 bg-gray-500/10' };
    }
  };

  const getActionIcon = (actionType: SessionActionType) => {
    switch (actionType) {
      case 'start':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'command':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'idle':
        return (
          <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'end':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        );
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Session Details</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : session ? (
              <div className="space-y-6">
                {/* Session Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Session ID</div>
                    <div className="text-sm text-gray-300 font-mono">{session.sessionId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusDisplay(session.status).className}`}>
                      {getStatusDisplay(session.status).label}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Session Name</div>
                    <div className="text-sm text-gray-300">{session.sessionName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Workspace</div>
                    <div className="text-sm text-gray-300">{session.workspaceName || 'N/A'}</div>
                  </div>
                </div>

                {/* User Info */}
                <div className="p-3 bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-2">User</div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {session.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{session.username}</div>
                      <div className="text-xs text-gray-500">{session.email}</div>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Started</div>
                    <div className="text-sm text-gray-300">{formatDate(session.startedAt)}</div>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Last Activity</div>
                    <div className="text-sm text-gray-300">{formatDate(session.lastActivityAt)}</div>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Commands</div>
                    <div className="text-sm text-gray-300">{session.totalCommands.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Tokens</div>
                    <div className="text-sm text-gray-300">{session.totalTokens.toLocaleString()}</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-3">Recent Activity</div>
                  {session.recentActivity.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">No activity recorded</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {session.recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-2 bg-gray-900/30 rounded-lg"
                        >
                          <div className="mt-0.5">{getActionIcon(activity.actionType)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-300 capitalize">
                                {activity.actionType}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(activity.createdAt)}
                              </span>
                            </div>
                            {Object.keys(activity.details).length > 0 && (
                              <div className="text-xs text-gray-500 mt-1 font-mono">
                                {JSON.stringify(activity.details)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Session not found</div>
            )}
          </div>

          {/* Footer */}
          {session && session.status !== 'terminated' && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={onTerminate}
                disabled={isTerminating}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTerminating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Terminating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Terminate Session
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
