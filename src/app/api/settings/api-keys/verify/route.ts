import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/auth';
import { validateApiKeyFormat } from '@/server/crypto/encryption';
import type { ApiKeyProvider, ApiKeyVerifyResponse } from '@/types/settings';
import { API_KEY_PROVIDERS } from '@/types/settings';

/**
 * POST /api/settings/api-keys/verify
 * Verify that an API key is valid by making a test request to the provider
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { apiKey, provider } = body as { apiKey: string; provider: ApiKeyProvider };

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!provider || !API_KEY_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Valid provider is required. Must be one of: ${API_KEY_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate format first
    if (!validateApiKeyFormat(apiKey, provider)) {
      const response: ApiKeyVerifyResponse = {
        valid: false,
        provider,
        error: `Invalid API key format for ${provider}`,
      };
      return NextResponse.json(response);
    }

    // Verify the key with the provider
    let valid = false;
    let error: string | undefined;

    switch (provider) {
      case 'anthropic':
        ({ valid, error } = await verifyAnthropicKey(apiKey));
        break;
      case 'openai':
        ({ valid, error } = await verifyOpenAIKey(apiKey));
        break;
      case 'google':
        ({ valid, error } = await verifyGoogleKey(apiKey));
        break;
    }

    const response: ApiKeyVerifyResponse = {
      valid,
      provider,
      ...(error && { error }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API Keys] Verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify API key' },
      { status: 500 }
    );
  }
}

/**
 * Verify Anthropic API key by making a test request
 */
async function verifyAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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

    const data = await response.json();

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API key does not have permission to access this resource' };
    }

    // Other errors (rate limit, etc.) mean the key is valid but might have usage restrictions
    if (response.status === 429) {
      return { valid: true }; // Rate limited means key is valid
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
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json();

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API key does not have permission to access this resource' };
    }

    // Rate limited means key is valid
    if (response.status === 429) {
      return { valid: true };
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
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      { method: 'GET' }
    );

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json();

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return { valid: false, error: data.error?.message || 'Invalid API key' };
    }

    // Rate limited means key is valid
    if (response.status === 429) {
      return { valid: true };
    }

    return { valid: false, error: data.error?.message || 'Unknown error' };
  } catch (error) {
    console.error('[Google] Verification error:', error);
    return { valid: false, error: 'Failed to connect to Google API' };
  }
}
