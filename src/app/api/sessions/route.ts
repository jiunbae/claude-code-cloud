import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { ptyManager } from '@/server/pty/PtyManager';
import type { CreateSessionRequest } from '@/types';

// GET /api/sessions - List all sessions
export async function GET() {
  const sessions = sessionStore.getAll();
  return NextResponse.json({ sessions });
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionRequest;

    // Validate required fields
    if (!body.name || !body.projectPath) {
      return NextResponse.json(
        { error: 'Name and projectPath are required' },
        { status: 400 }
      );
    }

    // Create session
    const session = sessionStore.create(body);

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
