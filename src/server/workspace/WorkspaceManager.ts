import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/user/workspace';

class WorkspaceManager {
  private workspacesRoot: string;

  constructor() {
    this.workspacesRoot = path.join(WORKSPACE_ROOT, 'workspaces');
  }

  /**
   * Get the filesystem path for a workspace
   */
  getWorkspacePath(ownerId: string, slug: string): string {
    return path.join(this.workspacesRoot, ownerId, slug);
  }

  /**
   * Validate that a path is within the workspaces directory
   */
  validatePath(targetPath: string): boolean {
    const resolved = path.resolve(targetPath);
    return resolved.startsWith(this.workspacesRoot);
  }

  /**
   * Check if a workspace directory exists
   */
  async exists(ownerId: string, slug: string): Promise<boolean> {
    const wsPath = this.getWorkspacePath(ownerId, slug);
    try {
      await fs.access(wsPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create an empty workspace directory
   */
  async createEmpty(ownerId: string, slug: string): Promise<void> {
    const wsPath = this.getWorkspacePath(ownerId, slug);

    // Validate path is within allowed directory
    if (!this.validatePath(wsPath)) {
      throw new Error('Invalid workspace path');
    }

    // Create directory
    await fs.mkdir(wsPath, { recursive: true });

    // Create a basic README
    const readmePath = path.join(wsPath, 'README.md');
    const readmeContent = `# ${slug}

Created with Claude Code Cloud

## Getting Started

This workspace is ready for your project files.
`;
    await fs.writeFile(readmePath, readmeContent, 'utf-8');
  }

  /**
   * Create a workspace by cloning a git repository
   */
  async createFromGit(
    ownerId: string,
    slug: string,
    gitUrl: string,
    branch?: string
  ): Promise<void> {
    const resolvedGitUrl = this.buildGitUrl(gitUrl);
    const wsPath = this.getWorkspacePath(ownerId, slug);
    const parentDir = path.dirname(wsPath);

    // Validate path
    if (!this.validatePath(wsPath)) {
      throw new Error('Invalid workspace path');
    }

    // Ensure parent directory exists
    await fs.mkdir(parentDir, { recursive: true });

    // Build git clone arguments
    const args = ['clone'];
    if (branch) {
      args.push('-b', branch);
    }
    args.push('--depth', '1'); // Shallow clone for faster initial setup
    args.push(resolvedGitUrl, slug);

    // Execute git clone
    await this.execGit(parentDir, args);
  }

  /**
   * Delete a workspace directory
   */
  async delete(ownerId: string, slug: string): Promise<void> {
    const wsPath = this.getWorkspacePath(ownerId, slug);

    // Validate path
    if (!this.validatePath(wsPath)) {
      throw new Error('Invalid workspace path');
    }

    // Check if directory exists
    const exists = await this.exists(ownerId, slug);
    if (!exists) {
      return; // Already deleted, nothing to do
    }

    // Remove directory recursively
    await fs.rm(wsPath, { recursive: true, force: true });

    // Clean up empty parent directory if needed
    const parentDir = path.dirname(wsPath);
    try {
      const files = await fs.readdir(parentDir);
      if (files.length === 0) {
        await fs.rmdir(parentDir);
      }
    } catch {
      // Ignore errors when cleaning parent directory
    }
  }

  /**
   * Get information about a workspace directory
   */
  async getInfo(ownerId: string, slug: string): Promise<WorkspaceInfo | null> {
    const wsPath = this.getWorkspacePath(ownerId, slug);

    if (!this.validatePath(wsPath)) {
      return null;
    }

    try {
      const stats = await fs.stat(wsPath);
      if (!stats.isDirectory()) {
        return null;
      }

      // Check if it's a git repository
      const gitPath = path.join(wsPath, '.git');
      let isGitRepo = false;
      try {
        await fs.access(gitPath);
        isGitRepo = true;
      } catch {
        isGitRepo = false;
      }

      return {
        path: wsPath,
        isGitRepo,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Execute a git command
   */
  private execGit(cwd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`git ${args[0]} failed: ${stderr || stdout}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn git: ${err.message}`));
      });
    });
  }

  /**
   * Build git URL with optional credentials injected via env vars
   */
  private buildGitUrl(gitUrl: string): string {
    const token = process.env.GIT_CLONE_TOKEN;
    const username = process.env.GIT_CLONE_USERNAME || 'x-access-token';

    // Only inject token for HTTPS URLs when a token is provided
    try {
      const url = new URL(gitUrl);
      if (url.protocol.startsWith('http') && token) {
        url.username = encodeURIComponent(username);
        url.password = encodeURIComponent(token);
        return url.toString();
      }
    } catch {
      // If URL parsing fails (e.g., SSH format), return original
    }

    return gitUrl;
  }
}

export interface WorkspaceInfo {
  path: string;
  isGitRepo: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

// Singleton instance
export const workspaceManager = new WorkspaceManager();
