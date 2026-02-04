import crypto from 'crypto';
import * as OTPAuth from 'otpauth';

const OTP_ISSUER = 'Claude Code Cloud';
const OTP_DIGITS = 6;
const OTP_PERIOD = 30;
const OTP_WINDOW = 1;

const OTP_ALGORITHM = 'aes-256-gcm';
const OTP_IV_LENGTH = 12;
const OTP_AUTH_TAG_LENGTH = 16;

function getOtpEncryptionKey(): Buffer {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  return crypto.createHash('sha256').update(jwtSecret).digest();
}

export function encryptOtpSecret(secret: string): string {
  const key = getOtpEncryptionKey();
  const iv = crypto.randomBytes(OTP_IV_LENGTH);
  const cipher = crypto.createCipheriv(OTP_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptOtpSecret(encryptedBase64: string): string {
  const key = getOtpEncryptionKey();
  const data = Buffer.from(encryptedBase64, 'base64');

  if (data.length < OTP_IV_LENGTH + OTP_AUTH_TAG_LENGTH) {
    throw new Error('Invalid OTP secret payload');
  }

  const iv = data.subarray(0, OTP_IV_LENGTH);
  const authTag = data.subarray(OTP_IV_LENGTH, OTP_IV_LENGTH + OTP_AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(OTP_IV_LENGTH + OTP_AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(OTP_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function generateOtpSecret(label: string): { secret: string; otpauthUrl: string } {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: OTP_ISSUER,
    label,
    algorithm: 'SHA1',
    digits: OTP_DIGITS,
    period: OTP_PERIOD,
    secret,
  });

  return {
    secret: secret.base32,
    otpauthUrl: totp.toString(),
  };
}

export function verifyOtpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/[^0-9]/g, '');
  if (normalized.length !== OTP_DIGITS) {
    return false;
  }

  const totp = new OTPAuth.TOTP({
    issuer: OTP_ISSUER,
    label: 'user',
    algorithm: 'SHA1',
    digits: OTP_DIGITS,
    period: OTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: normalized, window: OTP_WINDOW });
  return delta !== null;
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const code = crypto.randomInt(0, 100000000).toString().padStart(8, '0');
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  });
}
