import { nanoid } from 'nanoid';
import type { Participant, CursorPosition, PresenceUpdate } from '@/types/collaboration';

type PresenceListener = (update: PresenceUpdate) => void;

// Predefined colors for participants
const PARTICIPANT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
];

class ParticipantManager {
  private participants: Map<string, Map<string, Participant>> = new Map(); // sessionId -> participantId -> Participant
  private listeners: Map<string, Set<PresenceListener>> = new Map(); // sessionId -> listeners
  private colorIndex: Map<string, number> = new Map(); // sessionId -> next color index

  // Add participant to session
  join(
    sessionId: string,
    name: string,
    permission: 'owner' | 'view' | 'interact',
    isAnonymous: boolean = false
  ): Participant {
    const id = nanoid(8);
    const color = this.getNextColor(sessionId);
    const now = new Date();

    const participant: Participant = {
      id,
      sessionId,
      name,
      color,
      permission,
      isAnonymous,
      joinedAt: now,
      lastSeenAt: now,
    };

    if (!this.participants.has(sessionId)) {
      this.participants.set(sessionId, new Map());
    }

    this.participants.get(sessionId)!.set(id, participant);

    // Notify listeners
    this.notifyListeners(sessionId, {
      type: 'join',
      participant,
    });

    return participant;
  }

  // Remove participant from session
  leave(sessionId: string, participantId: string): void {
    const sessionParticipants = this.participants.get(sessionId);
    if (!sessionParticipants) return;

    const participant = sessionParticipants.get(participantId);
    if (!participant) return;

    sessionParticipants.delete(participantId);

    // Clean up empty sessions
    if (sessionParticipants.size === 0) {
      this.participants.delete(sessionId);
      this.colorIndex.delete(sessionId);
    }

    // Notify listeners
    this.notifyListeners(sessionId, {
      type: 'leave',
      participant,
    });
  }

  // Update participant's cursor position
  updateCursor(sessionId: string, participantId: string, position: CursorPosition): void {
    const sessionParticipants = this.participants.get(sessionId);
    if (!sessionParticipants) return;

    const participant = sessionParticipants.get(participantId);
    if (!participant) return;

    participant.cursorPosition = position;
    participant.lastSeenAt = new Date();

    // Notify listeners
    this.notifyListeners(sessionId, {
      type: 'cursor',
      participant,
    });
  }

  // Update last seen time (heartbeat)
  heartbeat(sessionId: string, participantId: string): void {
    const sessionParticipants = this.participants.get(sessionId);
    if (!sessionParticipants) return;

    const participant = sessionParticipants.get(participantId);
    if (participant) {
      participant.lastSeenAt = new Date();
    }
  }

  // Get participant by ID
  get(sessionId: string, participantId: string): Participant | null {
    return this.participants.get(sessionId)?.get(participantId) || null;
  }

  // Get all participants in a session
  getAll(sessionId: string): Participant[] {
    const sessionParticipants = this.participants.get(sessionId);
    if (!sessionParticipants) return [];
    return Array.from(sessionParticipants.values());
  }

  // Get participant count
  count(sessionId: string): number {
    return this.participants.get(sessionId)?.size || 0;
  }

  // Add presence listener
  addListener(sessionId: string, listener: PresenceListener): void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);
  }

  // Remove presence listener
  removeListener(sessionId: string, listener: PresenceListener): void {
    this.listeners.get(sessionId)?.delete(listener);
  }

  // Clean up stale participants (no heartbeat for 30 seconds)
  cleanupStale(): number {
    const staleThreshold = 30 * 1000; // 30 seconds
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, participants] of this.participants) {
      for (const [participantId, participant] of participants) {
        if (now - participant.lastSeenAt.getTime() > staleThreshold) {
          this.leave(sessionId, participantId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  private getNextColor(sessionId: string): string {
    const index = this.colorIndex.get(sessionId) || 0;
    const color = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
    this.colorIndex.set(sessionId, index + 1);
    return color;
  }

  private notifyListeners(sessionId: string, update: PresenceUpdate): void {
    const listeners = this.listeners.get(sessionId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(update);
        } catch (error) {
          console.error('Presence listener error:', error);
        }
      });
    }
  }
}

// Singleton instance
export const participantManager = new ParticipantManager();

// Periodically clean up stale participants
setInterval(() => {
  participantManager.cleanupStale();
}, 10000);
