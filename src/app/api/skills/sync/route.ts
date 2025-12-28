import { NextRequest, NextResponse } from 'next/server';
import { skillManager } from '@/server/skills';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import type { SkillSyncResponse } from '@/types/skill';

// POST /api/skills/sync - Synchronize skill registry with filesystem
// Admin only: This endpoint scans filesystem and modifies database
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const result = await skillManager.syncRegistry();

    const response: SkillSyncResponse = {
      result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to sync skills:', error);
    return NextResponse.json(
      { error: 'Failed to sync skills' },
      { status: 500 }
    );
  }
}
