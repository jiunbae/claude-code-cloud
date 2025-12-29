'use client';

import SessionCard from './SessionCard';
import type { SessionStats } from '@/types/adminSession';

interface SessionListProps {
  sessions: SessionStats[];
  selectedIds: Set<string>;
  onToggleSelect: (sessionId: string) => void;
  onViewDetail: (sessionId: string) => void;
  onTerminate: (sessionId: string) => void;
  isTerminating: boolean;
  isLoading: boolean;
}

export default function SessionList({
  sessions,
  selectedIds,
  onToggleSelect,
  onViewDetail,
  onTerminate,
  isTerminating,
  isLoading,
}: SessionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-gray-700 rounded mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-16 bg-gray-700 rounded-full" />
                  <div className="h-4 w-24 bg-gray-700 rounded" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j}>
                      <div className="h-3 w-12 bg-gray-700 rounded mb-1" />
                      <div className="h-4 w-20 bg-gray-700 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-12 h-12 mx-auto text-gray-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-gray-500">No sessions found</p>
        <p className="text-gray-600 text-sm mt-1">
          Sessions will appear here when users start Claude Code sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard
          key={session.sessionId}
          session={session}
          isSelected={selectedIds.has(session.sessionId)}
          onSelect={() => onToggleSelect(session.sessionId)}
          onViewDetail={() => onViewDetail(session.sessionId)}
          onTerminate={() => onTerminate(session.sessionId)}
          isTerminating={isTerminating}
        />
      ))}
    </div>
  );
}
