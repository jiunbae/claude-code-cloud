import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type {
  SessionStats,
  SessionActivityLog,
  AdminSessionStatus,
  SessionActionType,
  SessionFilters,
  PaginatedSessionsResponse,
  SessionDetail,
  OverallSessionStats,
} from '@/types/adminSession';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

class SessionStatsStore {
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
    // Create session_stats table
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS session_stats (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        total_tokens INTEGER DEFAULT 0,
        total_commands INTEGER DEFAULT 0,
        started_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'active'
      );

      CREATE INDEX IF NOT EXISTS idx_session_stats_user ON session_stats(user_id);
      CREATE INDEX IF NOT EXISTS idx_session_stats_status ON session_stats(status);
      CREATE INDEX IF NOT EXISTS idx_session_stats_started ON session_stats(started_at DESC);
    `);

    // Create session_activity_logs table
    this._db!.exec(`
      CREATE TABLE IF NOT EXISTS session_activity_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON session_activity_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON session_activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON session_activity_logs(created_at DESC);
    `);
  }

  // Create or update session stats
  upsertStats(sessionId: string, userId: string, updates?: Partial<SessionStats>): SessionStats {
    const existing = this.getStats(sessionId);
    const now = new Date().toISOString();

    if (existing) {
      // Update existing
      const fields: string[] = [];
      const values: unknown[] = [];

      if (updates?.totalTokens !== undefined) {
        fields.push('total_tokens = ?');
        values.push(updates.totalTokens);
      }
      if (updates?.totalCommands !== undefined) {
        fields.push('total_commands = ?');
        values.push(updates.totalCommands);
      }
      if (updates?.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates?.endedAt !== undefined) {
        fields.push('ended_at = ?');
        values.push(updates.endedAt ? updates.endedAt.toISOString() : null);
      }

      fields.push('last_activity_at = ?');
      values.push(now);
      values.push(sessionId);

      if (fields.length > 0) {
        const stmt = this.db.prepare(`
          UPDATE session_stats SET ${fields.join(', ')} WHERE session_id = ?
        `);
        stmt.run(...values);
      }

      return this.getStats(sessionId)!;
    } else {
      // Create new
      const stmt = this.db.prepare(`
        INSERT INTO session_stats (
          session_id, user_id, total_tokens, total_commands,
          started_at, last_activity_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        sessionId,
        userId,
        updates?.totalTokens ?? 0,
        updates?.totalCommands ?? 0,
        now,
        now,
        updates?.status ?? 'active'
      );

