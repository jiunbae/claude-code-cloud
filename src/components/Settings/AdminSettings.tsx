'use client';

import { useState, useEffect } from 'react';
import { useGlobalSettings } from '@/hooks/useSettings';
import type { GlobalSettings, ApiKeyProvider } from '@/types/settings';

const API_PROVIDER_OPTIONS: { value: ApiKeyProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
];

export function AdminSettings() {
  const { settings, isLoading, updateSettings, isSaving } = useGlobalSettings();
  const [localSettings, setLocalSettings] = useState<Partial<GlobalSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize local settings from fetched settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
  }, [settings]);

  // Check for changes
  useEffect(() => {
    if (settings && localSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(localSettings);
      setHasChanges(changed);
    }
  }, [localSettings, settings]);

  const handleSave = async () => {
    const result = await updateSettings(localSettings);
    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      setHasChanges(false);
    } else {
      setSaveMessage({ type: 'error', text: result.error || 'Failed to save settings' });
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Admin Settings</h2>
        <p className="text-gray-400 text-sm">Global configuration for all users</p>
      </div>

      {/* Registration & Access */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
          Registration & Access
        </h3>

        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-white">Allow Registration</h4>
            <p className="text-gray-400 text-sm">Allow new users to register</p>
          </div>
          <button
            onClick={() => setLocalSettings((s) => ({ ...s, allowRegistration: !s.allowRegistration }))}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${localSettings.allowRegistration ? 'bg-blue-600' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${localSettings.allowRegistration ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-white">Require Email Verification</h4>
            <p className="text-gray-400 text-sm">Users must verify email before accessing</p>
          </div>
          <button
            onClick={() => setLocalSettings((s) => ({ ...s, requireEmailVerification: !s.requireEmailVerification }))}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${localSettings.requireEmailVerification ? 'bg-blue-600' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${localSettings.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Maximum Users Allowed</label>
          <input
            type="number"
            min="1"
            max="10000"
            value={localSettings.maxUsersAllowed || 100}
            onChange={(e) => setLocalSettings((s) => ({ ...s, maxUsersAllowed: Number(e.target.value) }))}
            className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* API Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
          API Settings
        </h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Default API Provider</label>
          <select
            value={localSettings.defaultApiProvider || 'anthropic'}
            onChange={(e) => setLocalSettings((s) => ({ ...s, defaultApiProvider: e.target.value as ApiKeyProvider }))}
            className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {API_PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-white">Allow User API Keys</h4>
            <p className="text-gray-400 text-sm">Users can configure their own API keys</p>
          </div>
          <button
            onClick={() => setLocalSettings((s) => ({ ...s, allowUserApiKeys: !s.allowUserApiKeys }))}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${localSettings.allowUserApiKeys ? 'bg-blue-600' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${localSettings.allowUserApiKeys ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-white">Require API Key</h4>
            <p className="text-gray-400 text-sm">Require API key to start sessions</p>
          </div>
          <button
            onClick={() => setLocalSettings((s) => ({ ...s, requireApiKey: !s.requireApiKey }))}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${localSettings.requireApiKey ? 'bg-blue-600' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${localSettings.requireApiKey ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Session Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
          Session Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Max Sessions Per User</label>
            <input
              type="number"
              min="1"
              max="100"
              value={localSettings.maxSessionsPerUser || 10}
              onChange={(e) => setLocalSettings((s) => ({ ...s, maxSessionsPerUser: Number(e.target.value) }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Session Timeout (minutes)</label>
            <input
              type="number"
              min="5"
              max="1440"
              value={localSettings.sessionTimeoutMinutes || 60}
              onChange={(e) => setLocalSettings((s) => ({ ...s, sessionTimeoutMinutes: Number(e.target.value) }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Skills Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
          Skills Settings
        </h3>

        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-white">Enable Skills</h4>
            <p className="text-gray-400 text-sm">Enable skill system globally</p>
          </div>
          <button
            onClick={() => setLocalSettings((s) => ({ ...s, skillsEnabled: !s.skillsEnabled }))}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${localSettings.skillsEnabled ? 'bg-blue-600' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${localSettings.skillsEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-white">Allow User Skill Installation</h4>
            <p className="text-gray-400 text-sm">Users can install their own skills</p>
          </div>
          <button
            onClick={() => setLocalSettings((s) => ({ ...s, allowUserSkillInstall: !s.allowUserSkillInstall }))}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${localSettings.allowUserSkillInstall ? 'bg-blue-600' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${localSettings.allowUserSkillInstall ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`p-4 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-900/50 border border-green-700 text-green-300'
              : 'bg-red-900/50 border border-red-700 text-red-300'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${hasChanges && !isSaving
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        {hasChanges && (
          <button
            onClick={handleReset}
            className="px-6 py-2 rounded-lg font-medium text-gray-400 hover:text-white transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
