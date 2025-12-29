'use client';

import type { SessionStats, AdminSessionStatus } from '@/types/adminSession';

interface SessionCardProps {
  session: SessionStats;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetail: () => void;
  onTerminate: () => void;
  isTerminating: boolean;
}

export default function SessionCard({
  session,
  isSelected,
  onSelect,
  onViewDetail,
  onTerminate,
  isTerminating,
}: SessionCardProps) {
  const getStatusDisplay = (status: AdminSessionStatus) => {
    switch (status) {
      case 'active':
        return {
          icon: <span className="text-green-400">&#9679;</span>,
          label: 'Active',
          className: 'text-green-400 bg-green-500/10',
        };
      case 'idle':
        return {
          icon: <span className="text-yellow-400">&#9679;</span>,
          label: 'Idle',
          className: 'text-yellow-400 bg-yellow-500/10',
        };
      case 'terminated':
        return {
          icon: <span className="text-red-400">&#9679;</span>,
          label: 'Terminated',
          className: 'text-red-400 bg-red-500/10',
        };
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startedAt: Date, endedAt: Date | null) => {
    const end = endedAt ? new Date(endedAt) : new Date();
    const start = new Date(startedAt);
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);

    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const status = getStatusDisplay(session.status);
  const isTerminated = session.status === 'terminated';

  return (
    <div
      className={`p-4 bg-gray-800/50 border rounded-xl transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            disabled={isTerminated}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
              {status.icon} {status.label}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              {session.sessionId.slice(0, 8)}...
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Started</div>
              <div className="text-gray-300">{formatDate(session.startedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Duration</div>
              <div className="text-gray-300">{formatDuration(session.startedAt, session.endedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Commands</div>
              <div className="text-gray-300">{session.totalCommands.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Tokens</div>
              <div className="text-gray-300">{session.totalTokens.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onViewDetail}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="View details"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          {!isTerminated && (
            <button
              onClick={onTerminate}
              disabled={isTerminating}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Terminate session"
            >
              {isTerminating ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
