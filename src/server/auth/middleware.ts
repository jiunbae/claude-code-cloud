import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from './jwt';
import { isAuthDisabled, MOCK_USER } from '@/server/middleware/auth';
import { userStore } from './UserStore';
import type { User, PublicUser, JWTPayload } from '@/types/auth';

export interface AuthContext {
  userId: string;
  user: PublicUser;
  payload: JWTPayload;
}

/**
 * Get auth context from request
 * Returns null if not authenticated
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  if (isAuthDisabled()) {
    const user = userStore.getById(MOCK_USER.id)!;
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    return {
      userId: user.id,
      user: userStore.toPublicUser(user),
      payload,
    };
  }

  // Try to get token from cookie first, then from header
  const cookieToken = request.cookies.get('auth_token')?.value;
  const headerToken = getTokenFromHeader(request.headers.get('authorization'));
  const token = cookieToken || headerToken;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = userStore.getById(payload.userId);
  if (!user || !user.isActive) {
    return null;
  }

  return {
    userId: user.id,
    user: userStore.toPublicUser(user),
    payload,
  };
}

/**
 * Require authentication middleware helper
 * Returns auth context or error response
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return auth;
}

/**
 * Check if user has access to a session
 */
export async function hasSessionAccess(
  userId: string,
  sessionOwnerId: string,
  isPublic: boolean
): Promise<boolean> {
  // Owner always has access
  if (sessionOwnerId === userId) {
    return true;
  }

  // Public sessions are accessible to all authenticated users
  if (isPublic) {
    return true;
  }

  // TODO: Check session_access table for shared access
  return false;
}

/**
 * Helper to check if response is an error response
 */
export function isErrorResponse(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = 'Access denied'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
