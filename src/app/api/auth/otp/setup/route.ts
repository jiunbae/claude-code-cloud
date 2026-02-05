import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireAuth, isErrorResponse, userStore } from '@/server/auth';
import { encryptOtpSecret, generateBackupCodes, generateOtpSecret, hashBackupCodes } from '@/server/auth/otp';

// POST /api/auth/otp/setup - Generate OTP secret and QR code
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
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

    const { secret, otpauthUrl } = generateOtpSecret(user.email);
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
    const backupCodes = generateBackupCodes();

    const encryptedSecret = encryptOtpSecret(secret);
    userStore.updateOtpSecret(auth.userId, encryptedSecret);

    // Store hashed backup codes server-side
    const hashedCodes = hashBackupCodes(backupCodes);
    userStore.updateBackupCodes(auth.userId, hashedCodes);

    return NextResponse.json({
      secret,
      qrCodeUrl,
      backupCodes,
    });
  } catch (error) {
    console.error('OTP setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup OTP' },
      { status: 500 }
    );
  }
}
