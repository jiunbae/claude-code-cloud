export interface ShareToken {
  id: string;
  sessionId: string;
  token: string;
  permission: 'view' | 'interact';
  createdAt: Date;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
}

export interface Participant {
  id: string;
  sessionId: string;
  name: string;
  color: string;
  permission: 'owner' | 'view' | 'interact';
  joinedAt: Date;
  lastSeenAt: Date;
  cursorPosition?: CursorPosition;
}

export interface CursorPosition {
  line: number;
  column: number;
  filename?: string;
}

export interface PresenceUpdate {
  type: 'join' | 'leave' | 'cursor';
  participant: Participant;
}

export interface CreateShareTokenRequest {
  sessionId: string;
  permission: 'view' | 'interact';
  expiresInHours?: number;
  maxUses?: number;
}
