import { NextRequest, NextResponse } from 'next/server';
import { userStore, signToken, verifyOtpToken, getTokenFromHeader, AUTH_COOKIE_OPTIONS } from '@/server/auth';
import { decryptOtpSecret, verifyOtpCode, hashBackupCode } from '@/server/auth/otp';

// POST /api/auth/otp/validate - Validate OTP during login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, tempToken } = body as { code?: string; tempToken?: string };

    if (!code) {
      return NextResponse.json(
        { error: 'OTP code is required' },
        { status: 400 }
      );
    }

    const headerToken = getTokenFromHeader(request.headers.get('authorization'));
    const otpToken = tempToken || headerToken;

    if (!otpToken) {
      return NextResponse.json(
        { error: 'OTP token is required' },
        { status: 401 }
      );
    }

    const payload = verifyOtpToken(otpToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP token' },
        { status: 401 }
      );
    }

    const user = userStore.getById(payload.userId);
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid user' },
        { status: 401 }
      );
    }

    if (!user.otpEnabled) {
      return NextResponse.json(
        { error: 'OTP is not enabled for this account' },
        { status: 400 }
      );
    }

    const encryptedSecret = userStore.getOtpSecret(user.id);
    if (!encryptedSecret) {
      return NextResponse.json(
        { error: 'OTP secret not found' },
        { status: 400 }
      );
    }

    const secret = decryptOtpSecret(encryptedSecret);
    let isValidOtp = verifyOtpCode(secret, code);
    let usedBackupCode = false;

    // If TOTP code is invalid, try backup codes
    if (!isValidOtp) {
      const hashedInput = hashBackupCode(code);
      const backupCodes = userStore.getBackupCodes(user.id);

      if (backupCodes.includes(hashedInput)) {
        isValidOtp = true;
        usedBackupCode = true;
        // Remove the used backup code
        userStore.removeBackupCode(user.id, hashedInput);
      }
    }

    if (!isValidOtp) {
      return NextResponse.json(
        { error: 'Invalid OTP code' },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    userStore.updateLastLogin(user.id);

    const remainingBackupCodes = userStore.getBackupCodes(user.id).length;

    const response = NextResponse.json({
      user: userStore.toPublicUser(user),
      message: 'Login successful',
      ...(usedBackupCode && { warning: `Backup code used. ${remainingBackupCodes} remaining.` }),
    });

    response.cookies.set(AUTH_COOKIE_OPTIONS.name, token, {
      httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
      secure: AUTH_COOKIE_OPTIONS.secure,
      sameSite: AUTH_COOKIE_OPTIONS.sameSite,
      maxAge: AUTH_COOKIE_OPTIONS.maxAge,
      path: AUTH_COOKIE_OPTIONS.path,
    });

    return response;
  } catch (error) {
    console.error('OTP validate error:', error);
    return NextResponse.json(
      { error: 'Failed to validate OTP' },
      { status: 500 }
    );
  }
}
