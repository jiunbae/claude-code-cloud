import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { globalSettingsStore } from '@/server/settings';

// GET /api/admin/settings - Get all global settings (masked)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const settings = globalSettingsStore.getAllWithDefaults();

    return NextResponse.json({
      settings: settings.map((s) => ({
        key: s.key,
        hasValue: s.hasValue,
        maskedValue: s.maskedValue,
        description: s.description,
        updatedAt: s.updatedAt.toISOString(),
        updatedBy: s.updatedBy,
      })),
    });
  } catch (error) {
    console.error('[Admin Settings] Error getting settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings - Create or update a setting
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { key, value, description } = body as {
      key?: string;
      value?: string;
      description?: string;
    };

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      );
    }

    if (!value || typeof value !== 'string') {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      );
    }

    // Enforce a reasonable maximum length for setting values (10KB)
    const MAX_VALUE_LENGTH = 10 * 1024;
    if (value.length > MAX_VALUE_LENGTH) {
      return NextResponse.json(
        { error: 'Value is too long (max 10KB)' },
        { status: 400 }
      );
    }

    // Validate key format (alphanumeric and underscores only)
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: 'Key must be uppercase alphanumeric with underscores' },
        { status: 400 }
      );
    }

    const success = globalSettingsStore.set(key, value, auth.user.id, description);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Setting saved successfully',
      key,
    });
  } catch (error) {
    console.error('[Admin Settings] Error saving setting:', error);
    return NextResponse.json(
      { error: 'Failed to save setting' },
      { status: 500 }
    );
  }
}
