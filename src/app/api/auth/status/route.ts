import { NextResponse } from 'next/server';
import { isAuthDisabled } from '@/server/middleware/auth';

// GET /api/auth/status
// Returns: { authEnabled: boolean }
export async function GET() {
  return NextResponse.json(
    { authEnabled: !isAuthDisabled() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
