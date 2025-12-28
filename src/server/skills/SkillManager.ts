import { skillStore } from './SkillStore';
import { skillScanner, SkillScanner } from './SkillScanner';
import type {
  Skill,
  UserSkill,
  UserSkillWithDetails,
  UserSkillCreate,
  UserSkillUpdate,
  SkillSyncResult,
  SkillSyncError,
  SkillSearchParams,
  SkillConfig,
} from '@/types/skill';

/**
 * SkillManager - Orchestrates skill registry synchronization and user skill management
 */
class SkillManager {
  private scanner: SkillScanner;

  constructor(scanner?: SkillScanner) {
    this.scanner = scanner || skillScanner;
  }

  // ============================================================================
  // Registry Synchronization
  // ============================================================================

  /**
   * Synchronize skill registry with filesystem
   * Scans skills directory and updates database accordingly
   */
  async syncRegistry(): Promise<SkillSyncResult> {
    const result: SkillSyncResult = {
      added: [],
      updated: [],
      removed: [],
      errors: [],
      totalScanned: 0,
      timestamp: new Date(),
    };

    try {
      // Scan filesystem for skills
      const scannedSkills = this.scanner.scanAll();
      result.totalScanned = scannedSkills.length;

      // Get existing skills from registry
      const existingSkills = skillStore.getAllSkills();
      const existingNames = new Set(existingSkills.map((s) => s.name));
      const scannedNames = new Set(scannedSkills.map((s) => s.name));

      // Process scanned skills
      for (const skillFile of scannedSkills) {
        try {
          const existingSkill = skillStore.getSkillByName(skillFile.name);

          if (!existingSkill) {
            // New skill - add to registry
            skillStore.registerSkill({
              name: skillFile.name,
              displayName: skillFile.metadata.displayName || skillFile.name,
              description: skillFile.metadata.description || '',
              version: skillFile.metadata.version,
              author: skillFile.metadata.author,
              category: skillFile.metadata.category || 'general',
              dependencies: skillFile.metadata.dependencies || [],
              keywords: skillFile.metadata.keywords || [],
              isSystem: false,
            });
            result.added.push(skillFile.name);
          } else if (existingSkill.fileHash !== skillFile.hash) {
            // Existing skill with changes - update
            skillStore.updateSkill(skillFile.name, {
              displayName: skillFile.metadata.displayName || skillFile.name,
              description: skillFile.metadata.description || '',
              version: skillFile.metadata.version,
              author: skillFile.metadata.author,
              category: skillFile.metadata.category || 'general',
              dependencies: skillFile.metadata.dependencies || [],
              keywords: skillFile.metadata.keywords || [],
            });
            skillStore.updateSkillHash(skillFile.name, skillFile.hash);
            result.updated.push(skillFile.name);
          }
        } catch (error) {
          result.errors.push({
            skillPath: skillFile.path,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Remove skills that no longer exist on filesystem (non-system only)
      for (const existingName of existingNames) {
        if (!scannedNames.has(existingName)) {
          const skill = skillStore.getSkillByName(existingName);
          if (skill && !skill.isSystem) {
            skillStore.deleteSkill(existingName);
            result.removed.push(existingName);
          }
        }
      }
    } catch (error) {
      result.errors.push({
        skillPath: this.scanner.getSkillsDir(),
        error: error instanceof Error ? error.message : 'Failed to sync registry',
      });
    }

    return result;
  }

  // ============================================================================
  // Skill Registry Access
  // ============================================================================

  /**
   * Get all available skills
   */
  getAvailableSkills(params?: SkillSearchParams): Skill[] {
    return skillStore.getAllSkills(params);
  }

  /**
   * Get total count of skills matching filter criteria (for pagination)
   */
  getSkillCount(params?: SkillSearchParams): number {
    return skillStore.getFilteredSkillCount(params);
  }

  /**
   * Get skill by name
   */
  getSkill(name: string): Skill | null {
    return skillStore.getSkillByName(name);
  }

  /**
   * Get skill content (markdown)
   */
  getSkillContent(name: string): string | null {
    return this.scanner.getSkillContent(name);
  }

  /**
   * Search skills
   */
  searchSkills(query: string): Skill[] {
    return skillStore.getAllSkills({ query });
  }

  // ============================================================================
  // User Skill Management
  // ============================================================================

  /**
   * Get user's installed skills with full details
   */
  getUserSkillsWithDetails(userId: string): UserSkillWithDetails[] {
    const userSkills = skillStore.getUserSkills(userId);
    const allSkills = skillStore.getAllSkills();

    return allSkills.map((skill) => {
      const userSkill = userSkills.find((us) => us.skillName === skill.name);
      return {
        ...skill,
        isInstalled: !!userSkill,
        isEnabled: userSkill?.isEnabled ?? false,
        config: userSkill?.config ?? {},
        installedAt: userSkill?.installedAt,
      };
    });
  }

  /**
   * Get only user's installed skills
   */
  getUserSkills(userId: string): UserSkill[] {
    return skillStore.getUserSkills(userId);
  }

  /**
   * Get enabled skills for session
   */
  getEnabledSkillsForSession(userId: string): Skill[] {
    const enabledUserSkills = skillStore.getEnabledUserSkills(userId);
    return enabledUserSkills
      .map((us) => skillStore.getSkillByName(us.skillName))
      .filter((s): s is Skill => s !== null);
  }

  /**
   * Get skill contents for session prompt
   */
  getSkillContentsForSession(userId: string): { name: string; content: string }[] {
    const enabledSkills = this.getEnabledSkillsForSession(userId);
    return enabledSkills
      .map((skill) => {
        const content = this.scanner.getSkillContent(skill.name);
        if (!content) return null;
        return { name: skill.name, content };
      })
      .filter((s): s is { name: string; content: string } => s !== null);
  }

  /**
   * Install a skill for user
   */
  installSkill(userId: string, data: UserSkillCreate): UserSkill {
    // Verify skill exists in registry
    const skill = skillStore.getSkillByName(data.skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${data.skillName}`);
    }

    // Check if already installed
    if (skillStore.hasSkillInstalled(userId, data.skillName)) {
      throw new Error(`Skill already installed: ${data.skillName}`);
    }

    // Check dependencies
    if (skill.dependencies.length > 0) {
      const missingDeps = skill.dependencies.filter(
        (dep) => !skillStore.hasSkillInstalled(userId, dep)
      );
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
    }

    const skillPath = this.scanner.getSkillPath(data.skillName);
    return skillStore.installSkill(userId, data, skillPath);
  }

  /**
   * Uninstall a skill for user
   */
  uninstallSkill(userId: string, skillName: string): boolean {
    // Check if other installed skills depend on this
    const userSkills = skillStore.getUserSkills(userId);
    for (const userSkill of userSkills) {
      const skill = skillStore.getSkillByName(userSkill.skillName);
      if (skill && skill.dependencies.includes(skillName)) {
        throw new Error(
          `Cannot uninstall: ${userSkill.skillName} depends on ${skillName}`
        );
      }
    }

    return skillStore.uninstallSkill(userId, skillName);
  }

  /**
   * Toggle skill enabled state
   */
  toggleSkill(userId: string, skillName: string, enabled: boolean): UserSkill | null {
    return skillStore.updateUserSkill(userId, skillName, { isEnabled: enabled });
  }

  /**
   * Update skill configuration
   */
  updateSkillConfig(userId: string, skillName: string, config: SkillConfig): UserSkill | null {
    return skillStore.updateUserSkill(userId, skillName, { config });
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Install multiple skills at once
   */
  installSkills(userId: string, skillNames: string[]): { success: string[]; errors: SkillSyncError[] } {
    const success: string[] = [];
    const errors: SkillSyncError[] = [];

    for (const name of skillNames) {
      try {
        this.installSkill(userId, { skillName: name });
        success.push(name);
      } catch (error) {
        errors.push({
          skillPath: name,
          error: error instanceof Error ? error.message : 'Install failed',
        });
      }
    }

    return { success, errors };
  }

  /**
   * Enable all user skills
   */
  enableAllSkills(userId: string): void {
    const userSkills = skillStore.getUserSkills(userId);
    for (const skill of userSkills) {
      skillStore.updateUserSkill(userId, skill.skillName, { isEnabled: true });
    }
  }

  /**
   * Disable all user skills
   */
  disableAllSkills(userId: string): void {
    const userSkills = skillStore.getUserSkills(userId);
    for (const skill of userSkills) {
      skillStore.updateUserSkill(userId, skill.skillName, { isEnabled: false });
    }
  }
}

// Singleton instance
export const skillManager = new SkillManager();

// Export class for custom instances
export { SkillManager };
