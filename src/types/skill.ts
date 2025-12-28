/**
 * Skill Types for Claude Code Cloud
 *
 * Skills are markdown files that extend Claude's capabilities with
 * specialized knowledge and workflows.
 */

// ============================================================================
// Skill Categories
// ============================================================================

export type SkillCategory =
  | 'git'        // Git-related operations (commit, pr, branch)
  | 'code'       // Code generation and manipulation
  | 'ai'         // AI/ML related skills
  | 'utility'    // General utilities (file, text processing)
  | 'devops'     // CI/CD, deployment, infrastructure
  | 'docs'       // Documentation generation
  | 'test'       // Testing related
  | 'general';   // Uncategorized

// ============================================================================
// Skill Registry (Global)
// ============================================================================

/**
 * Skill metadata stored in the global registry
 */
export interface Skill {
  id: string;
  name: string;           // Unique identifier (directory name)
  displayName: string;    // Human-readable name
  description: string;
  version?: string;
  author?: string;
  category: SkillCategory;
  dependencies: string[]; // Other skills this depends on
  isSystem: boolean;      // Built-in system skill
  keywords: string[];     // For search
  fileHash?: string;      // For change detection
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillCreate {
  name: string;
  displayName: string;
  description: string;
  version?: string;
  author?: string;
  category?: SkillCategory;
  dependencies?: string[];
  isSystem?: boolean;
  keywords?: string[];
}

// ============================================================================
// User Skills
// ============================================================================

/**
 * User's installed skill with their configuration
 */
export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;        // Reference to skill registry
  skillName: string;      // Denormalized for quick access
  skillPath: string;      // Relative path in skills directory
  isEnabled: boolean;
  config: SkillConfig;    // User-specific configuration
  installedAt: Date;
  updatedAt: Date;
}

/**
 * Skill with full registry info plus user's installation status
 */
export interface UserSkillWithDetails extends Skill {
  isInstalled: boolean;
  isEnabled: boolean;
  config: SkillConfig;
  installedAt?: Date;
}

export interface SkillConfig {
  [key: string]: unknown;
}

export interface UserSkillCreate {
  skillName: string;
  config?: SkillConfig;
}

export interface UserSkillUpdate {
  isEnabled?: boolean;
  config?: SkillConfig;
}

// ============================================================================
// Skill File Structure
// ============================================================================

/**
 * Parsed skill file content
 */
export interface SkillFile {
  name: string;
  path: string;           // Full path
  relativePath: string;   // Relative to skills directory
  content: string;
  metadata: SkillMetadata;
  hash: string;
}

/**
 * Metadata extracted from skill.md frontmatter
 */
export interface SkillMetadata {
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  author?: string;
  category?: SkillCategory;
  dependencies?: string[];
  keywords?: string[];
  triggers?: string[];    // Keywords that activate this skill
}

// ============================================================================
// Skill Sync Status
// ============================================================================

export interface SkillSyncResult {
  added: string[];
  updated: string[];
  removed: string[];
  errors: SkillSyncError[];
  totalScanned: number;
  timestamp: Date;
}

export interface SkillSyncError {
  skillPath: string;
  error: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SkillListResponse {
  skills: Skill[];
  total: number;
}

export interface UserSkillListResponse {
  skills: UserSkillWithDetails[];
  total: number;
}

export interface SkillInstallResponse {
  success: boolean;
  skill: UserSkill;
}

export interface SkillSyncResponse {
  result: SkillSyncResult;
}

// ============================================================================
// Skill Discovery
// ============================================================================

/**
 * Search filters for skill discovery
 */
export interface SkillSearchParams {
  query?: string;
  category?: SkillCategory;
  author?: string;
  isSystem?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Skill recommendation based on context
 */
export interface SkillRecommendation {
  skill: Skill;
  score: number;          // Relevance score 0-1
  reason: string;         // Why this skill is recommended
}
