'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Layout';
import { SessionCard, CreateSessionModal } from '@/components/Session';
import { useSession } from '@/hooks/useSession';
import { useSessionStore } from '@/stores/sessionStore';
import type { Session, CreateSessionRequest } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { loading, error, getSessions, createSession, startSession, stopSession, deleteSession } =
    useSession();
  const { sessions, setSessions, addSession, updateSession, removeSession } = useSessionStore();

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      const data = await getSessions();
      setSessions(data);
    };
    fetchSessions();
  }, [getSessions, setSessions]);

  const handleCreateSession = useCallback(
    async (request: CreateSessionRequest) => {
      const session = await createSession(request);
      if (session) {
        addSession(session);
      }
    },
    [createSession, addSession]
  );

  const handleSelectSession = useCallback(
    (session: Session) => {
      router.push(`/session/${session.id}`);
    },
    [router]
  );

  const handleStartSession = useCallback(
    async (session: Session) => {
      updateSession(session.id, { status: 'starting' });
      const result = await startSession(session.id);
      if (result.error) {
        updateSession(session.id, { status: 'error' });
      }
    },
    [startSession, updateSession]
  );

  const handleStopSession = useCallback(
    async (session: Session) => {
      updateSession(session.id, { status: 'stopping' });
      const success = await stopSession(session.id);
      if (success) {
        updateSession(session.id, { status: 'idle' });
      }
    },
    [stopSession, updateSession]
  );

  const handleDeleteSession = useCallback(
    async (session: Session) => {
      if (confirm(`Delete session "${session.name}"?`)) {
        const success = await deleteSession(session.id);
        if (success) {
          removeSession(session.id);
        }
      }
    },
    [deleteSession, removeSession]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white">
      <Header />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Sessions
            </h2>
            <p className="text-gray-500 mt-0.5 sm:mt-1 text-sm sm:text-base">
              Manage your Claude Code sessions
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl sm:rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {loading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-gray-700"></div>
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-t-blue-500 animate-spin"></div>
            </div>
            <p className="text-gray-500 mt-4 text-sm">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-xl ring-1 ring-gray-700/50">
              <svg
                className="w-10 h-10 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">No sessions yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm sm:text-base">
              Create your first session to start using Claude Code in the cloud
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              Create Your First Session
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onSelect={handleSelectSession}
                onStart={handleStartSession}
                onStop={handleStopSession}
                onDelete={handleDeleteSession}
              />
            ))}
          </div>
        )}
      </main>

      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSession}
      />
    </div>
  );
}
