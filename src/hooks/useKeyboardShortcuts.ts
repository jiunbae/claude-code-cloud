'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSessionStore } from '@/stores/sessionStore';

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleSidebar } = useSidebarStore();
  const { sessions } = useSessionStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + B: Toggle sidebar
      if (modKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Cmd/Ctrl + N: New session
      if (modKey && e.key === 'n') {
        e.preventDefault();
        router.push('/?tab=sessions&action=new');
        return;
      }

      // Cmd/Ctrl + H: Go home
      if (modKey && e.key === 'h') {
        e.preventDefault();
        router.push('/');
        return;
      }

      // Cmd/Ctrl + 1-9: Quick switch to session by index
      if (modKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (sessions[index]) {
          router.push(`/session/${sessions[index].id}`);
        }
        return;
      }

      // Helper function for session navigation
      const navigateSession = (direction: 'prev' | 'next') => {
        const currentSessionMatch = pathname.match(/\/session\/(.+)/);
        if (!currentSessionMatch || sessions.length === 0) {
          return;
        }

        const currentId = currentSessionMatch[1];
        const currentIndex = sessions.findIndex((s) => s.id === currentId);
        if (currentIndex === -1) {
          return;
        }

        const nextIndex =
          direction === 'prev'
            ? (currentIndex - 1 + sessions.length) % sessions.length
            : (currentIndex + 1) % sessions.length;

        router.push(`/session/${sessions[nextIndex].id}`);
      };

      // Cmd/Ctrl + [: Previous session
      if (modKey && e.key === '[') {
        e.preventDefault();
        navigateSession('prev');
        return;
      }

      // Cmd/Ctrl + ]: Next session
      if (modKey && e.key === ']') {
        e.preventDefault();
        navigateSession('next');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname, toggleSidebar, sessions]);
}
