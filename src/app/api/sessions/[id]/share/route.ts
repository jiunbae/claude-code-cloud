import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { shareTokenStore } from '@/server/collaboration/ShareTokenStore';
import type { CreateShareTokenRequest } from '@/types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/sessions/:id/share - List share tokens
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = sessionStore.get(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const tokens = shareTokenStore.getBySessionId(id);

    // Don't expose the actual token in list view for security
    const sanitizedTokens = tokens.map((t) => ({
      id: t.id,
      permission: t.permission,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      maxUses: t.maxUses,
      useCount: t.useCount,
    }));

    return NextResponse.json(sanitizedTokens);
  } catch (error) {
    console.error('Share API error:', error);
    return NextResponse.json({ error: 'Failed to list share tokens' }, { status: 500 });
  }
}

// POST /api/sessions/:id/share - Create share token
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = sessionStore.get(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();

    const tokenRequest: CreateShareTokenRequest = {
      sessionId: id,
      permission: body.permission || 'view',
      expiresInHours: body.expiresInHours,
      maxUses: body.maxUses,
    };

    const shareToken = shareTokenStore.create(tokenRequest);

    // Generate share URL
    const baseUrl = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const shareUrl = `${protocol}://${baseUrl}/join/${shareToken.token}`;

    return NextResponse.json({
      id: shareToken.id,
      token: shareToken.token,
      shareUrl,
      permission: shareToken.permission,
      expiresAt: shareToken.expiresAt,
      maxUses: shareToken.maxUses,
    });
  } catch (error) {
    console.error('Share API error:', error);
    return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 });
  }
}

// DELETE /api/sessions/:id/share - Delete share token
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = sessionStore.get(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const tokenId = url.searchParams.get('tokenId');

    if (tokenId) {
      const deleted = shareTokenStore.delete(tokenId);
      return NextResponse.json({ success: deleted });
    }

    // Delete all tokens for session
    const count = shareTokenStore.deleteBySessionId(id);
    return NextResponse.json({ success: true, deletedCount: count });
  } catch (error) {
    console.error('Share API error:', error);
    return NextResponse.json({ error: 'Failed to delete share token' }, { status: 500 });
  }
}
