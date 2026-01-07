'use client';

import { useState, useEffect } from 'react';
import type { Session } from '@/types';

interface SessionCardProps {
  session: Session;
  onSelect: (session: Session) => void;
  onStart: (session: Session) => void;
  onStop: (session: Session) => void;
  onDelete: (session: Session) => void;
}

// Format relative time from date
function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function SessionCard({
  session,
  onSelect,
  onStart,
  onStop,
  onDelete,
}: SessionCardProps) {
  const isRunning = session.status === 'running';
  const isStarting = session.status === 'starting';
  const isStopping = session.status === 'stopping';
  const isLoading = isStarting || isStopping;

  // Use state for relative time to avoid hydration mismatch
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    setFormattedTime(formatRelativeTime(session.lastActiveAt));
    // Update time every minute
    const interval = setInterval(() => {
      setFormattedTime(formatRelativeTime(session.lastActiveAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [session.lastActiveAt]);

  const statusConfig = {
    running: { color: 'bg-green-500', label: 'Running' },
    starting: { color: 'bg-yellow-500 animate-pulse', label: 'Starting' },
    stopping: { color: 'bg-yellow-500 animate-pulse', label: 'Stopping' },
    error: { color: 'bg-red-500', label: 'Error' },
    idle: { color: 'bg-gray-500', label: 'Idle' },
  };

  const status = statusConfig[session.status] || statusConfig.idle;

  return (
    <div
      className="bg-gray-800/50 backdrop-blur rounded-xl p-4 hover:bg-gray-800 transition-all cursor-pointer border border-gray-700/50 hover:border-gray-600 hover:shadow-lg hover:shadow-black/20 active:scale-[0.99]"
      onClick={() => onSelect(session)}
    >
      {/* Mobile: Stack layout, Desktop: Side by side */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Session Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${status.color} ring-2 ring-offset-1 ring-offset-gray-800 ring-${isRunning ? 'green' : 'gray'}-500/30`} />
            <h3 className="text-white font-medium truncate text-base">{session.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isRunning ? 'bg-green-500/20 text-green-400' :
              isLoading ? 'bg-yellow-500/20 text-yellow-400' :
              session.status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-400 truncate font-mono text-xs">
            {session.workspace?.name || session.workspace?.slug || 'Unknown workspace'}
          </p>
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formattedTime || '\u00A0'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-700/50" onClick={(e) => e.stopPropagation()}>
          {isRunning ? (
            <button
              onClick={() => onStop(session)}
              disabled={isStopping}
              className="flex-1 sm:flex-none px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isStopping ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Stopping
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Stop
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => onStart(session)}
              disabled={isStarting}
              className="flex-1 sm:flex-none px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isStarting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Starting
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start
                </>
              )}
            </button>
          )}
          <button
            onClick={() => onDelete(session)}
            disabled={isRunning || isLoading}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-30 transition-colors"
            title="Delete session"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
