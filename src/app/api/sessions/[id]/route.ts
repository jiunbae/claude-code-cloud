import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';

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
      return { isRunning: data.isRunning, pid: data.pid };
    }
  } catch {
    // PTY API not available
  }
  return { isRunning: false };
}

// GET /api/sessions/:id - Get session details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = sessionStore.get(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get runtime info from PTY API
  const { isRunning, pid } = await getPtyStatus(id);

  return NextResponse.json({
    session: {
      ...session,
      status: isRunning ? 'running' : session.status,
      pid,
    },
  });
}

// PATCH /api/sessions/:id - Update session
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const session = sessionStore.update(id, body);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session });
}

// DELETE /api/sessions/:id - Delete session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

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
