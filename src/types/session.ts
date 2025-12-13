export type SessionStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

export interface Session {
  id: string;
  name: string;
  projectPath: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  config: SessionConfig;
  ownerId?: string;
  isPublic?: boolean;
}

export interface SessionConfig {
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
}

export interface CreateSessionRequest {
  name: string;
  projectPath: string;
  config?: Partial<SessionConfig>;
}

export interface SessionWithProcess extends Session {
  pid?: number;
}
