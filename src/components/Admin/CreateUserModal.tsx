'use client';

import { useState } from 'react';
import type { UserRole, CredentialMode } from '@/types/auth';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [credentialMode, setCredentialMode] = useState<CredentialMode>('global');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldError(null);
    setLoading(true);

    try {
      // Build request body
      const requestBody: Record<string, unknown> = {
        email,
        username,
        password,
        role,
        credentialMode,
      };

      // Add credentials if custom mode is selected
      if (credentialMode === 'custom') {
        const credentials: Record<string, string> = {};
        if (anthropicApiKey.trim()) {
          credentials.ANTHROPIC_API_KEY = anthropicApiKey.trim();
        }
        if (openaiApiKey.trim()) {
          credentials.OPENAI_API_KEY = openaiApiKey.trim();
        }
        if (Object.keys(credentials).length > 0) {
          requestBody.credentials = credentials;
        }
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form
        setEmail('');
        setUsername('');
        setPassword('');
        setRole('user');
        setCredentialMode('global');
        setAnthropicApiKey('');
        setOpenaiApiKey('');
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to create user');
        setFieldError(data.field || null);
      }
    } catch {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Create New User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-2.5 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                fieldError === 'email' ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={`w-full px-4 py-2.5 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                fieldError === 'username' ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="username"
            />
            <p className="mt-1 text-xs text-gray-500">3-20 characters, letters, numbers, underscore</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 py-2.5 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                fieldError === 'password' ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Password"
            />
            <p className="mt-1 text-xs text-gray-500">Min 8 characters with letters and numbers</p>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1.5">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Credential Mode Section */}
          <div className="pt-4 border-t border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              API Credential Mode
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="credentialMode"
                  value="global"
                  checked={credentialMode === 'global'}
                  onChange={() => setCredentialMode('global')}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <div>
                  <span className="text-white group-hover:text-blue-400 transition-colors">
                    Use Global Settings
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Use the API keys configured in Admin Settings
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="credentialMode"
                  value="custom"
                  checked={credentialMode === 'custom'}
                  onChange={() => setCredentialMode('custom')}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <div>
                  <span className="text-white group-hover:text-blue-400 transition-colors">
                    Use Custom Credentials
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Set user-specific API keys
                  </p>
                </div>
              </label>
            </div>

            {/* Custom Credentials Fields */}
            {credentialMode === 'custom' && (
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg space-y-4">
                <div>
                  <label htmlFor="anthropicApiKey" className="block text-sm font-medium text-gray-300 mb-1.5">
                    ANTHROPIC_API_KEY
                    <span className="text-gray-500 font-normal ml-1">(Optional)</span>
                  </label>
                  <input
                    id="anthropicApiKey"
                    type="password"
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                    placeholder="sk-ant-..."
                  />
                </div>
                <div>
                  <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-300 mb-1.5">
                    OPENAI_API_KEY
                    <span className="text-gray-500 font-normal ml-1">(Optional)</span>
                  </label>
                  <input
                    id="openaiApiKey"
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                    placeholder="sk-..."
                  />
                </div>
                <p className="text-xs text-gray-500">
                  If not set, the user will fall back to global settings for missing keys.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
