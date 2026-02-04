import type { AuthContext } from '@/server/auth/middleware';
import type { JWTPayload, PublicUser } from '@/types/auth';

export const MOCK_USER = {
  id: 'local-user',
  email: 'local@localhost',
  username: 'local',
  role: 'admin',
} as const;

export const MOCK_PUBLIC_USER: PublicUser = {
  ...MOCK_USER,
  credentialMode: 'global',
  createdAt: new Date(),
  lastLoginAt: new Date(),
};

// Skip auth checks when AUTH_DISABLED=true
export function isAuthDisabled(): boolean {
  return process.env.AUTH_DISABLED === 'true';
}

export function getMockAuthContext(): AuthContext {
  const payload: JWTPayload = {
    userId: MOCK_USER.id,
    email: MOCK_USER.email,
    username: MOCK_USER.username,
    role: MOCK_USER.role,
  };

  return {
    userId: MOCK_USER.id,
    user: MOCK_PUBLIC_USER,
    payload,
  };
}
