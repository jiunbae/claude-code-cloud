import fs from 'fs/promises';
import path from 'path';
import { getClaudeConfigDir } from '../session/CredentialResolver';

export interface ClaudeConfigFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: Date;
  content?: string;
}

export interface ClaudeSettings {
  // User preferences
  theme?: string;
  model?: string;

  // MCP servers configuration
  mcpServers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;

  // Permission settings
  permissions?: {
    allowRead?: boolean;
    allowWrite?: boolean;
    allowBash?: boolean;
    allowedPaths?: string[];
    disallowedPaths?: string[];
  };

  // Custom settings
  [key: string]: unknown;
}

export interface SkillMetadata {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  enabled: boolean;
}

/**
 * Manager for Claude configuration directory
 * Handles files in ~/.claude/ directory (user-specific)
 */
class ClaudeConfigManager {
  /**
   * Get the config directory path for a user
   */
  getConfigDir(userId: string): string {
    return getClaudeConfigDir(userId);
  }

  /**
   * Ensure config directory exists
   */
  async ensureConfigDir(userId: string): Promise<void> {
    const configDir = this.getConfigDir(userId);
    await fs.mkdir(configDir, { recursive: true });

    // Also ensure common subdirectories exist
    const subdirs = ['skills', 'logs'];
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(configDir, subdir), { recursive: true });
    }
  }

  /**
   * List files in the config directory
   */
  async listFiles(userId: string, subPath: string = ''): Promise<ClaudeConfigFile[]> {
    const configDir = this.getConfigDir(userId);
    const targetDir = subPath ? path.join(configDir, subPath) : configDir;

    // Ensure we're not escaping the config directory
    const normalizedTarget = path.normalize(targetDir);
    if (!normalizedTarget.startsWith(configDir)) {
      throw new Error('Invalid path: Cannot access files outside config directory');
    }

    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const files: ClaudeConfigFile[] = [];

      for (const entry of entries) {
        const filePath = path.join(subPath || '.', entry.name);
        const fullPath = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            path: filePath,
            type: 'directory',
          });
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: filePath,
            type: 'file',
            size: stats.size,
            modifiedAt: stats.mtime,
          });
        }
      }

      return files.sort((a, b) => {
        // Directories first, then alphabetically
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        await this.ensureConfigDir(userId);
        return [];
      }
      throw error;
    }
  }

  /**
   * Read a file from the config directory
   */
  async readFile(userId: string, filePath: string): Promise<string> {
    const configDir = this.getConfigDir(userId);
    const fullPath = path.join(configDir, filePath);

    // Security check
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(configDir)) {
      throw new Error('Invalid path: Cannot access files outside config directory');
    }

    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Write a file to the config directory
   */
  async writeFile(userId: string, filePath: string, content: string): Promise<void> {
    const configDir = this.getConfigDir(userId);
    const fullPath = path.join(configDir, filePath);

    // Security check
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(configDir)) {
      throw new Error('Invalid path: Cannot write files outside config directory');
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    await fs.mkdir(parentDir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * Delete a file from the config directory
   */
  async deleteFile(userId: string, filePath: string): Promise<void> {
    const configDir = this.getConfigDir(userId);
    const fullPath = path.join(configDir, filePath);

    // Security check
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(configDir)) {
      throw new Error('Invalid path: Cannot delete files outside config directory');
    }

    // Don't allow deleting the root config directory
    if (normalizedPath === configDir) {
      throw new Error('Cannot delete root config directory');
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
  }

  /**
   * Create a directory in the config directory
   */
  async createDirectory(userId: string, dirPath: string): Promise<void> {
    const configDir = this.getConfigDir(userId);
    const fullPath = path.join(configDir, dirPath);

    // Security check
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(configDir)) {
      throw new Error('Invalid path: Cannot create directories outside config directory');
    }

    await fs.mkdir(fullPath, { recursive: true });
  }

  /**
   * Get Claude settings (settings.json)
   */
  async getSettings(userId: string): Promise<ClaudeSettings | null> {
    try {
      const content = await this.readFile(userId, 'settings.json');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Save Claude settings
   */
  async saveSettings(userId: string, settings: ClaudeSettings): Promise<void> {
    await this.writeFile(userId, 'settings.json', JSON.stringify(settings, null, 2));
  }

  /**
   * Get CLAUDE.md content
   */
  async getClaudeMd(userId: string): Promise<string | null> {
    try {
      return await this.readFile(userId, 'CLAUDE.md');
    } catch {
      return null;
    }
  }

  /**
   * Save CLAUDE.md content
   */
  async saveClaudeMd(userId: string, content: string): Promise<void> {
    await this.writeFile(userId, 'CLAUDE.md', content);
  }

  /**
   * List installed skills
   */
  async listSkills(userId: string): Promise<SkillMetadata[]> {
    const configDir = this.getConfigDir(userId);
    const skillsDir = path.join(configDir, 'skills');

    try {
      const entries = await fs.readdir(skillsDir, { withFileTypes: true });
      const skills: SkillMetadata[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name);
          const metadataPath = path.join(skillPath, 'metadata.json');

          try {
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
            skills.push({
              name: entry.name,
              description: metadata.description,
              version: metadata.version,
              author: metadata.author,
              enabled: metadata.enabled !== false,
            });
          } catch {
            // Skill without metadata
            skills.push({
              name: entry.name,
              enabled: true,
            });
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Single-file skill
          skills.push({
            name: entry.name.replace('.md', ''),
            enabled: true,
          });
        }
      }

      return skills;
    } catch {
      return [];
    }
  }

  /**
   * Install a skill from content
   */
  async installSkill(
    userId: string,
    skillName: string,
    content: string,
    metadata?: Partial<SkillMetadata>
  ): Promise<void> {
    const configDir = this.getConfigDir(userId);
    const skillsDir = path.join(configDir, 'skills');

    // Validate skill name (alphanumeric, dash, underscore only)
    if (!/^[a-zA-Z0-9_-]+$/.test(skillName)) {
      throw new Error('Invalid skill name. Use only alphanumeric characters, dashes, and underscores.');
    }

    // Ensure skills directory exists using our safe method
    await this.createDirectory(userId, 'skills');

    // Check if it's a simple markdown skill or a directory-based skill
    if (content.trim().startsWith('{')) {
      // JSON content - treat as directory-based skill
      const skillRelativePath = path.join('skills', skillName);
      await this.createDirectory(userId, skillRelativePath);

      let parsedContent: { files?: Record<string, unknown> };
      try {
        parsedContent = JSON.parse(content);
      } catch {
        throw new Error('Invalid skill content: must be valid JSON for directory-based skills');
      }
      for (const [filename, fileContent] of Object.entries(parsedContent.files || {})) {
        // Sanitize filename to prevent path traversal - use only the base name
        const safeFilename = path.basename(filename);
        if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
          throw new Error(`Invalid filename in skill content: ${filename}`);
        }
        // Validate that fileContent is a string
        if (typeof fileContent !== 'string') {
          throw new Error(`Invalid content for file ${filename} in skill package. Content must be a string.`);
        }
        const fileRelativePath = path.join(skillRelativePath, safeFilename);
        await this.writeFile(userId, fileRelativePath, fileContent);
      }

      // Save metadata using safe method
      if (metadata) {
        const metadataPath = path.join(skillRelativePath, 'metadata.json');
        await this.writeFile(
          userId,
          metadataPath,
          JSON.stringify({ ...metadata, name: skillName, enabled: true }, null, 2)
        );
      }
    } else {
      // Markdown content - save as single file skill using safe method
      const fileRelativePath = path.join('skills', `${skillName}.md`);
      await this.writeFile(userId, fileRelativePath, content);
    }
  }

  /**
   * Uninstall a skill
   */
  async uninstallSkill(userId: string, skillName: string): Promise<void> {
    // Validate skill name to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(skillName)) {
      throw new Error('Invalid skill name. Use only alphanumeric characters, dashes, and underscores.');
    }

    const configDir = this.getConfigDir(userId);
    const skillsDir = path.join(configDir, 'skills');

    // Try directory-based skill first
    const skillDir = path.join(skillsDir, skillName);
    try {
      const stats = await fs.stat(skillDir);
      if (stats.isDirectory()) {
        await fs.rm(skillDir, { recursive: true });
        return;
      }
    } catch {
      // Not a directory
    }

    // Try single-file skill
    const skillFile = path.join(skillsDir, `${skillName}.md`);
    try {
      await fs.unlink(skillFile);
    } catch {
      throw new Error(`Skill '${skillName}' not found`);
    }
  }

  /**
   * Enable or disable a skill
   */
  async setSkillEnabled(userId: string, skillName: string, enabled: boolean): Promise<void> {
    // Validate skill name to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(skillName)) {
      throw new Error('Invalid skill name');
    }

    const configDir = this.getConfigDir(userId);
    const skillDir = path.join(configDir, 'skills', skillName);
    const metadataRelativePath = path.join('skills', skillName, 'metadata.json');

    try {
      const content = await this.readFile(userId, metadataRelativePath);
      const metadata = JSON.parse(content);
      metadata.enabled = enabled;
      await this.writeFile(userId, metadataRelativePath, JSON.stringify(metadata, null, 2));
    } catch {
      // Create metadata file for directory-based skills
      const stats = await fs.stat(skillDir);
      if (stats.isDirectory()) {
        await this.writeFile(
          userId,
          metadataRelativePath,
          JSON.stringify({ name: skillName, enabled }, null, 2)
        );
      } else {
        throw new Error(`Cannot set enabled state for single-file skill '${skillName}'`);
      }
    }
  }

  /**
   * Get full config directory summary
   */
  async getConfigSummary(userId: string): Promise<{
    hasSettings: boolean;
    hasClaudeMd: boolean;
    skillCount: number;
    totalSize: number;
  }> {
    const configDir = this.getConfigDir(userId);

    let hasSettings = false;
    let hasClaudeMd = false;
    let skillCount = 0;
    let totalSize = 0;

    try {
      await fs.access(path.join(configDir, 'settings.json'));
      hasSettings = true;
    } catch {
      // No settings file
    }

    try {
      await fs.access(path.join(configDir, 'CLAUDE.md'));
      hasClaudeMd = true;
    } catch {
      // No CLAUDE.md file
    }

    const skills = await this.listSkills(userId);
    skillCount = skills.length;

    // Calculate total size
    const calculateDirSize = async (dirPath: string): Promise<number> => {
      let size = 0;
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            size += stats.size;
          } else if (entry.isDirectory()) {
            size += await calculateDirSize(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
      return size;
    };

    totalSize = await calculateDirSize(configDir);

    return {
      hasSettings,
      hasClaudeMd,
      skillCount,
      totalSize,
    };
  }
}

// Singleton instance
export const claudeConfigManager = new ClaudeConfigManager();
