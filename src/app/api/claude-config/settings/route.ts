import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/server/auth';
import { claudeConfigManager, type ClaudeSettings } from '@/server/claude';

// GET /api/claude-config/settings - Get Claude settings.json
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const settings = await claudeConfigManager.getSettings(auth.userId);
    return NextResponse.json({ settings: settings || {} });
  } catch (error) {
    console.error('[ClaudeConfig Settings] Error getting settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// POST /api/claude-config/settings - Save Claude settings.json
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const settings = body as ClaudeSettings;

    // Basic validation
    if (typeof settings !== 'object' || settings === null) {
      return NextResponse.json(
        { error: 'Settings must be a valid object' },
        { status: 400 }
      );
    }

    await claudeConfigManager.saveSettings(auth.userId, settings);

    return NextResponse.json({
      message: 'Settings saved successfully',
      settings,
    });
  } catch (error) {
    console.error('[ClaudeConfig Settings] Error saving settings:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
