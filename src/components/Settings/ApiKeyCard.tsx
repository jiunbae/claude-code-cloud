'use client';

import { useState } from 'react';
import type { ApiKey } from '@/types/settings';

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  isLoading?: boolean;
}

export default function ApiKeyCard({
  apiKey,
  onDelete,
  onToggleActive,
  isLoading = false,
}: ApiKeyCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'anthropic':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'openai':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'google':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'anthropic':
        return 'Anthropic';
      case 'openai':
        return 'OpenAI';
      case 'google':
        return 'Google AI';
      default:
        return provider;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    // Use undefined to let the browser use the user's default locale
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(apiKey.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        apiKey.isActive
          ? 'bg-gray-800/80 border-green-500/30'
          : 'bg-gray-800/40 border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Key Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getProviderBadge(
                apiKey.provider
              )}`}
            >
              {getProviderName(apiKey.provider)}
            </span>
            {apiKey.isActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                Active
              </span>
            )}
          </div>

          <h3 className="text-white font-medium truncate">{apiKey.keyName}</h3>

          <div className="mt-2 flex items-center gap-2">
            <code className="text-sm text-gray-400 font-mono bg-gray-900/50 px-2 py-1 rounded">
              {apiKey.keyPreview}
            </code>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            <span>Created: {formatDate(apiKey.createdAt)}</span>
            {apiKey.lastUsedAt && (
              <span className="ml-4">Last used: {formatDate(apiKey.lastUsedAt)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle Active */}
          <button
            onClick={() => onToggleActive(apiKey.id, !apiKey.isActive)}
            disabled={isLoading}
            className={`p-2 rounded transition-colors disabled:opacity-50 ${
              apiKey.isActive
                ? 'text-green-400 hover:bg-green-500/10'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            title={apiKey.isActive ? 'Deactivate' : 'Activate'}
          >
            {apiKey.isActive ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
              title="Delete"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
