import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/auth/middleware';
import { workspaceStore } from '@/server/workspace/WorkspaceStore';
import { workspaceManager } from '@/server/workspace/WorkspaceManager';
import { isAuthDisabled } from '@/server/middleware/auth';
import type { UpdateWorkspaceRequest } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/:id
 * Get a specific workspace
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);
  if (!auth && !authDisabled) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const workspace = workspaceStore.get(id);

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  // Check ownership
  if (!authDisabled && workspace.ownerId !== auth?.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get session count
  const sessionCount = workspaceStore.getSessionCount(id);

  return NextResponse.json({
    workspace: { ...workspace, sessionCount },
  });
}

/**
 * PATCH /api/workspaces/:id
 * Update a workspace
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);
  if (!auth && !authDisabled) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const workspace = workspaceStore.get(id);

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  // Check ownership
  if (!authDisabled && workspace.ownerId !== auth?.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  let body: UpdateWorkspaceRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate name if provided
  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }

  const updated = workspaceStore.update(id, {
    name: body.name?.trim(),
    description: body.description,
  });

  return NextResponse.json({ workspace: updated });
}

/**
 * DELETE /api/workspaces/:id
 * Delete a workspace
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authDisabled = isAuthDisabled();
  const auth = await getAuthContext(request);
  if (!auth && !authDisabled) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const workspace = workspaceStore.get(id);

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  // Check ownership
  if (!authDisabled && workspace.ownerId !== auth?.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Check if there are connected sessions
  const sessionCount = workspaceStore.getSessionCount(id);
  if (sessionCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete workspace with ${sessionCount} connected session(s). Please delete all sessions first.`,
      },
      { status: 400 }
    );
  }

  try {
    // Delete from database first (safer - orphaned directories can be cleaned up later)
    workspaceStore.delete(id);

    // Then delete filesystem directory
    const ownerId = authDisabled ? workspace.ownerId : auth!.userId;
    await workspaceManager.delete(ownerId, workspace.slug);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
  }
}
