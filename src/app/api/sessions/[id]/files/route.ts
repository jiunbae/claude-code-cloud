import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { workspaceStore } from '@/server/workspace/WorkspaceStore';
import { workspaceManager } from '@/server/workspace/WorkspaceManager';
import { fileSystemManager } from '@/server/files/FileSystemManager';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/sessions/:id/files - Get file tree
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = sessionStore.get(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get workspace to determine project path
    const workspace = workspaceStore.get(session.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get actual filesystem path from workspace
    const projectPath = workspaceManager.getWorkspacePath(workspace.ownerId, workspace.slug);

    const url = new URL(request.url);
    const depth = parseInt(url.searchParams.get('depth') || '3', 10);
    const filePath = url.searchParams.get('path');

    // If path is provided, return file content
    if (filePath) {
      const fullPath = `${projectPath}/${filePath}`;
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
