/**
 * Custom error classes for Skill operations
 * These allow API handlers to differentiate error types without relying on error message strings
 */

export class SkillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillError';
  }
}

export class SkillNotFoundError extends SkillError {
  constructor(skillName: string) {
    super(`Skill not found: ${skillName}`);
    this.name = 'SkillNotFoundError';
  }
}

export class SkillAlreadyInstalledError extends SkillError {
  constructor(skillName: string) {
    super(`Skill already installed: ${skillName}`);
    this.name = 'SkillAlreadyInstalledError';
  }
}

export class SkillNotInstalledError extends SkillError {
  constructor(skillName: string) {
    super(`Skill not installed: ${skillName}`);
    this.name = 'SkillNotInstalledError';
  }
}

export class SkillDependencyError extends SkillError {
  public readonly missingDependencies: string[];

  constructor(skillName: string, missingDependencies: string[]) {
    super(`Missing dependencies for ${skillName}: ${missingDependencies.join(', ')}`);
    this.name = 'SkillDependencyError';
    this.missingDependencies = missingDependencies;
  }
}

export class SkillDependentError extends SkillError {
  public readonly dependentSkill: string;

  constructor(skillName: string, dependentSkill: string) {
    super(`Cannot uninstall: ${dependentSkill} depends on ${skillName}`);
    this.name = 'SkillDependentError';
    this.dependentSkill = dependentSkill;
  }
}
