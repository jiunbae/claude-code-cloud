'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ClaudeConfigFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
}

interface ConfigSummary {
  hasSettings: boolean;
  hasClaudeMd: boolean;
  skillCount: number;
  totalSize: number;
}

export function ClaudeConfigManager() {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<ClaudeConfigFile[]>([]);
  const [summary, setSummary] = useState<ConfigSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New file/folder modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newItemType, setNewItemType] = useState<'file' | 'directory'>('file');
  const [newItemName, setNewItemName] = useState('');

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/claude-config?action=summary', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch {
      // Ignore summary errors
    }
  }, []);

  const fetchFiles = useCallback(async (path: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/claude-config?path=${encodeURIComponent(path)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const data = await response.json();
      setFiles(data.files);
      setCurrentPath(path);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchSummary();
  }, [fetchFiles, fetchSummary]);

  const openFile = async (filePath: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/claude-config?action=read&path=${encodeURIComponent(filePath)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to read file');
      }

      const data = await response.json();
      setFileContent(data.content);
      setEditingFile(filePath);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (!editingFile) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/claude-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ path: editingFile, content: fileContent }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save file');
      }

      setEditingFile(null);
      await fetchFiles(currentPath);
      await fetchSummary();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (filePath: string, isDirectory: boolean) => {
    const confirmMsg = isDirectory
      ? `Delete directory "${filePath}" and all its contents?`
      : `Delete file "${filePath}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/api/claude-config?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      await fetchFiles(currentPath);
      await fetchSummary();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const createItem = async () => {
    if (!newItemName.trim()) return;

    try {
      const fullPath = currentPath ? `${currentPath}/${newItemName}` : newItemName;

      const response = await fetch('/api/claude-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          path: fullPath,
          content: newItemType === 'file' ? '' : undefined,
          action: newItemType === 'directory' ? 'createDir' : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create');
      }

      setShowNewModal(false);
      setNewItemName('');
      await fetchFiles(currentPath);
      await fetchSummary();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);

      const response = await fetch('/api/claude-config/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload');
      }

      await fetchFiles(currentPath);
      await fetchSummary();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const navigateUp = () => {
    const parts = currentPath.split('/');
    parts.pop();
    fetchFiles(parts.join('/'));
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Editor view
  if (editingFile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Editing: {editingFile}</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditingFile(null)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveFile}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <textarea
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          className="w-full h-96 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-y"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Claude Configuration Directory</h3>
        <p className="text-gray-400 text-sm">
          Manage your Claude configuration files, skills, and settings.
        </p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-white">{summary.skillCount}</div>
            <div className="text-sm text-gray-400">Skills</div>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-white">{summary.hasSettings ? 'Yes' : 'No'}</div>
            <div className="text-sm text-gray-400">settings.json</div>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-white">{summary.hasClaudeMd ? 'Yes' : 'No'}</div>
            <div className="text-sm text-gray-400">CLAUDE.md</div>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-white">{formatSize(summary.totalSize)}</div>
            <div className="text-sm text-gray-400">Total Size</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentPath && (
            <button
              onClick={navigateUp}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Go up"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-gray-400 font-mono text-sm">
            /{currentPath || '(root)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            New
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={() => fetchFiles(currentPath)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          {files.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No files yet. Create a new file or upload one to get started.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Name</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-400 w-24">Size</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-400 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {files.map((file) => (
                  <tr key={file.path} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => file.type === 'directory' ? fetchFiles(file.path) : openFile(file.path)}
                        className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors"
                      >
                        {file.type === 'directory' ? (
                          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {file.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {file.type === 'file' ? formatSize(file.size) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteItem(file.path, file.type === 'directory')}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setNewItemName('settings.json');
            setNewItemType('file');
            setShowNewModal(true);
          }}
          disabled={summary?.hasSettings}
          className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="text-white font-medium">Create settings.json</div>
          <div className="text-gray-400 text-sm">Configure Claude CLI settings</div>
        </button>
        <button
          onClick={() => {
            setNewItemName('CLAUDE.md');
            setNewItemType('file');
            setShowNewModal(true);
          }}
          disabled={summary?.hasClaudeMd}
          className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="text-white font-medium">Create CLAUDE.md</div>
          <div className="text-gray-400 text-sm">Custom instructions for Claude</div>
        </button>
        <button
          onClick={() => {
            setCurrentPath('skills');
            fetchFiles('skills');
          }}
          className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:border-blue-500 transition-colors text-left"
        >
          <div className="text-white font-medium">Manage Skills</div>
          <div className="text-gray-400 text-sm">{summary?.skillCount || 0} skills installed</div>
        </button>
      </div>

      {/* New Item Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="itemType"
                    checked={newItemType === 'file'}
                    onChange={() => setNewItemType('file')}
                    className="text-blue-600"
                  />
                  <span className="text-white">File</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="itemType"
                    checked={newItemType === 'directory'}
                    onChange={() => setNewItemType('directory')}
                    className="text-blue-600"
                  />
                  <span className="text-white">Directory</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={newItemType === 'file' ? 'filename.md' : 'folder-name'}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setNewItemName('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createItem}
                disabled={!newItemName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
