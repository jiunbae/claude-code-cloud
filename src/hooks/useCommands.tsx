'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export interface CommandItem {
  id: string;
  category: 'session' | 'workspace' | 'action' | 'navigation';
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface UseCommandsOptions {
  onClose: () => void;
}

export function useCommands({ onClose }: UseCommandsOptions): CommandItem[] {
  const router = useRouter();
  const { sessions } = useSessionStore();
  const { workspaces } = useWorkspaceStore();

  return useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Sessions
    sessions.forEach((session) => {
      items.push({
        id: `session-${session.id}`,
        category: 'session',
        label: session.name,
        description: session.workspace?.name,
        icon: (
          <div
            className={`w-2 h-2 rounded-full ${
              session.status === 'running'
                ? 'bg-green-500'
                : session.status === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-500'
            }`}
          />
        ),
        action: () => {
          router.push(`/session/${session.id}`);
          onClose();
        },
        keywords: [session.workspace?.name || ''],
      });
    });

    // Workspaces
    workspaces.forEach((workspace) => {
      items.push({
        id: `workspace-${workspace.id}`,
        category: 'workspace',
        label: workspace.name,
        description: workspace.description || workspace.slug,
        icon: (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        ),
        action: () => {
          router.push(`/?tab=workspaces`);
          onClose();
        },
        keywords: [workspace.slug, workspace.description || ''],
      });
    });

    // Actions
    items.push({
      id: 'action-new-session',
      category: 'action',
      label: 'New Session',
      description: 'Create a new Claude Code session',
      icon: (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: () => {
        router.push('/?tab=sessions&action=new');
        onClose();
      },
      keywords: ['create', 'add'],
    });

    items.push({
      id: 'action-new-workspace',
      category: 'action',
      label: 'New Workspace',
      description: 'Create a new workspace',
      icon: (
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: () => {
        router.push('/?tab=workspaces&action=new');
        onClose();
      },
      keywords: ['create', 'add', 'folder'],
    });

    // Navigation
    items.push({
      id: 'nav-dashboard',
      category: 'navigation',
      label: 'Dashboard',
      description: 'Go to dashboard',
      icon: (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      action: () => {
        router.push('/');
        onClose();
      },
      keywords: ['home', 'main'],
    });

    items.push({
      id: 'nav-sessions',
      category: 'navigation',
      label: 'Sessions',
      description: 'View all sessions',
      icon: (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      action: () => {
        router.push('/?tab=sessions');
        onClose();
      },
    });

    items.push({
      id: 'nav-workspaces',
      category: 'navigation',
      label: 'Workspaces',
      description: 'View all workspaces',
      icon: (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
      action: () => {
        router.push('/?tab=workspaces');
        onClose();
      },
    });

    return items;
  }, [sessions, workspaces, router, onClose]);
}
