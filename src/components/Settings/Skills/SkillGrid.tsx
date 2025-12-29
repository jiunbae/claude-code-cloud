'use client';

import type { UserSkillWithDetails } from '@/types/skill';
import SkillCard from '../SkillCard';

interface SkillGridProps {
  skills: UserSkillWithDetails[];
  onInstall: (skillName: string) => void;
  onUninstall: (skillName: string) => void;
  onToggle: (skillName: string, enabled: boolean) => void;
  onViewDetails?: (skill: UserSkillWithDetails) => void;
  onConfigure?: (skill: UserSkillWithDetails) => void;
  loadingSkill: string | null;
  emptyMessage?: string;
  emptyHint?: string;
}

export default function SkillGrid({
  skills,
  onInstall,
  onUninstall,
  onToggle,
  onViewDetails,
  onConfigure,
  loadingSkill,
  emptyMessage = 'No skills found',
  emptyHint,
}: SkillGridProps) {
  if (skills.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-12 h-12 text-gray-600 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <p className="text-gray-400">{emptyMessage}</p>
        {emptyHint && <p className="text-sm text-gray-500 mt-2">{emptyHint}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => (
        <div
          key={skill.id}
          className="h-full cursor-pointer"
          onClick={() => onViewDetails?.(skill)}
        >
          <SkillCard
            skill={skill}
            onInstall={onInstall}
            onUninstall={onUninstall}
            onToggle={onToggle}
            loading={loadingSkill === skill.name}
          />
        </div>
      ))}
    </div>
  );
}
