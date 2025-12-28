import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { GlobalSettings, GlobalSettingEntry, DEFAULT_GLOBAL_SETTINGS } from '@/types/settings';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

// Default global settings
const DEFAULT_SETTINGS: GlobalSettings = {
  allowRegistration: true,
  requireEmailVerification: false,
  maxUsersAllowed: 100,
  defaultApiProvider: 'anthropic',
  allowUserApiKeys: true,
  requireApiKey: false,
  maxSessionsPerUser: 10,
  sessionTimeoutMinutes: 60,
  skillsEnabled: true,
  allowUserSkillInstall: true,
};

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
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS global_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_by TEXT,
        updated_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Get all global settings as a single object
   */
  getAll(): GlobalSettings {
    const stmt = this.db.prepare(`SELECT key, value FROM global_settings`);
    const rows = stmt.all() as { key: string; value: string }[];

    // Start with defaults and override with stored values
    const settings = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      try {
        const value = JSON.parse(row.value);
        if (row.key in settings) {
          (settings as Record<string, unknown>)[row.key] = value;
        }
      } catch {
        // Skip invalid JSON values
        console.warn(`Invalid JSON value for global setting: ${row.key}`);
      }
    }

    return settings;
  }

  /**
   * Get a single setting value
   */
  get<K extends keyof GlobalSettings>(key: K): GlobalSettings[K] {
    const stmt = this.db.prepare(`SELECT value FROM global_settings WHERE key = ?`);
    const row = stmt.get(key) as { value: string } | undefined;

    if (row) {
      try {
        return JSON.parse(row.value);
      } catch {
        return DEFAULT_SETTINGS[key];
      }
    }

    return DEFAULT_SETTINGS[key];
  }

  /**
   * Get a setting entry with metadata
   */
  getEntry(key: string): GlobalSettingEntry | null {
    const stmt = this.db.prepare(`SELECT * FROM global_settings WHERE key = ?`);
    const row = stmt.get(key) as GlobalSettingRow | undefined;
    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Set a single setting value
   */
  set<K extends keyof GlobalSettings>(
    key: K,
    value: GlobalSettings[K],
    updatedBy?: string
  ): void {
    const now = new Date().toISOString();
    const jsonValue = JSON.stringify(value);

    const stmt = this.db.prepare(`
      INSERT INTO global_settings (key, value, updated_by, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `);

    stmt.run(key, jsonValue, updatedBy ?? null, now);
  }

  /**
   * Update multiple settings at once
   */
  updateMany(
    updates: Partial<GlobalSettings>,
    updatedBy?: string
  ): GlobalSettings {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO global_settings (key, value, updated_by, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `);

    const updateTransaction = this.db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          stmt.run(key, JSON.stringify(value), updatedBy ?? null, now);
        }
      }
    });

    updateTransaction();

    return this.getAll();
  }

  /**
   * Reset a setting to default
   */
  reset<K extends keyof GlobalSettings>(key: K): void {
    const stmt = this.db.prepare(`DELETE FROM global_settings WHERE key = ?`);
    stmt.run(key);
  }

  /**
   * Reset all settings to defaults
   */
  resetAll(): void {
    const stmt = this.db.prepare(`DELETE FROM global_settings`);
    stmt.run();
  }

  /**
   * Get last updated timestamp
   */
  getLastUpdated(): Date | null {
    const stmt = this.db.prepare(`
      SELECT MAX(updated_at) as last_updated FROM global_settings
    `);
    const row = stmt.get() as { last_updated: string | null } | undefined;

    return row?.last_updated ? new Date(row.last_updated) : null;
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

  private rowToEntry(row: GlobalSettingRow): GlobalSettingEntry {
    return {
      key: row.key,
      value: row.value,
      description: row.description ?? undefined,
      updatedBy: row.updated_by,
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Database row type
interface GlobalSettingRow {
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

// Singleton instance
export const globalSettingsStore = new GlobalSettingsStore();
