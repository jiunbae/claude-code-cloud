'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/Admin';
import { ClaudeArgsSettings } from '@/components/Settings';
import type { ClaudeArgsConfig } from '@/types/settings';

export default function AdminClaudeArgsPage() {
  const [config, setConfig] = useState<ClaudeArgsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/claude-args', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Claude args configuration');
      }

      const data = await response.json();
      setConfig(data.config);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (newConfig: ClaudeArgsConfig): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/admin/claude-args', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to save configuration' };
      }

      const data = await response.json();
      setConfig(data.config);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const handleReset = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/admin/claude-args', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to reset configuration' };
      }

      const data = await response.json();
      setConfig(data.config);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/admin"
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Claude CLI Arguments</h1>
              <p className="text-gray-400 mt-1">Configure global default arguments for Claude CLI</p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-400 hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Settings */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <ClaudeArgsSettings
              isAdmin={true}
              initialConfig={config}
              onSave={handleSave}
              onReset={handleReset}
              isLoading={loading}
            />
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-800 rounded-lg">
            <h3 className="text-blue-300 font-medium mb-2">Priority Order</h3>
            <p className="text-gray-400 text-sm">
              Claude CLI arguments are applied in the following priority order (highest to lowest):
            </p>
            <ol className="list-decimal list-inside text-gray-400 text-sm mt-2 space-y-1">
              <li>Session-level overrides (set when starting a session)</li>
              <li>User-level settings (set in user profile)</li>
              <li>Global defaults (configured here)</li>
              <li>Built-in defaults</li>
            </ol>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
