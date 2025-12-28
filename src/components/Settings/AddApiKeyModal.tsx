'use client';

import { useState } from 'react';
import type { ApiKeyProvider } from '@/types/settings';

interface AddApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddApiKeyModal({ isOpen, onClose, onSuccess }: AddApiKeyModalProps) {
  const [provider, setProvider] = useState<ApiKeyProvider>('anthropic');
  const [keyName, setKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  const resetForm = () => {
    setProvider('anthropic');
    setKeyName('');
    setApiKey('');
    setError('');
    setFieldError(null);
    setVerified(null);
  };

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key first');
      setFieldError('apiKey');
      return;
    }

    setVerifying(true);
    setVerified(null);
    setError('');
    setFieldError(null);

    try {
      const response = await fetch('/api/settings/api-keys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, provider }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setVerified(data.valid);
        if (!data.valid) {
          setError(data.error || 'API key is invalid');
          setFieldError('apiKey');
        }
      } else {
        setError(data.error || 'Failed to verify API key');
        setFieldError('apiKey');
      }
    } catch (err) {
      console.error('Failed to verify API key:', err);
      setError('Failed to verify API key');
      setFieldError('apiKey');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, keyName, apiKey }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        resetForm();
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to add API key');
        setFieldError(data.field || null);
      }
    } catch (err) {
      console.error('Failed to add API key:', err);
      setError('Failed to add API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Add API Key</h2>
          <button
            onClick={handleClose}
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

          {/* Provider Select */}
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-300 mb-1.5">
              Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as ApiKeyProvider);
                setVerified(null);
              }}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="google">Google AI (Gemini)</option>
            </select>
          </div>

          {/* Key Name */}
          <div>
            <label htmlFor="keyName" className="block text-sm font-medium text-gray-300 mb-1.5">
              Key Name
            </label>
            <input
              id="keyName"
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
              className={`w-full px-4 py-2.5 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                fieldError === 'keyName' ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="My API Key"
            />
            <p className="mt-1 text-xs text-gray-500">A friendly name to identify this key</p>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1.5">
              API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setVerified(null);
                }}
                required
                className={`w-full px-4 py-2.5 pr-24 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono ${
                  fieldError === 'apiKey' ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder={
                  provider === 'anthropic'
                    ? 'sk-ant-...'
                    : provider === 'openai'
                    ? 'sk-...'
                    : 'AIza...'
                }
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || !apiKey.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            {verified === true && (
              <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                API key verified successfully
              </p>
            )}
            {verified === false && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                API key verification failed
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Your API key will be encrypted before storage
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
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
                  Adding...
                </span>
              ) : (
                'Add Key'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
