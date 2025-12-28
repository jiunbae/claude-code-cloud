import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/auth';
import { apiKeyStore } from '@/server/settings/ApiKeyStore';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * DELETE /api/settings/api-keys/[id]
 * Delete an API key
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    // apiKeyStore.remove includes ownership verification
    const success = apiKeyStore.remove(id, auth.userId);

    if (!success) {
      return NextResponse.json(
        { error: 'API key not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Keys] Failed to delete key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/api-keys/[id]
 * Update an API key (activate/deactivate)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // Validate body first
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive field is required and must be a boolean' },
        { status: 400 }
      );
    }

    // apiKeyStore.setActive includes ownership verification
    const updatedKey = apiKeyStore.setActive(id, auth.userId, body.isActive);

    if (!updatedKey) {
      return NextResponse.json(
        { error: 'API key not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ apiKey: updatedKey });
  } catch (error) {
    console.error('[API Keys] Failed to update key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}
