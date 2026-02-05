'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { APP_NAME } from '@/config';
import AuthDisabledBanner from '@/components/Auth/AuthDisabledBanner';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useKeyboardShortcuts();
  const { setMobileOpen } = useSidebarStore();
  // Use useAuth hook to ensure auth state is initialized on app load
  const { isAuthenticated, isLoading } = useAuth();
  const { authDisabled } = useAuthStatus();

  // Show sidebar and mobile header only when authenticated and not loading
  const showSidebar = (isAuthenticated || authDisabled) && !isLoading;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      {/* Command Palette (global) - only show when authenticated */}
      {showSidebar && <CommandPalette />}

      {/* Sidebar - only show when authenticated */}
      {showSidebar && <Sidebar />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header - only show when authenticated */}
        {showSidebar && (
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-700">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">{APP_NAME}</h1>
          </header>
        )}

        <AuthDisabledBanner />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
