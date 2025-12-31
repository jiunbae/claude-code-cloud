import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/server/auth';
import { claudeConfigManager } from '@/server/claude';

// GET /api/claude-config - Get config summary and list files
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const action = searchParams.get('action');

    if (action === 'summary') {
      const summary = await claudeConfigManager.getConfigSummary(auth.userId);
      return NextResponse.json({ summary });
    }

    if (action === 'read' && path) {
      const content = await claudeConfigManager.readFile(auth.userId, path);
      return NextResponse.json({ content });
    }

    // List files in directory
    const files = await claudeConfigManager.listFiles(auth.userId, path);
    return NextResponse.json({ files, path });
  } catch (error) {
    console.error('[ClaudeConfig] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to access config' },
      { status: 500 }
    );
  }
}

// POST /api/claude-config - Create or update a file
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { path, content, action } = body as {
      path: string;
      content?: string;
      action?: 'createDir';
    };

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    if (action === 'createDir') {
      await claudeConfigManager.createDirectory(auth.userId, path);
      return NextResponse.json({ message: 'Directory created', path });
    }

    if (content === undefined) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    await claudeConfigManager.writeFile(auth.userId, path, content);
    return NextResponse.json({ message: 'File saved', path });
  } catch (error) {
    console.error('[ClaudeConfig] Error writing file:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to write file' },
      { status: 500 }
    );
  }
}

// DELETE /api/claude-config - Delete a file or directory
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    await claudeConfigManager.deleteFile(auth.userId, path);
    return NextResponse.json({ message: 'File deleted', path });
  } catch (error) {
    console.error('[ClaudeConfig] Error deleting file:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
