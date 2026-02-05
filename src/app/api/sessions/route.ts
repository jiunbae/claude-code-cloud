import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { workspaceStore } from '@/server/workspace/WorkspaceStore';
import { getAuthContext } from '@/server/auth';
import { isAuthDisabled } from '@/server/middleware/auth';
import type { CreateSessionRequest } from '@/types';

// GET /api/sessions - List user's sessions
export async function GET(request: NextRequest) {
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);

  // If authenticated, return user's sessions
  // If not authenticated, return empty (or public sessions in future)
  if (authDisabled) {
    const sessions = sessionStore.getAllWithWorkspace();
    return NextResponse.json(
      { sessions },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
        },
      }
    );
  }

  if (auth) {
    const sessions = sessionStore.getByOwner(auth.userId);
    return NextResponse.json(
      { sessions },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
        },
      }
    );
  }

  // Return empty for unauthenticated users
  return NextResponse.json(
    { sessions: [] },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    }
  );
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  // Require authentication for creating sessions
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);

  if (!auth && !authDisabled) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as CreateSessionRequest;

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.workspaceId?.trim()) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Verify workspace exists and user owns it
    const workspace = workspaceStore.get(body.workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (!authDisabled && auth && workspace.ownerId !== auth.userId) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

    // Check workspace is ready
    if (workspace.status !== 'ready') {
      return NextResponse.json(
        { error: `Workspace is not ready (status: ${workspace.status})` },
        { status: 400 }
      );
    }

    // Create session with owner
    const sessionOwnerId = authDisabled ? workspace.ownerId : auth!.userId;
    const session = sessionStore.create(body, sessionOwnerId);

    // Get session with workspace info
    const sessionWithWorkspace = sessionStore.getWithWorkspace(session.id);

    return NextResponse.json({ session: sessionWithWorkspace }, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