      return this.getStats(sessionId)!;
    }
  }

  // Get session stats by ID
  getStats(sessionId: string): SessionStats | null {
    const stmt = this.db.prepare(`SELECT * FROM session_stats WHERE session_id = ?`);
    const row = stmt.get(sessionId) as SessionStatsRow | undefined;
    return row ? this.rowToStats(row) : null;
  }

  // Get all session stats with pagination and filters
  getAllStats(
    page: number = 1,
    pageSize: number = 20,
    filters?: SessionFilters
  ): PaginatedSessionsResponse {
    let whereClause = '1=1';
    const params: unknown[] = [];

    if (filters?.userId) {
      whereClause += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.status) {
      whereClause += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.startDate) {
      whereClause += ' AND started_at >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      whereClause += ' AND started_at <= ?';
      params.push(filters.endDate);
    }

    // Count total
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM session_stats WHERE ${whereClause}
    `);
    const { count: total } = countStmt.get(...params) as { count: number };

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const stmt = this.db.prepare(`
      SELECT * FROM session_stats
      WHERE ${whereClause}
      ORDER BY last_activity_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...params, pageSize, offset) as SessionStatsRow[];

    return {
      sessions: rows.map((row) => this.rowToStats(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get session detail with user info and activity logs
  getSessionDetail(sessionId: string): SessionDetail | null {
    const stmt = this.db.prepare(`
      SELECT
        ss.*,
        u.username,
        u.email,
        s.name as session_name,
        w.name as workspace_name
      FROM session_stats ss
      LEFT JOIN users u ON ss.user_id = u.id
      LEFT JOIN sessions s ON ss.session_id = s.id
      LEFT JOIN workspaces w ON s.workspace_id = w.id
      WHERE ss.session_id = ?
    `);
    const row = stmt.get(sessionId) as SessionDetailRow | undefined;
    if (!row) return null;

    const recentActivity = this.getRecentActivity(sessionId, 20);

    return {
      sessionId: row.session_id,
      userId: row.user_id,
      totalTokens: row.total_tokens,
      totalCommands: row.total_commands,
      startedAt: new Date(row.started_at),
      lastActivityAt: new Date(row.last_activity_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : null,
      status: row.status as AdminSessionStatus,
      username: row.username || null,
      email: row.email || null,
      sessionName: row.session_name || 'Unnamed Session',
      workspaceName: row.workspace_name || undefined,
      recentActivity,
    };
  }

  // Increment counters
  incrementTokens(sessionId: string, tokens: number): void {
    const stmt = this.db.prepare(`
      UPDATE session_stats
      SET total_tokens = total_tokens + ?, last_activity_at = ?
      WHERE session_id = ?
    `);
    stmt.run(tokens, new Date().toISOString(), sessionId);
  }

  incrementCommands(sessionId: string): void {
    const stmt = this.db.prepare(`
      UPDATE session_stats
      SET total_commands = total_commands + 1, last_activity_at = ?
      WHERE session_id = ?
    `);
    stmt.run(new Date().toISOString(), sessionId);
  }

  // Update session status
  updateStatus(sessionId: string, status: AdminSessionStatus): void {
    const now = new Date().toISOString();
    const endedAt = status === 'terminated' ? now : null;

    const stmt = this.db.prepare(`
      UPDATE session_stats
      SET status = ?, last_activity_at = ?, ended_at = COALESCE(?, ended_at)
      WHERE session_id = ?
    `);
    stmt.run(status, now, endedAt, sessionId);
  }

  // Terminate session
  terminateSession(sessionId: string): boolean {
    const stats = this.getStats(sessionId);
    if (!stats || stats.status === 'terminated') {
      return false;
    }

    this.updateStatus(sessionId, 'terminated');
    this.logActivity(sessionId, stats.userId, 'end', { reason: 'admin_terminated' });
    return true;
  }

  // Bulk terminate sessions
  bulkTerminate(sessionIds: string[]): { terminated: string[]; failed: Array<{ sessionId: string; reason: string }> } {
    const terminated: string[] = [];
    const failed: Array<{ sessionId: string; reason: string }> = [];

    for (const sessionId of sessionIds) {
      try {
        const success = this.terminateSession(sessionId);
        if (success) {
          terminated.push(sessionId);
        } else {
          failed.push({ sessionId, reason: 'Session not found or already terminated' });
        }
      } catch (error) {
        failed.push({ sessionId, reason: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return { terminated, failed };
  }

  // Log activity
  logActivity(
    sessionId: string,
    userId: string,
    actionType: SessionActionType,
    details: Record<string, unknown> = {}
  ): SessionActivityLog {
    const id = nanoid(12);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO session_activity_logs (id, session_id, user_id, action_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, sessionId, userId, actionType, JSON.stringify(details), now);

    return {
      id,
      sessionId,
      userId,
      actionType,
      details,
      createdAt: new Date(now),
    };
  }

  // Get recent activity for a session
  getRecentActivity(sessionId: string, limit: number = 20): SessionActivityLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_activity_logs
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(sessionId, limit) as ActivityLogRow[];
    return rows.map((row) => this.rowToActivityLog(row));
  }

  // Get overall statistics
  getOverallStats(): OverallSessionStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get counts by status
    const countStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated,
        SUM(total_tokens) as total_tokens,
        SUM(total_commands) as total_commands
      FROM session_stats
    `);
    const counts = countStmt.get() as {
      total: number;
      active: number;
      idle: number;
      terminated: number;
      total_tokens: number;
      total_commands: number;
    };

    // Get sessions today
    const todayStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM session_stats WHERE started_at >= ?
    `);
    const { count: sessionsToday } = todayStmt.get(todayStart) as { count: number };

    // Get sessions this week
    const weekStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM session_stats WHERE started_at >= ?
    `);
    const { count: sessionsThisWeek } = weekStmt.get(weekStart) as { count: number };

    // Calculate average session duration
    const durationStmt = this.db.prepare(`
      SELECT AVG(
        CAST((julianday(COALESCE(ended_at, datetime('now'))) - julianday(started_at)) * 24 * 60 AS REAL)
      ) as avg_duration
      FROM session_stats
    `);
    const { avg_duration } = durationStmt.get() as { avg_duration: number | null };

    return {
      totalSessions: counts.total || 0,
      activeSessions: counts.active || 0,
      idleSessions: counts.idle || 0,
      terminatedSessions: counts.terminated || 0,
      totalTokensUsed: counts.total_tokens || 0,
      totalCommandsExecuted: counts.total_commands || 0,
      averageSessionDuration: avg_duration || 0,
      sessionsToday,
      sessionsThisWeek,
    };
  }

  // Mark idle sessions (sessions with no activity for X minutes)
  markIdleSessions(idleThresholdMinutes: number = 30): number {
    const threshold = new Date(Date.now() - idleThresholdMinutes * 60 * 1000).toISOString();

    const stmt = this.db.prepare(`
      UPDATE session_stats
      SET status = 'idle'
      WHERE status = 'active' AND last_activity_at < ?
    `);
    const result = stmt.run(threshold);
    return result.changes;
  }

  // Close database connection
  close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }

  private rowToStats(row: SessionStatsRow): SessionStats {
    return {
      sessionId: row.session_id,
      userId: row.user_id,
      totalTokens: row.total_tokens,
      totalCommands: row.total_commands,
      startedAt: new Date(row.started_at),
      lastActivityAt: new Date(row.last_activity_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : null,
      status: row.status as AdminSessionStatus,
    };
  }

  private rowToActivityLog(row: ActivityLogRow): SessionActivityLog {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      actionType: row.action_type as SessionActionType,
      details: JSON.parse(row.details),
      createdAt: new Date(row.created_at),
    };
  }
}

// Database row types
interface SessionStatsRow {
  session_id: string;
  user_id: string;
  total_tokens: number;
  total_commands: number;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  status: string;
}

interface SessionDetailRow extends SessionStatsRow {
  username: string | null;
  email: string | null;
  session_name: string | null;
  workspace_name: string | null;
}

interface ActivityLogRow {
  id: string;
  session_id: string;
  user_id: string;
  action_type: string;
  details: string;
  created_at: string;
}

// Singleton instance
export const sessionStatsStore = new SessionStatsStore();
