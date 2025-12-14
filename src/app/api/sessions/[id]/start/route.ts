import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { workspaceStore } from '@/server/workspace/WorkspaceStore';
import { workspaceManager } from '@/server/workspace/WorkspaceManager';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PTY_API_URL = process.env.PTY_API_URL || 'http://localhost:3003';

// POST /api/sessions/:id/start - Start Claude Code process
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = sessionStore.getWithWorkspace(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get workspace to determine project path
  const workspace = workspaceStore.get(session.workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  if (workspace.status !== 'ready') {
    return NextResponse.json(
      { error: `Workspace is not ready (status: ${workspace.status})` },
      { status: 400 }
    );
  }

  // Get actual filesystem path from workspace
  const projectPath = workspaceManager.getWorkspacePath(workspace.ownerId, workspace.slug);

  try {
    sessionStore.updateStatus(id, 'starting');

    // Call PTY API server to start the session
    const response = await fetch(`${PTY_API_URL}/sessions/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        config: session.config,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      sessionStore.updateStatus(id, 'error');
      return NextResponse.json({ error: result.error }, { status: response.status });
    }

    sessionStore.updateStatus(id, 'running');

    return NextResponse.json({
      success: true,
      pid: result.pid,
      message: 'Claude Code started',
    });
  } catch (error) {
    sessionStore.updateStatus(id, 'error');
    console.error('Failed to start session:', error);
    return NextResponse.json(
      { error: `Failed to start session: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
