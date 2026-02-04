import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type { Session, CreateSessionRequest, SessionStatus, SessionConfig, Workspace } from '@/types';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

class SessionStore {
  private _db: Database.Database | null = null;

  // Lazy database initialization
  private get db(): Database.Database {
    if (!this._db) {
      // Ensure directory exists
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this._db = new Database(DB_PATH);

      // Performance optimizations
      this._db.pragma('journal_mode = WAL');           // Write-Ahead Logging for better concurrency
      this._db.pragma('synchronous = NORMAL');         // Faster than FULL, still safe with WAL
      this._db.pragma('cache_size = -64000');          // 64MB cache (negative = KB)
      this._db.pragma('temp_store = MEMORY');          // Use memory for temp tables
      this._db.pragma('busy_timeout = 5000');          // 5 second timeout for locked database
      this._db.pragma('mmap_size = 268435456');        // 256 MiB memory-mapped I/O

      this.initSchema();
    }
    return this._db;
  }

  private initSchema(): void {
    // Ensure workspaces table exists before creating sessions (sessions join against it)
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

    // Use _db directly since this is called during initialization
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        config_cols INTEGER NOT NULL DEFAULT 120,
        config_rows INTEGER NOT NULL DEFAULT 30,
        config_env TEXT DEFAULT '{}',
        owner_id TEXT DEFAULT '',
        is_public INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_last_active
        ON sessions(last_active_at DESC);

      CREATE INDEX IF NOT EXISTS idx_sessions_status
        ON sessions(status);

      CREATE INDEX IF NOT EXISTS idx_sessions_owner
        ON sessions(owner_id);

      CREATE INDEX IF NOT EXISTS idx_sessions_workspace
        ON sessions(workspace_id);
    `);

    // Migration: Add workspace_id column if it doesn't exist (for existing databases with project_path)
    try {
      // Check if project_path column exists
      const tableInfo = this._db!.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
      const hasProjectPath = tableInfo.some(col => col.name === 'project_path');
      const hasWorkspaceId = tableInfo.some(col => col.name === 'workspace_id');

      if (hasProjectPath && !hasWorkspaceId) {
        // Old schema - need migration
        console.log('Migrating sessions table from project_path to workspace_id...');
        this._db!.exec(`ALTER TABLE sessions ADD COLUMN workspace_id TEXT DEFAULT ''`);
        this._db!.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id)`);
      }
    } catch {
      // Migration not needed or already done
    }
  }

  create(request: CreateSessionRequest, ownerId?: string): Session {
    const id = nanoid(12);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, name, workspace_id, status,
        created_at, updated_at, last_active_at,
        config_cols, config_rows, config_env,
        owner_id, is_public
      ) VALUES (?, ?, ?, 'idle', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      request.name,
      request.workspaceId,
      now,
      now,
      now,
      request.config?.cols ?? 120,
      request.config?.rows ?? 30,
      JSON.stringify(request.config?.env ?? {}),
      ownerId || '',
      0
    );

    return this.get(id)!;
  }

  get(id: string): Session | null {
    const stmt = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`);
    const row = stmt.get(id) as SessionRow | undefined;
    return row ? this.rowToSession(row) : null;
  }

  // Get session with workspace info
  getWithWorkspace(id: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT s.*,
        w.id as ws_id, w.name as ws_name, w.slug as ws_slug,
        w.description as ws_description, w.status as ws_status,
        w.source_type as ws_source_type, w.git_url as ws_git_url,
        w.git_branch as ws_git_branch, w.created_at as ws_created_at,
        w.updated_at as ws_updated_at, w.owner_id as ws_owner_id
      FROM sessions s
      LEFT JOIN workspaces w ON s.workspace_id = w.id
      WHERE s.id = ?
    `);
    const row = stmt.get(id) as (SessionRow & WorkspaceJoinRow) | undefined;
    return row ? this.rowToSessionWithWorkspace(row) : null;
  }

  getAll(): Session[] {
    const stmt = this.db.prepare(`SELECT * FROM sessions ORDER BY last_active_at DESC`);
    const rows = stmt.all() as SessionRow[];
    return rows.map((row) => this.rowToSession(row));
  }

  // Get all sessions with workspace info
  getAllWithWorkspace(): Session[] {
    const stmt = this.db.prepare(`
      SELECT s.*,
        w.id as ws_id, w.name as ws_name, w.slug as ws_slug,
        w.description as ws_description, w.status as ws_status,
        w.source_type as ws_source_type, w.git_url as ws_git_url,
        w.git_branch as ws_git_branch, w.created_at as ws_created_at,
        w.updated_at as ws_updated_at, w.owner_id as ws_owner_id
      FROM sessions s
      LEFT JOIN workspaces w ON s.workspace_id = w.id
      ORDER BY s.last_active_at DESC
    `);
    const rows = stmt.all() as (SessionRow & WorkspaceJoinRow)[];
    return rows.map((row) => this.rowToSessionWithWorkspace(row));
  }

  // Get sessions by owner with workspace info
  getByOwner(ownerId: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT s.*,
        w.id as ws_id, w.name as ws_name, w.slug as ws_slug,
        w.description as ws_description, w.status as ws_status,
        w.source_type as ws_source_type, w.git_url as ws_git_url,
        w.git_branch as ws_git_branch, w.created_at as ws_created_at,
        w.updated_at as ws_updated_at, w.owner_id as ws_owner_id
      FROM sessions s
      LEFT JOIN workspaces w ON s.workspace_id = w.id
      WHERE s.owner_id = ?
      ORDER BY s.last_active_at DESC
    `);
    const rows = stmt.all(ownerId) as (SessionRow & WorkspaceJoinRow)[];
    return rows.map((row) => this.rowToSessionWithWorkspace(row));
  }

  // Get sessions by workspace
  getByWorkspace(workspaceId: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE workspace_id = ?
      ORDER BY last_active_at DESC
    `);
    const rows = stmt.all(workspaceId) as SessionRow[];
    return rows.map((row) => this.rowToSession(row));
  }

  // Get accessible sessions (owned + public)
  getAccessible(userId: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT s.*,
        w.id as ws_id, w.name as ws_name, w.slug as ws_slug,
        w.description as ws_description, w.status as ws_status,
        w.source_type as ws_source_type, w.git_url as ws_git_url,
        w.git_branch as ws_git_branch, w.created_at as ws_created_at,
        w.updated_at as ws_updated_at, w.owner_id as ws_owner_id
      FROM sessions s
      LEFT JOIN workspaces w ON s.workspace_id = w.id
      WHERE s.owner_id = ? OR s.is_public = 1
      ORDER BY s.last_active_at DESC
    `);
    const rows = stmt.all(userId) as (SessionRow & WorkspaceJoinRow)[];
    return rows.map((row) => this.rowToSessionWithWorkspace(row));
  }

  // Check if user is owner
  isOwner(sessionId: string, userId: string): boolean {
    const stmt = this.db.prepare(`SELECT owner_id FROM sessions WHERE id = ?`);
    const row = stmt.get(sessionId) as { owner_id: string } | undefined;
    return row?.owner_id === userId;
  }

  // Check if session is accessible by user
  canAccess(sessionId: string, userId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM sessions
      WHERE id = ? AND (owner_id = ? OR is_public = 1 OR owner_id = '')
    `);
    return stmt.get(sessionId, userId) !== undefined;
  }

  update(id: string, updates: Partial<Session>): Session | null {
    const session = this.get(id);
    if (!session) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.workspaceId !== undefined) {
      fields.push('workspace_id = ?');
      values.push(updates.workspaceId);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.lastActiveAt !== undefined) {
      fields.push('last_active_at = ?');
      values.push(updates.lastActiveAt.toISOString());
    }
    if (updates.config !== undefined) {
      if (updates.config.cols !== undefined) {
        fields.push('config_cols = ?');
        values.push(updates.config.cols);
      }
      if (updates.config.rows !== undefined) {
        fields.push('config_rows = ?');
        values.push(updates.config.rows);
      }
      if (updates.config.env !== undefined) {
        fields.push('config_env = ?');
        values.push(JSON.stringify(updates.config.env));
      }
    }

    if (fields.length === 0) return session;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE sessions SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.get(id);
  }

  updateStatus(id: string, status: SessionStatus): Session | null {
    return this.update(id, { status, lastActiveAt: new Date() });
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM sessions WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  exists(id: string): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM sessions WHERE id = ?`);
    return stmt.get(id) !== undefined;
  }

  count(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM sessions`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  // Get sessions by status
  getByStatus(status: SessionStatus): Session[] {
    const stmt = this.db.prepare(`SELECT * FROM sessions WHERE status = ? ORDER BY last_active_at DESC`);
    const rows = stmt.all(status) as SessionRow[];
    return rows.map((row) => this.rowToSession(row));
  }

  // Search sessions by name
  searchByName(query: string): Session[] {
    const stmt = this.db.prepare(`SELECT * FROM sessions WHERE name LIKE ? ORDER BY last_active_at DESC`);
    const rows = stmt.all(`%${query}%`) as SessionRow[];
    return rows.map((row) => this.rowToSession(row));
  }

  // Close database connection
  close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }

  // Convert database row to Session object
  private rowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      name: row.name,
      workspaceId: row.workspace_id,
      status: row.status as SessionStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastActiveAt: new Date(row.last_active_at),
      config: {
        cols: row.config_cols,
        rows: row.config_rows,
        env: JSON.parse(row.config_env) as Record<string, string>,
      },
      ownerId: row.owner_id || undefined,
      isPublic: row.is_public === 1,
    };
  }

  // Convert database row with workspace join to Session object
  private rowToSessionWithWorkspace(row: SessionRow & WorkspaceJoinRow): Session {
    const session = this.rowToSession(row);

    if (row.ws_id) {
      session.workspace = {
        id: row.ws_id,
        name: row.ws_name,
        slug: row.ws_slug,
        description: row.ws_description || undefined,
        status: row.ws_status as Workspace['status'],
        sourceType: row.ws_source_type as 'empty' | 'git',
        gitUrl: row.ws_git_url || undefined,
        gitBranch: row.ws_git_branch || undefined,
        createdAt: new Date(row.ws_created_at),
        updatedAt: new Date(row.ws_updated_at),
        ownerId: row.ws_owner_id,
      };
    }

    return session;
  }
}

// Database row type
interface SessionRow {
  id: string;
  name: string;
  workspace_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
  config_cols: number;
  config_rows: number;
  config_env: string;
  owner_id: string;
  is_public: number;
}

// Workspace join row type
interface WorkspaceJoinRow {
  ws_id: string | null;
  ws_name: string;
  ws_slug: string;
  ws_description: string | null;
  ws_status: string;
  ws_source_type: string;
  ws_git_url: string | null;
  ws_git_branch: string | null;
  ws_created_at: string;
  ws_updated_at: string;
  ws_owner_id: string;
}

// Singleton instance
export const sessionStore = new SessionStore();
