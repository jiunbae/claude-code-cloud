import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { claudeArgsStore } from '@/server/settings';
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

/**
 * Validate ClaudeArgsConfig
 */
function validateClaudeArgsConfig(config: ClaudeArgsConfig): string | null {
  // Validate permission mode
  if (config.permissionMode) {
    const validModes = ['default', 'plan', 'auto-edit', 'full-auto'];
    if (!validModes.includes(config.permissionMode)) {
      return `Invalid permission mode: ${config.permissionMode}`;
    }
  }

  // Validate model format (basic check)
  if (config.model && typeof config.model !== 'string') {
    return 'Model must be a string';
  }

  // Validate arrays
  if (config.allowedTools && !Array.isArray(config.allowedTools)) {
    return 'allowedTools must be an array';
  }

  if (config.disallowedTools && !Array.isArray(config.disallowedTools)) {
    return 'disallowedTools must be an array';
  }

  if (config.mcpServers && !Array.isArray(config.mcpServers)) {
    return 'mcpServers must be an array';
  }

  if (config.customArgs && !Array.isArray(config.customArgs)) {
    return 'customArgs must be an array';
  }

  // Validate numeric fields
  if (config.maxTurns !== undefined && (typeof config.maxTurns !== 'number' || config.maxTurns < 1)) {
    return 'maxTurns must be a positive number';
  }

  if (config.contextWindow !== undefined && (typeof config.contextWindow !== 'number' || config.contextWindow < 1000)) {
    return 'contextWindow must be a number >= 1000';
  }

  // Validate output format
  if (config.outputFormat) {
    const validFormats = ['text', 'json', 'stream-json'];
    if (!validFormats.includes(config.outputFormat)) {
      return `Invalid output format: ${config.outputFormat}`;
    }
  }

  return null;
}
