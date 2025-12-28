import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { encrypt, decrypt, maskApiKey } from '../crypto';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

// Known API key settings
export const KNOWN_API_KEYS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GIT_CLONE_TOKEN',
] as const;

export type KnownApiKey = (typeof KNOWN_API_KEYS)[number];

export interface GlobalSetting {
  key: string;
  hasValue: boolean;
  maskedValue?: string;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

class GlobalSettingsStore {
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
    // Create global_settings table if not exists
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS global_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT NOT NULL,
        updated_by TEXT
      );
    `);

    // Create audit_logs table if not exists
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `);
  }

  /**
   * Get a setting value (decrypted)
   */
  get(key: string): string | null {
    const stmt = this.db.prepare(`SELECT value FROM global_settings WHERE key = ?`);
    const row = stmt.get(key) as { value: string } | undefined;

    if (!row) return null;

    try {
      return decrypt(row.value);
    } catch (error) {
      console.error(`[GlobalSettings] Failed to decrypt setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a setting value (encrypted)
   */
  set(key: string, value: string, adminId: string, description?: string): boolean {
    try {
      const encryptedValue = encrypt(value);
      const now = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO global_settings (key, value, description, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          description = excluded.description,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `);

      stmt.run(key, encryptedValue, description ?? null, now, adminId);

      // Log the action
      this.logAudit(adminId, 'key_updated', 'global_settings', key, {
        description,
      });

      return true;
    } catch (error) {
      console.error(`[GlobalSettings] Failed to set setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a setting
   */
  delete(key: string, adminId: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM global_settings WHERE key = ?`);
    const result = stmt.run(key);

    if (result.changes > 0) {
      this.logAudit(adminId, 'key_deleted', 'global_settings', key);
      return true;
    }

    return false;
  }

  /**
   * Get all settings (with masked values for display)
   */
  getAll(): GlobalSetting[] {
    const stmt = this.db.prepare(`
      SELECT key, value, description, updated_at, updated_by
      FROM global_settings
      ORDER BY key
    `);
    const rows = stmt.all() as Array<{
      key: string;
      value: string;
      description: string | null;
      updated_at: string;
      updated_by: string | null;
    }>;

    return rows.map((row) => {
      let maskedValue: string | undefined;
      try {
        const decrypted = decrypt(row.value);
        maskedValue = maskApiKey(decrypted);
      } catch {
        maskedValue = '****';
      }

      return {
        key: row.key,
        hasValue: true,
        maskedValue,
        description: row.description || undefined,
        updatedAt: new Date(row.updated_at),
        updatedBy: row.updated_by || undefined,
      };
    });
  }

  /**
   * Check if a setting exists
   */
  exists(key: string): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM global_settings WHERE key = ?`);
    return stmt.get(key) !== undefined;
  }

  /**
   * Get all known API keys status (including those not set)
   */
  getAllWithDefaults(): GlobalSetting[] {
    const existingSettings = this.getAll();
    const existingKeys = new Set(existingSettings.map((s) => s.key));

    const result: GlobalSetting[] = [...existingSettings];

    // Add entries for known keys that don't exist
    for (const key of KNOWN_API_KEYS) {
      if (!existingKeys.has(key)) {
        // Check if there's a fallback from environment variables
        const envValue = process.env[key];
        result.push({
          key,
          hasValue: !!envValue,
          maskedValue: envValue ? maskApiKey(envValue) : undefined,
          description: envValue ? 'Using environment variable' : undefined,
          updatedAt: new Date(0), // Epoch for env vars
        });
      }
    }

    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Log an audit event
   */
  logAudit(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      nanoid(12),
      new Date().toISOString(),
      userId,
      action,
      resourceType,
      resourceId || null,
      details ? JSON.stringify(details) : null
    );
  }

  /**
   * Get audit logs
   */
  getAuditLogs(options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
  }): AuditLog[] {
    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params: unknown[] = [];

    if (options?.userId) {
      query += ` AND user_id = ?`;
      params.push(options.userId);
    }
    if (options?.action) {
      query += ` AND action = ?`;
      params.push(options.action);
    }
    if (options?.resourceType) {
      query += ` AND resource_type = ?`;
      params.push(options.resourceType);
    }

    query += ` ORDER BY timestamp DESC`;

    if (options?.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Array<{
      id: string;
      timestamp: string;
      user_id: string;
      action: string;
      resource_type: string;
      resource_id: string | null;
      details: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id || undefined,
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }
}

// Singleton instance
export const globalSettingsStore = new GlobalSettingsStore();
