'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface AuthStatusResponse {
  authEnabled: boolean;
}

export function useAuthStatus() {
  const { authDisabled, authStatusFetched, setAuthDisabled } = useAuthStore();

  useEffect(() => {
    // Skip if already fetched
    if (authStatusFetched) return;

    let active = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/auth/status', { cache: 'no-store' });
        if (!active) return;
        if (response.ok) {
          const data = (await response.json()) as AuthStatusResponse;
          setAuthDisabled(!data.authEnabled);
          return;
        }
      } catch (error) {
        console.error('Failed to fetch auth status:', error);
        // Fall back to auth enabled on error
      }

      if (active) {
        setAuthDisabled(false); // Default to auth enabled
      }
    };

    fetchStatus();

    return () => {
      active = false;
    };
  }, [authStatusFetched, setAuthDisabled]);

  return {
    authEnabled: authDisabled === false,
    authDisabled: authDisabled === true,
    isLoading: authDisabled === null,
  };
}
