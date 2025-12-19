import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse, userStore } from '@/server/auth';
import { encryptCredentials, decryptCredentials, maskApiKey } from '@/server/crypto';
import { globalSettingsStore } from '@/server/settings';
import type { CredentialMode, UserCredentials, UserCredentialsInfo } from '@/types/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/:id/credentials - Get user credentials info (masked)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  // Check permissions: admin can view any, user can only view own
  if (auth.user.role !== 'admin' && auth.user.id !== id) {
    return NextResponse.json(
      { error: 'Not authorized to view this user\'s credentials' },
      { status: 403 }
    );
  }

  try {
    const user = userStore.getById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const credentialsInfo: UserCredentialsInfo = {
      mode: user.credentialMode,
      credentials: [],
    };

    if (user.credentialMode === 'custom') {
      const encryptedCredentials = userStore.getCredentials(id);
      if (encryptedCredentials) {
        try {
          const credentials = decryptCredentials(encryptedCredentials);
          for (const [key, value] of Object.entries(credentials)) {
            if (value) {
              credentialsInfo.credentials.push({
                key,
                hasValue: true,
                maskedValue: maskApiKey(value),
              });
            }
          }
        } catch (error) {
          console.error('[User Credentials] Failed to decrypt credentials:', error);
        }
      }
    }

    // Add known keys that don't have values
    const knownKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'];
    const existingKeys = new Set(credentialsInfo.credentials.map((c) => c.key));

    for (const key of knownKeys) {
      if (!existingKeys.has(key)) {
        credentialsInfo.credentials.push({
          key,
          hasValue: false,
        });
      }
    }

    return NextResponse.json(credentialsInfo);
  } catch (error) {
    console.error('[User Credentials] Error getting credentials:', error);
    return NextResponse.json(
      { error: 'Failed to get credentials' },
      { status: 500 }
    );
  }
}

// PUT /api/users/:id/credentials - Update user credentials
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  // Check permissions: admin can update any, user can only update own
  if (auth.user.role !== 'admin' && auth.user.id !== id) {
    return NextResponse.json(
      { error: 'Not authorized to update this user\'s credentials' },
      { status: 403 }
    );
  }

  try {
    const user = userStore.getById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { mode, credentials } = body as {
      mode?: CredentialMode;
      credentials?: UserCredentials;
    };

    // Update credential mode if provided
    if (mode !== undefined) {
      if (mode !== 'global' && mode !== 'custom') {
        return NextResponse.json(
          { error: 'Invalid credential mode' },
          { status: 400 }
        );
      }
      userStore.updateCredentialMode(id, mode);

      // If switching to global, clear custom credentials
      if (mode === 'global') {
        userStore.updateCredentials(id, null);
      }
    }

    // Update credentials if provided and mode is custom
    if (credentials && (mode === 'custom' || user.credentialMode === 'custom')) {
      // Merge with existing credentials
      let existingCredentials: UserCredentials = {};
      const encryptedCredentials = userStore.getCredentials(id);
      if (encryptedCredentials) {
        try {
          existingCredentials = decryptCredentials(encryptedCredentials);
        } catch (error) {
          console.error(`[User Credentials] Failed to decrypt credentials for user ${id}:`, error);
          // Continue with empty credentials if decryption fails
        }
      }

      // Merge: new values override existing
      const mergedCredentials: UserCredentials = {
        ...existingCredentials,
        ...credentials,
      };

      // Remove null/undefined values
      for (const key of Object.keys(mergedCredentials)) {
        if (!mergedCredentials[key]) {
          delete mergedCredentials[key];
        }
      }

      // Encrypt and save
      if (Object.keys(mergedCredentials).length > 0) {
        const encrypted = encryptCredentials(mergedCredentials as Record<string, string>);
        userStore.updateCredentials(id, encrypted);
      } else {
        userStore.updateCredentials(id, null);
      }

      // Log the action
      globalSettingsStore.logAudit(
        auth.user.id,
        'user_credentials_updated',
        'user_credentials',
        id,
        {
          updatedKeys: Object.keys(credentials),
        }
      );
    }

    return NextResponse.json({
      message: 'Credentials updated successfully',
    });
  } catch (error) {
    console.error('[User Credentials] Error updating credentials:', error);
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    );
  }
}
