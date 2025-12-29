// Admin Session types for monitoring and management

export type AdminSessionStatus = 'active' | 'idle' | 'terminated';
export type SessionActionType = 'start' | 'command' | 'idle' | 'end';

// Session stats for admin monitoring
export interface SessionStats {
  sessionId: string;
  userId: string;
  totalTokens: number;
  totalCommands: number;
  startedAt: Date;
  lastActivityAt: Date;
  endedAt: Date | null;
  status: AdminSessionStatus;
}

// Session activity log entry
export interface SessionActivityLog {
  id: string;
  sessionId: string;
  userId: string;
  actionType: SessionActionType;
  details: Record<string, unknown>;
  createdAt: Date;
}

// Paginated sessions response
export interface PaginatedSessionsResponse {
  sessions: SessionStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Session filters for API
export interface SessionFilters {
  userId?: string;
  status?: AdminSessionStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Session detail with activity logs
export interface SessionDetail extends SessionStats {
  username: string | null;
  email: string | null;
  sessionName: string;
  workspaceName?: string;
  recentActivity: SessionActivityLog[];
}

// Overall session statistics
export interface OverallSessionStats {
  totalSessions: number;
  activeSessions: number;
  idleSessions: number;
  terminatedSessions: number;
  totalTokensUsed: number;
  totalCommandsExecuted: number;
  averageSessionDuration: number; // in minutes
  sessionsToday: number;
  sessionsThisWeek: number;
}

// Bulk terminate request
export interface BulkTerminateRequest {
  sessionIds: string[];
}

// Bulk terminate response
export interface BulkTerminateResponse {
  terminated: string[];
  failed: Array<{
    sessionId: string;
    reason: string;
  }>;
}
