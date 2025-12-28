'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ApiKey, ApiKeyProvider } from '@/types/settings';
import ApiKeyCard from './ApiKeyCard';
import AddApiKeyModal from './AddApiKeyModal';

interface ApiKeyManagerProps {
  initialFilter?: ApiKeyProvider | 'all';
}

export default function ApiKeyManager({ initialFilter = 'all' }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApiKeyProvider | 'all'>(initialFilter);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/settings/api-keys', {
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setApiKeys(data.apiKeys || []);
      } else {
        setError(data.error || 'Failed to load API keys');
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
      setError('Failed to load API keys');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    setError(null);

    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setApiKeys((prev) => prev.filter((key) => key.id !== id));
      } else {
        setError(data.error || 'Failed to delete API key');
      }
    } catch (err) {
      console.error('Failed to delete API key:', err);
      setError('Failed to delete API key');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setActionLoading(id);
    setError(null);

    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        // The backend handles deactivating other keys for the same provider.
        // Refetching the keys ensures the UI reflects the source of truth.
        await fetchApiKeys(false);
      } else {
        setError(data.error || 'Failed to update API key');
      }
    } catch (err) {
      console.error('Failed to update API key:', err);
      setError('Failed to update API key');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredKeys = filter === 'all'
    ? apiKeys
    : apiKeys.filter((key) => key.provider === filter);

  // Memoized key counts to avoid recalculating on every render
  const keyCountsByProvider = useMemo(() => {
    const counts: Record<ApiKeyProvider | 'all', number> = {
      anthropic: 0,
      openai: 0,
      google: 0,
      all: apiKeys.length,
    };

    for (const key of apiKeys) {
      counts[key.provider]++;
    }

    return counts;
  }, [apiKeys]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage your API keys for various AI providers
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Key
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-700 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          All ({keyCountsByProvider.all})
        </button>
        <button
          onClick={() => setFilter('anthropic')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            filter === 'anthropic'
              ? 'bg-orange-500/20 text-orange-400'
              : 'text-gray-400 hover:text-orange-400 hover:bg-orange-500/10'
          }`}
        >
          Anthropic ({keyCountsByProvider.anthropic})
        </button>
        <button
          onClick={() => setFilter('openai')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            filter === 'openai'
              ? 'bg-green-500/20 text-green-400'
              : 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
          }`}
        >
          OpenAI ({keyCountsByProvider.openai})
        </button>
        <button
          onClick={() => setFilter('google')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            filter === 'google'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
          }`}
        >
          Google ({keyCountsByProvider.google})
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="w-8 h-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {apiKeys.length === 0 ? (
            <>
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <p className="text-lg font-medium text-gray-400 mb-2">No API keys yet</p>
              <p className="text-sm">Add your first API key to get started</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
              >
                Add API Key
              </button>
            </>
          ) : (
            <>
              <p>No API keys found for this provider</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKeys.map((key) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              isLoading={actionLoading === key.id}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <h3 className="text-sm font-medium text-gray-300 mb-2">About API Keys</h3>
        <ul className="text-xs text-gray-500 space-y-1.5">
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            API keys are encrypted before being stored in the database
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Only the active key for each provider will be used in sessions
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your keys override system-provided keys when available
          </li>
        </ul>
      </div>

      {/* Add Key Modal */}
      <AddApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchApiKeys}
      />
    </div>
  );
}
