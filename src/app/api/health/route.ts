import { NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { ptyManager } from '@/server/pty/PtyManager';

// Health check response type
interface HealthCheck {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  sessions: {
    total: number;
    running: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    usagePercent: number;
  };
  components: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
    ptyManager: { status: 'ok' | 'error'; activeProcesses: number };
  };
}

// GET /api/health - Health check endpoint
export async function GET() {
  const startTime = performance.now();

  // Check database health and get session count
  let dbStatus: HealthCheck['components']['database'] = { status: 'ok' };
  let totalSessionsCount = 0;
  try {
    const dbStart = performance.now();
    totalSessionsCount = sessionStore.count(); // Simple query to test DB connection
    dbStatus = { status: 'ok', latencyMs: Math.round(performance.now() - dbStart) };
  } catch (error) {
    dbStatus = { status: 'error', error: (error as Error).message };
  }

  // Check PTY manager health
  const ptyStatus: HealthCheck['components']['ptyManager'] = {
    status: 'ok',
    activeProcesses: ptyManager.getRunningCount(),
  };

  // Memory usage with percentage
  const memUsage = process.memoryUsage();
  const memory = {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    rss: memUsage.rss,
    external: memUsage.external,
    usagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  };

  // Determine overall status
  const overallStatus: HealthCheck['status'] =
    dbStatus.status === 'error' ? 'error' :
    memory.usagePercent > 90 ? 'degraded' : 'ok';

  const response: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    sessions: {
      total: totalSessionsCount,
      running: ptyManager.getRunningCount(),
    },
    memory,
    components: {
      database: dbStatus,
      ptyManager: ptyStatus,
    },
  };

  const statusCode = overallStatus === 'error' ? 503 : 200;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
