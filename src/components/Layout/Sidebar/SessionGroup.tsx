'use client';

import { useSidebarStore } from '@/stores/sidebarStore';
import { SessionItem } from './SessionItem';
import type { Session } from '@/types';

interface SessionGroupProps {
  id: string;
  title: string;
  sessions: Session[];
  isCollapsed?: boolean;
  onQuickAction?: (session: Session, action: 'start' | 'stop') => void;
}

export function SessionGroup({
  id,
  title,
  sessions,
  isCollapsed,
  onQuickAction,
}: SessionGroupProps) {
  const { expandedGroups, toggleGroup } = useSidebarStore();
  const isExpanded = expandedGroups.includes(id);

  if (sessions.length === 0) return null;

  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isCollapsed
            onQuickAction={onQuickAction}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Group Header */}
      <button
        onClick={() => toggleGroup(id)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors"
      >
        <span className="uppercase tracking-wider">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{sessions.length}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Sessions List */}
      {isExpanded && (
        <div className="space-y-0.5">
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} onQuickAction={onQuickAction} />
          ))}
        </div>
      )}
    </div>
  );
}
