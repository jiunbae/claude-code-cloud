import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type { Workspace, CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceStatus } from '@/types';

// Database path configuration - same as SessionStore
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

class WorkspaceStore {
  private _db: Database.Database | null = null;

  // Lazy database initialization
  private get db(): Database.Database {
    if (!this._db) {
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this._db = new Database(DB_PATH);
      this._db.pragma('journal_mode = WAL');
      this.initSchema();
    }
    return this._db;
  }

  private initSchema(): void {
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'ready',
        source_type TEXT NOT NULL DEFAULT 'empty',
        git_url TEXT,
        git_branch TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        UNIQUE(owner_id, slug)
      );

      CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
      CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
    `);
  }

  create(request: CreateWorkspaceRequest, ownerId: string): Workspace {
    const id = nanoid(12);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO workspaces (
        id, name, slug, description, status,
        source_type, git_url, git_branch,
        created_at, updated_at, owner_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const status: WorkspaceStatus = request.sourceType === 'git' ? 'cloning' : 'creating';

    stmt.run(
      id,
      request.name,
      request.slug,
      request.description || null,
      status,
      request.sourceType,
      request.gitUrl || null,
      request.gitBranch || null,
      now,
      now,
      ownerId
    );

    return this.get(id)!;
  }

  get(id: string): Workspace | null {
    const stmt = this.db.prepare(`SELECT * FROM workspaces WHERE id = ?`);
    const row = stmt.get(id) as WorkspaceRow | undefined;
    return row ? this.rowToWorkspace(row) : null;
  }

  getByOwner(ownerId: string): Workspace[] {
    const stmt = this.db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM sessions s WHERE s.workspace_id = w.id) as session_count
      FROM workspaces w
      WHERE w.owner_id = ?
      ORDER BY w.updated_at DESC
    `);
    const rows = stmt.all(ownerId) as (WorkspaceRow & { session_count: number })[];
    return rows.map((row) => this.rowToWorkspace(row, row.session_count));
  }

  getAll(): Workspace[] {
    const stmt = this.db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM sessions s WHERE s.workspace_id = w.id) as session_count
      FROM workspaces w
      ORDER BY w.updated_at DESC
    `);
    const rows = stmt.all() as (WorkspaceRow & { session_count: number })[];
    return rows.map((row) => this.rowToWorkspace(row, row.session_count));
  }

  findByOwnerAndSlug(ownerId: string, slug: string): Workspace | null {
    const stmt = this.db.prepare(`
      SELECT * FROM workspaces WHERE owner_id = ? AND slug = ?
    `);
    const row = stmt.get(ownerId, slug) as WorkspaceRow | undefined;
    return row ? this.rowToWorkspace(row) : null;
  }

  update(id: string, updates: UpdateWorkspaceRequest): Workspace | null {
    const workspace = this.get(id);
    if (!workspace) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (fields.length === 0) return workspace;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE workspaces SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.get(id);
  }

  updateStatus(id: string, status: WorkspaceStatus): Workspace | null {
    const stmt = this.db.prepare(`
      UPDATE workspaces SET status = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(status, new Date().toISOString(), id);
    return this.get(id);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM workspaces WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  exists(id: string): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM workspaces WHERE id = ?`);
    return stmt.get(id) !== undefined;
  }

  slugExists(ownerId: string, slug: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM workspaces WHERE owner_id = ? AND slug = ?
    `);
    return stmt.get(ownerId, slug) !== undefined;
  }

  getSessionCount(id: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sessions WHERE workspace_id = ?
    `);
    const result = stmt.get(id) as { count: number };
    return result.count;
  }

  isOwner(workspaceId: string, userId: string): boolean {
    const stmt = this.db.prepare(`SELECT owner_id FROM workspaces WHERE id = ?`);
    const row = stmt.get(workspaceId) as { owner_id: string } | undefined;
    return row?.owner_id === userId;
  }

  close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }

  private rowToWorkspace(row: WorkspaceRow, sessionCount?: number): Workspace {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      status: row.status as WorkspaceStatus,
      sourceType: row.source_type as 'empty' | 'git',
      gitUrl: row.git_url || undefined,
      gitBranch: row.git_branch || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      ownerId: row.owner_id,
      sessionCount: sessionCount,
    };
  }
}

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  source_type: string;
  git_url: string | null;
  git_branch: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

// Singleton instance
export const workspaceStore = new WorkspaceStore();
