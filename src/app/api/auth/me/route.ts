import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse, userStore } from '@/server/auth';
import { isAuthDisabled, MOCK_PUBLIC_USER, MOCK_USER } from '@/server/middleware/auth';

// GET /api/auth/me - Get current user
export async function GET(request: NextRequest) {
  if (isAuthDisabled()) {
    const user = userStore.getById(MOCK_USER.id);
    return NextResponse.json({
      user: user ? userStore.toPublicUser(user) : MOCK_PUBLIC_USER,
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
      }

      const updatedUser = {
        ...MOCK_PUBLIC_USER,
        username: username ?? MOCK_PUBLIC_USER.username,
      };

      return NextResponse.json({
        user: updatedUser,
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
