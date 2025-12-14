import { NextRequest, NextResponse } from 'next/server';
import { userStore, verifyPassword, signToken, AUTH_COOKIE_OPTIONS } from '@/server/auth';
import type { LoginRequest } from '@/types/auth';

// POST /api/auth/login - Login user
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest;
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    const user = userStore.getByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Get password hash and verify
    const passwordHash = userStore.getPasswordHash(email);
    if (!passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    // Update last login
    userStore.updateLastLogin(user.id);

    // Create response with cookie
    const response = NextResponse.json({
      user: userStore.toPublicUser(user),
      message: 'Login successful',
    });

    // Set auth cookie
    response.cookies.set(AUTH_COOKIE_OPTIONS.name, token, {
      httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
      secure: AUTH_COOKIE_OPTIONS.secure,
      sameSite: AUTH_COOKIE_OPTIONS.sameSite,
      maxAge: AUTH_COOKIE_OPTIONS.maxAge,
      path: AUTH_COOKIE_OPTIONS.path,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
