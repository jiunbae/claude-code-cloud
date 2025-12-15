import { spawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import os from 'os';
import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import type { SessionConfig, SessionStatus, TerminalKind } from '@/types';

interface PtySession {
  pty: IPty;
  sessionId: string;
  terminal: TerminalKind;
  workDir: string;
  status: SessionStatus;
  startedAt: Date;
  lastActivity: Date;
  outputBuffer: string[];
}

interface PtyManagerEvents {
  output: (sessionId: string, terminal: TerminalKind, data: string) => void;
  exit: (sessionId: string, terminal: TerminalKind, exitCode: number, signal?: number) => void;
  started: (sessionId: string, terminal: TerminalKind, pid: number) => void;
  error: (sessionId: string, terminal: TerminalKind, error: Error) => void;
}

const MAX_OUTPUT_BUFFER_SIZE = 5000; // lines

export class PtyManager extends EventEmitter {
  // Map key is `${sessionId}:${terminal}`
  private sessions: Map<string, PtySession> = new Map();

  constructor() {
    super();
  }

  private getKey(sessionId: string, terminal: TerminalKind): string {
    return `${sessionId}:${terminal}`;
  }

  private resolveClaudeBinary(): string | null {
    const result = spawnSync('sh', ['-lc', 'command -v claude'], {
      encoding: 'utf8',
    });
    if (result.status === 0) {
      const resolved = result.stdout.trim();
      return resolved.length > 0 ? resolved : null;
    }
    return null;
  }

  private async resolveAnthropicApiKey(homeDir: string): Promise<string | null> {
    const keyPath = path.join(homeDir, '.anthropic', 'api_key');
    try {
      const key = (await fs.readFile(keyPath, 'utf8')).trim();
      return key.length > 0 ? key : null;
    } catch {
      return null;
    }
  }

  /**
   * Ensure directory exists and is writable. Returns the path used.
   * Falls back to /app/data/claude if the primary directory is not writable
   * (common on NAS /bind mounts that disallow chown).
   */
  private async resolveClaudeConfigDir(homeDir: string): Promise<string> {
    const primary = path.join(homeDir, '.claude');
    const fallback = '/app/data/claude';

    const isWritable = async (dir: string): Promise<boolean> => {
      try {
        await fs.mkdir(dir, { recursive: true });
        // Test write permissions with a temp file
        const probe = path.join(dir, '.write-test');
        await fs.writeFile(probe, 'ok');
        await fs.unlink(probe);
        return true;
      } catch {
        return false;
      }
    };

    if (await isWritable(primary)) {
      return primary;
    }

    // Ensure fallback directory exists
    await fs.mkdir(fallback, { recursive: true });
    return fallback;
  }

  private resolveShellBinary(): string {
    const candidates = [process.env.SHELL, 'bash', 'sh'].filter(Boolean) as string[];

    for (const candidate of candidates) {
      // If SHELL is an absolute path, verify executability. Otherwise resolve via PATH.
      const cmd = candidate.includes('/')
        ? `test -x "${candidate}" && echo "${candidate}"`
        : `command -v ${candidate}`;

      const result = spawnSync('sh', ['-lc', cmd], { encoding: 'utf8' });
      if (result.status === 0) {
        const resolved = result.stdout.trim().split('\n')[0]?.trim();
        if (resolved) return resolved;
      }
    }

    return 'sh';
  }

  async startSession(
    sessionId: string,
    workDir: string,
    config: SessionConfig = {},
    terminal: TerminalKind = 'claude'
  ): Promise<{ pid: number }> {
    const key = this.getKey(sessionId, terminal);

    // Check if session already exists
    if (this.sessions.has(key)) {
      throw new Error(`Session ${sessionId} (${terminal}) already running`);
    }

    const cols = config.cols ?? 120;
    const rows = config.rows ?? 30;

    try {
      const homeDir = process.env.HOME || os.homedir() || '/home/nodejs';
      console.log(`[PTY] Starting session ${sessionId} (${terminal}) (cwd=${workDir})`);

      const env: Record<string, string> = {
        ...Object.entries(process.env).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value !== undefined) acc[key] = value;
          return acc;
        }, {}),
        ...Object.entries(config.env ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value !== undefined) acc[key] = String(value);
          return acc;
        }, {}),
        HOME: homeDir,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      };

      const command = terminal === 'claude' ? this.resolveClaudeBinary() : this.resolveShellBinary();
      if (terminal === 'claude' && !command) {
        throw new Error('Claude CLI not found in PATH (expected `claude`). Install it in the container image.');
      }

      // Claude-specific env/config
      if (terminal === 'claude') {
        // If ANTHROPIC_API_KEY is not provided, try ~/.anthropic/api_key
        if (!env.ANTHROPIC_API_KEY) {
          const apiKey = await this.resolveAnthropicApiKey(homeDir);
          if (apiKey) {
            env.ANTHROPIC_API_KEY = apiKey;
          }
        }

        // Ensure Claude CLI config directory is writable; fall back if necessary
        const claudeConfigDir = await this.resolveClaudeConfigDir(homeDir);
        env.CLAUDE_CONFIG_DIR = claudeConfigDir;
      }

      // Spawn process
      const pty = spawn(command as string, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: workDir,
        env,
      });

      const session: PtySession = {
        pty,
        sessionId,
        terminal,
        workDir,
        status: 'running',
        startedAt: new Date(),
        lastActivity: new Date(),
        outputBuffer: [],
      };

      this.sessions.set(key, session);

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

        this.emit('output', sessionId, terminal, data);
      });

      // Handle exit
      pty.onExit(({ exitCode, signal }) => {
        session.status = 'idle';
        console.log(
          `[PTY] Session ${sessionId} (${terminal}) exited (code=${exitCode}, signal=${signal ?? 'none'})`
        );
        if (exitCode !== 0) {
          const tailLines = session.outputBuffer.slice(-50).join('\n').trim();
          if (tailLines) {
            const tail = tailLines.length > 4000 ? `${tailLines.slice(-4000)}\n…(truncated)` : tailLines;
            console.log(`[PTY] Session ${sessionId} (${terminal}) output (tail):\n${tail}`);
          }
        }
        this.emit('exit', sessionId, terminal, exitCode, signal);
        this.sessions.delete(key);
      });

      this.emit('started', sessionId, terminal, pty.pid);

      return { pid: pty.pid };
    } catch (error) {
      console.error(`[PTY] Failed to start session ${sessionId} (${terminal}):`, error);
      this.emit('error', sessionId, terminal, error as Error);
      throw error;
    }
  }

  write(sessionId: string, terminal: TerminalKind, data: string): void {
    const session = this.sessions.get(this.getKey(sessionId, terminal));
    if (!session) {
      throw new Error(`Session ${sessionId} (${terminal}) not found`);
    }
    session.lastActivity = new Date();
    session.pty.write(data);
  }

  resize(sessionId: string, terminal: TerminalKind, cols: number, rows: number): void {
    const session = this.sessions.get(this.getKey(sessionId, terminal));
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  sendSignal(
    sessionId: string,
    terminal: TerminalKind,
    signal: 'SIGINT' | 'SIGTERM' | 'SIGKILL'
  ): void {
    const session = this.sessions.get(this.getKey(sessionId, terminal));
    if (session) {
      session.pty.kill(signal);
    }
  }

  async stopSession(
    sessionId: string,
    terminal: TerminalKind = 'claude',
    force = false
  ): Promise<void> {
    const session = this.sessions.get(this.getKey(sessionId, terminal));
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

  getScrollback(sessionId: string, terminal: TerminalKind): string[] {
    const session = this.sessions.get(this.getKey(sessionId, terminal));
    return session?.outputBuffer ?? [];
  }

  getStatus(sessionId: string, terminal: TerminalKind): SessionStatus {
    const session = this.sessions.get(this.getKey(sessionId, terminal));
    return session?.status ?? 'idle';
  }

  getPid(sessionId: string, terminal: TerminalKind): number | undefined {
    const session = this.sessions.get(this.getKey(sessionId, terminal));
    return session?.pty.pid;
  }

  isRunning(sessionId: string, terminal: TerminalKind = 'claude'): boolean {
    return this.sessions.has(this.getKey(sessionId, terminal));
  }

  getRunningCount(): number {
    return this.sessions.size;
  }

  getAllRunningSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  // Clean up all sessions
  async shutdown(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map(async (key) => {
      const session = this.sessions.get(key);
      if (!session) return;
      await this.stopSession(session.sessionId, session.terminal, true);
    });
    await Promise.all(promises);
  }
}

// Singleton instance
export const ptyManager = new PtyManager();
