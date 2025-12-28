'use client';

import type { UserSkillWithDetails, SkillCategory } from '@/types/skill';

interface SkillCardProps {
  skill: UserSkillWithDetails;
  onInstall: (skillName: string) => void;
  onUninstall: (skillName: string) => void;
  onToggle: (skillName: string, enabled: boolean) => void;
  loading?: boolean;
}

const categoryColors: Record<SkillCategory, { bg: string; text: string }> = {
  git: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  code: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  ai: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  utility: { bg: 'bg-green-500/20', text: 'text-green-400' },
  devops: { bg: 'bg-red-500/20', text: 'text-red-400' },
  docs: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  test: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  general: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

const categoryIcons: Record<SkillCategory, string> = {
  // Git branch icon (24x24 viewBox compatible)
  git: 'M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM7 9v6h2V9H7zm10-2v6.17A3.001 3.001 0 0 1 18 21a3 3 0 0 1-1-5.83V7h-2v6.17A3.001 3.001 0 0 1 12 21a3 3 0 0 1-1-5.83V9H9v4.17A3.001 3.001 0 0 1 6 21a3 3 0 0 1-3-3c0-1.3.84-2.4 2-2.83V7H3V5h4v2H5v6.17c1.16.43 2 1.53 2 2.83z',
  code: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  ai: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  utility: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  devops: 'M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
  docs: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  test: 'M20 3H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM4 19V7h16l.002 12H4z M6.5 11.5l1.414-1.414L10.5 12.672l5.086-5.086L17 9l-6.5 6.5z',
  general: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
};

export default function SkillCard({
  skill,
  onInstall,
  onUninstall,
  onToggle,
  loading,
}: SkillCardProps) {
  const categoryStyle = categoryColors[skill.category] || categoryColors.general;

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg ${categoryStyle.bg} flex items-center justify-center flex-shrink-0`}>
            <svg
              className={`w-5 h-5 ${categoryStyle.text}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d={categoryIcons[skill.category] || categoryIcons.general} />
            </svg>
          </div>

          {/* Name and Category */}
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-medium truncate">{skill.displayName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}>
                {skill.category}
              </span>
              {skill.isSystem && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  System
                </span>
              )}
              {skill.version && (
                <span className="text-xs text-gray-500">v{skill.version}</span>
              )}
            </div>
          </div>
        </div>

        {/* Toggle/Install Button */}
        <div className="flex items-center gap-2">
          {skill.isInstalled ? (
            <>
              {/* Toggle Switch */}
              <button
                onClick={() => onToggle(skill.name, !skill.isEnabled)}
                disabled={loading}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  skill.isEnabled ? 'bg-green-600' : 'bg-gray-600'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={skill.isEnabled ? 'Disable skill' : 'Enable skill'}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    skill.isEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>

              {/* Uninstall Button */}
              {!skill.isSystem && (
                <button
                  onClick={() => onUninstall(skill.name)}
                  disabled={loading}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-50 transition-colors"
                  title="Uninstall skill"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onInstall(skill.name)}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Install
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{skill.description || 'No description available'}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {skill.author && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {skill.author}
            </span>
          )}
          {skill.keywords.length > 0 && (
            <span className="flex items-center gap-1 truncate max-w-32">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="truncate">{skill.keywords.slice(0, 3).join(', ')}</span>
            </span>
          )}
        </div>

        {skill.isInstalled && skill.installedAt && (
          <span>Installed {formatDate(skill.installedAt)}</span>
        )}
      </div>

      {/* Dependencies Warning */}
      {skill.dependencies.length > 0 && !skill.isInstalled && (
        <div className="mt-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
          Requires: {skill.dependencies.join(', ')}
        </div>
      )}
    </div>
  );
}
