import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { workspaceManager } from '@/server/workspace/WorkspaceManager';
import { getAuthContext } from '@/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PTY_API_URL = process.env.PTY_API_URL || 'http://localhost:3003';

// POST /api/sessions/:id/start - Start Claude Code process
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Get authenticated user (optional - for credential resolution)
  const auth = await getAuthContext(request);
  const userId = auth?.userId;

  const session = sessionStore.getWithWorkspace(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Use workspace from session (already fetched via getWithWorkspace)
  const workspace = session.workspace;
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found for this session' }, { status: 404 });
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
        userId, // Pass user ID for credential resolution
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
