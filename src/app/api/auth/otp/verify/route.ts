import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse, userStore } from '@/server/auth';
import { decryptOtpSecret, verifyOtpCode } from '@/server/auth/otp';

// POST /api/auth/otp/verify - Verify OTP code and enable 2FA
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const body = await request.json();
    const { code } = body as { code?: string };

    if (!code) {
      return NextResponse.json(
        { error: 'OTP code is required' },
        { status: 400 }
      );
    }

    const user = userStore.getById(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.otpEnabled) {
      return NextResponse.json(
        { error: 'OTP is already enabled' },
        { status: 400 }
      );
    }

    const encryptedSecret = userStore.getOtpSecret(auth.userId);
    if (!encryptedSecret) {
      return NextResponse.json(
        { error: 'OTP setup has not been initiated' },
        { status: 400 }
      );
    }

    const secret = decryptOtpSecret(encryptedSecret);
    const isValid = verifyOtpCode(secret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid OTP code' },
        { status: 400 }
      );
    }

    userStore.setOtpEnabled(auth.userId, true);

    return NextResponse.json({
      message: 'OTP enabled',
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
