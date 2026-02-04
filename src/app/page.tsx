'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SessionCard, CreateSessionModal } from '@/components/Session';
import { WorkspaceList, CreateWorkspaceModal } from '@/components/Workspace';
import { LandingPage } from '@/components/Landing';
import { useAuth } from '@/hooks/useAuth';
import { Suspense } from 'react';
import { useSession } from '@/hooks/useSession';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { Session, CreateSessionRequest, Workspace, CreateWorkspaceRequest } from '@/types';

type TabType = 'sessions' | 'workspaces';

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  // Session hooks
  const {
    loading: sessionLoading,
    error: sessionError,
    getSessions,
    createSession,
    startSession,
    stopSession,
    deleteSession,
  } = useSession();
  const { sessions, setSessions, addSession, updateSession, removeSession } = useSessionStore();

  // Workspace hooks
  const {
    loading: workspaceLoading,
    error: workspaceError,
    getWorkspaces,
    createWorkspace,
    deleteWorkspace,
  } = useWorkspace();
  const { workspaces, setWorkspaces, addWorkspace, removeWorkspace } = useWorkspaceStore();

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      const [sessionsData, workspacesData] = await Promise.all([getSessions(), getWorkspaces()]);
      setSessions(sessionsData);
      setWorkspaces(workspacesData);
    };
    fetchData();
  }, [getSessions, getWorkspaces, setSessions, setWorkspaces]);

  // Handle URL params for tab and action
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');

    if (tab === 'sessions' || tab === 'workspaces') {
      setActiveTab(tab);
    }

    if (action === 'new') {
      if (tab === 'workspaces') {
        setIsCreateWorkspaceModalOpen(true);
      } else {
        setIsCreateSessionModalOpen(true);
      }
      // Clear the action param from URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('action');
      const newSearch = newParams.toString();
      router.replace(newSearch ? `/?${newSearch}` : '/');
    }
  }, [searchParams, router]);

  // Workspace handlers
  const handleCreateWorkspace = useCallback(
    async (request: CreateWorkspaceRequest) => {
      const workspace = await createWorkspace(request);
      if (workspace) {
        addWorkspace(workspace);
      }
    },
    [createWorkspace, addWorkspace]
  );

  const handleDeleteWorkspace = useCallback(
    async (id: string) => {
      const success = await deleteWorkspace(id);
      if (success) {
        removeWorkspace(id);
      }
    },
    [deleteWorkspace, removeWorkspace]
  );

  const handleSelectWorkspaceForSession = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setIsCreateSessionModalOpen(true);
  }, []);

  // Session handlers
  const handleCreateSession = useCallback(
    async (request: CreateSessionRequest) => {
      const session = await createSession(request);
      if (session) {
        addSession(session);
        setActiveTab('sessions');
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

  const loading = sessionLoading || workspaceLoading;
  const error = sessionError || workspaceError;

  return (
    <div className="h-full overflow-auto bg-gray-900 text-white">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
        {/* Tabs - Sessions first */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-700/50">
          {[
            { id: 'sessions' as const, label: 'Sessions', count: sessions.length },
            { id: 'workspaces' as const, label: 'Workspaces', count: workspaces.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-white' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-700 rounded">
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Workspaces Tab */}
        {activeTab === 'workspaces' && (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Workspaces
                </h2>
                <p className="text-gray-500 mt-0.5 sm:mt-1 text-sm sm:text-base">
                  Manage your project workspaces
                </p>
              </div>
              <button
                onClick={() => setIsCreateWorkspaceModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl sm:rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Workspace
              </button>
            </div>

            {/* Workspace List */}
            <WorkspaceList
              workspaces={workspaces}
              onDelete={handleDeleteWorkspace}
              onSelect={handleSelectWorkspaceForSession}
              loading={loading && workspaces.length === 0}
            />
          </>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Sessions
                </h2>
                <p className="text-gray-500 mt-0.5 sm:mt-1 text-sm sm:text-base">
                  Manage your Claude Code sessions
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedWorkspace(null);
                  setIsCreateSessionModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl sm:rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Session
              </button>
            </div>

            {/* Session List */}
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
                  {workspaces.length === 0
                    ? 'Create a workspace first, then create a session'
                    : 'Create a session to start using Claude Code in the cloud'}
                </p>
                <button
                  onClick={() => {
                    if (workspaces.length === 0) {
                      setActiveTab('workspaces');
                      setIsCreateWorkspaceModalOpen(true);
                    } else {
                      setSelectedWorkspace(null);
                      setIsCreateSessionModalOpen(true);
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                >
                  {workspaces.length === 0 ? 'Create a Workspace' : 'Create Your First Session'}
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
          </>
        )}
      </main>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />

      <CreateSessionModal
        isOpen={isCreateSessionModalOpen}
        onClose={() => {
          setIsCreateSessionModalOpen(false);
          setSelectedWorkspace(null);
        }}
        onCreate={handleCreateSession}
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        onCreateWorkspace={() => {
          setIsCreateSessionModalOpen(false);
          setIsCreateWorkspaceModalOpen(true);
        }}
      />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-gray-700"></div>
        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-t-blue-500 animate-spin"></div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Show dashboard for authenticated users (wrap in Suspense for useSearchParams)
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  );
}
