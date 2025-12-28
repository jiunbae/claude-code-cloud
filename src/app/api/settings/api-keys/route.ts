import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/auth';
import { apiKeyStore } from '@/server/settings/ApiKeyStore';
import { validateApiKeyFormat, isEncryptionConfigured } from '@/server/crypto/encryption';
import type { ApiKeyCreate, ApiKeyListResponse } from '@/types/settings';

/**
 * GET /api/settings/api-keys
 * List all API keys for the authenticated user
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const apiKeys = apiKeyStore.getByUser(auth.userId);
    const response: ApiKeyListResponse = {
      apiKeys,
      total: apiKeys.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API Keys] Failed to list keys:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/api-keys
 * Add a new API key for the authenticated user
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check if encryption is configured
  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      { error: 'Server encryption not configured. Please set ENCRYPTION_KEY environment variable.' },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as ApiKeyCreate;

    // Validate required fields
    if (!body.keyName?.trim()) {
      return NextResponse.json(
        { error: 'Key name is required', field: 'keyName' },
        { status: 400 }
      );
    }

    if (!body.provider) {
      return NextResponse.json(
        { error: 'Provider is required', field: 'provider' },
        { status: 400 }
      );
    }

    if (!['anthropic', 'openai', 'google'].includes(body.provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be anthropic, openai, or google', field: 'provider' },
        { status: 400 }
      );
    }

    if (!body.apiKey?.trim()) {
      return NextResponse.json(
        { error: 'API key is required', field: 'apiKey' },
        { status: 400 }
      );
    }

    // Validate API key format
    if (body.provider !== 'google' && !validateApiKeyFormat(body.apiKey, body.provider)) {
      return NextResponse.json(
        { error: `Invalid API key format for ${body.provider}`, field: 'apiKey' },
        { status: 400 }
      );
    }

    // Add the API key
    const apiKey = apiKeyStore.add(auth.userId, body);

    return NextResponse.json({ apiKey }, { status: 201 });
  } catch (error) {
    console.error('[API Keys] Failed to add key:', error);
    const message = error instanceof Error ? error.message : 'Failed to add API key';

    // Check for duplicate key error
    if (message.includes('already exists')) {
      return NextResponse.json(
        { error: message, field: 'keyName' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
