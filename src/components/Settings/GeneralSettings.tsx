'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import type { ThemeMode, Language } from '@/types/settings';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
];

const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-5-20250514', label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
];

export function GeneralSettings() {
  const { settings, isLoading, updateSettings, isSaving } = useSettings();
  const [localSettings, setLocalSettings] = useState({
    theme: 'dark' as ThemeMode,
    language: 'ko' as Language,
    defaultModel: 'claude-sonnet-4-5-20250514',
    terminalFontSize: 14,
    editorFontSize: 14,
    autoSave: true,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize local settings from fetched settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        theme: settings.theme,
        language: settings.language,
        defaultModel: settings.defaultModel,
        terminalFontSize: settings.terminalFontSize,
        editorFontSize: settings.editorFontSize,
        autoSave: settings.autoSave,
      });
    }
  }, [settings]);

  // Check for changes
  useEffect(() => {
    if (settings) {
      const changed =
        localSettings.theme !== settings.theme ||
        localSettings.language !== settings.language ||
        localSettings.defaultModel !== settings.defaultModel ||
        localSettings.terminalFontSize !== settings.terminalFontSize ||
        localSettings.editorFontSize !== settings.editorFontSize ||
        localSettings.autoSave !== settings.autoSave;
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
      setLocalSettings({
        theme: settings.theme,
        language: settings.language,
        defaultModel: settings.defaultModel,
        terminalFontSize: settings.terminalFontSize,
        editorFontSize: settings.editorFontSize,
        autoSave: settings.autoSave,
      });
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
        <h2 className="text-xl font-semibold text-white mb-2">General Settings</h2>
        <p className="text-gray-400 text-sm">Customize your experience</p>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Theme</label>
        <div className="flex gap-3">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setLocalSettings((s) => ({ ...s, theme: option.value }))}
              className={`
                px-4 py-2 rounded-lg border transition-colors
                ${localSettings.theme === option.value
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Language</label>
        <select
          value={localSettings.language}
          onChange={(e) => setLocalSettings((s) => ({ ...s, language: e.target.value as Language }))}
          className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Default Model */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Default Model</label>
        <select
          value={localSettings.defaultModel}
          onChange={(e) => setLocalSettings((s) => ({ ...s, defaultModel: e.target.value }))}
          className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-gray-500 text-sm">The model used by default when creating new sessions</p>
      </div>

      {/* Font Sizes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Terminal Font Size: {localSettings.terminalFontSize}px
          </label>
          <input
            type="range"
            min="8"
            max="32"
            value={localSettings.terminalFontSize}
            onChange={(e) => setLocalSettings((s) => ({ ...s, terminalFontSize: Number(e.target.value) }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>8px</span>
            <span>32px</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Editor Font Size: {localSettings.editorFontSize}px
          </label>
          <input
            type="range"
            min="8"
            max="32"
            value={localSettings.editorFontSize}
            onChange={(e) => setLocalSettings((s) => ({ ...s, editorFontSize: Number(e.target.value) }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>8px</span>
            <span>32px</span>
          </div>
        </div>
      </div>

      {/* Auto Save */}
      <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
        <div>
          <h3 className="text-sm font-medium text-white">Auto Save</h3>
          <p className="text-gray-400 text-sm">Automatically save changes in the editor</p>
        </div>
        <button
          onClick={() => setLocalSettings((s) => ({ ...s, autoSave: !s.autoSave }))}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${localSettings.autoSave ? 'bg-blue-600' : 'bg-gray-600'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${localSettings.autoSave ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
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
