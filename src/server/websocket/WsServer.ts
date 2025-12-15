import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage, Server } from 'http';
import { parse as parseUrl } from 'url';
import { Socket } from 'net';
import { ptyManager } from '../pty/PtyManager';
import { VALID_TERMINAL_TYPES } from '@/types';
import type { ClientMessage, ServerMessage, TerminalKind, WsConnectionInfo } from '@/types';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  connectionInfo?: WsConnectionInfo;
}

interface CollabWebSocket extends WebSocket {
  isAlive: boolean;
  sessionId: string;
  userId: string;
  userName?: string;
  userColor?: string;
}

interface CollaboratorPresence {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; column: number };
  lastSeen: number;
  isTyping: boolean;
}

export class WsServer {
  private httpServer: Server;
  private terminalWss: WebSocketServer;
  private collabWss: WebSocketServer;
  private clients: Map<string, Set<ExtendedWebSocket>> = new Map(); // roomKey -> clients
  private collabClients: Map<string, Set<CollabWebSocket>> = new Map(); // sessionId -> collab clients
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3001) {
    // Create HTTP server for WebSocket upgrade handling
    this.httpServer = createServer((req, res) => {
      // Return 426 Upgrade Required for non-WebSocket requests
      res.writeHead(426, { 'Content-Type': 'text/plain' });
      res.end('WebSocket connection required');
    });

    // Create WebSocketServers without their own servers (noServer: true)
    this.terminalWss = new WebSocketServer({ noServer: true });
    this.collabWss = new WebSocketServer({ noServer: true });

    this.setupUpgradeHandler();
    this.setupTerminalServer();
    this.setupCollabServer();
    this.setupPtyListeners();
    this.startHeartbeat();

    this.httpServer.listen(port, () => {
      console.log(`WebSocket server started on port ${port}`);
    });
  }

  private setupUpgradeHandler(): void {
    this.httpServer.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      const { pathname } = parseUrl(request.url || '', true);

      if (pathname === '/ws' || pathname === '/ws/') {
        // Terminal WebSocket
        this.terminalWss.handleUpgrade(request, socket, head, (ws) => {
          this.terminalWss.emit('connection', ws, request);
        });
      } else if (pathname === '/ws/collab' || pathname === '/ws/collab/') {
        // Collaboration WebSocket
        this.collabWss.handleUpgrade(request, socket, head, (ws) => {
          this.collabWss.emit('connection', ws, request);
        });
      } else {
        // Unknown path - destroy socket
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
      }
    });
  }

  private getRoomKey(sessionId: string, terminal: TerminalKind): string {
    return `${sessionId}:${terminal}`;
  }

  private setupTerminalServer(): void {
    this.terminalWss.on('connection', (ws: ExtendedWebSocket, req: IncomingMessage) => {
      ws.isAlive = true;

      // Extract session ID from URL
      const { query } = parseUrl(req.url || '', true);
      const sessionId = query.sessionId as string;
      const terminal = (query.terminal as TerminalKind | undefined) ?? 'claude';

      if (!sessionId) {
        this.sendMessage(ws, {
          type: 'error',
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required',
        });
        ws.close();
        return;
      }

      if (!VALID_TERMINAL_TYPES.includes(terminal)) {
        this.sendMessage(ws, {
          type: 'error',
          code: 'INVALID_TERMINAL',
          message: 'Invalid terminal type',
        });
        ws.close();
        return;
      }

      // Store connection info
      ws.connectionInfo = {
        sessionId,
        terminal,
        connectedAt: new Date(),
      };

      // Add to room
      this.joinRoom(this.getRoomKey(sessionId, terminal), ws);

      // Send connection established
      this.sendMessage(ws, {
        type: 'connection:established',
        sessionId,
      });

      // Send scrollback if available
      const scrollback = ptyManager.getScrollback(sessionId, terminal);
      if (scrollback.length > 0) {
        this.sendMessage(ws, {
          type: 'terminal:scrollback',
          data: scrollback,
        });
      }

      // Send current status
      const status = ptyManager.getStatus(sessionId, terminal);
      const pid = ptyManager.getPid(sessionId, terminal);
      this.sendMessage(ws, {
        type: 'session:status',
        status,
        pid,
      });

      // Handle messages
      ws.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as ClientMessage;
          this.handleTerminalMessage(ws, sessionId, terminal, message);
        } catch {
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
        this.leaveRoom(this.getRoomKey(sessionId, terminal), ws);
      });

      // Handle error
      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
        this.leaveRoom(this.getRoomKey(sessionId, terminal), ws);
      });
    });
  }

  private setupCollabServer(): void {
    this.collabWss.on('connection', (ws: CollabWebSocket, req: IncomingMessage) => {
      ws.isAlive = true;

      // Extract session ID and user ID from URL
      const { query } = parseUrl(req.url || '', true);
      const sessionId = query.sessionId as string;
      const userId = query.userId as string;

      if (!sessionId || !userId) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'MISSING_PARAMS',
          message: 'sessionId and userId are required',
        }));
        ws.close();
        return;
      }

      ws.sessionId = sessionId;
      ws.userId = userId;

      // Add to collab room
      this.joinCollabRoom(sessionId, ws);

      // Handle messages
      ws.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          this.handleCollabMessage(ws, message);
        } catch {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'INVALID_MESSAGE',
            message: 'Invalid message format',
          }));
        }
      });

      // Handle pong for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle close
      ws.on('close', () => {
        this.leaveCollabRoom(sessionId, ws);
        this.broadcastCollabPresence(sessionId);
      });

      // Handle error
      ws.on('error', (error) => {
        console.error(`Collab WebSocket error for session ${sessionId}:`, error);
        this.leaveCollabRoom(sessionId, ws);
      });
    });
  }

  private handleCollabMessage(ws: CollabWebSocket, message: Record<string, unknown>): void {
    const { sessionId } = ws;

    switch (message.type) {
      case 'collab:join':
        ws.userName = message.userName as string;
        ws.userColor = message.userColor as string;
        this.broadcastCollabPresence(sessionId);
        break;

      case 'collab:heartbeat':
        // Just keep the connection alive, presence is broadcast on join/leave
        break;

      case 'collab:chat':
        // Broadcast chat message to all collaborators in the session
        this.broadcastToCollabRoom(sessionId, {
          type: 'collab:chat',
          message: message.message,
        }, ws);
        break;

      case 'collab:cursor':
        // Broadcast cursor position to all collaborators
        this.broadcastToCollabRoom(sessionId, {
          type: 'collab:cursor',
          userId: ws.userId,
          cursor: message.cursor,
        }, ws);
        break;

      case 'collab:typing':
        // Broadcast typing status to all collaborators
        this.broadcastToCollabRoom(sessionId, {
          type: 'collab:typing',
          userId: ws.userId,
          isTyping: message.isTyping,
        }, ws);
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: 'Unknown message type',
        }));
    }
  }

  private joinCollabRoom(sessionId: string, ws: CollabWebSocket): void {
    if (!this.collabClients.has(sessionId)) {
      this.collabClients.set(sessionId, new Set());
    }
    this.collabClients.get(sessionId)!.add(ws);
  }

  private leaveCollabRoom(sessionId: string, ws: CollabWebSocket): void {
    const room = this.collabClients.get(sessionId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.collabClients.delete(sessionId);
      }
    }
  }

  private broadcastCollabPresence(sessionId: string): void {
    const room = this.collabClients.get(sessionId);
    if (!room) return;

    const collaborators: CollaboratorPresence[] = [];
    room.forEach((client) => {
      if (client.userName) {
        collaborators.push({
          id: client.userId,
          name: client.userName,
          color: client.userColor || '#7aa2f7',
          lastSeen: Date.now(),
          isTyping: false,
        });
      }
    });

    const message = JSON.stringify({
      type: 'collab:presence',
      collaborators,
    });

    room.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private broadcastToCollabRoom(
    sessionId: string,
    message: Record<string, unknown>,
    exclude?: CollabWebSocket
  ): void {
    const room = this.collabClients.get(sessionId);
    if (!room) return;

    const data = JSON.stringify(message);
    room.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private setupPtyListeners(): void {
    // Forward PTY output to connected clients
    ptyManager.on('output', (sessionId: string, terminal: TerminalKind, data: string) => {
      this.broadcast(this.getRoomKey(sessionId, terminal), {
        type: 'terminal:output',
        data,
        timestamp: Date.now(),
      });
    });

    // Handle PTY exit
    ptyManager.on('exit', (sessionId: string, terminal: TerminalKind, exitCode: number) => {
      this.broadcast(this.getRoomKey(sessionId, terminal), {
        type: 'session:status',
        status: 'idle',
        exitCode,
      });
    });

    // Handle PTY start
    ptyManager.on('started', (sessionId: string, terminal: TerminalKind, pid: number) => {
      this.broadcast(this.getRoomKey(sessionId, terminal), {
        type: 'session:status',
        status: 'running',
        pid,
      });
    });

    // Handle PTY error
    ptyManager.on('error', (sessionId: string, terminal: TerminalKind, error: Error) => {
      this.broadcast(this.getRoomKey(sessionId, terminal), {
        type: 'session:error',
        code: 'PTY_ERROR',
        message: error.message,
      });
    });
  }

  private handleTerminalMessage(
    ws: ExtendedWebSocket,
    sessionId: string,
    terminal: TerminalKind,
    message: ClientMessage
  ): void {
    switch (message.type) {
      case 'terminal:input':
        if (ptyManager.isRunning(sessionId, terminal)) {
          ptyManager.write(sessionId, terminal, message.data);
        } else {
          this.sendMessage(ws, {
            type: 'session:error',
            code: 'SESSION_NOT_RUNNING',
            message: 'Session is not running',
          });
        }
        break;

      case 'terminal:resize':
        ptyManager.resize(sessionId, terminal, message.cols, message.rows);
        break;

      case 'terminal:signal':
        ptyManager.sendSignal(sessionId, terminal, message.signal);
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

  private joinRoom(roomKey: string, ws: ExtendedWebSocket): void {
    if (!this.clients.has(roomKey)) {
      this.clients.set(roomKey, new Set());
    }
    this.clients.get(roomKey)!.add(ws);
  }

  private leaveRoom(roomKey: string, ws: ExtendedWebSocket): void {
    const room = this.clients.get(roomKey);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.clients.delete(roomKey);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(roomKey: string, message: ServerMessage, exclude?: WebSocket): void {
    const room = this.clients.get(roomKey);
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
      // Terminal clients heartbeat
      this.terminalWss.clients.forEach((ws) => {
        const extWs = ws as ExtendedWebSocket;
        if (!extWs.isAlive) {
          extWs.terminate();
          return;
        }
        extWs.isAlive = false;
        extWs.ping();
      });

      // Collab clients heartbeat
      this.collabWss.clients.forEach((ws) => {
        const collabWs = ws as CollabWebSocket;
        if (!collabWs.isAlive) {
          collabWs.terminate();
          return;
        }
        collabWs.isAlive = false;
        collabWs.ping();
      });
    }, 30000);
  }

  getConnectionCount(sessionId?: string): number {
    if (sessionId) {
      // Return count across all terminals for the session
      let total = 0;
      this.clients.forEach((room, roomKey) => {
        if (roomKey.startsWith(`${sessionId}:`)) {
          total += room.size;
        }
      });
      return total;
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

      // Close all terminal client connections
      this.terminalWss.clients.forEach((client) => {
        client.terminate();
      });

      // Close all collab client connections
      this.collabWss.clients.forEach((client) => {
        client.terminate();
      });

      // Close HTTP server (which closes both WebSocket servers)
      this.httpServer.close(() => {
        resolve();
      });
    });
  }
}
