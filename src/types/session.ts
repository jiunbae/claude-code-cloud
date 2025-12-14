import type { Workspace } from './workspace';

export type SessionStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

export interface Session {
  id: string;
  name: string;
  workspaceId: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  config: SessionConfig;
  ownerId?: string;
  isPublic?: boolean;
  workspace?: Workspace; // 조회 시 포함
}

export interface SessionConfig {
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
}

export interface CreateSessionRequest {
  name: string;
  workspaceId: string;
  config?: Partial<SessionConfig>;
}

export interface SessionWithProcess extends Session {
  pid?: number;
}
