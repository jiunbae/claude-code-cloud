import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/server/auth';
import { userSettingsStore } from '@/server/settings';
import { userStore } from '@/server/auth/UserStore';
import type { UserSettingsUpdate } from '@/types/settings';
import { VALID_THEMES, VALID_LANGUAGES } from '@/types/settings';
import type { CredentialMode } from '@/types/auth';

const VALID_CREDENTIAL_MODES: CredentialMode[] = ['global', 'custom'];

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
      if (!VALID_THEMES.includes(body.theme)) {
        return NextResponse.json(
          { error: 'Invalid theme value', field: 'theme' },
          { status: 400 }
        );
      }
      updates.theme = body.theme;
    }

    if (body.language !== undefined) {
      if (!VALID_LANGUAGES.includes(body.language)) {
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

// PATCH /api/settings/me - Update credential mode
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const body = await request.json();

    // Only allow credentialMode update via PATCH
    if (body.credentialMode !== undefined) {
      if (!VALID_CREDENTIAL_MODES.includes(body.credentialMode)) {
        return NextResponse.json(
          { error: 'Invalid credentialMode value. Must be "global" or "custom"', field: 'credentialMode' },
          { status: 400 }
        );
      }

      const success = userStore.updateCredentialMode(auth.userId, body.credentialMode);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update credential mode' },
          { status: 500 }
        );
      }

      const user = userStore.getById(auth.userId);

      return NextResponse.json({
        credentialMode: body.credentialMode,
        user: user ? userStore.toPublicUser(user) : null,
        message: 'Credential mode updated',
      });
    }

    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
