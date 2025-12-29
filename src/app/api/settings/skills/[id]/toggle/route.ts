import { NextRequest, NextResponse } from 'next/server';
import { skillManager } from '@/server/skills';
import { getAuthContext } from '@/server/auth';

interface RouteParams {
  params: { id: string };
}

// POST /api/settings/skills/:id/toggle - Toggle skill enabled/disabled
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: skillName } = params;
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json() as { enabled?: boolean };

    // Get current skill to determine toggle state
    const currentSkill = skillManager.getUserSkillWithDetails(auth.userId, skillName);

    if (!currentSkill || !currentSkill.isInstalled) {
      return NextResponse.json(
        { error: 'Skill not installed' },
        { status: 404 }
      );
    }

    // Toggle: if enabled is provided, use it; otherwise toggle current state
    const newEnabled = body.enabled !== undefined ? body.enabled : !currentSkill.isEnabled;

    const updated = skillManager.toggleSkill(auth.userId, skillName, newEnabled);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to toggle skill' },
        { status: 500 }
      );
    }

    // Get updated skill
    const skill = skillManager.getUserSkillWithDetails(auth.userId, skillName);

    return NextResponse.json({
      success: true,
      skill,
    });
  } catch (error) {
    console.error('Failed to toggle skill:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle skill';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
