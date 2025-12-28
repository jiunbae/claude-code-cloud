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
    // Check if the key exists and belongs to the user
    const apiKey = apiKeyStore.getById(id);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    if (apiKey.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const success = apiKeyStore.remove(id, auth.userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
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

    // Check if the key exists and belongs to the user
    const existingKey = apiKeyStore.getById(id);

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    if (existingKey.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Currently only isActive can be updated
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive field is required and must be a boolean' },
        { status: 400 }
      );
    }

    const updatedKey = apiKeyStore.setActive(id, auth.userId, body.isActive);

    if (!updatedKey) {
      return NextResponse.json(
        { error: 'Failed to update API key' },
        { status: 500 }
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
