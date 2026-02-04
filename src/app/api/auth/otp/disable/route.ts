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

    // Validate both password and OTP together to prevent timing attacks
    const passwordHash = userStore.getPasswordHash(user.email);
    const isValidPassword = passwordHash ? await verifyPassword(password, passwordHash) : false;

    const encryptedSecret = userStore.getOtpSecret(auth.userId);
    let isValidOtp = false;
    if (encryptedSecret) {
      try {
        const secret = decryptOtpSecret(encryptedSecret);
        isValidOtp = verifyOtpCode(secret, code);
      } catch {
        // Decryption failed, treat as invalid OTP
        isValidOtp = false;
      }
    }

    if (!isValidPassword || !isValidOtp) {
      return NextResponse.json(
        { error: 'Invalid password or OTP code' },
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
