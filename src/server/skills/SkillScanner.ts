import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import yaml from 'js-yaml';
import type { SkillFile, SkillMetadata, SkillCategory } from '@/types/skill';

// Skills directory configuration
const CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '~', '.claude');
const SKILLS_DIR = path.join(CLAUDE_CONFIG_DIR, 'skills');

/**
 * Parse YAML frontmatter from markdown content using js-yaml
 */
function parseFrontmatter(content: string): { metadata: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  try {
    const metadata = yaml.load(yamlContent) as Record<string, unknown>;
    return { metadata: metadata || {}, body };
  } catch (error) {
    console.error('Failed to parse YAML frontmatter:', error);
    return { metadata: {}, body };
  }
}

/**
 * Convert raw metadata to typed SkillMetadata
 */
function toSkillMetadata(raw: Record<string, unknown>): SkillMetadata {
  const validCategories: SkillCategory[] = ['git', 'code', 'ai', 'utility', 'devops', 'docs', 'test', 'general'];

  const category = raw.category as string | undefined;
  const validCategory = category && validCategories.includes(category as SkillCategory)
    ? (category as SkillCategory)
    : 'general';

  return {
    name: raw.name as string | undefined,
    displayName: (raw.displayName || raw.display_name || raw['display-name']) as string | undefined,
    description: raw.description as string | undefined,
    version: raw.version as string | undefined,
    author: raw.author as string | undefined,
    category: validCategory,
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    triggers: Array.isArray(raw.triggers) ? raw.triggers : [],
  };
}

/**
 * Calculate file hash for change detection
 */
function calculateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Scan a single skill directory
 */
function scanSkillDirectory(skillDir: string, baseDir: string): SkillFile | null {
  const skillMdPath = path.join(skillDir, 'skill.md');

  if (!fs.existsSync(skillMdPath)) {
    // Also check for index.md
    const indexMdPath = path.join(skillDir, 'index.md');
    if (!fs.existsSync(indexMdPath)) {
      return null;
    }
    return parseSkillFile(indexMdPath, baseDir);
  }

  return parseSkillFile(skillMdPath, baseDir);
}

/**
 * Parse a skill markdown file
 */
function parseSkillFile(filePath: string, baseDir: string): SkillFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { metadata: rawMetadata, body } = parseFrontmatter(content);
    const metadata = toSkillMetadata(rawMetadata);

    // Derive name from directory if not specified
    const skillDir = path.dirname(filePath);
    const dirName = path.basename(skillDir);
    const name = metadata.name || dirName;

    // Derive display name from name if not specified
    const displayName = metadata.displayName ||
      name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    // Extract description from first paragraph if not in frontmatter
    let description = metadata.description;
    if (!description) {
      const firstParagraph = body.trim().split('\n\n')[0];
      if (firstParagraph && !firstParagraph.startsWith('#')) {
        description = firstParagraph.substring(0, 200);
      }
    }

    return {
      name,
      path: filePath,
      relativePath: path.relative(baseDir, skillDir),
      content,
      metadata: {
        ...metadata,
        name,
        displayName,
        description,
      },
      hash: calculateHash(content),
    };
  } catch (error) {
    console.error(`Failed to parse skill file: ${filePath}`, error);
    return null;
  }
}

/**
 * SkillScanner - Scans and parses skill files from the skills directory
 */
class SkillScanner {
  private skillsDir: string;

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir || SKILLS_DIR;
  }

  /**
   * Get the skills directory path
   */
  getSkillsDir(): string {
    return this.skillsDir;
  }

  /**
   * Check if skills directory exists
   */
  skillsDirExists(): boolean {
    return fs.existsSync(this.skillsDir);
  }

  /**
   * Scan all skills in the skills directory
   */
  scanAll(): SkillFile[] {
    if (!this.skillsDirExists()) {
      console.log(`Skills directory not found: ${this.skillsDir}`);
      return [];
    }

    const skills: SkillFile[] = [];
    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

      const skillDir = path.join(this.skillsDir, entry.name);
      const skillFile = scanSkillDirectory(skillDir, this.skillsDir);

      if (skillFile) {
        skills.push(skillFile);
      }
    }

    return skills;
  }

  /**
   * Scan a specific skill by name
   */
  scanSkill(name: string): SkillFile | null {
    const skillDir = path.join(this.skillsDir, name);

    if (!fs.existsSync(skillDir)) {
      return null;
    }

    return scanSkillDirectory(skillDir, this.skillsDir);
  }

  /**
   * Get skill content by name
   */
  getSkillContent(name: string): string | null {
    const skillFile = this.scanSkill(name);
    return skillFile?.content || null;
  }

  /**
   * Get skill file path
   */
  getSkillPath(name: string): string {
    return path.join(this.skillsDir, name);
  }

  /**
   * List skill names
   */
  listSkillNames(): string[] {
    if (!this.skillsDirExists()) {
      return [];
    }

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    return entries
      .filter((entry) => {
        if (!entry.isDirectory()) return false;
        if (entry.name.startsWith('.') || entry.name.startsWith('_')) return false;

        // Check if skill.md or index.md exists
        const skillMdPath = path.join(this.skillsDir, entry.name, 'skill.md');
        const indexMdPath = path.join(this.skillsDir, entry.name, 'index.md');
        return fs.existsSync(skillMdPath) || fs.existsSync(indexMdPath);
      })
      .map((entry) => entry.name);
  }

  /**
   * Watch skills directory for changes
   */
  watch(callback: (event: string, filename: string | null) => void): fs.FSWatcher | null {
    if (!this.skillsDirExists()) {
      console.warn(`Cannot watch skills directory: ${this.skillsDir} does not exist`);
      return null;
    }

    return fs.watch(this.skillsDir, { recursive: true, encoding: 'utf8' }, callback);
  }
}

// Default scanner instance
export const skillScanner = new SkillScanner();

// Export class for custom instances
export { SkillScanner };
