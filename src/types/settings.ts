/**
 * User and Global Settings Types
 */

// ============================================================================
// Claude CLI Args Configuration
// ============================================================================

/**
 * Permission mode for Claude CLI
 * - 'default': Uses Claude's default permission settings
 * - 'plan': Plan mode - Claude presents plan before execution
 * - 'auto-edit': Automatically approves file edits
 * - 'full-auto': Full autonomous mode (dangerous)
 */
export type ClaudePermissionMode = 'default' | 'plan' | 'auto-edit' | 'full-auto';

/**
 * Claude CLI arguments configuration
 * These map directly to claude CLI flags
 */
export interface ClaudeArgsConfig {
  // Model selection
  model?: string; // --model: claude-sonnet-4-20250514, claude-opus-4-20250514, etc.

  // Permission settings
  permissionMode?: ClaudePermissionMode; // --permission-mode

  // Tool restrictions
  allowedTools?: string[]; // --allowedTools: List of allowed tools
  disallowedTools?: string[]; // --disallowedTools: List of disallowed tools

  // MCP (Model Context Protocol) settings
  mcpServers?: string[]; // --mcp: MCP server configurations (JSON strings)

  // System prompt customization
  systemPrompt?: string; // --system-prompt: Custom system prompt
  appendSystemPrompt?: string; // --append-system-prompt: Append to default system prompt

  // Context & memory
  maxTurns?: number; // --max-turns: Maximum conversation turns
  contextWindow?: number; // Not a direct flag, but useful for configuration

  // Output settings
  verbose?: boolean; // --verbose: Enable verbose output
  outputFormat?: 'text' | 'json' | 'stream-json'; // --output-format

  // Additional custom args (for future CLI options)
  customArgs?: string[]; // Additional raw arguments to pass
}

/**
 * Default Claude args configuration
 */
export const DEFAULT_CLAUDE_ARGS: ClaudeArgsConfig = {
  permissionMode: 'default',
  allowedTools: [],
  disallowedTools: [],
  mcpServers: [],
  verbose: false,
};

/**
 * Predefined model options for UI selection
 */
export const CLAUDE_MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Latest)' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
] as const;

/**
 * Common Claude tools that can be allowed/disallowed
 */
export const CLAUDE_TOOLS = [
  { value: 'Read', label: 'Read - Read files', category: 'file' },
  { value: 'Write', label: 'Write - Create/overwrite files', category: 'file' },
  { value: 'Edit', label: 'Edit - Edit existing files', category: 'file' },
  { value: 'Bash', label: 'Bash - Execute shell commands', category: 'system' },
  { value: 'Glob', label: 'Glob - Find files by pattern', category: 'file' },
  { value: 'Grep', label: 'Grep - Search file contents', category: 'file' },
  { value: 'LS', label: 'LS - List directory contents', category: 'file' },
  { value: 'WebFetch', label: 'WebFetch - Fetch web content', category: 'network' },
  { value: 'WebSearch', label: 'WebSearch - Search the web', category: 'network' },
  { value: 'TodoRead', label: 'TodoRead - Read todo list', category: 'task' },
  { value: 'TodoWrite', label: 'TodoWrite - Write todo list', category: 'task' },
  { value: 'Task', label: 'Task - Launch sub-agents', category: 'agent' },
] as const;

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
  claudeArgs?: ClaudeArgsConfig; // User-specific Claude args (overrides global)
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
  claudeArgs?: ClaudeArgsConfig;
}

export interface UserSettingsUpdate {
  theme?: ThemeMode;
  language?: Language;
  defaultModel?: string;
  terminalFontSize?: number;
  editorFontSize?: number;
  autoSave?: boolean;
  claudeArgs?: ClaudeArgsConfig;
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

  // Claude CLI Args (Global Defaults)
  claudeArgs?: ClaudeArgsConfig;
  allowUserClaudeArgs: boolean; // Whether users can override Claude args
  allowSessionClaudeArgs: boolean; // Whether sessions can override Claude args

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
  claudeArgs: DEFAULT_CLAUDE_ARGS,
  allowUserClaudeArgs: true,
  allowSessionClaudeArgs: true,
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
