'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Session } from '@/types';

interface SessionItemProps {
  session: Session;
  isCollapsed?: boolean;
  onQuickAction?: (session: Session, action: 'start' | 'stop') => void;
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function getStatusColor(status: Session['status']): string {
  switch (status) {
    case 'running':
      return 'bg-green-500';
    case 'starting':
    case 'stopping':
      return 'bg-yellow-500 animate-pulse';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

export function SessionItem({ session, isCollapsed, onQuickAction }: SessionItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === `/session/${session.id}`;

  const handleClick = useCallback(() => {
    router.push(`/session/${session.id}`);
  }, [router, session.id]);

  const handleQuickAction = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (session.status === 'running') {
        onQuickAction?.(session, 'stop');
      } else if (session.status === 'idle') {
        onQuickAction?.(session, 'start');
      }
    },
    [session, onQuickAction]
  );

  if (isCollapsed) {
    return (
      <button
        onClick={handleClick}
        className={`
          w-10 h-10 rounded-lg flex items-center justify-center
          transition-colors relative group
          ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-400'}
        `}
        title={session.name}
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`} />
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {session.name}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-full px-3 py-2 rounded-lg text-left
        transition-colors group
        ${isActive ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-gray-700/50'}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(session.status)}`} />

        {/* Session Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-200'}`}
            >
              {session.name}
            </span>
            {/* Quick Action Button */}
            {(session.status === 'running' || session.status === 'idle') && (
              <button
                onClick={handleQuickAction}
                className={`
                  p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                  ${session.status === 'running' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-green-500/20 text-green-400'}
                `}
                title={session.status === 'running' ? 'Stop' : 'Start'}
              >
                {session.status === 'running' ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500 truncate">{session.workspace?.name}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{formatTimeAgo(session.updatedAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
