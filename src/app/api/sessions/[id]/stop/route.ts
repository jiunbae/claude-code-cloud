import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PTY_API_URL = process.env.PTY_API_URL || 'http://localhost:3003';

// POST /api/sessions/:id/stop - Stop Claude Code process
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = sessionStore.get(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    sessionStore.updateStatus(id, 'stopping');

    // Call PTY API server to stop the session
    const response = await fetch(`${PTY_API_URL}/sessions/${id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: body.force === true }),
    });

    const result = await response.json();

    if (!response.ok) {
      // If session not running, that's okay - just update status
      if (response.status === 400) {
        sessionStore.updateStatus(id, 'idle');
        return NextResponse.json({ success: true, message: 'Session already stopped' });
      }
      return NextResponse.json({ error: result.error }, { status: response.status });
    }

    sessionStore.updateStatus(id, 'idle');

    return NextResponse.json({
      success: true,
      message: 'Claude Code stopped',
    });
  } catch (error) {
    console.error('Failed to stop session:', error);
    return NextResponse.json(
      { error: `Failed to stop session: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
