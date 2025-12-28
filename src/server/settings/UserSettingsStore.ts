import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type { UserSettings, UserSettingsCreate, UserSettingsUpdate, ThemeMode, Language } from '@/types/settings';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

// Default settings
const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  theme: 'dark',
  language: 'ko',
  defaultModel: 'claude-sonnet-4-5-20250514',
  terminalFontSize: 14,
  editorFontSize: 14,
  autoSave: true,
};

class UserSettingsStore {
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
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        theme TEXT DEFAULT 'dark',
        language TEXT DEFAULT 'ko',
        default_model TEXT DEFAULT 'claude-sonnet-4-5-20250514',
        terminal_font_size INTEGER DEFAULT 14,
        editor_font_size INTEGER DEFAULT 14,
        auto_save INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    `);
  }

  /**
   * Get settings for a user, creating defaults if they don't exist
   */
  getByUserId(userId: string): UserSettings {
    const stmt = this.db.prepare(`SELECT * FROM user_settings WHERE user_id = ?`);
    const row = stmt.get(userId) as UserSettingsRow | undefined;

    if (row) {
      return this.rowToSettings(row);
    }

    // Create default settings for this user
    return this.create(userId);
  }

  /**
   * Create default settings for a user
   */
  create(userId: string, settings?: UserSettingsCreate): UserSettings {
    const id = nanoid(12);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO user_settings (
        id, user_id, theme, language, default_model,
        terminal_font_size, editor_font_size, auto_save,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      settings?.theme ?? DEFAULT_SETTINGS.theme,
      settings?.language ?? DEFAULT_SETTINGS.language,
      settings?.defaultModel ?? DEFAULT_SETTINGS.defaultModel,
      settings?.terminalFontSize ?? DEFAULT_SETTINGS.terminalFontSize,
      settings?.editorFontSize ?? DEFAULT_SETTINGS.editorFontSize,
      (settings?.autoSave ?? DEFAULT_SETTINGS.autoSave) ? 1 : 0,
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * Get settings by ID
   */
  getById(id: string): UserSettings | null {
    const stmt = this.db.prepare(`SELECT * FROM user_settings WHERE id = ?`);
    const row = stmt.get(id) as UserSettingsRow | undefined;
    return row ? this.rowToSettings(row) : null;
  }

  /**
   * Update user settings
   */
  update(userId: string, updates: UserSettingsUpdate): UserSettings | null {
    // Ensure settings exist
    const existing = this.getByUserId(userId);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.theme !== undefined) {
      fields.push('theme = ?');
      values.push(updates.theme);
    }
    if (updates.language !== undefined) {
      fields.push('language = ?');
      values.push(updates.language);
    }
    if (updates.defaultModel !== undefined) {
      fields.push('default_model = ?');
      values.push(updates.defaultModel);
    }
    if (updates.terminalFontSize !== undefined) {
      fields.push('terminal_font_size = ?');
      values.push(updates.terminalFontSize);
    }
    if (updates.editorFontSize !== undefined) {
      fields.push('editor_font_size = ?');
      values.push(updates.editorFontSize);
    }
    if (updates.autoSave !== undefined) {
      fields.push('auto_save = ?');
      values.push(updates.autoSave ? 1 : 0);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    const stmt = this.db.prepare(`UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`);
    stmt.run(...values);

    return this.getByUserId(userId);
  }

  /**
   * Delete user settings
   */
  delete(userId: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM user_settings WHERE user_id = ?`);
    const result = stmt.run(userId);
    return result.changes > 0;
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

  private rowToSettings(row: UserSettingsRow): UserSettings {
    return {
      id: row.id,
      userId: row.user_id,
      theme: row.theme as ThemeMode,
      language: row.language as Language,
      defaultModel: row.default_model,
      terminalFontSize: row.terminal_font_size,
      editorFontSize: row.editor_font_size,
      autoSave: row.auto_save === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Database row type
interface UserSettingsRow {
  id: string;
  user_id: string;
  theme: string;
  language: string;
  default_model: string;
  terminal_font_size: number;
  editor_font_size: number;
  auto_save: number;
  created_at: string;
  updated_at: string;
}

// Singleton instance
export const userSettingsStore = new UserSettingsStore();
