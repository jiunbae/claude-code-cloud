'use client';

import { useEffect, useState } from 'react';
import type { UserSkillWithDetails, SkillCategory } from '@/types/skill';

interface SkillDetailModalProps {
  skill: UserSkillWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall: (skillName: string) => void;
  onUninstall: (skillName: string) => void;
  onToggle: (skillName: string, enabled: boolean) => void;
  onConfigure?: (skill: UserSkillWithDetails) => void;
  isLoading?: boolean;
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

export default function SkillDetailModal({
  skill,
  isOpen,
  onClose,
  onInstall,
  onUninstall,
  onToggle,
  onConfigure,
  isLoading,
}: SkillDetailModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Fetch skill content when modal opens
  useEffect(() => {
    if (isOpen && skill) {
      setLoadingContent(true);
      fetch(`/api/skills/${encodeURIComponent(skill.name)}`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          setContent(data.content || null);
        })
        .catch(() => {
          setContent(null);
        })
        .finally(() => {
          setLoadingContent(false);
        });
    }
  }, [isOpen, skill?.name]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !skill) return null;

  const categoryStyle = categoryColors[skill.category] || categoryColors.general;

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-lg ${categoryStyle.bg} flex items-center justify-center`}
              >
                <svg
                  className={`w-6 h-6 ${categoryStyle.text}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{skill.displayName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}
                  >
                    {skill.category}
                  </span>
                  {skill.version && (
                    <span className="text-xs text-gray-500">v{skill.version}</span>
                  )}
                  {skill.isSystem && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      System
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
              <p className="text-gray-300">{skill.description || 'No description available'}</p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {skill.author && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Author</h3>
                  <p className="text-white">{skill.author}</p>
                </div>
              )}
              {skill.isInstalled && skill.installedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Installed</h3>
                  <p className="text-white">{formatDate(skill.installedAt)}</p>
                </div>
              )}
            </div>

            {/* Keywords */}
            {skill.keywords.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {skill.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {skill.dependencies.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Dependencies</h3>
                <div className="flex flex-wrap gap-2">
                  {skill.dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Content Preview */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Content Preview</h3>
              {loadingContent ? (
                <div className="p-4 bg-gray-900 rounded-lg">
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ) : content ? (
                <pre className="p-4 bg-gray-900 rounded-lg text-sm text-gray-300 overflow-x-auto max-h-48">
                  {content.slice(0, 1000)}
                  {content.length > 1000 && '...'}
                </pre>
              ) : (
                <p className="text-gray-500 text-sm">Content not available</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700">
            <div>
              {skill.isInstalled && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {skill.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => onToggle(skill.name, !skill.isEnabled)}
                    disabled={isLoading}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      skill.isEnabled ? 'bg-green-600' : 'bg-gray-600'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        skill.isEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {skill.isInstalled ? (
                <>
                  {onConfigure && Object.keys(skill.config || {}).length > 0 && (
                    <button
                      onClick={() => onConfigure(skill)}
                      className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  )}
                  {!skill.isSystem && (
                    <button
                      onClick={() => onUninstall(skill.name)}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Uninstall
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => onInstall(skill.name)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Install
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
