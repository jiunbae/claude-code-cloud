'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Layout';

// Generate anonymous name with 6-digit ID for better uniqueness (900,000 combinations)
function generateAnonymousName(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `Anonymous ${randomNum}`;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [validated, setValidated] = useState(false);
  const [anonymousName] = useState(() => generateAnonymousName());
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    permission: 'view' | 'interact';
    allowAnonymous?: boolean;
  } | null>(null);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await fetch(`/api/join/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid share link');
          return;
        }

        setSessionInfo(data);
        setValidated(true);
      } catch (err) {
        setError('Failed to validate share link');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleJoin = async (isAnonymousJoin: boolean = false) => {
    const joinName = isAnonymousJoin ? anonymousName : name.trim();
    if (!sessionInfo || !joinName) return;

    setLoading(true);
    try {
      // Join as participant
      const res = await fetch(`/api/sessions/${sessionInfo.sessionId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: joinName,
          permission: sessionInfo.permission,
          isAnonymous: isAnonymousJoin,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join session');
      }

      const data = await res.json();

      // Store participant info in session storage
      sessionStorage.setItem(
        `participant:${sessionInfo.sessionId}`,
        JSON.stringify(data)
      );

      // For anonymous participants, also store anonymous info for AuthGuard bypass
      if (isAnonymousJoin) {
        sessionStorage.setItem(
          `anonymous:${sessionInfo.sessionId}`,
          JSON.stringify({
            ...data,
            isAnonymous: true,
          })
        );
      }

      // Store share token for API access
      sessionStorage.setItem(`shareToken:${sessionInfo.sessionId}`, token);

      // Redirect to session page
      router.push(`/session/${sessionInfo.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
      setLoading(false);
    }
  };

  if (loading && !validated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-900/50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Invalid Share Link</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-900/50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Join Session</h2>
            <p className="text-gray-400">
              You&apos;ve been invited to{' '}
              {sessionInfo?.permission === 'interact' ? 'collaborate on' : 'view'} a Claude Code session
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            {sessionInfo?.allowAnonymous ? (
              <>
                {/* Anonymous viewer mode */}
                <div className="text-center">
                  <div className="px-4 py-3 bg-gray-700 rounded-lg mb-4">
                    <p className="text-sm text-gray-400 mb-1">You will join as:</p>
                    <p className="text-lg font-medium text-white">{anonymousName}</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
                    <div className="px-2 py-1 rounded bg-yellow-900/50 text-yellow-400">
                      Anonymous Viewer
                    </div>
                    <div className="px-2 py-1 rounded bg-blue-900/50 text-blue-400">
                      View only
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoin(true)}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Joining...' : 'Join as Viewer'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Regular join mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div
                    className={`px-2 py-1 rounded ${
                      sessionInfo?.permission === 'interact'
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-blue-900/50 text-blue-400'
                    }`}
                  >
                    {sessionInfo?.permission === 'interact' ? 'Can interact' : 'View only'}
                  </div>
                </div>

                <button
                  onClick={() => handleJoin(false)}
                  disabled={!name.trim() || loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining...' : 'Join Session'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
