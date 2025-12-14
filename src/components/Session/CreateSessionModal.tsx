'use client';

import { useState, useEffect } from 'react';
import type { CreateSessionRequest, Workspace } from '@/types';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (request: CreateSessionRequest) => void;
  workspaces: Workspace[];
  selectedWorkspace?: Workspace | null;
  onCreateWorkspace?: () => void;
}

export default function CreateSessionModal({
  isOpen,
  onClose,
  onCreate,
  workspaces,
  selectedWorkspace,
  onCreateWorkspace,
}: CreateSessionModalProps) {
  const [name, setName] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [error, setError] = useState('');

  // Set default workspace when modal opens or selected workspace changes
  useEffect(() => {
    if (isOpen) {
      if (selectedWorkspace) {
        setWorkspaceId(selectedWorkspace.id);
      } else if (workspaces.length > 0 && !workspaceId) {
        setWorkspaceId(workspaces[0].id);
      }
    }
  }, [isOpen, selectedWorkspace, workspaces, workspaceId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Session name is required');
      return;
    }

    if (!workspaceId) {
      setError('Please select a workspace');
      return;
    }

    onCreate({
      name: name.trim(),
      workspaceId,
    });

    // Reset form
    setName('');
    setWorkspaceId('');
    onClose();
  };

  const readyWorkspaces = workspaces.filter((w) => w.status === 'ready');
  const selectedWs = workspaces.find((w) => w.id === workspaceId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Create New Session</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Session Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Session Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Feature Development"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Workspace Selection */}
            <div>
              <label htmlFor="workspace" className="block text-sm font-medium text-gray-300 mb-1">
                Workspace
              </label>
              {readyWorkspaces.length === 0 ? (
                <div className="text-center py-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <p className="text-sm text-gray-400 mb-2">No workspaces available</p>
                  {onCreateWorkspace && (
                    <button
                      type="button"
                      onClick={onCreateWorkspace}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      + Create a workspace first
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <select
                    id="workspace"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a workspace...</option>
                    {readyWorkspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name} ({ws.slug})
                      </option>
                    ))}
                  </select>
                  {selectedWs && (
                    <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{selectedWs.slug}</span>
                        <span className="text-gray-500">|</span>
                        <span>{selectedWs.sessionCount ?? 0} sessions</span>
                        <span className="text-gray-500">|</span>
                        <span>{selectedWs.sourceType === 'git' ? 'Git' : 'Empty'}</span>
                      </div>
                    </div>
                  )}
                  {onCreateWorkspace && (
                    <button
                      type="button"
                      onClick={onCreateWorkspace}
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      + Create new workspace...
                    </button>
                  )}
                </>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={readyWorkspaces.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
