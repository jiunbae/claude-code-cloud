import { NextRequest, NextResponse } from 'next/server';
import { skillManager } from '@/server/skills';
import { getAuthContext } from '@/server/auth';
import type { SkillCategory, SkillListResponse } from '@/types/skill';

// GET /api/skills - Get available skills list
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
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || undefined;
    const category = searchParams.get('category') as SkillCategory | undefined;
    const isSystem = searchParams.get('isSystem');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Filter params without pagination for counting
    const filterParams = {
      query,
      category,
      isSystem: isSystem !== null ? isSystem === 'true' : undefined,
    };

    // Params with pagination for fetching
    const params = {
      ...filterParams,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    const skills = skillManager.getAvailableSkills(params);
    // Get total count without pagination for accurate pagination info
    const total = skillManager.getSkillCount(filterParams);

    const response: SkillListResponse = {
      skills,
      total,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Failed to get skills:', error);
    return NextResponse.json(
      { error: 'Failed to get skills' },
      { status: 500 }
    );
  }
}
