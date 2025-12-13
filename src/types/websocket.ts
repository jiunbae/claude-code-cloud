import type { SessionStatus } from './session';

// Client to Server messages
export type ClientMessage =
  | { type: 'terminal:input'; data: string }
  | { type: 'terminal:resize'; cols: number; rows: number }
  | { type: 'terminal:signal'; signal: 'SIGINT' | 'SIGTERM' }
  | { type: 'session:subscribe'; sessionId: string }
  | { type: 'session:unsubscribe'; sessionId: string }
  | { type: 'ping' };

// Server to Client messages
export type ServerMessage =
  | { type: 'terminal:output'; data: string; timestamp: number }
  | { type: 'terminal:scrollback'; data: string[] }
  | { type: 'session:status'; status: SessionStatus; pid?: number; exitCode?: number }
  | { type: 'session:error'; code: string; message: string }
  | { type: 'connection:established'; sessionId: string }
  | { type: 'pong' }
  | { type: 'error'; code: string; message: string };

export interface WsConnectionInfo {
  sessionId: string;
  connectedAt: Date;
}
