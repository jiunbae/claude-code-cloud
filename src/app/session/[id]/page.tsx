'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Layout';
import { ShareDialog, ParticipantList } from '@/components/Collaboration';
import { AuthGuard } from '@/components/Auth';
import { useSession } from '@/hooks/useSession';
import type { Session } from '@/types';

// Dynamic import for Terminal (SSR disabled)
const Terminal = dynamic(() => import('@/components/Terminal/Terminal'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  ),
});

// Dynamic import for MultiTabTerminal (SSR disabled)
const MultiTabTerminal = dynamic(
  () => import('@/components/Terminal/MultiTabTerminal'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    ),
  }
);

// Dynamic import for FileExplorer
const FileExplorer = dynamic(
  () => import('@/components/FileExplorer/FileExplorer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    ),
  }
);

type ViewTab = 'claude' | 'codex' | 'terminal' | 'files';

function SessionView() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [, setTerminalStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [activeTab, setActiveTab] = useState<ViewTab>('claude');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { loading, error, getSession, startSession, stopSession } = useSession();
  const [shellStarting, setShellStarting] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [shellError, setShellError] = useState<string | null>(null);
  const [codexStarting, setCodexStarting] = useState(false);
  const [codexReady, setCodexReady] = useState(false);
  const [codexError, setCodexError] = useState<string | null>(null);

  // Fetch session on mount
  useEffect(() => {
    const fetchSession = async () => {
      const data = await getSession(sessionId);
      setSession(data);
    };
    fetchSession();
  }, [sessionId, getSession]);

  // Poll for status updates
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getSession(sessionId);
      if (data) {
        setSession(data);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, getSession]);

  const handleStart = useCallback(async () => {
    if (!session) return;
    setSession({ ...session, status: 'starting' });
    const result = await startSession(sessionId);
    if (result.error) {
      setSession({ ...session, status: 'error' });
    } else {
      setSession({ ...session, status: 'running' });
    }
  }, [session, sessionId, startSession]);

  const handleStop = useCallback(async () => {
    if (!session) return;
    setSession({ ...session, status: 'stopping' });
    const success = await stopSession(sessionId);
    if (success) {
      setSession({ ...session, status: 'idle' });
    }
  }, [session, sessionId, stopSession]);

  const isRunning = session?.status === 'running';
  const isStarting = session?.status === 'starting';
  const isStopping = session?.status === 'stopping';

  const ensureShellStarted = useCallback(async () => {
    if (shellReady || shellStarting) return;

    setShellStarting(true);
    setShellError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/shell/start`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start shell');
      }

      setShellReady(true);
    } catch (err) {
      setShellError((err as Error).message);
      setShellReady(false);
    } finally {
      setShellStarting(false);
    }
  }, [sessionId, shellReady, shellStarting]);

  const ensureCodexStarted = useCallback(async () => {
    if (codexReady || codexStarting) return;

    setCodexStarting(true);
    setCodexError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/codex/start`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Codex');
      }

      setCodexReady(true);
    } catch (err) {
      setCodexError((err as Error).message);
      setCodexReady(false);
    } finally {
      setCodexStarting(false);
    }
  }, [sessionId, codexReady, codexStarting]);

  // Start shell in the background once the session is available
  useEffect(() => {
    if (!session?.workspace) return;
    if (session.workspace.status !== 'ready') return;
    ensureShellStarted();
  }, [session?.workspace?.status, ensureShellStarted]);

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Session not found</h2>
          <p className="text-gray-400 mb-4">The session you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header title={session.name} showBackButton />

      {/* Session Info Bar - Responsive */}
      <div className="bg-gray-800/80 backdrop-blur border-b border-gray-700/50 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          {/* Session Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                isRunning
                  ? 'bg-green-500 shadow-lg shadow-green-500/50'
                  : isStarting || isStopping
                    ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50'
                    : session.status === 'error'
                      ? 'bg-red-500 shadow-lg shadow-red-500/50'
                      : 'bg-gray-500'
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm sm:text-base truncate">{session.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isRunning ? 'bg-green-500/20 text-green-400' :
                  isStarting || isStopping ? 'bg-yellow-500/20 text-yellow-400' :
                  session.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {session.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-md font-mono">{session.workspace?.name || session.workspace?.slug || 'Unknown workspace'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ParticipantList
              sessionId={sessionId}
              onShareClick={() => setIsShareOpen(true)}
            />
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={isStopping}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isStopping ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="hidden sm:inline">Stopping...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                    <span className="hidden sm:inline">Stop Claude</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isStarting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="hidden sm:inline">Starting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="hidden sm:inline">Start Claude</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Bar - Mobile Optimized */}
      <div className="bg-gray-800/50 border-b border-gray-700/50 px-2 sm:px-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('claude')}
            className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'claude'
                ? 'text-white border-b-2 border-blue-500 bg-blue-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Claude</span>
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('codex');
              ensureCodexStarted();
            }}
            className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'codex'
                ? 'text-white border-b-2 border-green-500 bg-green-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              <span>Codex</span>
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('terminal');
              ensureShellStarted();
            }}
            className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'terminal'
                ? 'text-white border-b-2 border-blue-500 bg-blue-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6h18M3 12h18M3 18h18"
                />
              </svg>
              <span>Terminal</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'files'
                ? 'text-white border-b-2 border-blue-500 bg-blue-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span>Files</span>
            </span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {activeTab === 'claude' ? (
          isRunning || isStarting ? (
            <Terminal sessionId={sessionId} terminal="claude" onStatusChange={setTerminalStatus} />
          ) : (
            <div className="flex-1 bg-[#1a1b26] flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-300 mb-2">Claude not running</h3>
                <p className="text-gray-500 mb-4">Start Claude to use Claude Code</p>
                <button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Start Claude
                </button>
              </div>
            </div>
          )
        ) : activeTab === 'codex' ? (
          codexReady ? (
            <Terminal sessionId={sessionId} terminal="codex" onStatusChange={setTerminalStatus} />
          ) : codexStarting ? (
            <div className="flex-1 bg-gray-900 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="flex-1 bg-[#1a1b26] flex items-center justify-center">
              <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-300 mb-2">Codex not started</h3>
                <p className="text-gray-500 mb-4">
                  {codexError ? codexError : 'Start Codex to use OpenAI Codex CLI.'}
                </p>
                <button
                  onClick={ensureCodexStarted}
                  disabled={codexStarting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Start Codex
                </button>
              </div>
            </div>
          )
        ) : activeTab === 'terminal' ? (
          shellReady ? (
            <MultiTabTerminal sessionId={sessionId} onStatusChange={setTerminalStatus} />
          ) : shellStarting ? (
            <div className="flex-1 bg-gray-900 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="flex-1 bg-[#1a1b26] flex items-center justify-center">
              <div className="text-center max-w-md px-4">
                <h3 className="text-xl font-medium text-gray-300 mb-2">Terminal not started</h3>
                <p className="text-gray-500 mb-4">
                  {shellError ? shellError : 'Start the shell to use a regular terminal.'}
                </p>
                <button
                  onClick={ensureShellStarted}
                  disabled={shellStarting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Start Terminal
                </button>
              </div>
            </div>
          )
        ) : (
          <FileExplorer sessionId={sessionId} />
        )}
      </div>

      {error && (
        <div className="absolute bottom-4 right-4 p-4 bg-red-900/90 border border-red-700 rounded-lg text-red-300 max-w-md">
          {error}
        </div>
      )}

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        sessionId={sessionId}
      />
    </div>
  );
}

export default function SessionPage() {
  return (
    <AuthGuard>
      <SessionView />
    </AuthGuard>
  );
}
