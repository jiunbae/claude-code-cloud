import { NextRequest, NextResponse } from 'next/server';
import { userStore, requireAdmin, isErrorResponse } from '@/server/auth';
import type { UserRole } from '@/types/auth';

interface UpdateUserRequest {
  username?: string;
  role?: UserRole;
  isActive?: boolean;
}

// GET /api/admin/users/[id] - Get user by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  try {
    const user = userStore.getById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: userStore.toPublicUser(user),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  try {
    const body = (await request.json()) as UpdateUserRequest;
    const { username, role, isActive } = body;

    // Check if user exists
    const existingUser = userStore.getById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent admin from demoting themselves
    if (auth.userId === id && role && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot change your own admin role' },
        { status: 400 }
      );
    }

    // Prevent admin from deactivating themselves
    if (auth.userId === id && isActive === false) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Validate username if provided
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 3-20 characters, alphanumeric and underscore only', field: 'username' },
          { status: 400 }
        );
      }

      // Check if username is taken by another user
      const userWithUsername = userStore.getByUsername(username);
      if (userWithUsername && userWithUsername.id !== id) {
        return NextResponse.json(
          { error: 'Username already taken', field: 'username' },
          { status: 409 }
        );
      }
    }

    // Validate role if provided
    if (role && role !== 'admin' && role !== 'user') {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "user"', field: 'role' },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = userStore.update(id, { username, role, isActive });
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: userStore.toPublicUser(updatedUser),
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Deactivate user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  try {
    // Prevent admin from deleting themselves
    if (auth.userId === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = userStore.getById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete (deactivate)
    const deleted = userStore.delete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
