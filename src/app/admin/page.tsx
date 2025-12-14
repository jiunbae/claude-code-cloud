import { Metadata } from 'next';
import Link from 'next/link';
import { AdminGuard } from '@/components/Admin';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Claude Code Cloud',
  description: 'Admin dashboard for Claude Code Cloud',
};

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400 mt-1">Manage your Claude Code Cloud instance</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Back to App
            </Link>
          </div>

          {/* Admin Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Users Card */}
            <Link
              href="/admin/users"
              className="block p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-blue-500/50 transition-colors group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">User Management</h2>
              </div>
              <p className="text-gray-400 text-sm">
                Create, edit, and manage user accounts. Control access and permissions.
              </p>
            </Link>

            {/* Sessions Card (placeholder) */}
            <div className="p-6 bg-gray-800/30 border border-gray-700/50 rounded-xl opacity-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-500">Sessions</h2>
              </div>
              <p className="text-gray-600 text-sm">
                View and manage active sessions. (Coming soon)
              </p>
            </div>

            {/* Settings Card (placeholder) */}
            <div className="p-6 bg-gray-800/30 border border-gray-700/50 rounded-xl opacity-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-500">Settings</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Configure system settings. (Coming soon)
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
