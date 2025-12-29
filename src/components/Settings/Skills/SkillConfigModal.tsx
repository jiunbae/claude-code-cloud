'use client';

import { useState, useEffect } from 'react';
import type { UserSkillWithDetails, SkillConfig } from '@/types/skill';

interface SkillConfigModalProps {
  skill: UserSkillWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (skillName: string, config: SkillConfig) => void;
  isLoading?: boolean;
}

export default function SkillConfigModal({
  skill,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: SkillConfigModalProps) {
  const [config, setConfig] = useState<SkillConfig>({});
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize config when modal opens
  useEffect(() => {
    if (isOpen && skill) {
      setConfig(skill.config || {});
      setJsonInput(JSON.stringify(skill.config || {}, null, 2));
      setError(null);
    }
  }, [isOpen, skill]);

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

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    setError(null);

    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('Configuration must be a JSON object');
        return;
      }
      setConfig(parsed);
    } catch (e) {
      setError('Invalid JSON format');
    }
  };

  const handleSave = () => {
    if (error || !skill) return;

    try {
      const parsed = JSON.parse(jsonInput);
      onSave(skill.name, parsed);
      onClose();
    } catch {
      setError('Invalid JSON format');
    }
  };

  if (!isOpen || !skill) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-white">Configure Skill</h2>
              <p className="text-sm text-gray-400 mt-1">{skill.displayName}</p>
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
          <div className="p-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Configuration (JSON)
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => handleJsonChange(e.target.value)}
                className={`w-full h-48 px-3 py-2 bg-gray-900 border rounded-lg text-sm text-gray-300 font-mono focus:outline-none transition-colors ${
                  error
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-700 focus:border-blue-500'
                }`}
                placeholder='{"key": "value"}'
                spellCheck={false}
              />
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
              <p className="mt-2 text-xs text-gray-500">
                Enter skill-specific configuration as a JSON object
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !!error}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
