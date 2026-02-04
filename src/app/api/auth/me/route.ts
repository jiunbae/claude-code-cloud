import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse, userStore } from '@/server/auth';
import { isAuthDisabled, MOCK_USER } from '@/server/middleware/auth';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error: 'Username must be 3-20 characters, alphanumeric and underscore only',
    };
  }
  return { valid: true };
}

// GET /api/auth/me - Get current user
export async function GET(request: NextRequest) {
  if (isAuthDisabled()) {
    const user = userStore.getById(MOCK_USER.id);
    return NextResponse.json({
      user: user ? userStore.toPublicUser(user) : null,
    });
  }

  const auth = await requireAuth(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  return NextResponse.json({
    user: auth.user,
  });
}

// PATCH /api/auth/me - Update user profile
export async function PATCH(request: NextRequest) {
  if (isAuthDisabled()) {
    try {
      const body = await request.json();
      const { username } = body;

      if (username !== undefined) {
        const validation = validateUsername(username);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error, field: 'username' },
            { status: 400 }
          );
        }
      }

      // Persist the update in UserStore for mock user
      const updatedUser = userStore.update(MOCK_USER.id, { username });
      if (!updatedUser) {
        return NextResponse.json(
          { error: 'Mock user not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: userStore.toPublicUser(updatedUser),
        message: 'Profile updated',
      });
    } catch (error) {
      console.error('Profile update error (auth disabled):', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
  }

  const auth = await requireAuth(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const body = await request.json();
    const { username } = body;

    // Validate username if provided
    if (username !== undefined) {
      const validation = validateUsername(username);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error, field: 'username' },
          { status: 400 }
        );
      }

      // Check if username is taken by another user
      const existingUser = userStore.getByUsername(username);
      if (existingUser && existingUser.id !== auth.userId) {
        return NextResponse.json(
          { error: 'Username already taken', field: 'username' },
          { status: 409 }
        );
      }
    }

    const updatedUser = userStore.update(auth.userId, { username });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: userStore.toPublicUser(updatedUser),
      message: 'Profile updated',
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
