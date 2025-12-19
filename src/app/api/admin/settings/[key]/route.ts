import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { globalSettingsStore } from '@/server/settings';
import { maskApiKey } from '@/server/crypto';

interface RouteParams {
  params: Promise<{ key: string }>;
}

// GET /api/admin/settings/:key - Get a specific setting (masked)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const { key } = await params;

  try {
    const value = globalSettingsStore.get(key);

    if (!value) {
      // Check if there's an environment variable fallback
      const envValue = process.env[key];
      if (envValue) {
        return NextResponse.json({
          key,
          hasValue: true,
          maskedValue: maskApiKey(envValue),
          description: 'Using environment variable',
          isEnvFallback: true,
        });
      }

      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      key,
      hasValue: true,
      maskedValue: maskApiKey(value),
    });
  } catch (error) {
    console.error(`[Admin Settings] Error getting setting ${key}:`, error);
    return NextResponse.json(
      { error: 'Failed to get setting' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings/:key - Update a setting
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const { key } = await params;

  try {
    const body = await request.json();
    const { value, description } = body as {
      value?: string;
      description?: string;
    };

    if (!value || typeof value !== 'string') {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      );
    }

    const success = globalSettingsStore.set(key, value, auth.user.id, description);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Setting updated successfully',
      key,
      maskedValue: maskApiKey(value),
    });
  } catch (error) {
    console.error(`[Admin Settings] Error updating setting ${key}:`, error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/settings/:key - Delete a setting
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const { key } = await params;

  try {
    const success = globalSettingsStore.delete(key, auth.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Setting deleted successfully',
      key,
    });
  } catch (error) {
    console.error(`[Admin Settings] Error deleting setting ${key}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}
