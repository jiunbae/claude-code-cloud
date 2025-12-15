'use client';

import type { CollaboratorPresence } from '@/hooks/useCollaboration';

interface PresenceIndicatorProps {
  collaborators: CollaboratorPresence[];
  connected: boolean;
}

export default function PresenceIndicator({
  collaborators,
  connected,
}: PresenceIndicatorProps) {
  if (!connected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        Connecting...
      </div>
    );
  }

  const activeUsers = collaborators.filter(
    (c) => Date.now() - c.lastSeen < 60000
  );

  return (
    <div className="flex items-center gap-3">
      {/* Connection status */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        Live
      </div>

      {/* Active collaborators */}
      {activeUsers.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">
            {activeUsers.length} collaborator{activeUsers.length !== 1 ? 's' : ''}
          </span>
          <div className="flex -space-x-1.5">
            {activeUsers.slice(0, 5).map((user) => (
              <div
                key={user.odId}
                className="relative group"
              >
                <div
                  className="w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center text-[10px] font-medium text-white cursor-pointer"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {user.isTyping && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-white">...</span>
                  </div>
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {user.name}
                  {user.cursor && (
                    <span className="text-gray-400 ml-1">
                      Line {user.cursor.line}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {activeUsers.length > 5 && (
              <div className="w-6 h-6 rounded-full border-2 border-gray-800 bg-gray-600 flex items-center justify-center text-[10px] text-white">
                +{activeUsers.length - 5}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
