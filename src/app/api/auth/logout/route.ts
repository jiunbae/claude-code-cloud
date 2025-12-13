import { NextResponse } from 'next/server';
import { AUTH_COOKIE_OPTIONS } from '@/server/auth';

// POST /api/auth/logout - Logout user
export async function POST() {
  const response = NextResponse.json({
    message: 'Logout successful',
  });

  // Clear auth cookie by setting it to expire immediately
  response.cookies.set(AUTH_COOKIE_OPTIONS.name, '', {
    httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
    secure: AUTH_COOKIE_OPTIONS.secure,
    sameSite: AUTH_COOKIE_OPTIONS.sameSite,
    maxAge: 0,
    path: AUTH_COOKIE_OPTIONS.path,
  });

  return response;
}
