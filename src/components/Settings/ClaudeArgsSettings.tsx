'use client';

import { useState, useEffect } from 'react';
import type { ClaudeArgsConfig, ClaudePermissionMode } from '@/types/settings';
import { CLAUDE_MODEL_OPTIONS, CLAUDE_TOOLS, DEFAULT_CLAUDE_ARGS } from '@/types/settings';

interface ClaudeArgsSettingsProps {
  /** Whether this is admin mode (global settings) or user mode */
  isAdmin?: boolean;
  /** Initial config from API */
  initialConfig?: ClaudeArgsConfig | null;
  /** Effective config (for showing inheritance in user mode) */
  effectiveConfig?: ClaudeArgsConfig;
  /** Callback when config changes */
  onSave: (config: ClaudeArgsConfig) => Promise<{ success: boolean; error?: string }>;
  /** Callback to reset/delete config */
  onReset?: () => Promise<{ success: boolean; error?: string }>;
  /** Loading state */
  isLoading?: boolean;
}

const PERMISSION_MODE_OPTIONS: { value: ClaudePermissionMode; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Use Claude\'s default permission settings' },
  { value: 'plan', label: 'Plan Mode', description: 'Claude presents plan before execution' },
  { value: 'auto-edit', label: 'Auto Edit', description: 'Automatically approves file edits' },
  { value: 'full-auto', label: 'Full Auto', description: 'Full autonomous mode (use with caution)' },
];

