import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/server/auth';
import { claudeConfigManager } from '@/server/claude';

// GET /api/claude-config/skills - List all skills
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const skills = await claudeConfigManager.listSkills(auth.userId);
    return NextResponse.json({ skills });
  } catch (error) {
    console.error('[ClaudeConfig Skills] Error listing skills:', error);
    return NextResponse.json(
      { error: 'Failed to list skills' },
      { status: 500 }
    );
  }
}

// POST /api/claude-config/skills - Install a skill
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { name, content, description, version, author } = body as {
      name: string;
      content: string;
      description?: string;
      version?: string;
      author?: string;
    };

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    await claudeConfigManager.installSkill(auth.userId, name, content, {
      description,
      version,
      author,
    });

    return NextResponse.json({
      message: 'Skill installed successfully',
      skill: { name, description, version, author, enabled: true },
    });
  } catch (error) {
    console.error('[ClaudeConfig Skills] Error installing skill:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to install skill' },
      { status: 500 }
    );
  }
}

// PATCH /api/claude-config/skills - Enable/disable a skill
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { name, enabled } = body as {
      name: string;
      enabled: boolean;
    };

    if (!name || enabled === undefined) {
      return NextResponse.json(
        { error: 'Name and enabled are required' },
        { status: 400 }
      );
    }

    await claudeConfigManager.setSkillEnabled(auth.userId, name, enabled);

    return NextResponse.json({
      message: `Skill ${enabled ? 'enabled' : 'disabled'} successfully`,
      skill: { name, enabled },
    });
  } catch (error) {
    console.error('[ClaudeConfig Skills] Error updating skill:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update skill' },
      { status: 500 }
    );
  }
}

// DELETE /api/claude-config/skills - Uninstall a skill
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Skill name is required' },
        { status: 400 }
      );
    }

    await claudeConfigManager.uninstallSkill(auth.userId, name);

    return NextResponse.json({
      message: 'Skill uninstalled successfully',
      name,
    });
  } catch (error) {
    console.error('[ClaudeConfig Skills] Error uninstalling skill:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to uninstall skill' },
      { status: 500 }
    );
  }
}
