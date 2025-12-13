import { NextRequest, NextResponse } from 'next/server';
import { userStore, hashPassword, validatePassword, signToken, AUTH_COOKIE_OPTIONS } from '@/server/auth';
import type { RegisterRequest } from '@/types/auth';

// POST /api/auth/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequest;
    const { email, username, password } = body;

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', field: 'email' },
        { status: 400 }
      );
    }

    // Validate username format (3-20 chars, alphanumeric and underscore)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error: 'Username must be 3-20 characters, alphanumeric and underscore only',
          field: 'username',
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message, field: 'password' },
        { status: 400 }
      );
    }

    // Check if email already exists
    if (userStore.emailExists(email)) {
      return NextResponse.json(
        { error: 'Email already registered', field: 'email' },
        { status: 409 }
      );
    }

    // Check if username already exists
    if (userStore.usernameExists(username)) {
      return NextResponse.json(
        { error: 'Username already taken', field: 'username' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = userStore.create(email, username, passwordHash);

    // Generate JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // Update last login
    userStore.updateLastLogin(user.id);

    // Create response with cookie
    const response = NextResponse.json({
      user: userStore.toPublicUser(user),
      message: 'Registration successful',
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
