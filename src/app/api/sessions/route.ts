import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { getAuthContext } from '@/server/auth';
import type { CreateSessionRequest } from '@/types';

// GET /api/sessions - List user's sessions
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);

  // If authenticated, return user's sessions
  // If not authenticated, return empty (or public sessions in future)
  if (auth) {
    const sessions = sessionStore.getByOwner(auth.userId);
    return NextResponse.json({ sessions });
  }

  // Return empty for unauthenticated users
  return NextResponse.json({ sessions: [] });
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  // Require authentication for creating sessions
  const auth = await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as CreateSessionRequest;

    // Validate required fields
    if (!body.name || !body.projectPath) {
      return NextResponse.json(
        { error: 'Name and projectPath are required' },
        { status: 400 }
      );
    }

    // Create session with owner
    const session = sessionStore.create(body, auth.userId);

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
