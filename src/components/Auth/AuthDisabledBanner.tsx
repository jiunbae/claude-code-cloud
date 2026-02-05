'use client';

import { useAuthStatus } from '@/hooks/useAuthStatus';

export default function AuthDisabledBanner() {
  const { authDisabled, isLoading } = useAuthStatus();

  if (isLoading || !authDisabled) {
    return null;
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-100 text-xs sm:text-sm px-4 py-2 flex items-center justify-center">
      <span className="font-semibold mr-2">Auth Disabled</span>
      <span>Authentication is disabled. Do not use in production.</span>
    </div>
  );
}
