import { NextResponse } from 'next/server';

// POST /api/auth/register - Public registration is disabled
export async function POST() {
  return NextResponse.json(
    { error: 'Public registration is disabled. Please contact administrator.' },
    { status: 403 }
  );
}
