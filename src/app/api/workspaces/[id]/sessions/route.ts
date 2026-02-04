import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/auth/middleware';
import { workspaceStore } from '@/server/workspace/WorkspaceStore';
import { sessionStore } from '@/server/session/SessionStore';
import { isAuthDisabled } from '@/server/middleware/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/:id/sessions
 * Get all sessions for a specific workspace
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);
  if (!auth && !authDisabled) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const workspace = workspaceStore.get(id);

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  // Check ownership
  if (!authDisabled && workspace.ownerId !== auth?.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get sessions for this workspace
  const sessions = sessionStore.getByWorkspace(id);

  return NextResponse.json({ sessions });
}
