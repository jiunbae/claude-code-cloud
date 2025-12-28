import { NextRequest, NextResponse } from 'next/server';
import { skillManager } from '@/server/skills';
import { getAuthContext } from '@/server/auth';
import type { UserSkillCreate, SkillInstallResponse } from '@/types/skill';

// POST /api/skills/install - Install a skill for the user
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
    const body = await request.json() as UserSkillCreate;

    // Validate required fields
    if (!body.skillName?.trim()) {
      return NextResponse.json(
        { error: 'Skill name is required' },
        { status: 400 }
      );
    }

    const skill = skillManager.installSkill(auth.userId, {
      skillName: body.skillName,
      config: body.config || {},
    });

    const response: SkillInstallResponse = {
      success: true,
      skill,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to install skill:', error);

    // Handle specific errors
    const message = error instanceof Error ? error.message : 'Failed to install skill';

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes('already installed') || message.includes('Missing dependencies')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
