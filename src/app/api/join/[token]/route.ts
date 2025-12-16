import { NextRequest, NextResponse } from 'next/server';
import { shareTokenStore } from '@/server/collaboration/ShareTokenStore';

type RouteParams = {
  params: Promise<{ token: string }>;
};

// GET /api/join/:token - Validate share token
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const result = shareTokenStore.validateToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 400 }
      );
    }

    // Increment use count
    const shareToken = shareTokenStore.getByToken(token);
    if (shareToken) {
      shareTokenStore.incrementUseCount(shareToken.id);
    }

    return NextResponse.json({
      sessionId: result.sessionId,
      permission: result.permission,
      allowAnonymous: result.allowAnonymous,
    });
  } catch (error) {
    console.error('Join API error:', error);
    return NextResponse.json({ error: 'Failed to validate share link' }, { status: 500 });
  }
}
