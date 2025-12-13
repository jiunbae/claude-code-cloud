import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { participantManager } from '@/server/collaboration/ParticipantManager';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/sessions/:id/participants - List participants
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = sessionStore.get(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const participants = participantManager.getAll(id);

    return NextResponse.json({
      count: participants.length,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        permission: p.permission,
        joinedAt: p.joinedAt,
        lastSeenAt: p.lastSeenAt,
        cursorPosition: p.cursorPosition,
      })),
    });
  } catch (error) {
    console.error('Participants API error:', error);
    return NextResponse.json({ error: 'Failed to list participants' }, { status: 500 });
  }
}

// POST /api/sessions/:id/participants - Join session
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = sessionStore.get(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();
    const name = body.name || 'Anonymous';
    const permission = body.permission || 'view';

    const participant = participantManager.join(id, name, permission);

    return NextResponse.json({
      participantId: participant.id,
      name: participant.name,
      color: participant.color,
      permission: participant.permission,
    });
  } catch (error) {
    console.error('Participants API error:', error);
    return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
  }
}

// DELETE /api/sessions/:id/participants - Leave session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const participantId = url.searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json({ error: 'participantId required' }, { status: 400 });
    }

    participantManager.leave(id, participantId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Participants API error:', error);
    return NextResponse.json({ error: 'Failed to leave session' }, { status: 500 });
  }
}
