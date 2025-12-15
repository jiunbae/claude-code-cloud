import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { workspaceManager } from '@/server/workspace/WorkspaceManager';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PTY_API_URL = process.env.PTY_API_URL || 'http://localhost:3003';

// POST /api/sessions/:id/codex/start - Start Codex CLI process
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = sessionStore.getWithWorkspace(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

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

  const projectPath = workspaceManager.getWorkspacePath(workspace.ownerId, workspace.slug);

  try {
    const response = await fetch(`${PTY_API_URL}/sessions/${id}/codex/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        config: session.config,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: result.error }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      pid: result.pid,
      message: 'Codex started',
    });
  } catch (error) {
    console.error('Failed to start codex:', error);
    return NextResponse.json(
      { error: `Failed to start codex: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
