'use client';

import { useState, useCallback } from 'react';
import type { Session, CreateSessionRequest } from '@/types';

const API_BASE = '/api/sessions';

export function useSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (request: CreateSessionRequest): Promise<Session | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const { session } = await response.json();
      return session;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSessions = useCallback(async (): Promise<Session[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_BASE);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const { sessions } = await response.json();
      return sessions;
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getSession = useCallback(async (id: string): Promise<Session | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get share token from sessionStorage if available
      const shareToken = typeof window !== 'undefined'
        ? sessionStorage.getItem(`shareToken:${id}`)
        : null;

      const headers: HeadersInit = {};
      if (shareToken) {
        headers['x-share-token'] = shareToken;
      }

      const response = await fetch(`${API_BASE}/${id}`, { headers });
      if (!response.ok) {
        throw new Error('Session not found');
      }
      const { session } = await response.json();
      return session;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      return response.ok;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const startSession = useCallback(async (id: string): Promise<{ pid?: number; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${id}/start`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      return { pid: data.pid };
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const stopSession = useCallback(async (id: string, force = false): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      return response.ok;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createSession,
    getSessions,
    getSession,
    deleteSession,
    startSession,
    stopSession,
  };
}
