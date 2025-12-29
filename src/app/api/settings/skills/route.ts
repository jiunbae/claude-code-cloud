import { NextRequest, NextResponse } from 'next/server';
import { skillManager, SkillNotFoundError, SkillAlreadyInstalledError, SkillDependencyError } from '@/server/skills';
import { getAuthContext } from '@/server/auth';
import type { UserSkillCreate, UserSkillListResponse, SkillInstallResponse } from '@/types/skill';

// GET /api/settings/skills - Get user's installed skills
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const skills = skillManager.getUserSkillsWithDetails(auth.userId);

    // Filter to only installed skills
    const installedSkills = skills.filter((s) => s.isInstalled);

    const response: UserSkillListResponse = {
      skills: installedSkills,
      total: installedSkills.length,
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

// POST /api/settings/skills - Install a skill
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json() as UserSkillCreate;

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

    if (error instanceof SkillNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof SkillAlreadyInstalledError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SkillDependencyError) {
      return NextResponse.json({
        error: error.message,
        missingDependencies: error.missingDependencies,
      }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to install skill';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
