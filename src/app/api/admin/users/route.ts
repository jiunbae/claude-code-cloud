import { NextRequest, NextResponse } from 'next/server';
import { userStore, hashPassword, validatePassword, requireAdmin, isErrorResponse } from '@/server/auth';
import { encryptCredentials } from '@/server/crypto';
import type { UserRole, CredentialMode, UserCredentials } from '@/types/auth';

interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
  credentialMode?: CredentialMode;
  credentials?: UserCredentials;
}

// GET /api/admin/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const users = userStore.getAll();
    return NextResponse.json({
      users: users.map(user => userStore.toPublicUser(user)),
      total: users.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = (await request.json()) as CreateUserRequest;
    const { email, username, password, role = 'user' } = body;

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

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters, alphanumeric and underscore only', field: 'username' },
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

    // Validate role
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "user"', field: 'role' },
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
    const user = userStore.create(email, username, passwordHash, role);

    // Handle credential mode and credentials
    const credentialMode = body.credentialMode || 'global';
    if (credentialMode !== 'global' && credentialMode !== 'custom') {
      return NextResponse.json(
        { error: 'credentialMode must be either "global" or "custom"', field: 'credentialMode' },
        { status: 400 }
      );
    }

    userStore.updateCredentialMode(user.id, credentialMode);

    // If custom mode with credentials, save them
    if (credentialMode === 'custom' && body.credentials) {
      const cleanCredentials: Record<string, string> = {};
      for (const [key, value] of Object.entries(body.credentials)) {
        if (value && typeof value === 'string') {
          cleanCredentials[key] = value;
        }
      }
      if (Object.keys(cleanCredentials).length > 0) {
        const encrypted = encryptCredentials(cleanCredentials);
        userStore.updateCredentials(user.id, encrypted);
      }
    }

    // Fetch updated user
    const updatedUser = userStore.getById(user.id);

    return NextResponse.json({
      user: userStore.toPublicUser(updatedUser!),
      message: 'User created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
