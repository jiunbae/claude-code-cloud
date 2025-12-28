import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type {
  Skill,
  SkillCreate,
  UserSkill,
  UserSkillCreate,
  UserSkillUpdate,
  SkillCategory,
  SkillConfig,
  SkillSearchParams,
} from '@/types/skill';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

class SkillStore {
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
    // Create skill_registry table
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS skill_registry (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT,
        description TEXT,
        version TEXT,
        author TEXT,
        category TEXT DEFAULT 'general',
        dependencies TEXT DEFAULT '[]',
        is_system INTEGER DEFAULT 0,
        keywords TEXT DEFAULT '[]',
        file_hash TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_skill_registry_name ON skill_registry(name);
      CREATE INDEX IF NOT EXISTS idx_skill_registry_category ON skill_registry(category);
    `);

    // Create user_skills table
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS user_skills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        skill_id TEXT,
        skill_name TEXT NOT NULL,
        skill_path TEXT NOT NULL,
        is_enabled INTEGER DEFAULT 1,
        config TEXT DEFAULT '{}',
        installed_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, skill_name)
      );

      CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_skills_name ON user_skills(skill_name);
    `);
  }

  // ============================================================================
  // Skill Registry Methods
  // ============================================================================

  /**
   * Register a new skill in the registry
   */
  registerSkill(data: SkillCreate): Skill {
    const id = nanoid(12);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO skill_registry (
        id, name, display_name, description, version, author,
        category, dependencies, is_system, keywords, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.displayName,
      data.description,
      data.version || null,
      data.author || null,
      data.category || 'general',
      JSON.stringify(data.dependencies || []),
      data.isSystem ? 1 : 0,
      JSON.stringify(data.keywords || []),
      now,
      now
    );

    return this.getSkillById(id)!;
  }

  /**
   * Update skill in the registry
   */
  updateSkill(name: string, data: Partial<SkillCreate>): Skill | null {
    const skill = this.getSkillByName(name);
    if (!skill) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(data.displayName);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.version !== undefined) {
      fields.push('version = ?');
      values.push(data.version);
    }
    if (data.author !== undefined) {
      fields.push('author = ?');
      values.push(data.author);
    }
    if (data.category !== undefined) {
      fields.push('category = ?');
      values.push(data.category);
    }
    if (data.dependencies !== undefined) {
      fields.push('dependencies = ?');
      values.push(JSON.stringify(data.dependencies));
    }
    if (data.keywords !== undefined) {
      fields.push('keywords = ?');
      values.push(JSON.stringify(data.keywords));
    }

    if (fields.length === 0) return skill;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(name);

    const stmt = this.db.prepare(`UPDATE skill_registry SET ${fields.join(', ')} WHERE name = ?`);
    stmt.run(...values);

    return this.getSkillByName(name);
  }

  /**
   * Update skill file hash
   */
  updateSkillHash(name: string, hash: string): void {
    const stmt = this.db.prepare(`
      UPDATE skill_registry SET file_hash = ?, updated_at = ? WHERE name = ?
    `);
    stmt.run(hash, new Date().toISOString(), name);
  }

  /**
   * Get skill by ID
   */
  getSkillById(id: string): Skill | null {
    const stmt = this.db.prepare(`SELECT * FROM skill_registry WHERE id = ?`);
    const row = stmt.get(id) as SkillRow | undefined;
    return row ? this.rowToSkill(row) : null;
  }

  /**
   * Get skill by name
   */
  getSkillByName(name: string): Skill | null {
    const stmt = this.db.prepare(`SELECT * FROM skill_registry WHERE name = ?`);
    const row = stmt.get(name) as SkillRow | undefined;
    return row ? this.rowToSkill(row) : null;
  }

  /**
   * Get all skills in registry
   */
  getAllSkills(params?: SkillSearchParams): Skill[] {
    let query = `SELECT * FROM skill_registry WHERE 1=1`;
    const values: unknown[] = [];

    if (params?.category) {
      query += ` AND category = ?`;
      values.push(params.category);
    }
    if (params?.isSystem !== undefined) {
      query += ` AND is_system = ?`;
      values.push(params.isSystem ? 1 : 0);
    }
    if (params?.query) {
      query += ` AND (name LIKE ? OR display_name LIKE ? OR description LIKE ? OR keywords LIKE ?)`;
      const searchTerm = `%${params.query}%`;
      values.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY is_system DESC, display_name ASC`;

    if (params?.limit) {
      query += ` LIMIT ?`;
      values.push(params.limit);
    }
    if (params?.offset) {
      query += ` OFFSET ?`;
      values.push(params.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...values) as SkillRow[];
    return rows.map((row) => this.rowToSkill(row));
  }

  /**
   * Get skill count (simple total)
   */
  getSkillCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM skill_registry`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Get skill count with filters (for pagination)
   */
  getFilteredSkillCount(params?: SkillSearchParams): number {
    let query = `SELECT COUNT(*) as count FROM skill_registry WHERE 1=1`;
    const values: unknown[] = [];

    if (params?.category) {
      query += ` AND category = ?`;
      values.push(params.category);
    }
    if (params?.isSystem !== undefined) {
      query += ` AND is_system = ?`;
      values.push(params.isSystem ? 1 : 0);
    }
    if (params?.query) {
      query += ` AND (name LIKE ? OR display_name LIKE ? OR description LIKE ? OR keywords LIKE ?)`;
      const searchTerm = `%${params.query}%`;
      values.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...values) as { count: number };
    return result.count;
  }

  /**
   * Delete skill from registry
   */
  deleteSkill(name: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM skill_registry WHERE name = ?`);
    const result = stmt.run(name);
    return result.changes > 0;
  }

  /**
   * Check if skill exists
   */
  skillExists(name: string): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM skill_registry WHERE name = ?`);
    return stmt.get(name) !== undefined;
  }

  // ============================================================================
  // User Skills Methods
  // ============================================================================

  /**
   * Install a skill for a user
   */
  installSkill(userId: string, data: UserSkillCreate, skillPath: string): UserSkill {
    const skill = this.getSkillByName(data.skillName);
    const id = nanoid(12);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO user_skills (id, user_id, skill_id, skill_name, skill_path, is_enabled, config, installed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      skill?.id || null,
      data.skillName,
      skillPath,
      JSON.stringify(data.config || {}),
      now,
      now
    );

    return this.getUserSkillById(id)!;
  }

  /**
   * Update user skill settings
   */
  updateUserSkill(userId: string, skillName: string, updates: UserSkillUpdate): UserSkill | null {
    const userSkill = this.getUserSkill(userId, skillName);
    if (!userSkill) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.isEnabled !== undefined) {
      fields.push('is_enabled = ?');
      values.push(updates.isEnabled ? 1 : 0);
    }
    if (updates.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(updates.config));
    }

    if (fields.length === 0) return userSkill;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);
    values.push(skillName);

    const stmt = this.db.prepare(`UPDATE user_skills SET ${fields.join(', ')} WHERE user_id = ? AND skill_name = ?`);
    stmt.run(...values);

    return this.getUserSkill(userId, skillName);
  }

  /**
   * Get user skill by ID
   */
  getUserSkillById(id: string): UserSkill | null {
    const stmt = this.db.prepare(`SELECT * FROM user_skills WHERE id = ?`);
    const row = stmt.get(id) as UserSkillRow | undefined;
    return row ? this.rowToUserSkill(row) : null;
  }

  /**
   * Get user skill by user ID and skill name
   */
  getUserSkill(userId: string, skillName: string): UserSkill | null {
    const stmt = this.db.prepare(`SELECT * FROM user_skills WHERE user_id = ? AND skill_name = ?`);
    const row = stmt.get(userId, skillName) as UserSkillRow | undefined;
    return row ? this.rowToUserSkill(row) : null;
  }

  /**
   * Get all skills for a user
   */
  getUserSkills(userId: string): UserSkill[] {
    const stmt = this.db.prepare(`SELECT * FROM user_skills WHERE user_id = ? ORDER BY installed_at DESC`);
    const rows = stmt.all(userId) as UserSkillRow[];
    return rows.map((row) => this.rowToUserSkill(row));
  }

  /**
   * Get enabled skills for a user
   */
  getEnabledUserSkills(userId: string): UserSkill[] {
    const stmt = this.db.prepare(`SELECT * FROM user_skills WHERE user_id = ? AND is_enabled = 1`);
    const rows = stmt.all(userId) as UserSkillRow[];
    return rows.map((row) => this.rowToUserSkill(row));
  }

  /**
   * Uninstall a skill for a user
   */
  uninstallSkill(userId: string, skillName: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM user_skills WHERE user_id = ? AND skill_name = ?`);
    const result = stmt.run(userId, skillName);
    return result.changes > 0;
  }

  /**
   * Check if user has skill installed
   */
  hasSkillInstalled(userId: string, skillName: string): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM user_skills WHERE user_id = ? AND skill_name = ?`);
    return stmt.get(userId, skillName) !== undefined;
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

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private rowToSkill(row: SkillRow): Skill {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name || row.name,
      description: row.description || '',
      version: row.version || undefined,
      author: row.author || undefined,
      category: (row.category as SkillCategory) || 'general',
      dependencies: JSON.parse(row.dependencies || '[]'),
      isSystem: row.is_system === 1,
      keywords: JSON.parse(row.keywords || '[]'),
      fileHash: row.file_hash || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private rowToUserSkill(row: UserSkillRow): UserSkill {
    return {
      id: row.id,
      userId: row.user_id,
      skillId: row.skill_id || '',
      skillName: row.skill_name,
      skillPath: row.skill_path,
      isEnabled: row.is_enabled === 1,
      config: JSON.parse(row.config || '{}') as SkillConfig,
      installedAt: new Date(row.installed_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Database row types
interface SkillRow {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  version: string | null;
  author: string | null;
  category: string;
  dependencies: string;
  is_system: number;
  keywords: string;
  file_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface UserSkillRow {
  id: string;
  user_id: string;
  skill_id: string | null;
  skill_name: string;
  skill_path: string;
  is_enabled: number;
  config: string;
  installed_at: string;
  updated_at: string;
}

// Singleton instance
export const skillStore = new SkillStore();
