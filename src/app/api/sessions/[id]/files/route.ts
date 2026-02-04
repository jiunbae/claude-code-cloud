import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { sessionStore } from '@/server/session/SessionStore';
import { workspaceManager } from '@/server/workspace/WorkspaceManager';
import { fileSystemManager } from '@/server/files/FileSystemManager';
import { getAuthContext } from '@/server/auth';
import { isAuthDisabled } from '@/server/middleware/auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Helper to get workspace path from session with auth check
async function getWorkspacePath(sessionId: string, userId?: string) {
  const session = sessionStore.getWithWorkspace(sessionId);

  if (!session) {
    return { error: 'Session not found', status: 404 };
  }

  // Check ownership if userId provided
  if (userId && session.ownerId !== userId) {
    return { error: 'Access denied', status: 403 };
  }

  const workspace = session.workspace;
  if (!workspace) {
    return { error: 'Workspace not found for this session', status: 404 };
  }

  const projectPath = workspaceManager.getWorkspacePath(workspace.ownerId, workspace.slug);
  return { projectPath, session, workspace };
}

// Validate path to prevent path traversal attacks (cross-platform)
function validatePath(basePath: string, filePath: string): string | null {
  // Reject empty string or current directory reference
  if (!filePath || filePath === '.') {
    return null;
  }

  const fullPath = path.join(basePath, filePath);
  const normalizedBase = path.resolve(basePath);
  const normalizedFull = path.resolve(fullPath);
  const relative = path.relative(normalizedBase, normalizedFull);

  // Ensure the resolved path is within the base directory (robust cross-platform check)
  if (
    relative.startsWith('..' + path.sep) ||
    relative === '..' ||
    path.isAbsolute(relative)
  ) {
    return null;
  }
  return normalizedFull;
}

// GET /api/sessions/:id/files - Get file tree
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authDisabled = isAuthDisabled();
    const auth = await getAuthContext(request);

    if (!auth && !authDisabled) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await getWorkspacePath(id, authDisabled ? undefined : auth?.userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { projectPath } = result;

    const url = new URL(request.url);
    const depth = parseInt(url.searchParams.get('depth') || '3', 10);
    const filePath = url.searchParams.get('path');

    // If path is provided, return file content
    if (filePath) {
      const fullPath = validatePath(projectPath, filePath);
      if (!fullPath) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
      }
      const info = await fileSystemManager.getFileInfo(fullPath);

      if (!info.exists) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      if (info.isDirectory) {
        const tree = await fileSystemManager.getTree(fullPath, 1);
        return NextResponse.json(tree);
      }

      // Check if file is text
      if (info.mimeType.startsWith('text/') || info.mimeType === 'application/json') {
        const content = await fileSystemManager.readFile(fullPath);
        return NextResponse.json({
          path: filePath,
          content,
          mimeType: info.mimeType,
          size: info.size,
          modifiedAt: info.modifiedAt,
        });
      }

      // Binary file - return metadata only
      return NextResponse.json({
        path: filePath,
        content: null,
        mimeType: info.mimeType,
        size: info.size,
        modifiedAt: info.modifiedAt,
        binary: true,
      });
    }

    // Return directory tree
    const tree = await fileSystemManager.getTree(projectPath, depth);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Files API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to read files';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/sessions/:id/files - Save file content
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authDisabled = isAuthDisabled();
    const auth = await getAuthContext(request);

    if (!auth && !authDisabled) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await getWorkspacePath(id, authDisabled ? undefined : auth?.userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { projectPath } = result;

    const body = await request.json();
    const { path: filePath, content } = body;

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }

    const fullPath = validatePath(projectPath, filePath);
    if (!fullPath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    await fileSystemManager.writeFile(fullPath, content);

    // Get updated file info
    const info = await fileSystemManager.getFileInfo(fullPath);

    return NextResponse.json({
      path: filePath,
      size: info.size,
      modifiedAt: info.modifiedAt,
      success: true,
    });
  } catch (error) {
    console.error('Files API PUT error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/sessions/:id/files - Delete file
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authDisabled = isAuthDisabled();
    const auth = await getAuthContext(request);

    if (!auth && !authDisabled) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await getWorkspacePath(id, authDisabled ? undefined : auth?.userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { projectPath } = result;

    const url = new URL(request.url);
    const filePath = url.searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    const fullPath = validatePath(projectPath, filePath);
    if (!fullPath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    await fileSystemManager.deleteFile(fullPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Files API DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
