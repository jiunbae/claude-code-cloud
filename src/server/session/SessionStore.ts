import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import type { Session, CreateSessionRequest, SessionStatus, SessionConfig } from '@/types';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

class SessionStore {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        project_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        config_cols INTEGER NOT NULL DEFAULT 120,
        config_rows INTEGER NOT NULL DEFAULT 30,
        config_env TEXT DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_last_active
        ON sessions(last_active_at DESC);

      CREATE INDEX IF NOT EXISTS idx_sessions_status
        ON sessions(status);
    `);

    // Add owner_id column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN owner_id TEXT DEFAULT ''`);
    } catch {
      // Column already exists
    }

    // Add is_public column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN is_public INTEGER DEFAULT 0`);
    } catch {
      // Column already exists
    }

    // Create index for owner_id
    try {
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_id)`);
    } catch {
      // Index might already exist
    }
  }

  create(request: CreateSessionRequest, ownerId?: string): Session {
    const id = nanoid(12);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, name, project_path, status,
        created_at, updated_at, last_active_at,
        config_cols, config_rows, config_env,
        owner_id, is_public
      ) VALUES (?, ?, ?, 'idle', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      request.name,
      request.projectPath,
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

  getAll(): Session[] {
    const stmt = this.db.prepare(`SELECT * FROM sessions ORDER BY last_active_at DESC`);
    const rows = stmt.all() as SessionRow[];
    return rows.map((row) => this.rowToSession(row));
  }

  // Get sessions by owner
  getByOwner(ownerId: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE owner_id = ?
      ORDER BY last_active_at DESC
    `);
    const rows = stmt.all(ownerId) as SessionRow[];
    return rows.map((row) => this.rowToSession(row));
  }

  // Get accessible sessions (owned + public)
  getAccessible(userId: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE owner_id = ? OR is_public = 1
      ORDER BY last_active_at DESC
    `);
    const rows = stmt.all(userId) as SessionRow[];
    return rows.map((row) => this.rowToSession(row));
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
    if (updates.projectPath !== undefined) {
      fields.push('project_path = ?');
      values.push(updates.projectPath);
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
    this.db.close();
  }

  // Convert database row to Session object
  private rowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      name: row.name,
      projectPath: row.project_path,
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
}

// Database row type
interface SessionRow {
  id: string;
  name: string;
  project_path: string;
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

// Singleton instance
export const sessionStore = new SessionStore();
