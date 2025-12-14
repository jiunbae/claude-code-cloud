'use client';

import type { Workspace } from '@/types';
import WorkspaceCard from './WorkspaceCard';

interface WorkspaceListProps {
  workspaces: Workspace[];
  onDelete: (id: string) => void;
  onSelect?: (workspace: Workspace) => void;
  loading?: boolean;
}

export default function WorkspaceList({ workspaces, onDelete, onSelect, loading }: WorkspaceListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-4 bg-gray-700 rounded w-full mb-4" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-700 rounded flex-1" />
              <div className="h-8 bg-gray-700 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-300">No workspaces</h3>
        <p className="mt-2 text-sm text-gray-500">
          Create a workspace to start organizing your projects.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onDelete={onDelete}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
