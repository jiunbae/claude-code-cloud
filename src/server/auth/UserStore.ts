import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type { User, PublicUser, UserRole } from '@/types/auth';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

class UserStore {
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
    // Create users table (use _db directly since this is called during initialization)
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT,
        is_active INTEGER DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // Add role column if it doesn't exist (for existing databases)
    try {
      this._db!.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
    } catch {
      // Column already exists
    }

    // Add owner_id column to sessions if it doesn't exist
    try {
      this._db!.exec(`ALTER TABLE sessions ADD COLUMN owner_id TEXT DEFAULT ''`);
    } catch {
      // Column already exists
    }

    try {
      this._db!.exec(`ALTER TABLE sessions ADD COLUMN is_public INTEGER DEFAULT 0`);
    } catch {
      // Column already exists
    }

    // Create index for owner_id
    try {
      this._db!.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_id)`);
    } catch {
      // Index might already exist
    }
  }

  /**
   * Create a new user
   */
  create(email: string, username: string, passwordHash: string, role: UserRole = 'user'): User {
    const id = nanoid(12);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, username, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, email.toLowerCase(), username, passwordHash, role, now, now);

    return this.getById(id)!;
  }

  /**
   * Check if user is admin
   */
  isAdmin(userId: string): boolean {
    const user = this.getById(userId);
    return user?.role === 'admin';
  }

  /**
   * Initialize admin account from environment variables
   * Only creates if no users exist
   */
  async initAdminAccount(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Skip if env vars not set
    if (!adminEmail || !adminUsername || !adminPassword) {
      return;
    }

    // Skip if users already exist
    if (this.count() > 0) {
      return;
    }

    // Import dynamically to avoid circular dependency
    const { hashPassword } = await import('./password');
    const passwordHash = await hashPassword(adminPassword);

    this.create(adminEmail, adminUsername, passwordHash, 'admin');
    console.log(`[Auth] Initial admin account created: ${adminUsername}`);
  }

  /**
   * Get user by ID
   */
  getById(id: string): User | null {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE id = ?`);
    const row = stmt.get(id) as UserRow | undefined;
    return row ? this.rowToUser(row) : null;
  }

  /**
   * Get user by email
   */
  getByEmail(email: string): User | null {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE email = ?`);
    const row = stmt.get(email.toLowerCase()) as UserRow | undefined;
    return row ? this.rowToUser(row) : null;
  }

  /**
   * Get user by username
   */
  getByUsername(username: string): User | null {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE username = ?`);
    const row = stmt.get(username) as UserRow | undefined;
    return row ? this.rowToUser(row) : null;
  }

  /**
   * Get password hash for authentication
   */
  getPasswordHash(email: string): string | null {
    const stmt = this.db.prepare(`SELECT password_hash FROM users WHERE email = ?`);
    const row = stmt.get(email.toLowerCase()) as { password_hash: string } | undefined;
    return row?.password_hash || null;
  }

  /**
   * Update user profile
   */
  update(id: string, updates: Partial<Pick<User, 'email' | 'username' | 'role' | 'isActive'>>): User | null {
    const user = this.getById(id);
    if (!user) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email.toLowerCase());
    }
    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (fields.length === 0) return user;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id);
  }

  /**
   * Update password
   */
  updatePassword(id: string, newPasswordHash: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
    `);
    const result = stmt.run(newPasswordHash, new Date().toISOString(), id);
    return result.changes > 0;
  }

  /**
   * Update last login time
   */
  updateLastLogin(id: string): void {
    const stmt = this.db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`);
    stmt.run(new Date().toISOString(), id);
  }

  /**
   * Check if email exists
   */
  emailExists(email: string): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM users WHERE email = ?`);
    return stmt.get(email.toLowerCase()) !== undefined;
  }

  /**
   * Check if username exists
   */
  usernameExists(username: string): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM users WHERE username = ?`);
    return stmt.get(username) !== undefined;
  }

  /**
   * Delete user (soft delete by setting is_active = 0)
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare(`UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?`);
    const result = stmt.run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  /**
   * Get all users (for admin)
   */
  getAll(): User[] {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC`);
    const rows = stmt.all() as UserRow[];
    return rows.map((row) => this.rowToUser(row));
  }

  /**
   * Get user count
   */
  count(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM users WHERE is_active = 1`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Convert User to PublicUser (without sensitive fields)
   */
  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
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

  private rowToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      role: (row.role as UserRole) || 'user',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
      isActive: row.is_active === 1,
    };
  }
}

// Database row type
interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: number;
}

// Singleton instance
export const userStore = new UserStore();
