import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isErrorResponse, userStore, verifyPassword } from '@/server/auth';
import { decryptOtpSecret, verifyOtpCode } from '@/server/auth/otp';

// POST /api/auth/otp/disable - Disable 2FA
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const body = await request.json();
    const { password, code } = body as { password?: string; code?: string };

    if (!password || !code) {
      return NextResponse.json(
        { error: 'Password and OTP code are required' },
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

    if (!user.otpEnabled) {
      return NextResponse.json(
        { error: 'OTP is not enabled' },
        { status: 400 }
      );
    }

    const passwordHash = userStore.getPasswordHash(user.email);
    if (!passwordHash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const encryptedSecret = userStore.getOtpSecret(auth.userId);
    if (!encryptedSecret) {
      return NextResponse.json(
        { error: 'OTP secret not found' },
        { status: 400 }
      );
    }

    const secret = decryptOtpSecret(encryptedSecret);
    const isValidOtp = verifyOtpCode(secret, code);

    if (!isValidOtp) {
      return NextResponse.json(
        { error: 'Invalid OTP code' },
        { status: 401 }
      );
    }

    userStore.clearOtp(auth.userId);

    return NextResponse.json({
      message: 'OTP disabled',
    });
  } catch (error) {
    console.error('OTP disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable OTP' },
      { status: 500 }
    );
  }
}
