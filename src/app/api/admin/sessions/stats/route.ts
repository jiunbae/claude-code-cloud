import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { sessionStatsStore } from '@/server/session/SessionStatsStore';

// GET /api/admin/sessions/stats - Get overall session statistics
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const stats = sessionStatsStore.getOverallStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching session stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session statistics' },
      { status: 500 }
    );
  }
}
