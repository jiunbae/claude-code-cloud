'use client';

import { useState, useCallback } from 'react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export default function ShareDialog({ isOpen, onClose, sessionId }: ShareDialogProps) {
  const [permission, setPermission] = useState<'view' | 'interact'>('view');
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number | undefined>(24);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission: allowAnonymous ? 'view' : permission,
          allowAnonymous,
          expiresInHours: expiresInHours || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create share link');
      }

      const data = await res.json();
      setShareUrl(data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  }, [sessionId, permission, allowAnonymous, expiresInHours]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareUrl]);

  const handleClose = useCallback(() => {
    setShareUrl(null);
    setError(null);
    setCopied(false);
    setAllowAnonymous(false);
    setPermission('view');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Share Session</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
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

        {shareUrl ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
                <button
                  onClick={handleCopy}
                  className={`px-3 py-2 rounded-lg font-medium text-sm ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-400">
              {allowAnonymous ? (
                <>
                  <span className="text-yellow-400">Anonymous users</span> can view this session without logging in
                </>
              ) : (
                <>
                  Anyone with this link can{' '}
                  <span className="text-white">
                    {permission === 'interact' ? 'interact with' : 'view'}
                  </span>{' '}
                  this session
                </>
              )}
              {expiresInHours && (
                <>
                  {' '}for{' '}
                  <span className="text-white">{expiresInHours} hours</span>
                </>
              )}
              .
            </p>

            <button
              onClick={() => setShareUrl(null)}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Create Another Link
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Permission
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPermission('view')}
                  disabled={allowAnonymous}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                    permission === 'view' || allowAnonymous
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${allowAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  View Only
                </button>
                <button
                  onClick={() => setPermission('interact')}
                  disabled={allowAnonymous}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                    permission === 'interact' && !allowAnonymous
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${allowAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Can Interact
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Allow Anonymous Viewers
                  </label>
                  <p className="text-xs text-gray-500">
                    Anyone can view without logging in
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAllowAnonymous(!allowAnonymous);
                    if (!allowAnonymous) setPermission('view');
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    allowAnonymous ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      allowAnonymous ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {allowAnonymous && (
                <p className="text-xs text-yellow-500 mt-2">
                  Anonymous viewers are limited to View Only permission
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expires In
              </label>
              <select
                value={expiresInHours || ''}
                onChange={(e) =>
                  setExpiresInHours(e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Never</option>
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Share Link'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
