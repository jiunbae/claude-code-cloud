import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { sessionStore } from '@/server/session/SessionStore';
import { workspaceManager } from '@/server/workspace/WorkspaceManager';
import { fileSystemManager } from '@/server/files/FileSystemManager';
import { getAuthContext } from '@/server/auth';
import { shareTokenStore } from '@/server/collaboration/ShareTokenStore';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Helper to get workspace path from session with auth check
async function getWorkspacePath(sessionId: string, userId?: string, shareToken?: string) {
  const session = sessionStore.getWithWorkspace(sessionId);

  if (!session) {
    return { error: 'Session not found', status: 404 };
  }

  // Check ownership or share token access
  const isOwner = userId && session.ownerId === userId;

  let hasShareAccess = false;
  if (shareToken) {
    const validation = shareTokenStore.validateToken(shareToken);
    hasShareAccess = validation.valid && validation.sessionId === sessionId;
  }

  if (!isOwner && !hasShareAccess) {
    return { error: 'Access denied', status: 403 };
  }

  const workspace = session.workspace;
  if (!workspace) {
    return { error: 'Workspace not found for this session', status: 404 };
  }

  const projectPath = workspaceManager.getWorkspacePath(workspace.ownerId, workspace.slug);
  return { projectPath, session, workspace };
}

// Validate path to prevent path traversal attacks
function validatePath(basePath: string, filePath: string): string | null {
  if (!filePath || filePath === '.') {
    return basePath; // Return root for empty path
  }

  const fullPath = path.join(basePath, filePath);
  const normalizedBase = path.resolve(basePath);
  const normalizedFull = path.resolve(fullPath);
  const relative = path.relative(normalizedBase, normalizedFull);

  if (
    relative.startsWith('..' + path.sep) ||
    relative === '..' ||
    path.isAbsolute(relative)
  ) {
    return null;
  }
  return normalizedFull;
}

// GET /api/sessions/:id/files/download - Download file or directory as zip
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getAuthContext(request);

    const url = new URL(request.url);
    const shareToken = url.searchParams.get('token');

    // Allow access with either auth or valid share token
    if (!auth && !shareToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await getWorkspacePath(id, auth?.userId, shareToken || undefined);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { projectPath } = result;
    const filePath = url.searchParams.get('path') || '';
    const forceZip = url.searchParams.get('zip') === 'true';

    const fullPath = validatePath(projectPath, filePath);
    if (!fullPath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const info = await fileSystemManager.getFileInfo(fullPath);

    if (!info.exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Directory download - always as zip
    if (info.isDirectory || forceZip) {
      return await streamZipDownload(fullPath, filePath || path.basename(projectPath));
    }

    // Single file download
    return await streamFileDownload(fullPath, path.basename(fullPath), info.mimeType);
  } catch (error) {
    console.error('Download API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to download';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Stream single file download
async function streamFileDownload(
  filePath: string,
  fileName: string,
  mimeType: string
): Promise<Response> {
  const buffer = await fileSystemManager.readFileBuffer(filePath);

  const headers = new Headers({
    'Content-Type': mimeType,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    'Content-Length': buffer.length.toString(),
  });

  // Convert Buffer to Uint8Array for Response compatibility
  return new Response(new Uint8Array(buffer), { headers });
}

// Stream directory as zip
async function streamZipDownload(
  dirPath: string,
  dirName: string
): Promise<Response> {
  const archive = archiver('zip', {
    zlib: { level: 6 }, // Balanced compression
  });

  const passThrough = new PassThrough();

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    passThrough.destroy(err);
  });

  archive.pipe(passThrough);

  // Add directory contents to archive
  archive.directory(dirPath, false);

  // Finalize the archive (async)
  archive.finalize();

  const headers = new Headers({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(dirName)}.zip"`,
  });

  // Convert Node.js stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      passThrough.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      passThrough.on('end', () => {
        controller.close();
      });
      passThrough.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      archive.abort();
      passThrough.destroy();
    },
  });

  return new Response(webStream, { headers });
}
