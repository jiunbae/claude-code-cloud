'use client';

export function ApiKeysSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">API Keys</h2>
        <p className="text-gray-400 text-sm">Manage your API keys for different providers</p>
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
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-300 mb-2">API Key Management</h3>
        <p className="text-gray-500 mb-4">
          Configure your API keys for Anthropic, OpenAI, and other providers.
        </p>
        <p className="text-gray-600 text-sm">Coming soon</p>
      </div>
    </div>
  );
}
