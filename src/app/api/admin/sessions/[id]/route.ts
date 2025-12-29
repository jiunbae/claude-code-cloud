import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { sessionStatsStore } from '@/server/session/SessionStatsStore';

interface RouteParams {
  params: { id: string };
}

// GET /api/admin/sessions/[id] - Get session detail
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { id } = params;
    const session = sessionStatsStore.getSessionDetail(id);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error fetching session detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session detail' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sessions/[id] - Terminate session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { id } = params;
    const success = sessionStatsStore.terminateSession(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Session not found or already terminated' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Session terminated successfully',
      sessionId: id,
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    return NextResponse.json(
      { error: 'Failed to terminate session' },
      { status: 500 }
    );
  }
}
