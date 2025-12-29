import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/auth';
import { apiKeyStore } from '@/server/settings/ApiKeyStore';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/settings/api-keys/[id]/set-default
 * Set an API key as the default (active) key for its provider
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    // apiKeyStore.setActive includes ownership verification and
    // automatically deactivates other keys for the same provider
    const updatedKey = apiKeyStore.setActive(id, auth.userId, true);

    if (!updatedKey) {
      return NextResponse.json(
        { error: 'API key not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      apiKey: updatedKey,
      message: `API key "${updatedKey.keyName}" is now the default for ${updatedKey.provider}`,
    });
  } catch (error) {
    console.error('[API Keys] Failed to set default key:', error);
    return NextResponse.json(
      { error: 'Failed to set default API key' },
      { status: 500 }
    );
  }
}
