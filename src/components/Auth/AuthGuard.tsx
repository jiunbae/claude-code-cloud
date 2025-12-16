'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  sessionId?: string;
}

export default function AuthGuard({ children, fallback, sessionId }: AuthGuardProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const [isAnonymousParticipant, setIsAnonymousParticipant] = useState<boolean | null>(null);

  // Check for anonymous participant info in sessionStorage
  // Security Note: This client-side check allows view-only access. The risk is acceptable
  // because anonymous users are restricted to read-only operations (no terminal input).
  // For enhanced security, consider adding server-side participant validation in future.
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      const anonymousInfo = sessionStorage.getItem(`anonymous:${sessionId}`);
      setIsAnonymousParticipant(!!anonymousInfo);
    } else {
      setIsAnonymousParticipant(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // Wait for anonymous check to complete
    if (isAnonymousParticipant === null) return;

    if (!isLoading && !isAuthenticated && !isAnonymousParticipant) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isAnonymousParticipant, router]);

  // Show loading state
  if (isLoading || isAnonymousParticipant === null) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-gray-700"></div>
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-t-blue-500 animate-spin"></div>
            </div>
            <p className="text-gray-500 mt-4 text-sm">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Anonymous participant - allow access
  if (isAnonymousParticipant) {
    return <>{children}</>;
  }

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-gray-700"></div>
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-t-blue-500 animate-spin"></div>
            </div>
            <p className="text-gray-500 mt-4 text-sm">Redirecting to login...</p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