export function ClaudeArgsSettings({
  isAdmin = false,
  initialConfig,
  effectiveConfig,
  onSave,
  onReset,
  isLoading = false,
}: ClaudeArgsSettingsProps) {
  const [config, setConfig] = useState<ClaudeArgsConfig>(initialConfig || DEFAULT_CLAUDE_ARGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom inputs
  const [customTool, setCustomTool] = useState('');
  const [customMcpServer, setCustomMcpServer] = useState('');
  const [customArg, setCustomArg] = useState('');

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  useEffect(() => {
    const changed = JSON.stringify(config) !== JSON.stringify(initialConfig || DEFAULT_CLAUDE_ARGS);
    setHasChanges(changed);
  }, [config, initialConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await onSave(config);
      if (result.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setHasChanges(false);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save settings' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReset = async () => {
    if (!onReset) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await onReset();
      if (result.success) {
        setConfig(DEFAULT_CLAUDE_ARGS);
        setMessage({ type: 'success', text: 'Settings reset to defaults' });
        setHasChanges(false);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to reset settings' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred while resetting' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const addToArray = (field: 'allowedTools' | 'disallowedTools' | 'mcpServers' | 'customArgs', value: string) => {
    if (!value.trim()) return;
    const current = config[field] || [];
    if (!current.includes(value.trim())) {
      setConfig({ ...config, [field]: [...current, value.trim()] });
    }
  };

  const removeFromArray = (field: 'allowedTools' | 'disallowedTools' | 'mcpServers' | 'customArgs', value: string) => {
    const current = config[field] || [];
    setConfig({ ...config, [field]: current.filter((v) => v !== value) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {isAdmin ? 'Global Claude CLI Arguments' : 'Claude CLI Arguments'}
        </h3>
        <p className="text-gray-400 text-sm">
          {isAdmin
            ? 'Configure default Claude CLI arguments for all users. Users can override these settings in their own profiles.'
            : 'Override global Claude CLI arguments for your sessions. Leave empty to use global defaults.'}
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Model</label>
        <select
          value={config.model || ''}
          onChange={(e) => setConfig({ ...config, model: e.target.value || undefined })}
          className="w-full max-w-md px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Default (auto-select)</option>
          {CLAUDE_MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {!isAdmin && effectiveConfig?.model && config.model !== effectiveConfig.model && (
          <p className="text-xs text-gray-500">Global default: {effectiveConfig.model}</p>
        )}
      </div>

      {/* Permission Mode */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Permission Mode</label>
        <select
          value={config.permissionMode || 'default'}
          onChange={(e) => setConfig({ ...config, permissionMode: e.target.value as ClaudePermissionMode })}
          className="w-full max-w-md px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {PERMISSION_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
        {config.permissionMode === 'full-auto' && (
          <p className="text-xs text-yellow-400">
            Warning: Full auto mode allows Claude to execute any action without approval.
          </p>
        )}
      </div>

      {/* Allowed Tools */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Allowed Tools</label>
        <p className="text-xs text-gray-500">Restrict Claude to only use these tools. Leave empty to allow all tools.</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {(config.allowedTools || []).map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center px-2 py-1 bg-green-900/50 border border-green-700 rounded text-sm text-green-300"
            >
              {tool}
              <button
                onClick={() => removeFromArray('allowedTools', tool)}
                className="ml-1 hover:text-green-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={customTool}
            onChange={(e) => {
              if (e.target.value) {
                addToArray('allowedTools', e.target.value);
                setCustomTool('');
              }
            }}
            className="flex-1 max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a tool...</option>
            {CLAUDE_TOOLS.filter((t) => !(config.allowedTools || []).includes(t.value)).map((tool) => (
              <option key={tool.value} value={tool.value}>
                {tool.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Disallowed Tools */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Disallowed Tools</label>
        <p className="text-xs text-gray-500">Prevent Claude from using these tools.</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {(config.disallowedTools || []).map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center px-2 py-1 bg-red-900/50 border border-red-700 rounded text-sm text-red-300"
            >
              {tool}
              <button
                onClick={() => removeFromArray('disallowedTools', tool)}
                className="ml-1 hover:text-red-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                addToArray('disallowedTools', e.target.value);
              }
            }}
            className="flex-1 max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a tool...</option>
            {CLAUDE_TOOLS.filter((t) => !(config.disallowedTools || []).includes(t.value)).map((tool) => (
              <option key={tool.value} value={tool.value}>
                {tool.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MCP Servers */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">MCP Servers</label>
        <p className="text-xs text-gray-500">Add MCP (Model Context Protocol) server configurations as JSON strings.</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {(config.mcpServers || []).map((server, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-1 bg-purple-900/50 border border-purple-700 rounded text-sm text-purple-300 max-w-xs truncate"
              title={server}
            >
              {server.length > 40 ? `${server.substring(0, 40)}...` : server}
              <button
                onClick={() => removeFromArray('mcpServers', server)}
                className="ml-1 hover:text-purple-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customMcpServer}
            onChange={(e) => setCustomMcpServer(e.target.value)}
            placeholder='{"name": "server", "command": "..."}'
            className="flex-1 max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              addToArray('mcpServers', customMcpServer);
              setCustomMcpServer('');
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">System Prompt Override</label>
        <p className="text-xs text-gray-500">Replace Claude&apos;s default system prompt entirely.</p>
        <textarea
          value={config.systemPrompt || ''}
          onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value || undefined })}
          placeholder="Leave empty to use default system prompt"
          rows={3}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-y"
        />
      </div>

      {/* Append System Prompt */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Append to System Prompt</label>
        <p className="text-xs text-gray-500">Add additional instructions to Claude&apos;s default system prompt.</p>
        <textarea
          value={config.appendSystemPrompt || ''}
          onChange={(e) => setConfig({ ...config, appendSystemPrompt: e.target.value || undefined })}
          placeholder="Additional instructions..."
          rows={3}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-y"
        />
      </div>

      {/* Max Turns */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Max Turns</label>
        <p className="text-xs text-gray-500">Maximum number of conversation turns before stopping.</p>
        <input
          type="number"
          min="1"
          max="1000"
          value={config.maxTurns || ''}
          onChange={(e) => setConfig({ ...config, maxTurns: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="No limit"
          className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Verbose Mode */}
      <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
        <div>
          <h4 className="text-sm font-medium text-white">Verbose Mode</h4>
          <p className="text-gray-400 text-sm">Enable verbose output for debugging</p>
        </div>
        <button
          onClick={() => setConfig({ ...config, verbose: !config.verbose })}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${config.verbose ? 'bg-blue-600' : 'bg-gray-600'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${config.verbose ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Custom Args */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Custom Arguments</label>
        <p className="text-xs text-gray-500">Add custom CLI arguments (advanced users only).</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {(config.customArgs || []).map((arg, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-gray-300"
            >
              {arg}
              <button
                onClick={() => removeFromArray('customArgs', arg)}
                className="ml-1 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customArg}
            onChange={(e) => setCustomArg(e.target.value)}
            placeholder="--custom-flag value"
            className="flex-1 max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              addToArray('customArgs', customArg);
              setCustomArg('');
            }}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/50 border border-green-700 text-green-300'
              : 'bg-red-900/50 border border-red-700 text-red-300'
          }`}
        >
          {message.text}
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
        {onReset && (
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-6 py-2 rounded-lg font-medium text-gray-400 hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>
        )}
      </div>
    </div>
  );
}
