'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Participant } from '@/types';

interface ParticipantListProps {
  sessionId: string;
  onShareClick?: () => void;
}

export default function ParticipantList({ sessionId, onShareClick }: ParticipantListProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/participants`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants);
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Poll for updates
  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 5000);
    return () => clearInterval(interval);
  }, [fetchParticipants]);

  const getPermissionBadge = (permission: string) => {
    switch (permission) {
      case 'owner':
        return (
          <span className="px-1.5 py-0.5 text-xs bg-purple-900/50 text-purple-400 rounded">
            Owner
          </span>
        );
      case 'interact':
        return (
          <span className="px-1.5 py-0.5 text-xs bg-green-900/50 text-green-400 rounded">
            Editor
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
            Viewer
          </span>
        );
    }
  };

  return (
    <div className="relative">
      {/* Collapsed view - just avatars */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
      >
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {participants.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-medium"
              style={{ backgroundColor: p.color }}
              title={p.name}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {participants.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-gray-800 bg-gray-600 flex items-center justify-center text-xs text-white">
              +{participants.length - 3}
            </div>
          )}
          {participants.length === 0 && (
            <div className="w-6 h-6 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
          )}
        </div>

        <span className="text-sm text-gray-400">
          {loading ? '...' : participants.length}
        </span>

        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded dropdown */}
      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-dropdown">
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                Participants ({participants.length})
              </span>
              {onShareClick && (
                <button
                  onClick={onShareClick}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Share
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-auto">
            {participants.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No participants yet
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white truncate">{p.name}</span>
                        {getPermissionBadge(p.permission)}
                      </div>
                      {p.cursorPosition && (
                        <span className="text-xs text-gray-500">
                          Line {p.cursorPosition.line}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
