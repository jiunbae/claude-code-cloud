import { NextRequest, NextResponse } from 'next/server';
import { skillManager } from '@/server/skills';
import { getAuthContext } from '@/server/auth';
import type { UserSkillUpdate } from '@/types/skill';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/skills/:id - Get skill details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: skillName } = await params;
  const auth = await getAuthContext(request);

  // Require authentication
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const skill = skillManager.getSkill(skillName);

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Get skill content
    const content = skillManager.getSkillContent(skillName);

    return NextResponse.json({
      skill,
      content,
    });
  } catch (error) {
    console.error('Failed to get skill:', error);
    return NextResponse.json(
      { error: 'Failed to get skill' },
      { status: 500 }
    );
  }
}

// PATCH /api/skills/:id - Update user's skill settings (toggle, config)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: skillName } = await params;
  const auth = await getAuthContext(request);

  // Require authentication
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json() as UserSkillUpdate;

    // Toggle enabled state
    if (body.isEnabled !== undefined) {
      const updated = skillManager.toggleSkill(auth.userId, skillName, body.isEnabled);
      if (!updated) {
        return NextResponse.json(
          { error: 'Skill not installed' },
          { status: 404 }
        );
      }
    }

    // Update config
    if (body.config !== undefined) {
      const updated = skillManager.updateSkillConfig(auth.userId, skillName, body.config);
      if (!updated) {
        return NextResponse.json(
          { error: 'Skill not installed' },
          { status: 404 }
        );
      }
    }

    // Get updated skill
    const skills = skillManager.getUserSkillsWithDetails(auth.userId);
    const skill = skills.find((s) => s.name === skillName);

    return NextResponse.json({ skill });
  } catch (error) {
    console.error('Failed to update skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

// DELETE /api/skills/:id - Uninstall skill
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: skillName } = await params;
  const auth = await getAuthContext(request);

  // Require authentication
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const deleted = skillManager.uninstallSkill(auth.userId, skillName);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Skill not found or not installed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to uninstall skill:', error);

    // Handle dependency error
    const message = error instanceof Error ? error.message : 'Failed to uninstall skill';
    if (message.includes('Cannot uninstall')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
