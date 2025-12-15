import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PTY_API_URL = process.env.PTY_API_URL || 'http://localhost:3003';

// POST /api/sessions/:id/codex/stop - Stop Codex CLI process
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = sessionStore.get(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${PTY_API_URL}/sessions/${id}/codex/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: body.force === true }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      // If codex not running, treat as already stopped
      if (response.status === 400) {
        return NextResponse.json({ success: true, message: 'Codex already stopped' });
      }
      return NextResponse.json({ error: result?.error || `PTY API request failed with status ${response.status}` }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Codex stopped',
    });
  } catch (error) {
    console.error('Failed to stop codex:', error);
    return NextResponse.json(
      { error: `Failed to stop codex: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
