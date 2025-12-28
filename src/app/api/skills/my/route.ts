import { NextRequest, NextResponse } from 'next/server';
import { skillManager } from '@/server/skills';
import { getAuthContext } from '@/server/auth';
import type { UserSkillListResponse } from '@/types/skill';

// GET /api/skills/my - Get user's installed skills with details
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);

  // Require authentication
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const skills = skillManager.getUserSkillsWithDetails(auth.userId);

    const response: UserSkillListResponse = {
      skills,
      total: skills.length,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=10',
      },
    });
  } catch (error) {
    console.error('Failed to get user skills:', error);
    return NextResponse.json(
      { error: 'Failed to get user skills' },
      { status: 500 }
    );
  }
}
