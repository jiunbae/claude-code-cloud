import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Get encryption key from environment variable
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_MASTER_KEY;

  if (!keyBase64) {
    // In production, strictly require ENCRYPTION_MASTER_KEY
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_MASTER_KEY must be set for credential encryption in production environment');
    }

    // Fallback to JWT_SECRET only in development/test environments
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      console.warn('[Security] ENCRYPTION_MASTER_KEY not set, using JWT_SECRET as fallback. This is NOT secure for production.');
      // Derive a key from JWT_SECRET using SHA-256
      return crypto.createHash('sha256').update(jwtSecret).digest();
    }
    throw new Error('ENCRYPTION_MASTER_KEY or JWT_SECRET must be set for credential encryption');
  }

  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_MASTER_KEY must be ${KEY_LENGTH} bytes (256 bits) when decoded from base64`);
  }

  return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns base64 encoded string: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypt a base64 encoded encrypted string
 * Expects format: iv + authTag + ciphertext
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encryptedBase64, 'base64');

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Mask an API key for display purposes
 * Shows first 4 and last 4 characters
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}${'*'.repeat(8)}${key.slice(-4)}`;
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt a credentials object (key-value pairs)
 */
export function encryptCredentials(credentials: Record<string, string>): string {
  return encrypt(JSON.stringify(credentials));
}

/**
 * Decrypt a credentials object
 */
export function decryptCredentials(encryptedCredentials: string): Record<string, string> {
  const decrypted = decrypt(encryptedCredentials);
  return JSON.parse(decrypted);
}

/**
 * Generate a new encryption key (for setup purposes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}
