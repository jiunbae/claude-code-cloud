'use client';

export function SkillsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Skills</h2>
        <p className="text-gray-400 text-sm">Manage installed skills and extensions</p>
      </div>

      {/* Placeholder content */}
      <div className="p-8 bg-gray-700/30 border border-gray-600 border-dashed rounded-lg text-center">
        <svg
          className="w-12 h-12 text-gray-500 mx-auto mb-4"
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
        <h3 className="text-lg font-medium text-gray-300 mb-2">Skills Management</h3>
        <p className="text-gray-500 mb-4">
          Install, configure, and manage Claude Code skills to extend functionality.
        </p>
        <p className="text-gray-600 text-sm">Coming soon</p>
      </div>
    </div>
  );
}
