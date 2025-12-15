import { NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { ptyManager } from '@/server/pty/PtyManager';

// Prometheus text format metrics endpoint
// GET /api/metrics - Returns metrics in Prometheus exposition format
export async function GET() {
  const timestamp = Date.now();
  const metrics: string[] = [];

  // Helper to add metric with optional labels
  const addMetric = (
    name: string,
    value: number,
    type: 'gauge' | 'counter',
    help: string,
    labels?: Record<string, string>
  ) => {
    const labelStr = labels
      ? `{${Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')}}`
      : '';
    metrics.push(`# HELP ${name} ${help}`);
    metrics.push(`# TYPE ${name} ${type}`);
    metrics.push(`${name}${labelStr} ${value} ${timestamp}`);
  };

  // Process metrics
  const memUsage = process.memoryUsage();
  addMetric(
    'nodejs_heap_size_used_bytes',
    memUsage.heapUsed,
    'gauge',
    'Process heap size used in bytes'
  );
  addMetric(
    'nodejs_heap_size_total_bytes',
    memUsage.heapTotal,
    'gauge',
    'Process heap size total in bytes'
  );
  addMetric(
    'nodejs_external_memory_bytes',
    memUsage.external,
    'gauge',
    'Process external memory size in bytes'
  );
  addMetric(
    'nodejs_rss_bytes',
    memUsage.rss,
    'gauge',
    'Process resident set size in bytes'
  );

  // Uptime
  addMetric(
    'process_uptime_seconds',
    Math.floor(process.uptime()),
    'gauge',
    'Process uptime in seconds'
  );

  // Session metrics
  try {
    const totalSessions = sessionStore.count();
    const runningSessions = ptyManager.getRunningCount();
    const idleSessions = totalSessions - runningSessions;

    addMetric(
      'claude_code_sessions_total',
      totalSessions,
      'gauge',
      'Total number of sessions'
    );
    addMetric(
      'claude_code_sessions_running',
      runningSessions,
      'gauge',
      'Number of running sessions'
    );
    addMetric(
      'claude_code_sessions_idle',
      idleSessions,
      'gauge',
      'Number of idle sessions'
    );

    // PTY process metrics
    addMetric(
      'claude_code_pty_processes_active',
      runningSessions,
      'gauge',
      'Number of active PTY processes'
    );
  } catch (error) {
    // Database might not be available
    console.error('Failed to retrieve session metrics for Prometheus:', error);
    addMetric(
      'claude_code_sessions_total',
      0,
      'gauge',
      'Total number of sessions'
    );
  }

  // CPU usage (if available)
  const cpuUsage = process.cpuUsage();
  addMetric(
    'process_cpu_user_seconds_total',
    cpuUsage.user / 1e6,
    'counter',
    'Total user CPU time spent in seconds'
  );
  addMetric(
    'process_cpu_system_seconds_total',
    cpuUsage.system / 1e6,
    'counter',
    'Total system CPU time spent in seconds'
  );

  // Event loop lag (approximate via simple timing)
  const startHrTime = process.hrtime();
  await new Promise((resolve) => setImmediate(resolve));
  const [seconds, nanoseconds] = process.hrtime(startHrTime);
  const eventLoopLagMs = seconds * 1000 + nanoseconds / 1e6;
  addMetric(
    'nodejs_eventloop_lag_seconds',
    eventLoopLagMs / 1000,
    'gauge',
    'Event loop lag in seconds'
  );

  // Info metric
  metrics.push(`# HELP claude_code_info Application info`);
  metrics.push(`# TYPE claude_code_info gauge`);
  metrics.push(
    `claude_code_info{version="${process.env.npm_package_version || '1.0.0'}",nodejs_version="${process.version}"} 1`
  );

  // Return metrics in Prometheus text format
  return new NextResponse(metrics.join('\n') + '\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
