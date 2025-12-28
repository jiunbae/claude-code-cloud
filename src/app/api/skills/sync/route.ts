import { NextRequest, NextResponse } from 'next/server';
import { skillManager } from '@/server/skills';
import { getAuthContext } from '@/server/auth';
import type { SkillSyncResponse } from '@/types/skill';

// POST /api/skills/sync - Synchronize skill registry with filesystem
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);

  // Require authentication
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
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
