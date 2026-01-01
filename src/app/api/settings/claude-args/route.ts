import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/server/auth';
import { claudeArgsStore, validateClaudeArgsConfig } from '@/server/settings';
import type { ClaudeArgsConfig } from '@/types/settings';

// GET /api/settings/claude-args - Get user's Claude args configuration
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    // Get user-specific config
    const userConfig = claudeArgsStore.getUser(auth.userId);

    // Get effective config (with inheritance)
    const effectiveConfig = claudeArgsStore.resolveEffective(undefined, auth.userId);

    return NextResponse.json({
      userConfig, // User's specific overrides (null if none)
      effectiveConfig, // What will actually be used (merged with global)
    });
  } catch (error) {
    console.error('[User Claude Args] Error getting config:', error);
    return NextResponse.json(
      { error: 'Failed to get Claude args configuration' },
      { status: 500 }
    );
  }
}

// POST /api/settings/claude-args - Update user's Claude args configuration
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
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

    const success = claudeArgsStore.setUser(auth.userId, config);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save Claude args configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Claude args configuration saved successfully',
      userConfig: claudeArgsStore.getUser(auth.userId),
      effectiveConfig: claudeArgsStore.resolveEffective(undefined, auth.userId),
    });
  } catch (error) {
    console.error('[User Claude Args] Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save Claude args configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/claude-args - Delete user's custom config (use global defaults)
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    claudeArgsStore.deleteUser(auth.userId);

    return NextResponse.json({
      message: 'User Claude args configuration deleted (using global defaults)',
      userConfig: null,
      effectiveConfig: claudeArgsStore.resolveEffective(undefined, auth.userId),
    });
  } catch (error) {
    console.error('[User Claude Args] Error deleting config:', error);
    return NextResponse.json(
      { error: 'Failed to delete Claude args configuration' },
      { status: 500 }
    );
  }
}
