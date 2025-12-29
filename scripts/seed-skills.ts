/**
 * Seed default skills into the database
 *
 * Run with: npx ts-node --project tsconfig.server.json scripts/seed-skills.ts
 * Or: npx tsx scripts/seed-skills.ts
 */

import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';

// Database path configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db/claude-cloud.db');

// Default skills to seed
const defaultSkills = [
  {
    name: 'git-helper',
    displayName: 'Git Helper',
    description: 'Git command helper skill. Provides assistance with Git operations including commit messages, branch management, PR creation, and conflict resolution.',
    version: '1.0.0',
    author: 'Claude Code',
    category: 'git',
    dependencies: [],
    isSystem: true,
    keywords: ['git', 'commit', 'branch', 'pr', 'merge', 'version control'],
  },
  {
    name: 'jest-runner',
    displayName: 'Jest Runner',
    description: 'Test runner skill for Jest. Helps execute tests, analyze results, generate test cases, and improve code coverage.',
    version: '1.0.0',
    author: 'Claude Code',
    category: 'test',
    dependencies: [],
    isSystem: true,
    keywords: ['jest', 'test', 'testing', 'unit test', 'coverage', 'tdd'],
  },
  {
    name: 'markdown-writer',
    displayName: 'Markdown Writer',
    description: 'Document generation skill. Creates well-formatted markdown documentation including READMEs, API docs, and technical specifications.',
    version: '1.0.0',
    author: 'Claude Code',
    category: 'docs',
    dependencies: [],
    isSystem: true,
    keywords: ['markdown', 'docs', 'documentation', 'readme', 'writing'],
  },
  {
    name: 'docker-helper',
    displayName: 'Docker Helper',
    description: 'Docker management skill. Assists with Dockerfile creation, docker-compose configuration, container debugging, and deployment optimization.',
    version: '1.0.0',
    author: 'Claude Code',
    category: 'devops',
    dependencies: [],
    isSystem: true,
    keywords: ['docker', 'container', 'dockerfile', 'compose', 'deployment', 'devops'],
  },
  {
    name: 'code-refactor',
    displayName: 'Code Refactor',
    description: 'Code refactoring assistant. Identifies code smells, suggests improvements, and helps with systematic refactoring of large codebases.',
    version: '1.0.0',
    author: 'Claude Code',
    category: 'code',
    dependencies: [],
    isSystem: false,
    keywords: ['refactor', 'clean code', 'code quality', 'improvement', 'optimization'],
  },
  {
    name: 'api-designer',
    displayName: 'API Designer',
    description: 'REST API design skill. Helps design RESTful APIs with proper endpoints, schemas, validation, and OpenAPI/Swagger documentation.',
    version: '1.0.0',
    author: 'Claude Code',
    category: 'code',
    dependencies: [],
    isSystem: false,
    keywords: ['api', 'rest', 'openapi', 'swagger', 'design', 'schema'],
  },
  {
    name: 'debug-assistant',
    displayName: 'Debug Assistant',
    description: 'Debugging helper skill. Assists with analyzing error messages, stack traces, and identifying root causes of bugs.',
    version: '1.0.0',
    author: 'Claude Code',
    category: 'utility',
    dependencies: [],
    isSystem: false,
    keywords: ['debug', 'error', 'bug', 'troubleshoot', 'fix', 'stack trace'],
  },
  {
    name: 'ai-prompt-helper',
    displayName: 'AI Prompt Helper',
    description: 'AI prompt engineering skill. Helps craft effective prompts for various AI models and use cases.',
    version: '1.0.0',
    author: 'Claude Code',
    category: 'ai',
    dependencies: [],
    isSystem: false,
    keywords: ['ai', 'prompt', 'llm', 'gpt', 'claude', 'engineering'],
  },
];

function seedSkills() {
  console.log('Seeding default skills...');
  console.log(`Database path: ${DB_PATH}`);

  // Ensure directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
  }

  const db = new Database(DB_PATH);

  try {
    db.pragma('journal_mode = WAL');

    // Create table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS skill_registry (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT,
        description TEXT,
        version TEXT,
        author TEXT,
        category TEXT DEFAULT 'general',
        dependencies TEXT DEFAULT '[]',
        is_system INTEGER DEFAULT 0,
        keywords TEXT DEFAULT '[]',
        file_hash TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_skill_registry_name ON skill_registry(name);
      CREATE INDEX IF NOT EXISTS idx_skill_registry_category ON skill_registry(category);
    `);

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO skill_registry (
        id, name, display_name, description, version, author,
        category, dependencies, is_system, keywords, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const checkStmt = db.prepare(`SELECT id, created_at FROM skill_registry WHERE name = ?`);

    let added = 0;
    let updated = 0;

    for (const skill of defaultSkills) {
      const now = new Date().toISOString();
      const existing = checkStmt.get(skill.name) as { id: string; created_at: string } | undefined;

      if (existing) {
        // Update existing skill, preserving created_at
        insertStmt.run(
          existing.id,
          skill.name,
          skill.displayName,
          skill.description,
          skill.version,
          skill.author,
          skill.category,
          JSON.stringify(skill.dependencies),
          skill.isSystem ? 1 : 0,
          JSON.stringify(skill.keywords),
          existing.created_at, // Preserve original created_at
          now
        );
        updated++;
        console.log(`  Updated: ${skill.displayName}`);
      } else {
        // Insert new skill
        const id = nanoid(12);
        insertStmt.run(
          id,
          skill.name,
          skill.displayName,
          skill.description,
          skill.version,
          skill.author,
          skill.category,
          JSON.stringify(skill.dependencies),
          skill.isSystem ? 1 : 0,
          JSON.stringify(skill.keywords),
          now,
          now
        );
        added++;
        console.log(`  Added: ${skill.displayName}`);
      }
    }

    console.log(`\nSeed completed: ${added} added, ${updated} updated`);
  } finally {
    db.close();
  }
}

// Run seed
try {
  seedSkills();
} catch (error) {
  console.error('Seed failed:', error);
  process.exit(1);
}
