import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/server/auth';
import { claudeConfigManager } from '@/server/claude';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file extensions for security
const ALLOWED_EXTENSIONS = [
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml',
  '.js', '.ts', '.py', '.sh', '.bash',
  '.config', '.rc',
];

// POST /api/claude-config/upload - Upload a file
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const targetPath = formData.get('path') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!targetPath) {
      return NextResponse.json(
        { error: 'Target path is required' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    const isNoExtension = !fileName.includes('.');

    if (!hasAllowedExtension && !isNoExtension) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Determine full path
    const fullPath = targetPath.endsWith('/') || targetPath === ''
      ? `${targetPath}${file.name}`
      : targetPath;

    // Write file
    await claudeConfigManager.writeFile(auth.userId, fullPath, content);

    return NextResponse.json({
      message: 'File uploaded successfully',
      path: fullPath,
      size: file.size,
    });
  } catch (error) {
    console.error('[ClaudeConfig Upload] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
