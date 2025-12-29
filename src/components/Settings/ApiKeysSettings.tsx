'use client';

import { useEffect } from 'react';
import ApiKeyManager from './ApiKeyManager';
import CredentialModeSwitch from './CredentialModeSwitch';
import { useApiKeysStore } from '@/stores/apiKeysStore';
import { useAuthStore } from '@/stores/authStore';

export function ApiKeysSettings() {
  const { user } = useAuthStore();
  const { credentialMode, setCredentialMode, isUpdatingMode, setUpdatingMode } = useApiKeysStore();

  // Initialize credential mode from user data
  useEffect(() => {
    if (user?.credentialMode && credentialMode !== user.credentialMode) {
      setCredentialMode(user.credentialMode);
    }
  }, [user?.credentialMode, credentialMode, setCredentialMode]);

  const handleModeChange = async (mode: 'global' | 'custom') => {
    setUpdatingMode(true);
    try {
      const response = await fetch('/api/settings/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialMode: mode }),
        credentials: 'include',
      });

      if (response.ok) {
        setCredentialMode(mode);
      } else {
        console.error('Failed to update credential mode');
      }
    } catch (error) {
      console.error('Failed to update credential mode:', error);
    } finally {
      setUpdatingMode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">API Keys</h2>
        <p className="text-gray-400 text-sm">
          Manage your API keys for different providers. Choose between using system-provided
          credentials or your own custom API keys.
        </p>
      </div>

      {/* Credential Mode Switch */}
      <CredentialModeSwitch
        mode={credentialMode}
        onModeChange={handleModeChange}
        isLoading={isUpdatingMode}
      />

      {/* API Key Manager (only shown in custom mode) */}
      {credentialMode === 'custom' ? (
        <ApiKeyManager />
      ) : (
        <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-1">Using System Credentials</h3>
              <p className="text-gray-400 text-sm">
                You are currently using the system-provided API credentials. Sessions will use the
                globally configured API keys managed by the administrator.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Switch to &quot;Custom Keys&quot; mode to use your own API keys.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
