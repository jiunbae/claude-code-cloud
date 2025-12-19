import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WsServer } from './websocket/WsServer';
import { ptyManager } from './pty/PtyManager';
import { VALID_TERMINAL_TYPES } from '@/types';
import type { TerminalKind } from '@/types';

const wsPort = parseInt(process.env.WS_PORT || '3001', 10);
const httpPort = parseInt(process.env.PTY_API_PORT || '3003', 10);

// Helper: Parse JSON body from request
async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
}

// Helper: Send JSON response
function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Generic handler: Start terminal
async function handleTerminalStart(
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  terminal: TerminalKind
): Promise<void> {
  try {
    const data = await parseJsonBody(req);
    const { projectPath, config, userId } = data as {
      projectPath?: string;
      config?: Record<string, unknown>;
      userId?: string;
    };

    if (!projectPath) {
      sendJson(res, 400, { error: 'projectPath required' });
      return;
    }

    // For non-claude terminals, return existing pid if already running
    if (terminal !== 'claude' && ptyManager.isRunning(sessionId, terminal)) {
      sendJson(res, 200, { success: true, pid: ptyManager.getPid(sessionId, terminal) });
      return;
    }

    // For claude, reject if already running
    if (terminal === 'claude' && ptyManager.isRunning(sessionId, terminal)) {
      sendJson(res, 400, { error: 'Session already running' });
      return;
    }

    const { pid } = await ptyManager.startSession(sessionId, projectPath, config || {}, terminal, userId);
    sendJson(res, 200, { success: true, pid });
  } catch (error) {
    console.error(`Failed to start ${terminal}:`, error);
    sendJson(res, 500, { error: (error as Error).message });
  }
}

// Generic handler: Stop terminal
async function handleTerminalStop(
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  terminal: TerminalKind
): Promise<void> {
  try {
    if (!ptyManager.isRunning(sessionId, terminal)) {
      const terminalLabel = terminal.charAt(0).toUpperCase() + terminal.slice(1);
      sendJson(res, 400, { error: `${terminalLabel} not running` });
      return;
    }

    const data = await parseJsonBody(req);
    await ptyManager.stopSession(sessionId, terminal, (data as { force?: boolean }).force === true);
    sendJson(res, 200, { success: true });
  } catch (error) {
    console.error(`Failed to stop ${terminal}:`, error);
    sendJson(res, 500, { error: (error as Error).message });
  }
}

// Generic handler: Get terminal status
function handleTerminalStatus(
  res: ServerResponse,
  sessionId: string,
  terminal: TerminalKind
): void {
  sendJson(res, 200, {
    running: ptyManager.isRunning(sessionId, terminal),
    status: ptyManager.getStatus(sessionId, terminal),
    pid: ptyManager.getPid(sessionId, terminal),
  });
}

// Simple HTTP API for PTY session management
function createHttpApi() {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${httpPort}`);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Route: /sessions/:id/...
    if (pathParts[0] !== 'sessions' || !pathParts[1]) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const sessionId = pathParts[1];
    const terminalOrAction = pathParts[2];
    const action = pathParts[3];

    // Legacy routes: /sessions/:id/start, /sessions/:id/stop, /sessions/:id/status (defaults to 'claude')
    if (terminalOrAction === 'start' && req.method === 'POST') {
      await handleTerminalStart(req, res, sessionId, 'claude');
      return;
    }

    if (terminalOrAction === 'stop' && req.method === 'POST') {
      // Legacy route defaults to 'claude' terminal
      await handleTerminalStop(req, res, sessionId, 'claude');
      return;
    }

    if (terminalOrAction === 'status' && req.method === 'GET') {
      handleTerminalStatus(res, sessionId, 'claude');
      return;
    }

    // New routes: /sessions/:id/:terminal/:action
    if (VALID_TERMINAL_TYPES.includes(terminalOrAction as TerminalKind) && action) {
      const terminal = terminalOrAction as TerminalKind;

      switch (action) {
        case 'start':
          if (req.method === 'POST') {
            await handleTerminalStart(req, res, sessionId, terminal);
            return;
          }
          break;
        case 'stop':
          if (req.method === 'POST') {
            await handleTerminalStop(req, res, sessionId, terminal);
            return;
          }
          break;
        case 'status':
          if (req.method === 'GET') {
            handleTerminalStatus(res, sessionId, terminal);
            return;
          }
          break;
      }
    }

    // 404 for other routes
    sendJson(res, 404, { error: 'Not found' });
  });

  return server;
}

async function main() {
  try {
    // Start WebSocket server
    const wsServer = new WsServer(wsPort);

    // Start HTTP API server for PTY management
    const httpServer = createHttpApi();
    httpServer.listen(httpPort, () => {
      console.log(`> PTY API ready on http://localhost:${httpPort}`);
    });

    console.log(`> WebSocket server ready on ws://localhost:${wsPort}`);

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down WebSocket server...');

      // Close WebSocket server and wait for it to fully close
      await wsServer.shutdown();

      // Stop all PTY sessions
      await ptyManager.shutdown();

      console.log('WebSocket server closed');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start WebSocket server:', error);
    process.exit(1);
  }
}

main();
