import type { Workspace } from './workspace';
import type { ClaudeArgsConfig } from './settings';

export type SessionStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

export type TerminalKind = 'claude' | 'codex' | 'shell';

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
  claudeArgs?: ClaudeArgsConfig; // Session-level Claude args override
}

export interface CreateSessionRequest {
  name: string;
  workspaceId: string;
  config?: Partial<SessionConfig>;
}

export interface SessionWithProcess extends Session {
  pid?: number;
}
