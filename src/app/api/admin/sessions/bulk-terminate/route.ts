import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { sessionStatsStore } from '@/server/session/SessionStatsStore';
import type { BulkTerminateRequest } from '@/types/adminSession';

// POST /api/admin/sessions/bulk-terminate - Bulk terminate sessions
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = (await request.json()) as BulkTerminateRequest;

    if (!body.sessionIds || !Array.isArray(body.sessionIds) || body.sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'sessionIds array is required' },
        { status: 400 }
      );
    }

    // Limit bulk operations
    if (body.sessionIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 sessions can be terminated at once' },
        { status: 400 }
      );
    }

    const result = sessionStatsStore.bulkTerminate(body.sessionIds);

    return NextResponse.json({
      message: `${result.terminated.length} sessions terminated`,
      ...result,
    });
  } catch (error) {
    console.error('Error bulk terminating sessions:', error);
    return NextResponse.json(
      { error: 'Failed to bulk terminate sessions' },
      { status: 500 }
    );
  }
}
