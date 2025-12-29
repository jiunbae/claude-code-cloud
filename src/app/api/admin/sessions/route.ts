import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { sessionStatsStore } from '@/server/session/SessionStatsStore';
import type { SessionFilters } from '@/types/adminSession';

// GET /api/admin/sessions - Get all sessions with pagination and filters
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const filters: SessionFilters = {};

    const userId = searchParams.get('userId');
    if (userId) filters.userId = userId;

    const status = searchParams.get('status');
    if (status && ['active', 'idle', 'terminated'].includes(status)) {
      filters.status = status as SessionFilters['status'];
    }

    const startDate = searchParams.get('startDate');
    if (startDate) filters.startDate = startDate;

    const endDate = searchParams.get('endDate');
    if (endDate) filters.endDate = endDate;

    const search = searchParams.get('search');
    if (search) filters.search = search;

    const result = sessionStatsStore.getAllStats(page, pageSize, filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
