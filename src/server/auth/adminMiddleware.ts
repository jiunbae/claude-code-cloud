import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isErrorResponse, type AuthContext } from './middleware';

/**
 * Require admin authentication middleware helper
 * Returns auth context or error response
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (auth.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return auth;
}

/**
 * Check if user is admin
 */
export function isAdmin(auth: AuthContext): boolean {
  return auth.user.role === 'admin';
}

export { isErrorResponse };
