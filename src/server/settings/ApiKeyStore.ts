import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type { ApiKey, ApiKeyCreate, ApiKeyProvider, ApiKeyWithSecret } from '@/types/settings';
import {
  encryptApiKey,
  decryptApiKey,
  serializeEncryptedData,
  deserializeEncryptedData,
  maskApiKey,
} from '@/server/crypto/encryption';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

/**
 * Custom error for duplicate API key
 */
export class DuplicateKeyError extends Error {
  constructor(keyName: string, provider: string) {
    super(`API key with name "${keyName}" already exists for provider "${provider}"`);
    this.name = 'DuplicateKeyError';
  }
}

/**
 * Database row type for user_api_keys table
 */
interface ApiKeyRow {
  id: string;
  user_id: string;
  provider: string;
  key_name: string;
  encrypted_key: string;
  key_preview: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

class ApiKeyStore {
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
      CREATE TABLE IF NOT EXISTS user_api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        key_name TEXT NOT NULL,
        encrypted_key TEXT NOT NULL,
        key_preview TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_used_at TEXT,
        UNIQUE(user_id, provider, key_name)
      );

      CREATE INDEX IF NOT EXISTS idx_api_keys_user ON user_api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_provider ON user_api_keys(user_id, provider);
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON user_api_keys(user_id, provider, is_active);
    `);
  }

  /**
   * Get all API keys for a user (without decrypted keys)
   */
  getByUser(userId: string): ApiKey[] {
    const stmt = this.db.prepare(`
      SELECT * FROM user_api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as ApiKeyRow[];
    return rows.map((row) => this.rowToApiKey(row));
  }

  /**
   * Get API keys for a user filtered by provider
   */
  getByUserAndProvider(userId: string, provider: ApiKeyProvider): ApiKey[] {
    const stmt = this.db.prepare(`
      SELECT * FROM user_api_keys
      WHERE user_id = ? AND provider = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId, provider) as ApiKeyRow[];
    return rows.map((row) => this.rowToApiKey(row));
  }

  /**
   * Get the active API key for a user and provider (with decrypted key)
   * Returns null if no active key exists
   */
  getActiveKey(userId: string, provider: ApiKeyProvider): ApiKeyWithSecret | null {
    const stmt = this.db.prepare(`
      SELECT * FROM user_api_keys
      WHERE user_id = ? AND provider = ? AND is_active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    const row = stmt.get(userId, provider) as ApiKeyRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToApiKeyWithSecret(row);
  }

  /**
   * Get a single API key by ID
   */
  getById(id: string): ApiKey | null {
    const stmt = this.db.prepare(`SELECT * FROM user_api_keys WHERE id = ?`);
    const row = stmt.get(id) as ApiKeyRow | undefined;
    return row ? this.rowToApiKey(row) : null;
  }

  /**
   * Get a single API key by ID with decrypted key
   */
  getByIdWithSecret(id: string): ApiKeyWithSecret | null {
    const stmt = this.db.prepare(`SELECT * FROM user_api_keys WHERE id = ?`);
    const row = stmt.get(id) as ApiKeyRow | undefined;
    return row ? this.rowToApiKeyWithSecret(row) : null;
  }

  /**
   * Add a new API key for a user
   */
  add(userId: string, data: ApiKeyCreate): ApiKey {
    const id = nanoid(12);
    const now = new Date().toISOString();

    // Encrypt the API key
    const encryptedData = encryptApiKey(data.apiKey);
    const encryptedKey = serializeEncryptedData(encryptedData);
    const keyPreview = maskApiKey(data.apiKey);

    // Check if key with same name exists for this user and provider
    const existingStmt = this.db.prepare(`
      SELECT id FROM user_api_keys
      WHERE user_id = ? AND provider = ? AND key_name = ?
    `);
    const existing = existingStmt.get(userId, data.provider, data.keyName);

    if (existing) {
      throw new DuplicateKeyError(data.keyName, data.provider);
    }

    // If this is the first key for this provider, make it active by default
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM user_api_keys
      WHERE user_id = ? AND provider = ?
    `);
    const countResult = countStmt.get(userId, data.provider) as { count: number };
    const isFirstKey = countResult.count === 0;

    const stmt = this.db.prepare(`
      INSERT INTO user_api_keys (
        id, user_id, provider, key_name, encrypted_key, key_preview,
        is_active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      data.provider,
      data.keyName,
      encryptedKey,
      keyPreview,
      isFirstKey ? 1 : 0, // First key is automatically active
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * Remove an API key
   */
  remove(id: string, userId: string): boolean {
    // Verify ownership before deletion
    const key = this.getById(id);
    if (!key || key.userId !== userId) {
      return false;
    }

    const stmt = this.db.prepare(`DELETE FROM user_api_keys WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Set an API key as active (deactivates other keys for same provider)
   * Uses a transaction to ensure atomicity
   */
  setActive(id: string, userId: string, active: boolean): ApiKey | null {
    // Verify ownership
    const key = this.getById(id);
    if (!key || key.userId !== userId) {
      return null;
    }

    const now = new Date().toISOString();

    const transaction = this.db.transaction(() => {
      if (active) {
        // Deactivate all other keys for this provider
        const deactivateStmt = this.db.prepare(`
          UPDATE user_api_keys
          SET is_active = 0, updated_at = ?
          WHERE user_id = ? AND provider = ? AND id != ?
        `);
        deactivateStmt.run(now, userId, key.provider, id);
      }

      // Update this key's active status
      const stmt = this.db.prepare(`
        UPDATE user_api_keys
        SET is_active = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(active ? 1 : 0, now, id);
    });

    transaction();

    return this.getById(id);
  }

  /**
   * Update the last_used_at timestamp for an API key
   */
  updateLastUsed(id: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE user_api_keys
      SET last_used_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);
  }

  /**
   * Check if a user has any active API key for a specific provider
   */
  hasActiveKey(userId: string, provider: ApiKeyProvider): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM user_api_keys
      WHERE user_id = ? AND provider = ? AND is_active = 1
      LIMIT 1
    `);
    return stmt.get(userId, provider) !== undefined;
  }

  /**
   * Get total count of API keys for a user
   */
  countByUser(userId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM user_api_keys WHERE user_id = ?
    `);
    const result = stmt.get(userId) as { count: number };
    return result.count;
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

  /**
   * Convert database row to ApiKey (without decrypted key)
   */
  private rowToApiKey(row: ApiKeyRow): ApiKey {
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider as ApiKeyProvider,
      keyName: row.key_name,
      keyPreview: row.key_preview,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    };
  }

  /**
   * Convert database row to ApiKeyWithSecret (with decrypted key)
   */
  private rowToApiKeyWithSecret(row: ApiKeyRow): ApiKeyWithSecret {
    const apiKey = this.rowToApiKey(row);
    const encryptedData = deserializeEncryptedData(row.encrypted_key);
    const decryptedKey = decryptApiKey(encryptedData);

    return {
      ...apiKey,
      decryptedKey,
    };
  }
}

// Singleton instance
export const apiKeyStore = new ApiKeyStore();
