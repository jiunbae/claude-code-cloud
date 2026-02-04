'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import type { PublicUser, LoginRequest } from '@/types/auth';

const API_BASE = '/api/auth';

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, authChecked, isCheckingAuth, setUser, setLoading, setCheckingAuth, logout: clearAuth } = useAuthStore();

  // Fetch current user on mount
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [setUser, setLoading]);

  // Initialize auth state on component mount only.
  // Empty dependency array is intentional: we only want to check auth ONCE when the
  // hook is first used. Adding dependencies would cause re-checks on every state change,
  // defeating the purpose of the authChecked optimization. The internal checks for
  // authChecked, isCheckingAuth, and user handle the logic correctly for mount-time initialization.
  useEffect(() => {
    // Skip if auth has already been checked (prevents repeated API calls)
    if (authChecked) {
      setLoading(false);
      return;
    }
    // Skip if another instance is already checking auth (prevents race condition)
    if (isCheckingAuth) {
      return;
    }
    // If we already have a user in state (e.g., from login), don't refetch
    if (!user) {
      setCheckingAuth(true);
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login
  const login = useCallback(
    async (
      data: LoginRequest
    ): Promise<{ success: boolean; error?: string; requiresOtp?: boolean; tempToken?: string }> => {
      try {
        const response = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        });

        const result = await response.json();

        if (response.ok) {
          if (result.requiresOtp) {
            if (!result.tempToken) {
              return { success: false, error: 'OTP token missing' };
            }
            return { success: true, requiresOtp: true, tempToken: result.tempToken };
          }

          setUser(result.user);
          return { success: true };
        }

        return { success: false, error: result.error };
      } catch {
        return { success: false, error: 'Login failed' };
      }
    },
    [setUser]
  );

  // Complete login with OTP
  const verifyOtpLogin = useCallback(
    async (
      code: string,
      tempToken: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`${API_BASE}/otp/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tempToken}`,
          },
          body: JSON.stringify({ code }),
          credentials: 'include',
        });

        const result = await response.json();

        if (response.ok) {
          setUser(result.user);
          return { success: true };
        }

        return { success: false, error: result.error };
      } catch {
        return { success: false, error: 'OTP validation failed' };
      }
    },
    [setUser]
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore errors
    } finally {
      clearAuth();
      router.push('/login');
    }
  }, [clearAuth, router]);

  // Update profile
  const updateProfile = useCallback(
    async (data: Partial<Pick<PublicUser, 'username'>>): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`${API_BASE}/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        });

        const result = await response.json();

        if (response.ok) {
          setUser(result.user);
          return { success: true };
        }

        return { success: false, error: result.error };
      } catch {
        return { success: false, error: 'Update failed' };
      }
    },
    [setUser]
  );

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    verifyOtpLogin,
    logout,
    updateProfile,
    refreshUser: fetchUser,
  };
}
