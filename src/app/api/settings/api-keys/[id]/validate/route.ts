import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/auth';
import { apiKeyStore } from '@/server/settings/ApiKeyStore';
import type { ApiKeyVerifyResponse } from '@/types/settings';

// API endpoint URLs for key verification
const API_ENDPOINTS = {
  ANTHROPIC: 'https://api.anthropic.com/v1/messages',
  OPENAI: 'https://api.openai.com/v1/models',
  GOOGLE: 'https://generativelanguage.googleapis.com/v1/models',
} as const;

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/settings/api-keys/[id]/validate
 * Validate an existing stored API key by making a test request to the provider
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { id } = params;

  try {
    // Get the API key with the decrypted secret
    const apiKeyData = apiKeyStore.getByIdWithSecret(id);

    if (!apiKeyData) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (apiKeyData.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Verify the key with the provider
    let valid = false;
    let error: string | undefined;

    switch (apiKeyData.provider) {
      case 'anthropic':
        ({ valid, error } = await verifyAnthropicKey(apiKeyData.decryptedKey));
        break;
      case 'openai':
        ({ valid, error } = await verifyOpenAIKey(apiKeyData.decryptedKey));
        break;
      case 'google':
        ({ valid, error } = await verifyGoogleKey(apiKeyData.decryptedKey));
        break;
    }

    // Update the validation status in the database
    const updatedKey = apiKeyStore.updateValidation(id, auth.userId, valid);

    const response: ApiKeyVerifyResponse = {
      valid,
      provider: apiKeyData.provider,
      ...(error && { error }),
    };

    return NextResponse.json({
      ...response,
      apiKey: updatedKey,
    });
  } catch (error) {
    console.error('[API Keys] Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate API key' },
      { status: 500 }
    );
  }
}

/**
 * Verify Anthropic API key by making a test request
 */
async function verifyAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(API_ENDPOINTS.ANTHROPIC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    // Rate limited means key is valid
    if (response.status === 429) {
      return { valid: true };
    }

    // Parse JSON response safely
    let data;
    try {
      data = await response.json();
    } catch {
      return { valid: false, error: `Received non-JSON response from API (status: ${response.status})` };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API key does not have permission to access this resource' };
    }

    return { valid: false, error: data.error?.message || 'Unknown error' };
  } catch (error) {
    console.error('[Anthropic] Verification error:', error);
    return { valid: false, error: 'Failed to connect to Anthropic API' };
  }
}

/**
 * Verify OpenAI API key by making a test request
 */
async function verifyOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(API_ENDPOINTS.OPENAI, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    // Rate limited means key is valid
    if (response.status === 429) {
      return { valid: true };
    }

    // Parse JSON response safely
    let data;
    try {
      data = await response.json();
    } catch {
      return { valid: false, error: `Received non-JSON response from API (status: ${response.status})` };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API key does not have permission to access this resource' };
    }

    return { valid: false, error: data.error?.message || 'Unknown error' };
  } catch (error) {
    console.error('[OpenAI] Verification error:', error);
    return { valid: false, error: 'Failed to connect to OpenAI API' };
  }
}

/**
 * Verify Google (Gemini) API key by making a test request
 */
async function verifyGoogleKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${API_ENDPOINTS.GOOGLE}?key=${apiKey}`,
      { method: 'GET' }
    );

    if (response.ok) {
      return { valid: true };
    }

    // Rate limited means key is valid
    if (response.status === 429) {
      return { valid: true };
    }

    // Parse JSON response safely
    let data;
    try {
      data = await response.json();
    } catch {
      return { valid: false, error: `Received non-JSON response from API (status: ${response.status})` };
    }

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return { valid: false, error: data.error?.message || 'Invalid API key' };
    }

    return { valid: false, error: data.error?.message || 'Unknown error' };
  } catch (error) {
    console.error('[Google] Verification error:', error);
    return { valid: false, error: 'Failed to connect to Google API' };
  }
}
