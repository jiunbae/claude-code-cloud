import { spawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import type { SessionConfig, SessionStatus } from '@/types';

interface PtySession {
  pty: IPty;
  sessionId: string;
  workDir: string;
  status: SessionStatus;
  startedAt: Date;
  lastActivity: Date;
  outputBuffer: string[];
}

interface PtyManagerEvents {
  output: (sessionId: string, data: string) => void;
  exit: (sessionId: string, exitCode: number, signal?: number) => void;
  started: (sessionId: string, pid: number) => void;
  error: (sessionId: string, error: Error) => void;
}

const MAX_OUTPUT_BUFFER_SIZE = 5000; // lines

export class PtyManager extends EventEmitter {
  private sessions: Map<string, PtySession> = new Map();

  constructor() {
    super();
  }

  async startSession(
    sessionId: string,
    workDir: string,
    config: SessionConfig = {}
  ): Promise<{ pid: number }> {
    // Check if session already exists
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already running`);
    }

    const cols = config.cols ?? 120;
    const rows = config.rows ?? 30;

    try {
      // Spawn claude CLI process
      const pty = spawn('claude', [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: workDir,
        env: {
          ...process.env,
          ...config.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
      });

      const session: PtySession = {
        pty,
        sessionId,
        workDir,
        status: 'running',
        startedAt: new Date(),
        lastActivity: new Date(),
        outputBuffer: [],
      };

      this.sessions.set(sessionId, session);

      // Handle output
      pty.onData((data: string) => {
        session.lastActivity = new Date();

        // Buffer output for scrollback
        const lines = data.split('\n');
        session.outputBuffer.push(...lines);

        // Trim buffer if too large
        if (session.outputBuffer.length > MAX_OUTPUT_BUFFER_SIZE) {
          session.outputBuffer = session.outputBuffer.slice(-MAX_OUTPUT_BUFFER_SIZE);
        }

        this.emit('output', sessionId, data);
      });

      // Handle exit
      pty.onExit(({ exitCode, signal }) => {
        session.status = 'idle';
        this.emit('exit', sessionId, exitCode, signal);
        this.sessions.delete(sessionId);
      });

      this.emit('started', sessionId, pty.pid);

      return { pid: pty.pid };
    } catch (error) {
      this.emit('error', sessionId, error as Error);
      throw error;
    }
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.lastActivity = new Date();
    session.pty.write(data);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  sendSignal(sessionId: string, signal: 'SIGINT' | 'SIGTERM' | 'SIGKILL'): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.kill(signal);
    }
  }

  async stopSession(sessionId: string, force = false): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'stopping';

    if (force) {
      session.pty.kill('SIGKILL');
    } else {
      // Graceful shutdown
      session.pty.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (this.sessions.has(sessionId)) {
          session.pty.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  getScrollback(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session?.outputBuffer ?? [];
  }

  getStatus(sessionId: string): SessionStatus {
    const session = this.sessions.get(sessionId);
    return session?.status ?? 'idle';
  }

  getPid(sessionId: string): number | undefined {
    const session = this.sessions.get(sessionId);
    return session?.pty.pid;
  }

  isRunning(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  getRunningCount(): number {
    return this.sessions.size;
  }

  getAllRunningSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  // Clean up all sessions
  async shutdown(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map((sessionId) =>
      this.stopSession(sessionId, true)
    );
    await Promise.all(promises);
  }
}

// Singleton instance
export const ptyManager = new PtyManager();
