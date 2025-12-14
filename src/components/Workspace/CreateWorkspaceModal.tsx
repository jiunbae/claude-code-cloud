'use client';

import { useState, useEffect } from 'react';
import type { CreateWorkspaceRequest } from '@/types';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (request: CreateWorkspaceRequest) => void;
}

// Convert name to valid slug
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export default function CreateWorkspaceModal({ isOpen, onClose, onCreate }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<'empty' | 'git'>('empty');
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('');
  const [error, setError] = useState('');

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(nameToSlug(name));
    }
  }, [name, slugManuallyEdited]);

  if (!isOpen) return null;

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    // Only allow valid slug characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(sanitized);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (!slug.trim()) {
      setError('Slug is required');
      return;
    }

    if (slug.length < 3) {
      setError('Slug must be at least 3 characters');
      return;
    }

    if (sourceType === 'git' && !gitUrl.trim()) {
      setError('Git URL is required');
      return;
    }

    onCreate({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      sourceType,
      gitUrl: sourceType === 'git' ? gitUrl.trim() : undefined,
      gitBranch: sourceType === 'git' && gitBranch.trim() ? gitBranch.trim() : undefined,
    });

    // Reset form
    setName('');
    setSlug('');
    setSlugManuallyEdited(false);
    setDescription('');
    setSourceType('empty');
    setGitUrl('');
    setGitBranch('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Create New Workspace</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Workspace Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-1">
                Directory Name (slug)
              </label>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-project"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only letters, numbers, and hyphens (3-50 characters)
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short description of your workspace"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Source Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Source</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sourceType"
                    value="empty"
                    checked={sourceType === 'empty'}
                    onChange={() => setSourceType('empty')}
                    className="text-blue-500"
                  />
                  <span className="text-gray-300">Empty Directory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sourceType"
                    value="git"
                    checked={sourceType === 'git'}
                    onChange={() => setSourceType('git')}
                    className="text-blue-500"
                  />
                  <span className="text-gray-300">Clone from Git</span>
                </label>
              </div>
            </div>

            {/* Git Options */}
            {sourceType === 'git' && (
              <>
                <div>
                  <label htmlFor="gitUrl" className="block text-sm font-medium text-gray-300 mb-1">
                    Git URL
                  </label>
                  <input
                    type="text"
                    id="gitUrl"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="gitBranch" className="block text-sm font-medium text-gray-300 mb-1">
                    Branch (optional)
                  </label>
                  <input
                    type="text"
                    id="gitBranch"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
