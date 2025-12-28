'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/Admin';

interface GlobalSetting {
  key: string;
  hasValue: boolean;
  maskedValue?: string;
  description?: string;
  updatedAt: string;
  updatedBy?: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<GlobalSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (key: string) => {
    if (!editValue.trim()) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          value: editValue,
          description: editDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save setting');
      }

      setEditingKey(null);
      setEditValue('');
      setEditDescription('');
      setError(null); // Clear error on success
      await fetchSettings();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete "${key}"? This will fall back to environment variable if available.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete setting');
      }

      setError(null); // Clear error on success
      await fetchSettings();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAddNew = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      setError('Key and value are required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: newKey.toUpperCase(),
          value: newValue,
          description: newDescription || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add setting');
      }

      setShowAddModal(false);
      setNewKey('');
      setNewValue('');
      setNewDescription('');
      setError(null); // Clear error on success
      await fetchSettings();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Global Settings</h1>
                <p className="text-gray-400 mt-1">Manage API keys and environment variables</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Key
            </button>
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

          {/* Settings list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.map((setting) => (
                <div
                  key={setting.key}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white font-mono">
                        {setting.key}
                      </h3>
                      {setting.description && (
                        <p className="text-gray-400 text-sm mt-1">{setting.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4">
                        {setting.hasValue ? (
                          <span className="flex items-center gap-2 text-green-400 text-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            {setting.maskedValue || '****'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-500 text-sm">
                            <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                            Not set
                          </span>
                        )}
                        {setting.updatedAt && new Date(setting.updatedAt).getTime() > 0 && (
                          <span className="text-gray-500 text-xs">
                            Updated: {new Date(setting.updatedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingKey(setting.key);
                          setEditValue('');
                          setEditDescription(setting.description || '');
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                      >
                        Edit
                      </button>
                      {setting.hasValue && setting.updatedAt && new Date(setting.updatedAt).getTime() > 0 && (
                        <button
                          onClick={() => handleDelete(setting.key)}
                          className="px-3 py-1.5 text-sm bg-red-900/50 text-red-400 rounded hover:bg-red-900 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edit form */}
                  {editingKey === setting.key && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">New Value</label>
                          <input
                            type="password"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Enter new value..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Enter description..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingKey(null);
                              setEditValue('');
                              setEditDescription('');
                            }}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(setting.key)}
                            disabled={saving || !editValue.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {settings.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No settings configured. Add a new key to get started.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add New Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Add New Setting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  placeholder="e.g., ANTHROPIC_API_KEY"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Uppercase letters, numbers, and underscores only</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Value</label>
                <input
                  type="password"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter value..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewKey('');
                  setNewValue('');
                  setNewDescription('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNew}
                disabled={saving || !newKey.trim() || !newValue.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Setting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminGuard>
  );
}
