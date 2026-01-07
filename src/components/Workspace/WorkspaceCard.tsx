'use client';

import { useState, useEffect } from 'react';
import type { Workspace } from '@/types';

interface WorkspaceCardProps {
  workspace: Workspace;
  onDelete: (id: string) => void;
  onSelect?: (workspace: Workspace) => void;
}

function getStatusColor(status: Workspace['status']): string {
  switch (status) {
    case 'ready':
      return 'bg-green-500';
    case 'creating':
    case 'cloning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

function getStatusLabel(status: Workspace['status']): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'creating':
      return 'Creating...';
    case 'cloning':
      return 'Cloning...';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

function formatRelativeDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

export default function WorkspaceCard({ workspace, onDelete, onSelect }: WorkspaceCardProps) {
  // Use state for relative time to avoid hydration mismatch
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    setFormattedTime(formatRelativeDate(workspace.createdAt));
    // Update time every minute
    const interval = setInterval(() => {
      setFormattedTime(formatRelativeDate(workspace.createdAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [workspace.createdAt]);

  const handleDelete = () => {
    if (workspace.sessionCount && workspace.sessionCount > 0) {
      alert(`Cannot delete workspace with ${workspace.sessionCount} connected session(s). Please delete all sessions first.`);
      return;
    }

    if (confirm(`Are you sure you want to delete "${workspace.name}"? This will also delete all files in the workspace directory.`)) {
      onDelete(workspace.id);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{workspace.name}</h3>
          <p className="text-sm text-gray-400 font-mono truncate">{workspace.slug}</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(workspace.status)}`} />
          <span className="text-xs text-gray-400">{getStatusLabel(workspace.status)}</span>
        </div>
      </div>

      {/* Description */}
      {workspace.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{workspace.description}</p>
      )}

      {/* Info */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {workspace.sessionCount ?? 0} sessions
        </span>
        <span className="flex items-center gap-1">
          {workspace.sourceType === 'git' ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
              </svg>
              Git
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Empty
            </>
          )}
        </span>
        <span>Created {formattedTime || '\u00A0'}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onSelect && workspace.status === 'ready' && (
          <button
            onClick={() => onSelect(workspace)}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            New Session
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={workspace.status === 'creating' || workspace.status === 'cloning'}
          className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
