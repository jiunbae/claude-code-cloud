import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { ptyManager } from '../pty/PtyManager';
import type { ClientMessage, ServerMessage, WsConnectionInfo } from '@/types';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  connectionInfo?: WsConnectionInfo;
}

export class WsServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<ExtendedWebSocket>> = new Map(); // sessionId -> clients
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({ port });
    this.setupServer();
    this.setupPtyListeners();
    this.startHeartbeat();

    console.log(`WebSocket server started on port ${port}`);
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: ExtendedWebSocket, req: IncomingMessage) => {
      ws.isAlive = true;

      // Extract session ID from URL
      const { query } = parseUrl(req.url || '', true);
      const sessionId = query.sessionId as string;

      if (!sessionId) {
        this.sendMessage(ws, {
          type: 'error',
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required',
        });
        ws.close();
        return;
      }

      // Store connection info
      ws.connectionInfo = {
        sessionId,
        connectedAt: new Date(),
      };

      // Add to room
      this.joinRoom(sessionId, ws);

      // Send connection established
      this.sendMessage(ws, {
        type: 'connection:established',
        sessionId,
      });

      // Send scrollback if available
      const scrollback = ptyManager.getScrollback(sessionId);
      if (scrollback.length > 0) {
        this.sendMessage(ws, {
          type: 'terminal:scrollback',
          data: scrollback,
        });
      }

      // Send current status
      const status = ptyManager.getStatus(sessionId);
      const pid = ptyManager.getPid(sessionId);
      this.sendMessage(ws, {
        type: 'session:status',
        status,
        pid,
      });

      // Handle messages
      ws.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as ClientMessage;
          this.handleMessage(ws, sessionId, message);
        } catch (error) {
          this.sendMessage(ws, {
            type: 'error',
            code: 'INVALID_MESSAGE',
            message: 'Invalid message format',
          });
        }
      });

      // Handle pong for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle close
      ws.on('close', () => {
        this.leaveRoom(sessionId, ws);
      });

      // Handle error
      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
        this.leaveRoom(sessionId, ws);
      });
    });
  }

  private setupPtyListeners(): void {
    // Forward PTY output to connected clients
    ptyManager.on('output', (sessionId: string, data: string) => {
      this.broadcast(sessionId, {
        type: 'terminal:output',
        data,
        timestamp: Date.now(),
      });
    });

    // Handle PTY exit
    ptyManager.on('exit', (sessionId: string, exitCode: number) => {
      this.broadcast(sessionId, {
        type: 'session:status',
        status: 'idle',
        exitCode,
      });
    });

    // Handle PTY start
    ptyManager.on('started', (sessionId: string, pid: number) => {
      this.broadcast(sessionId, {
        type: 'session:status',
        status: 'running',
        pid,
      });
    });

    // Handle PTY error
    ptyManager.on('error', (sessionId: string, error: Error) => {
      this.broadcast(sessionId, {
        type: 'session:error',
        code: 'PTY_ERROR',
        message: error.message,
      });
    });
  }

  private handleMessage(ws: ExtendedWebSocket, sessionId: string, message: ClientMessage): void {
    switch (message.type) {
      case 'terminal:input':
        if (ptyManager.isRunning(sessionId)) {
          ptyManager.write(sessionId, message.data);
        } else {
          this.sendMessage(ws, {
            type: 'session:error',
            code: 'SESSION_NOT_RUNNING',
            message: 'Session is not running',
          });
        }
        break;

      case 'terminal:resize':
        ptyManager.resize(sessionId, message.cols, message.rows);
        break;

      case 'terminal:signal':
        ptyManager.sendSignal(sessionId, message.signal);
        break;

      case 'ping':
        this.sendMessage(ws, { type: 'pong' });
        break;

      default:
        this.sendMessage(ws, {
          type: 'error',
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Unknown message type`,
        });
    }
  }

  private joinRoom(sessionId: string, ws: ExtendedWebSocket): void {
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, new Set());
    }
    this.clients.get(sessionId)!.add(ws);
  }

  private leaveRoom(sessionId: string, ws: ExtendedWebSocket): void {
    const room = this.clients.get(sessionId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.clients.delete(sessionId);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(sessionId: string, message: ServerMessage, exclude?: WebSocket): void {
    const room = this.clients.get(sessionId);
    if (!room) return;

    const data = JSON.stringify(message);
    room.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const extWs = ws as ExtendedWebSocket;
        if (!extWs.isAlive) {
          extWs.terminate();
          return;
        }
        extWs.isAlive = false;
        extWs.ping();
      });
    }, 30000);
  }

  getConnectionCount(sessionId?: string): number {
    if (sessionId) {
      return this.clients.get(sessionId)?.size ?? 0;
    }
    let total = 0;
    this.clients.forEach((room) => {
      total += room.size;
    });
    return total;
  }

  shutdown(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Close all client connections first
      this.wss.clients.forEach((client) => {
        client.terminate();
      });

      this.wss.close(() => {
        resolve();
      });
    });
  }
}
