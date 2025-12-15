import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WsServer } from './websocket/WsServer';
import { ptyManager } from './pty/PtyManager';

const wsPort = parseInt(process.env.WS_PORT || '3001', 10);
const httpPort = parseInt(process.env.PTY_API_PORT || '3003', 10);

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

    // POST /sessions/:id/start
    if (req.method === 'POST' && pathParts[0] === 'sessions' && pathParts[2] === 'start') {
      const sessionId = pathParts[1];

      try {
        // Read request body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }
        const data = body ? JSON.parse(body) : {};
        const { projectPath, config } = data;

        if (!projectPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'projectPath required' }));
          return;
        }

        if (ptyManager.isRunning(sessionId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session already running' }));
          return;
        }

        const { pid } = await ptyManager.startSession(sessionId, projectPath, config || {});

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, pid }));
      } catch (error) {
        console.error('Failed to start session:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    // POST /sessions/:id/stop
    if (req.method === 'POST' && pathParts[0] === 'sessions' && pathParts[2] === 'stop') {
      const sessionId = pathParts[1];

      try {
        if (!ptyManager.isRunning(sessionId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not running' }));
          return;
        }

        await ptyManager.stopSession(sessionId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Failed to stop session:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    // GET /sessions/:id/status
    if (req.method === 'GET' && pathParts[0] === 'sessions' && pathParts[2] === 'status') {
      const sessionId = pathParts[1];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        running: ptyManager.isRunning(sessionId),
        status: ptyManager.getStatus(sessionId, 'claude'),
        pid: ptyManager.getPid(sessionId, 'claude'),
      }));
      return;
    }

    // POST /sessions/:id/shell/start
    if (
      req.method === 'POST' &&
      pathParts[0] === 'sessions' &&
      pathParts[2] === 'shell' &&
      pathParts[3] === 'start'
    ) {
      const sessionId = pathParts[1];

      try {
        // Read request body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }
        const data = body ? JSON.parse(body) : {};
        const { projectPath, config } = data;

        if (!projectPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'projectPath required' }));
          return;
        }

        if (ptyManager.isRunning(sessionId, 'shell')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, pid: ptyManager.getPid(sessionId, 'shell') }));
          return;
        }

        const { pid } = await ptyManager.startSession(sessionId, projectPath, config || {}, 'shell');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, pid }));
      } catch (error) {
        console.error('Failed to start shell:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    // POST /sessions/:id/shell/stop
    if (
      req.method === 'POST' &&
      pathParts[0] === 'sessions' &&
      pathParts[2] === 'shell' &&
      pathParts[3] === 'stop'
    ) {
      const sessionId = pathParts[1];

      try {
        if (!ptyManager.isRunning(sessionId, 'shell')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Shell not running' }));
          return;
        }

        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }
        const data = body ? JSON.parse(body) : {};

        await ptyManager.stopSession(sessionId, 'shell', data.force === true);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Failed to stop shell:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    // GET /sessions/:id/shell/status
    if (
      req.method === 'GET' &&
      pathParts[0] === 'sessions' &&
      pathParts[2] === 'shell' &&
      pathParts[3] === 'status'
    ) {
      const sessionId = pathParts[1];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          running: ptyManager.isRunning(sessionId, 'shell'),
          status: ptyManager.getStatus(sessionId, 'shell'),
          pid: ptyManager.getPid(sessionId, 'shell'),
        })
      );
      return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
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
