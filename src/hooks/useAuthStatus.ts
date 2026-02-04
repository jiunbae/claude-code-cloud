'use client';

import { useEffect, useState } from 'react';

interface AuthStatus {
  authEnabled: boolean;
}

export function useAuthStatus() {
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/auth/status', { cache: 'no-store' });
        if (!active) return;
        if (response.ok) {
          const data = (await response.json()) as AuthStatus;
          setAuthEnabled(Boolean(data.authEnabled));
          return;
        }
      } catch {
        // Ignore errors and fall back to auth enabled
      }

      if (active) {
        setAuthEnabled(true);
      }
    };

    fetchStatus();

    return () => {
      active = false;
    };
  }, []);

  return {
    authEnabled,
    authDisabled: authEnabled === false,
    isLoading: authEnabled === null,
  };
}
