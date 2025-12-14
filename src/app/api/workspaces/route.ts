import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/auth/middleware';
import { workspaceStore } from '@/server/workspace/WorkspaceStore';
import { workspaceManager } from '@/server/workspace/WorkspaceManager';
import type { CreateWorkspaceRequest } from '@/types';

// Slug validation: only alphanumeric and hyphens, 3-50 chars
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

function validateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

/**
 * GET /api/workspaces
 * Get all workspaces for the current user
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const workspaces = workspaceStore.getByOwner(auth.userId);
  return NextResponse.json({ workspaces });
}

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: CreateWorkspaceRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (!body.slug?.trim()) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  // Validate slug format
  const slug = body.slug.toLowerCase().trim();
  if (!validateSlug(slug)) {
    return NextResponse.json(
      { error: 'Slug must be 3-50 characters, alphanumeric and hyphens only, cannot start/end with hyphen' },
      { status: 400 }
    );
  }

  // Validate source type
  if (!body.sourceType || !['empty', 'git'].includes(body.sourceType)) {
    return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
  }

  // Validate git URL if source type is git
  if (body.sourceType === 'git') {
    if (!body.gitUrl?.trim()) {
      return NextResponse.json({ error: 'Git URL is required for git source type' }, { status: 400 });
    }

    // Basic git URL validation
    const gitUrl = body.gitUrl.trim();
    if (!gitUrl.startsWith('https://') && !gitUrl.startsWith('git@')) {
      return NextResponse.json({ error: 'Git URL must start with https:// or git@' }, { status: 400 });
    }
  }

  // Check if slug already exists for this user
  if (workspaceStore.slugExists(auth.userId, slug)) {
    return NextResponse.json({ error: 'A workspace with this slug already exists' }, { status: 409 });
  }

  try {
    // Create workspace record in database
    const workspace = workspaceStore.create(
      {
        ...body,
        slug,
      },
      auth.userId
    );

    // Create filesystem directory (async, don't wait)
    (async () => {
      try {
        if (body.sourceType === 'empty') {
          await workspaceManager.createEmpty(auth.userId, slug);
        } else {
          await workspaceManager.createFromGit(auth.userId, slug, body.gitUrl!, body.gitBranch);
        }
        // Update status to ready
        workspaceStore.updateStatus(workspace.id, 'ready');
      } catch (error) {
        console.error('Failed to create workspace directory:', error);
        workspaceStore.updateStatus(workspace.id, 'error');
      }
    })();

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
