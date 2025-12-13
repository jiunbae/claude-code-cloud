import { NextResponse } from 'next/server';
import { sessionStore } from '@/server/session/SessionStore';
import { ptyManager } from '@/server/pty/PtyManager';

// GET /api/health - Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessions: {
      total: sessionStore.count(),
      running: ptyManager.getRunningCount(),
    },
    memory: process.memoryUsage(),
  });
}
