/**
 * API Key Encryption Utilities
 *
 * Uses AES-256-GCM for secure encryption of API keys stored in the database.
 * The encryption key is derived from the ENCRYPTION_KEY environment variable.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Encrypted data structure stored in the database
 */
export interface EncryptedData {
  iv: string;        // Base64 encoded initialization vector
  tag: string;       // Base64 encoded authentication tag
  ciphertext: string; // Base64 encoded encrypted data
}

/**
 * Get the encryption key from environment variable
 * The key should be a 64-character hex string (32 bytes)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate a secure key with: openssl rand -hex 32'
    );
  }

  // If key is hex-encoded (64 chars), decode it
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // If key is raw 32 bytes, use directly
  if (key.length === 32) {
    return Buffer.from(key, 'utf8');
  }

  // Hash the key to get 32 bytes (less secure, but allows any length key)
  console.warn(
    'ENCRYPTION_KEY should be a 64-character hex string. ' +
    'Using SHA-256 hash of the provided key instead.'
  );
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt an API key for secure storage
 *
 * @param plaintext - The API key to encrypt
 * @returns Encrypted data object with iv, tag, and ciphertext
 */
export function encryptApiKey(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

/**
 * Decrypt an API key from storage
 *
 * @param data - Encrypted data object with iv, tag, and ciphertext
 * @returns The decrypted API key
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptApiKey(data: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(data.iv, 'base64');
  const tag = Buffer.from(data.tag, 'base64');
  const ciphertext = Buffer.from(data.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Serialize encrypted data to a JSON string for database storage
 */
export function serializeEncryptedData(data: EncryptedData): string {
  return JSON.stringify(data);
}

/**
 * Deserialize encrypted data from a JSON string
 */
export function deserializeEncryptedData(json: string): EncryptedData {
  return JSON.parse(json) as EncryptedData;
}

/**
 * Mask an API key for display purposes
 * Shows the prefix and last 4 characters, hiding the rest
 *
 * @example
 * maskApiKey('sk-ant-api03-xxxxxxxxxxxxxxxxxxxx')
 * // Returns: 'sk-ant-***...***xxxx'
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 12) {
    return '***';
  }

  // Find the prefix (sk-ant-, sk-proj-, etc.)
  const prefixMatch = key.match(/^(sk-[a-z]+-)/i);
  const prefix = prefixMatch ? prefixMatch[1] : key.slice(0, 6);
  const suffix = key.slice(-4);

  return `${prefix}***...***${suffix}`;
}

/**
 * Validate that an API key has a valid format
 */
export function validateApiKeyFormat(key: string, provider: 'anthropic' | 'openai'): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  switch (provider) {
    case 'anthropic':
      // Anthropic keys start with sk-ant-
      return key.startsWith('sk-ant-') && key.length > 20;
    case 'openai':
      // OpenAI keys start with sk- or sk-proj-
      return (key.startsWith('sk-') || key.startsWith('sk-proj-')) && key.length > 20;
    default:
      return key.length > 10;
  }
}

/**
 * Generate a random encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
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
