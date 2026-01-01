import type { ClaudeArgsConfig } from '@/types/settings';

/**
 * Validate ClaudeArgsConfig
 * Returns an error message if invalid, null if valid
 */
export function validateClaudeArgsConfig(config: ClaudeArgsConfig): string | null {
  // Validate permission mode
  if (config.permissionMode) {
    const validModes = ['default', 'plan', 'auto-edit', 'full-auto'];
    if (!validModes.includes(config.permissionMode)) {
      return `Invalid permission mode: ${config.permissionMode}`;
    }
  }

  // Validate model format (basic check)
  if (config.model && typeof config.model !== 'string') {
    return 'Model must be a string';
  }

  // Validate arrays
  if (config.allowedTools && !Array.isArray(config.allowedTools)) {
    return 'allowedTools must be an array';
  }

  if (config.disallowedTools && !Array.isArray(config.disallowedTools)) {
    return 'disallowedTools must be an array';
  }

  if (config.mcpServers && !Array.isArray(config.mcpServers)) {
    return 'mcpServers must be an array';
  }

  if (config.customArgs && !Array.isArray(config.customArgs)) {
    return 'customArgs must be an array';
  }

  // Validate numeric fields (use Number.isFinite to handle NaN)
  if (config.maxTurns !== undefined && (!Number.isFinite(config.maxTurns) || config.maxTurns < 1)) {
    return 'maxTurns must be a positive number';
  }

  if (config.contextWindow !== undefined && (!Number.isFinite(config.contextWindow) || config.contextWindow < 1000)) {
    return 'contextWindow must be a number >= 1000';
  }

  // Validate output format
  if (config.outputFormat) {
    const validFormats = ['text', 'json', 'stream-json'];
    if (!validFormats.includes(config.outputFormat)) {
      return `Invalid output format: ${config.outputFormat}`;
    }
  }

  return null;
}
