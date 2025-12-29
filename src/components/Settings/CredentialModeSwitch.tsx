'use client';

import type { CredentialMode } from '@/types/auth';

interface CredentialModeSwitchProps {
  mode: CredentialMode;
  onModeChange: (mode: CredentialMode) => void;
  isLoading?: boolean;
}

export default function CredentialModeSwitch({
  mode,
  onModeChange,
  isLoading = false,
}: CredentialModeSwitchProps) {
  return (
    <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Credential Mode</h3>
          <p className="text-xs text-gray-400 mt-1">
            Choose how you want to authenticate with AI providers
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-900 rounded-lg">
          <button
            onClick={() => onModeChange('global')}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'global'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              System
            </span>
          </button>

          <button
            onClick={() => onModeChange('custom')}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'custom'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Custom Keys
            </span>
          </button>
        </div>
      </div>

      {/* Mode Description */}
      <div className="mt-4 flex gap-4">
        <div
          className={`flex-1 p-3 rounded-lg border ${
            mode === 'global'
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-gray-800/30 border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {mode === 'global' && (
              <svg
                className="w-4 h-4 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            <span
              className={`text-sm font-medium ${
                mode === 'global' ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              System Credentials
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Use the API keys configured by the system administrator.
          </p>
        </div>

        <div
          className={`flex-1 p-3 rounded-lg border ${
            mode === 'custom'
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-gray-800/30 border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {mode === 'custom' && (
              <svg
                className="w-4 h-4 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            <span
              className={`text-sm font-medium ${
                mode === 'custom' ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              Custom Keys
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Use your own API keys for full control over usage and billing.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Updating credential mode...
        </div>
      )}
    </div>
  );
}
