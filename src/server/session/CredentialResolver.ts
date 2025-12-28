import { userStore } from '../auth';
import { globalSettingsStore } from '../settings';
import { decryptCredentials } from '../crypto';
import type { UserCredentials } from '@/types/auth';

export interface ResolvedCredentials {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  [key: string]: string | undefined;
}

export interface CredentialResolutionResult {
  credentials: ResolvedCredentials;
  source: 'session' | 'user' | 'global' | 'env';
  userId?: string;
}

/**
 * Resolve credentials for a session based on priority:
 * 1. Session-specific config_env (passed as parameter)
 * 2. User-specific credentials (if credential_mode='custom')
 * 3. Global settings (from database)
 * 4. Environment variables (fallback)
 */
export function resolveCredentials(
  userId?: string,
  sessionEnv?: Record<string, string>
): CredentialResolutionResult {
  const credentials: ResolvedCredentials = {};
  let source: CredentialResolutionResult['source'] = 'env';

  // Priority 1: Session-specific environment (if provided)
  if (sessionEnv) {
    if (sessionEnv.ANTHROPIC_API_KEY) {
      credentials.ANTHROPIC_API_KEY = sessionEnv.ANTHROPIC_API_KEY;
      source = 'session';
    }
    if (sessionEnv.OPENAI_API_KEY) {
      credentials.OPENAI_API_KEY = sessionEnv.OPENAI_API_KEY;
      source = 'session';
    }
  }

  // Priority 2: User-specific credentials
  if (userId) {
    const user = userStore.getById(userId);
    if (user && user.credentialMode === 'custom') {
      const encryptedCredentials = userStore.getCredentials(userId);
      if (encryptedCredentials) {
        try {
          const userCredentials = decryptCredentials(encryptedCredentials);

          // Only use user credentials if not already set by session
          if (!credentials.ANTHROPIC_API_KEY && userCredentials.ANTHROPIC_API_KEY) {
            credentials.ANTHROPIC_API_KEY = userCredentials.ANTHROPIC_API_KEY;
            if (source !== 'session') source = 'user';
          }
          if (!credentials.OPENAI_API_KEY && userCredentials.OPENAI_API_KEY) {
            credentials.OPENAI_API_KEY = userCredentials.OPENAI_API_KEY;
            if (source !== 'session') source = 'user';
          }

          // Copy any additional credentials
          for (const [key, value] of Object.entries(userCredentials)) {
            if (value && !credentials[key]) {
              credentials[key] = value;
            }
          }
        } catch (error) {
          console.error('[CredentialResolver] Failed to decrypt user credentials:', error);
        }
      }
    }
  }

  // Priority 3: Global settings
  if (!credentials.ANTHROPIC_API_KEY) {
    const globalKey = globalSettingsStore.get('ANTHROPIC_API_KEY');
    if (globalKey) {
      credentials.ANTHROPIC_API_KEY = globalKey;
      if (source === 'env') source = 'global';
    }
  }
  if (!credentials.OPENAI_API_KEY) {
    const globalKey = globalSettingsStore.get('OPENAI_API_KEY');
    if (globalKey) {
      credentials.OPENAI_API_KEY = globalKey;
      if (source === 'env') source = 'global';
    }
  }

  // Priority 4: Environment variables (fallback)
  if (!credentials.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY) {
    credentials.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  }
  if (!credentials.OPENAI_API_KEY && process.env.OPENAI_API_KEY) {
    credentials.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  }

  return {
    credentials,
    source,
    userId,
  };
}

/**
 * Get the Claude config directory for a user
 * Each user gets their own config directory to isolate session data
 */
export function getClaudeConfigDir(userId?: string): string {
  const baseDir = process.env.CLAUDE_DATA_DIR || '/app/data/claude';

  if (userId) {
    return `${baseDir}/users/${userId}`;
  }

  return `${baseDir}/global`;
}

/**
 * Log credential access for audit purposes
 */
export function logCredentialAccess(
  userId: string,
  sessionId: string,
  source: CredentialResolutionResult['source']
): void {
  globalSettingsStore.logAudit(
    userId,
    'credentials_accessed',
    'session',
    sessionId,
    { source }
  );
}
