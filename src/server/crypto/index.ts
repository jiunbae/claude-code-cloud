// Credential encryption (for global settings - from SecretStore)
export {
  encrypt,
  decrypt,
  maskApiKey as maskCredential,
  isEncryptionConfigured,
  encryptCredentials,
  decryptCredentials,
  generateEncryptionKey as generateCredentialKey,
} from './SecretStore';

// API Key encryption (for user API keys - from encryption)
export {
  encryptApiKey,
  decryptApiKey,
  serializeEncryptedData,
  deserializeEncryptedData,
  maskApiKey,
  validateApiKeyFormat,
  generateEncryptionKey,
  isEncryptionConfigured as isApiKeyEncryptionConfigured,
  type EncryptedData,
} from './encryption';
