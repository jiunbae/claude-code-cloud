import jwt, { SignOptions } from 'jsonwebtoken';
import type { JWTPayload } from '@/types/auth';

const envJwtSecret = process.env.JWT_SECRET;
if (!envJwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = envJwtSecret;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
const OTP_TOKEN_EXPIRES_IN = (process.env.OTP_TOKEN_EXPIRES_IN || '10m') as SignOptions['expiresIn'];

export interface OtpTokenPayload extends JWTPayload {
  otpPending: true;
}

/**
 * Sign a JWT token with user payload
 */
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { otpPending?: boolean };
    if (decoded.otpPending) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Sign a short-lived OTP token for completing 2FA login
 */
export function signOtpToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, otpPending: true }, JWT_SECRET, {
    expiresIn: OTP_TOKEN_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Verify OTP token (must include otpPending)
 */
export function verifyOtpToken(token: string): OtpTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as OtpTokenPayload;
    if (!decoded.otpPending) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Decode a token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Get token from Authorization header
 */
export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  // Support "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return authHeader;
}

/**
 * Cookie options for auth token
 */
export const AUTH_COOKIE_OPTIONS = {
  name: 'auth_token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  path: '/',
};
