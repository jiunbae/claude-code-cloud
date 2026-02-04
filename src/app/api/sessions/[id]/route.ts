import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { getAuthContext } from '@/server/auth';
import { shareTokenStore } from '@/server/collaboration/ShareTokenStore';
import { isAuthDisabled } from '@/server/middleware/auth';

const PTY_API_URL = process.env.PTY_API_URL || 'http://localhost:3003';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to get session status from PTY API
async function getPtyStatus(sessionId: string): Promise<{ isRunning: boolean; pid?: number }> {
  try {
    const response = await fetch(`${PTY_API_URL}/sessions/${sessionId}/status`);
    if (response.ok) {
      const data = await response.json();
      // PTY API returns { running, status, pid }
      const isRunning = Boolean(data.running ?? data.isRunning);
      return { isRunning, pid: data.pid };
    }
  } catch {
    // PTY API not available
  }
  return { isRunning: false };
}

// GET /api/sessions/:id - Get session details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);
  const session = sessionStore.get(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Check for share token in header or query parameter
  const shareToken = request.headers.get('x-share-token') ||
    request.nextUrl.searchParams.get('shareToken');

  // Validate share token if provided
  // Security policy for share tokens:
  // - allowAnonymous: true -> Anyone with the token can access (anonymous viewers)
  // - allowAnonymous: false -> Only authenticated users with the token can access
  // Note: Non-anonymous tokens grant access to ANY authenticated user with the token,
  // not specific users. This is by design for simple link sharing. For user-specific
  // access control, use the owner/public session settings instead.
  let hasValidShareToken = false;
  if (shareToken) {
    const tokenResult = shareTokenStore.validateToken(shareToken);
    hasValidShareToken =
      tokenResult.valid &&
      tokenResult.sessionId === id &&
      (tokenResult.allowAnonymous || !!auth || authDisabled);
  }

  // Check access: owner, public, legacy session (no owner), or valid share token
  const canAccess =
    authDisabled ||
    !session.ownerId ||
    session.isPublic ||
    (auth && session.ownerId === auth.userId) ||
    hasValidShareToken;

  if (!canAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get runtime info from PTY API
  const { isRunning, pid } = await getPtyStatus(id);

  // If PTY is not running but DB still says running/starting, surface as idle
  const effectiveStatus =
    isRunning
      ? 'running'
      : session.status === 'running' || session.status === 'starting'
        ? 'idle'
        : session.status;

  return NextResponse.json({
    session: {
      ...session,
      status: effectiveStatus,
      pid,
    },
  });
}

// PATCH /api/sessions/:id - Update session
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);
  const session = sessionStore.get(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Only owner can update (or legacy sessions with no owner)
  if (!authDisabled && session.ownerId && session.ownerId !== '' && (!auth || session.ownerId !== auth.userId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json();
  const updated = sessionStore.update(id, body);

  return NextResponse.json({ session: updated });
}

// DELETE /api/sessions/:id - Delete session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);
  const session = sessionStore.get(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Only owner can delete (or legacy sessions with no owner)
  if (!authDisabled && session.ownerId && session.ownerId !== '' && (!auth || session.ownerId !== auth.userId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Stop if running via PTY API
  try {
    const { isRunning } = await getPtyStatus(id);
    if (isRunning) {
      await fetch(`${PTY_API_URL}/sessions/${id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
    }
  } catch {
    // PTY API might not be available, continue with deletion
  }

  const deleted = sessionStore.delete(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
