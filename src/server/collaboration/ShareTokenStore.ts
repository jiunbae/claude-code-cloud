import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { ShareToken, CreateShareTokenRequest } from '@/types/collaboration';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

class ShareTokenStore {
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
      this._db.pragma('journal_mode = WAL');
      this.initSchema();
    }
    return this._db;
  }

  private initSchema(): void {
    // Use _db directly since this is called during initialization
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS share_tokens (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        permission TEXT NOT NULL DEFAULT 'view',
        allow_anonymous INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        max_uses INTEGER,
        use_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_share_tokens_session
        ON share_tokens(session_id);

      CREATE INDEX IF NOT EXISTS idx_share_tokens_token
        ON share_tokens(token);
    `);

    // Migration: Add allow_anonymous column if it doesn't exist
    try {
      this._db!.exec(`ALTER TABLE share_tokens ADD COLUMN allow_anonymous INTEGER NOT NULL DEFAULT 0`);
    } catch {
      // Column already exists, ignore error
    }
  }

  create(request: CreateShareTokenRequest): ShareToken {
    const id = nanoid(12);
    const token = this.generateToken();
    const now = new Date();

    // If allowAnonymous is true, force permission to 'view'
    const permission = request.allowAnonymous ? 'view' : request.permission;
    const allowAnonymous = request.allowAnonymous || false;

    let expiresAt: Date | null = null;
    if (request.expiresInHours) {
      expiresAt = new Date(now.getTime() + request.expiresInHours * 60 * 60 * 1000);
    }

    const stmt = this.db.prepare(`
      INSERT INTO share_tokens (
        id, session_id, token, permission, allow_anonymous,
        created_at, expires_at, max_uses, use_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(
      id,
      request.sessionId,
      token,
      permission,
      allowAnonymous ? 1 : 0,
      now.toISOString(),
      expiresAt?.toISOString() || null,
      request.maxUses || null
    );

    return this.get(id)!;
  }

  get(id: string): ShareToken | null {
    const stmt = this.db.prepare(`SELECT * FROM share_tokens WHERE id = ?`);
    const row = stmt.get(id) as ShareTokenRow | undefined;
    return row ? this.rowToToken(row) : null;
  }

  getByToken(token: string): ShareToken | null {
    const stmt = this.db.prepare(`SELECT * FROM share_tokens WHERE token = ?`);
    const row = stmt.get(token) as ShareTokenRow | undefined;
    return row ? this.rowToToken(row) : null;
  }

  getBySessionId(sessionId: string): ShareToken[] {
    const stmt = this.db.prepare(`
      SELECT * FROM share_tokens WHERE session_id = ? ORDER BY created_at DESC
    `);
    const rows = stmt.all(sessionId) as ShareTokenRow[];
    return rows.map((row) => this.rowToToken(row));
  }

  incrementUseCount(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE share_tokens SET use_count = use_count + 1 WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM share_tokens WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteBySessionId(sessionId: string): number {
    const stmt = this.db.prepare(`DELETE FROM share_tokens WHERE session_id = ?`);
    const result = stmt.run(sessionId);
    return result.changes;
  }

  // Validate token and return permission if valid
  validateToken(token: string): { valid: boolean; sessionId?: string; permission?: 'view' | 'interact'; allowAnonymous?: boolean } {
    const shareToken = this.getByToken(token);

    if (!shareToken) {
      return { valid: false };
    }

    // Check expiration
    if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
      return { valid: false };
    }

    // Check max uses
    if (shareToken.maxUses !== null && shareToken.useCount >= shareToken.maxUses) {
      return { valid: false };
    }

    return {
      valid: true,
      sessionId: shareToken.sessionId,
      permission: shareToken.permission,
      allowAnonymous: shareToken.allowAnonymous,
    };
  }

  // Clean up expired tokens
  cleanupExpired(): number {
    const stmt = this.db.prepare(`
      DELETE FROM share_tokens WHERE expires_at IS NOT NULL AND expires_at < ?
    `);
    const result = stmt.run(new Date().toISOString());
    return result.changes;
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private rowToToken(row: ShareTokenRow): ShareToken {
    return {
      id: row.id,
      sessionId: row.session_id,
      token: row.token,
      permission: row.permission as 'view' | 'interact',
      allowAnonymous: row.allow_anonymous === 1,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      maxUses: row.max_uses,
      useCount: row.use_count,
    };
  }
}

interface ShareTokenRow {
  id: string;
  session_id: string;
  token: string;
  permission: string;
  allow_anonymous: number;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
}

export const shareTokenStore = new ShareTokenStore();
