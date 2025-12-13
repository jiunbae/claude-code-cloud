import { watch, type FSWatcher } from 'chokidar';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: Date;
  children?: FileNode[];
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  relativePath: string;
}

type ChangeListener = (event: FileChangeEvent) => void;

class FileSystemManager {
  private watchers: Map<string, FSWatcher> = new Map();
  private listeners: Map<string, Set<ChangeListener>> = new Map();
  private allowedRoots: Set<string> = new Set();

  constructor() {
    const workspaceRoot = process.env.WORKSPACE_ROOT || '/home/user/workspace';
    this.allowedRoots.add(path.resolve(workspaceRoot));
  }

  // Validate path is within allowed roots
  private validatePath(targetPath: string): string {
    const resolved = path.resolve(targetPath);

    for (const root of this.allowedRoots) {
      if (resolved.startsWith(root)) {
        return resolved;
      }
    }

    throw new Error(`Access denied: Path ${targetPath} is outside allowed directories`);
  }

  // Get directory tree
  async getTree(rootPath: string, depth: number = 3): Promise<FileNode> {
    const validPath = this.validatePath(rootPath);
    return this.buildTree(validPath, depth, 0);
  }

  private async buildTree(currentPath: string, maxDepth: number, currentDepth: number): Promise<FileNode> {
    const stat = await fs.stat(currentPath);
    const name = path.basename(currentPath);

    const node: FileNode = {
      name,
      path: currentPath,
      type: stat.isDirectory() ? 'directory' : 'file',
      size: stat.size,
      modifiedAt: stat.mtime,
    };

    if (stat.isDirectory() && currentDepth < maxDepth) {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        // Filter out hidden files and common ignore patterns
        const filtered = entries.filter(entry => {
          const name = entry.name;
          if (name.startsWith('.')) return false;
          if (name === 'node_modules') return false;
          if (name === '__pycache__') return false;
          if (name === '.git') return false;
          return true;
        });

        // Sort: directories first, then alphabetically
        filtered.sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });

        node.children = await Promise.all(
          filtered.map(entry =>
            this.buildTree(path.join(currentPath, entry.name), maxDepth, currentDepth + 1)
          )
        );
      } catch (error) {
        // Permission denied or other errors
        node.children = [];
      }
    }

    return node;
  }

  // List files matching pattern
  async listFiles(rootPath: string, pattern: string = '**/*'): Promise<string[]> {
    const validPath = this.validatePath(rootPath);

    const files = await fg(pattern, {
      cwd: validPath,
      ignore: ['**/node_modules/**', '**/.git/**', '**/.*'],
      dot: false,
      onlyFiles: true,
    });

    return files.map(f => path.join(validPath, f));
  }

  // Read file content
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const validPath = this.validatePath(filePath);

    const stat = await fs.stat(validPath);

    // Limit file size to 1MB
    if (stat.size > 1024 * 1024) {
      throw new Error('File too large (max 1MB)');
    }

    return fs.readFile(validPath, { encoding });
  }

  // Read file as buffer
  async readFileBuffer(filePath: string): Promise<Buffer> {
    const validPath = this.validatePath(filePath);

    const stat = await fs.stat(validPath);

    // Limit file size to 5MB for binary
    if (stat.size > 5 * 1024 * 1024) {
      throw new Error('File too large (max 5MB)');
    }

    return fs.readFile(validPath);
  }

  // Get file info
  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size: number;
    modifiedAt: Date;
    isDirectory: boolean;
    mimeType: string;
  }> {
    const validPath = this.validatePath(filePath);

    try {
      const stat = await fs.stat(validPath);
      return {
        exists: true,
        size: stat.size,
        modifiedAt: stat.mtime,
        isDirectory: stat.isDirectory(),
        mimeType: this.getMimeType(validPath),
      };
    } catch {
      return {
        exists: false,
        size: 0,
        modifiedAt: new Date(),
        isDirectory: false,
        mimeType: 'application/octet-stream',
      };
    }
  }

  // Start watching a directory
  startWatching(sessionId: string, rootPath: string): void {
    const validPath = this.validatePath(rootPath);

    if (this.watchers.has(sessionId)) {
      return;
    }

    const watcher = watch(validPath, {
      ignored: /(^|[\/\\])(\.|node_modules|\.git)/,
      persistent: true,
      ignoreInitial: true,
      depth: 10,
    });

    const handleEvent = (type: FileChangeEvent['type']) => (filePath: string) => {
      const event: FileChangeEvent = {
        type,
        path: filePath,
        relativePath: path.relative(validPath, filePath),
      };

      const listeners = this.listeners.get(sessionId);
      if (listeners) {
        listeners.forEach(listener => listener(event));
      }
    };

    watcher.on('add', handleEvent('add'));
    watcher.on('change', handleEvent('change'));
    watcher.on('unlink', handleEvent('unlink'));
    watcher.on('addDir', handleEvent('addDir'));
    watcher.on('unlinkDir', handleEvent('unlinkDir'));

    this.watchers.set(sessionId, watcher);
    this.listeners.set(sessionId, new Set());
  }

  // Stop watching
  stopWatching(sessionId: string): void {
    const watcher = this.watchers.get(sessionId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sessionId);
      this.listeners.delete(sessionId);
    }
  }

  // Add change listener
  addListener(sessionId: string, listener: ChangeListener): void {
    const listeners = this.listeners.get(sessionId);
    if (listeners) {
      listeners.add(listener);
    }
  }

  // Remove change listener
  removeListener(sessionId: string, listener: ChangeListener): void {
    const listeners = this.listeners.get(sessionId);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  // Get MIME type from extension
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.tsx': 'text/typescript',
      '.jsx': 'text/javascript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.py': 'text/x-python',
      '.rs': 'text/x-rust',
      '.go': 'text/x-go',
      '.java': 'text/x-java',
      '.c': 'text/x-c',
      '.cpp': 'text/x-c++',
      '.h': 'text/x-c',
      '.hpp': 'text/x-c++',
      '.yml': 'text/yaml',
      '.yaml': 'text/yaml',
      '.xml': 'text/xml',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Add allowed root
  addAllowedRoot(rootPath: string): void {
    this.allowedRoots.add(path.resolve(rootPath));
  }

  // Close all watchers
  closeAll(): void {
    for (const [sessionId] of this.watchers) {
      this.stopWatching(sessionId);
    }
  }
}

// Singleton instance
export const fileSystemManager = new FileSystemManager();
