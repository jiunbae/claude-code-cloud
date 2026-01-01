import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type { ClaudeArgsConfig } from '@/types/settings';
import { DEFAULT_CLAUDE_ARGS } from '@/types/settings';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

/**
 * Store for managing Claude CLI arguments configuration
 * Supports global, user-level, and session-level configuration with priority inheritance
 */
class ClaudeArgsStore {
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
    // Create claude_args table for storing configurations
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS claude_args (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        scope_id TEXT,
        config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT,
        UNIQUE(scope, scope_id)
      );

      CREATE INDEX IF NOT EXISTS idx_claude_args_scope ON claude_args(scope);
      CREATE INDEX IF NOT EXISTS idx_claude_args_scope_id ON claude_args(scope_id);
    `);
  }

  /**
   * Get global Claude args configuration
   */
  getGlobal(): ClaudeArgsConfig {
    const stmt = this.db.prepare(`
      SELECT config FROM claude_args WHERE scope = 'global' AND scope_id IS NULL
    `);
    const row = stmt.get() as { config: string } | undefined;

    if (!row) {
      return { ...DEFAULT_CLAUDE_ARGS };
    }

    try {
      return { ...DEFAULT_CLAUDE_ARGS, ...JSON.parse(row.config) };
    } catch {
      return { ...DEFAULT_CLAUDE_ARGS };
    }
  }

  /**
   * Set global Claude args configuration
   */
  setGlobal(config: ClaudeArgsConfig, adminId: string): boolean {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO claude_args (id, scope, scope_id, config, created_at, updated_at, updated_by)
      VALUES (?, 'global', NULL, ?, ?, ?, ?)
      ON CONFLICT(scope, scope_id) DO UPDATE SET
        config = excluded.config,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `);

    try {
      stmt.run(nanoid(12), JSON.stringify(config), now, now, adminId);
      return true;
    } catch (error) {
      console.error('[ClaudeArgsStore] Failed to set global config:', error);
      return false;
    }
  }

  /**
   * Get user-specific Claude args configuration
   */
  getUser(userId: string): ClaudeArgsConfig | null {
    const stmt = this.db.prepare(`
      SELECT config FROM claude_args WHERE scope = 'user' AND scope_id = ?
    `);
    const row = stmt.get(userId) as { config: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.config);
    } catch {
      return null;
    }
  }

  /**
   * Set user-specific Claude args configuration
   */
  setUser(userId: string, config: ClaudeArgsConfig): boolean {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO claude_args (id, scope, scope_id, config, created_at, updated_at, updated_by)
      VALUES (?, 'user', ?, ?, ?, ?, ?)
      ON CONFLICT(scope, scope_id) DO UPDATE SET
        config = excluded.config,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `);

    try {
      stmt.run(nanoid(12), userId, JSON.stringify(config), now, now, userId);
      return true;
    } catch (error) {
      console.error('[ClaudeArgsStore] Failed to set user config:', error);
      return false;
    }
  }

  /**
   * Delete user-specific Claude args configuration
   */
  deleteUser(userId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM claude_args WHERE scope = 'user' AND scope_id = ?
    `);
    const result = stmt.run(userId);
    return result.changes > 0;
  }

  /**
   * Get session-specific Claude args configuration
   */
  getSession(sessionId: string): ClaudeArgsConfig | null {
    const stmt = this.db.prepare(`
      SELECT config FROM claude_args WHERE scope = 'session' AND scope_id = ?
    `);
    const row = stmt.get(sessionId) as { config: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.config);
    } catch {
      return null;
    }
  }

  /**
   * Set session-specific Claude args configuration
   */
  setSession(sessionId: string, config: ClaudeArgsConfig, userId?: string): boolean {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO claude_args (id, scope, scope_id, config, created_at, updated_at, updated_by)
      VALUES (?, 'session', ?, ?, ?, ?, ?)
      ON CONFLICT(scope, scope_id) DO UPDATE SET
        config = excluded.config,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `);

    try {
      stmt.run(nanoid(12), sessionId, JSON.stringify(config), now, now, userId || null);
      return true;
    } catch (error) {
      console.error('[ClaudeArgsStore] Failed to set session config:', error);
      return false;
    }
  }

  /**
   * Delete session-specific Claude args configuration
   */
  deleteSession(sessionId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM claude_args WHERE scope = 'session' AND scope_id = ?
    `);
    const result = stmt.run(sessionId);
    return result.changes > 0;
  }

  /**
   * Resolve effective Claude args for a session
   * Priority: session > user > global > defaults
   */
  resolveEffective(sessionId?: string, userId?: string): ClaudeArgsConfig {
    // Start with defaults
    let effective: ClaudeArgsConfig = { ...DEFAULT_CLAUDE_ARGS };

    // Apply global settings
    const global = this.getGlobal();
    effective = this.mergeConfigs(effective, global);

    // Apply user settings if provided
    if (userId) {
      const user = this.getUser(userId);
      if (user) {
        effective = this.mergeConfigs(effective, user);
      }
    }

    // Apply session settings if provided
    if (sessionId) {
      const session = this.getSession(sessionId);
      if (session) {
        effective = this.mergeConfigs(effective, session);
      }
    }

    return effective;
  }

  /**
   * Merge two configs, with source taking precedence
   */
  private mergeConfigs(base: ClaudeArgsConfig, source: ClaudeArgsConfig): ClaudeArgsConfig {
    const merged = { ...base };

    // Only override defined values (allow empty arrays as valid overrides)
    if (source.model !== undefined) merged.model = source.model;
    if (source.permissionMode !== undefined) merged.permissionMode = source.permissionMode;
    if (source.allowedTools !== undefined) {
      merged.allowedTools = source.allowedTools;
    }
    if (source.disallowedTools !== undefined) {
      merged.disallowedTools = source.disallowedTools;
    }
    if (source.mcpServers !== undefined) {
      merged.mcpServers = source.mcpServers;
    }
    if (source.systemPrompt !== undefined) merged.systemPrompt = source.systemPrompt;
    if (source.appendSystemPrompt !== undefined) merged.appendSystemPrompt = source.appendSystemPrompt;
    if (source.maxTurns !== undefined) merged.maxTurns = source.maxTurns;
    if (source.contextWindow !== undefined) merged.contextWindow = source.contextWindow;
    if (source.verbose !== undefined) merged.verbose = source.verbose;
    if (source.outputFormat !== undefined) merged.outputFormat = source.outputFormat;
    if (source.customArgs !== undefined) {
      merged.customArgs = source.customArgs;
    }

    return merged;
  }

  /**
   * Convert ClaudeArgsConfig to CLI arguments array
   */
  toCliArgs(config: ClaudeArgsConfig): string[] {
    const args: string[] = [];

    if (config.model) {
      args.push('--model', config.model);
    }

    if (config.permissionMode && config.permissionMode !== 'default') {
      args.push('--permission-mode', config.permissionMode);
    }

    if (config.allowedTools && config.allowedTools.length > 0) {
      args.push('--allowedTools', config.allowedTools.join(','));
    }

    if (config.disallowedTools && config.disallowedTools.length > 0) {
      args.push('--disallowedTools', config.disallowedTools.join(','));
    }

    if (config.mcpServers && config.mcpServers.length > 0) {
      for (const server of config.mcpServers) {
        args.push('--mcp', server);
      }
    }

    if (config.systemPrompt) {
      args.push('--system-prompt', config.systemPrompt);
    }

    if (config.appendSystemPrompt) {
      args.push('--append-system-prompt', config.appendSystemPrompt);
    }

    if (config.maxTurns !== undefined) {
      args.push('--max-turns', String(config.maxTurns));
    }

    if (config.verbose) {
      args.push('--verbose');
    }

    if (config.outputFormat && config.outputFormat !== 'text') {
      args.push('--output-format', config.outputFormat);
    }

    // Add any custom args
    if (config.customArgs && config.customArgs.length > 0) {
      args.push(...config.customArgs);
    }

    return args;
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
export const claudeArgsStore = new ClaudeArgsStore();
