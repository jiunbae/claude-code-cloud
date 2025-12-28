'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { SessionGroup } from './SessionGroup';
import { APP_NAME } from '@/config';
import type { Session } from '@/types';

export function Sidebar() {
  const router = useRouter();
  const {
    isOpen,
    isMobileOpen,
    isCollapsed,
    searchQuery,
    setMobileOpen,
    toggleCollapsed,
    setSearchQuery,
  } = useSidebarStore();

  const { sessions, setSessions, updateSession } = useSessionStore();
  const { getSessions, startSession, stopSession } = useSession();
  const { user, logout } = useAuth();

  // Fetch sessions on mount and when page becomes visible
  // TODO: Replace with WebSocket push for real-time session status updates
  // Server should broadcast 'session:status_update' events when session state changes
  useEffect(() => {
    const fetchSessions = async () => {
      const data = await getSessions();
      setSessions(data);
    };

    // Initial fetch
    fetchSessions();

    // Refresh when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSessions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getSessions, setSessions]);

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (session) =>
        session.name.toLowerCase().includes(query) ||
        session.workspace?.name?.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  // Group sessions by status
  const groupedSessions = useMemo(() => {
    const active = filteredSessions.filter((s) =>
      ['running', 'starting', 'stopping'].includes(s.status)
    );
    const recent = filteredSessions.filter((s) => ['idle', 'error'].includes(s.status));
    return { active, recent };
  }, [filteredSessions]);

  // Quick action handler
  const handleQuickAction = useCallback(
    async (session: Session, action: 'start' | 'stop') => {
      if (action === 'start') {
        updateSession(session.id, { status: 'starting' });
        await startSession(session.id);
      } else {
        updateSession(session.id, { status: 'stopping' });
        await stopSession(session.id);
      }
    },
    [startSession, stopSession, updateSession]
  );

  // New session handler
  const handleNewSession = useCallback(() => {
    router.push('/?tab=sessions&action=new');
    setMobileOpen(false);
  }, [router, setMobileOpen]);

  // Close mobile sidebar on navigation
  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, [setMobileOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isCollapsed && (
          <h1 className="text-lg font-semibold text-white truncate">{APP_NAME}</h1>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors hidden lg:flex"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
        {/* Mobile close button */}
        <button
          onClick={handleCloseMobile}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors lg:hidden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
              >
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* New Session Button */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewSession}
          className={`
            flex items-center justify-center gap-2 rounded-lg font-medium transition-all
            bg-blue-600 hover:bg-blue-500 text-white
            ${isCollapsed ? 'w-10 h-10' : 'w-full px-4 py-2'}
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {!isCollapsed && <span>New Session</span>}
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        <SessionGroup
          id="active"
          title="Active"
          sessions={groupedSessions.active}
          isCollapsed={isCollapsed}
          onQuickAction={handleQuickAction}
        />
        <SessionGroup
          id="recent"
          title="Recent"
          sessions={groupedSessions.recent}
          isCollapsed={isCollapsed}
          onQuickAction={handleQuickAction}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700">
        {/* Navigation */}
        {!isCollapsed && (
          <div className="p-3 space-y-1">
            <button
              onClick={() => {
                router.push('/');
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => {
                router.push('/settings');
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
              </svg>
              GitHub
            </a>
          </div>
        )}

        {/* User section */}
        <div className={`p-3 border-t border-gray-700 ${isCollapsed ? 'flex justify-center' : ''}`}>
          {user ? (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              {/* User avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {user.username
                  .split(/[\s_-]/)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.username}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              )}
              {!isCollapsed && (
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                  title="Sign out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ${isCollapsed ? 'justify-center' : 'w-full'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              {!isCollapsed && 'Sign In'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col
          bg-gray-900 border-r border-gray-700
          transition-all duration-300 ease-in-out
          ${isOpen ? (isCollapsed ? 'w-16' : 'w-64') : 'w-0 overflow-hidden'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={handleCloseMobile}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 w-72 bg-gray-900 border-r border-gray-700 z-50 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
