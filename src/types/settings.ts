/**
 * User and Global Settings Types
 */

// ============================================================================
// User Settings
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'en' | 'ko' | 'ja' | 'zh';

export const VALID_THEMES: readonly ThemeMode[] = ['light', 'dark', 'system'] as const;
export const VALID_LANGUAGES: readonly Language[] = ['en', 'ko', 'ja', 'zh'] as const;

export interface UserSettings {
  id: string;
  userId: string;
  theme: ThemeMode;
  language: Language;
  defaultModel: string;
  terminalFontSize: number;
  editorFontSize: number;
  autoSave: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettingsCreate {
  theme?: ThemeMode;
  language?: Language;
  defaultModel?: string;
  terminalFontSize?: number;
  editorFontSize?: number;
  autoSave?: boolean;
}

export interface UserSettingsUpdate {
  theme?: ThemeMode;
  language?: Language;
  defaultModel?: string;
  terminalFontSize?: number;
  editorFontSize?: number;
  autoSave?: boolean;
}

// ============================================================================
// API Keys
// ============================================================================

export type ApiKeyProvider = 'anthropic' | 'openai' | 'google';

export const API_KEY_PROVIDERS: readonly ApiKeyProvider[] = ['anthropic', 'openai', 'google'] as const;

export interface ApiKey {
  id: string;
  userId: string;
  provider: ApiKeyProvider;
  keyName: string;
  keyPreview: string; // Masked version: sk-ant-***...***abc
  isActive: boolean;
  isValid: boolean | null; // null = not validated yet, true = valid, false = invalid
  lastUsedAt: Date | null;
  lastValidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyCreate {
  provider: ApiKeyProvider;
  keyName: string;
  apiKey: string; // Raw API key (will be encrypted)
}

export interface ApiKeyWithSecret extends ApiKey {
  decryptedKey: string; // Only for internal use, never sent to client
}

// ============================================================================
// Global Settings (Admin)
// ============================================================================

export interface GlobalSettings {
  // Registration & Access
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxUsersAllowed: number;

  // Default API Settings
  defaultApiProvider: ApiKeyProvider;
  allowUserApiKeys: boolean; // Whether users can set their own API keys
  requireApiKey: boolean; // Whether API key is required to start sessions

  // Session Settings
  maxSessionsPerUser: number;
  sessionTimeoutMinutes: number;

  // Skill Settings
  skillsEnabled: boolean;
  allowUserSkillInstall: boolean;

  // Branding
  customBranding?: {
    appName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

export interface GlobalSettingEntry {
  key: string;
  value: string; // JSON serialized value
  description?: string;
  updatedBy: string | null;
  updatedAt: Date;
}

// Default values for global settings
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  allowRegistration: true,
  requireEmailVerification: false,
  maxUsersAllowed: 100,
  defaultApiProvider: 'anthropic',
  allowUserApiKeys: true,
  requireApiKey: false,
  maxSessionsPerUser: 10,
  sessionTimeoutMinutes: 60,
  skillsEnabled: true,
  allowUserSkillInstall: true,
};

// ============================================================================
// OAuth Tokens (for future OAuth support)
// ============================================================================

export type OAuthProvider = 'anthropic' | 'openai' | 'github';

export interface OAuthToken {
  id: string;
  userId: string;
  provider: OAuthProvider;
  accessToken: string; // Encrypted
  refreshToken?: string; // Encrypted
  tokenType: string;
  expiresAt: Date | null;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthTokenCreate {
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  scopes?: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiKeyListResponse {
  apiKeys: ApiKey[];
  total: number;
}

export interface UserSettingsResponse {
  settings: UserSettings;
}

export interface GlobalSettingsResponse {
  settings: GlobalSettings;
  lastUpdated: Date;
}

export interface ApiKeyVerifyResponse {
  valid: boolean;
  provider: ApiKeyProvider;
  error?: string;
}
