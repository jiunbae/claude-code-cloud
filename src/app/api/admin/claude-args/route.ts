import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { claudeArgsStore, validateClaudeArgsConfig } from '@/server/settings';
import type { ClaudeArgsConfig } from '@/types/settings';

// GET /api/admin/claude-args - Get global Claude args configuration
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const config = claudeArgsStore.getGlobal();

    return NextResponse.json({
      config,
    });
  } catch (error) {
    console.error('[Admin Claude Args] Error getting config:', error);
    return NextResponse.json(
      { error: 'Failed to get Claude args configuration' },
      { status: 500 }
    );
  }
}

// POST /api/admin/claude-args - Update global Claude args configuration
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const config = body as ClaudeArgsConfig;

    // Validate the configuration
    const validationError = validateClaudeArgsConfig(config);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const success = claudeArgsStore.setGlobal(config, auth.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save Claude args configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Claude args configuration saved successfully',
      config: claudeArgsStore.getGlobal(),
    });
  } catch (error) {
    console.error('[Admin Claude Args] Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save Claude args configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/claude-args - Reset to defaults
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    // Set to empty config (will use defaults)
    const success = claudeArgsStore.setGlobal({}, auth.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reset Claude args configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Claude args configuration reset to defaults',
      config: claudeArgsStore.getGlobal(),
    });
  } catch (error) {
    console.error('[Admin Claude Args] Error resetting config:', error);
    return NextResponse.json(
      { error: 'Failed to reset Claude args configuration' },
      { status: 500 }
    );
  }
}
