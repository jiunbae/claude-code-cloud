import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/server/auth';
import { userSettingsStore } from '@/server/settings';
import type { UserSettingsUpdate } from '@/types/settings';

// GET /api/settings/me - Get current user settings
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const settings = userSettingsStore.getByUserId(auth.userId);

    return NextResponse.json({
      settings,
    });
  } catch (error) {
    console.error('Failed to get user settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/me - Update current user settings
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const body = await request.json();
    const updates: UserSettingsUpdate = {};

    // Validate and extract allowed fields
    if (body.theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(body.theme)) {
        return NextResponse.json(
          { error: 'Invalid theme value', field: 'theme' },
          { status: 400 }
        );
      }
      updates.theme = body.theme;
    }

    if (body.language !== undefined) {
      if (!['en', 'ko', 'ja', 'zh'].includes(body.language)) {
        return NextResponse.json(
          { error: 'Invalid language value', field: 'language' },
          { status: 400 }
        );
      }
      updates.language = body.language;
    }

    if (body.defaultModel !== undefined) {
      if (typeof body.defaultModel !== 'string') {
        return NextResponse.json(
          { error: 'Invalid defaultModel value', field: 'defaultModel' },
          { status: 400 }
        );
      }
      updates.defaultModel = body.defaultModel;
    }

    if (body.terminalFontSize !== undefined) {
      const size = Number(body.terminalFontSize);
      if (isNaN(size) || size < 8 || size > 32) {
        return NextResponse.json(
          { error: 'Terminal font size must be between 8 and 32', field: 'terminalFontSize' },
          { status: 400 }
        );
      }
      updates.terminalFontSize = size;
    }

    if (body.editorFontSize !== undefined) {
      const size = Number(body.editorFontSize);
      if (isNaN(size) || size < 8 || size > 32) {
        return NextResponse.json(
          { error: 'Editor font size must be between 8 and 32', field: 'editorFontSize' },
          { status: 400 }
        );
      }
      updates.editorFontSize = size;
    }

    if (body.autoSave !== undefined) {
      updates.autoSave = Boolean(body.autoSave);
    }

    const settings = userSettingsStore.update(auth.userId, updates);

    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings,
      message: 'Settings updated',
    });
  } catch (error) {
    console.error('Failed to update user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
