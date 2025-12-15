'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface CollaboratorPresence {
  odId: string;
  name: string;
  color: string;
  cursor?: { line: number; column: number };
  lastSeen: number;
  isTyping: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  timestamp: number;
}

interface UseCollaborationOptions {
  sessionId: string;
  userName: string;
  userColor?: string;
  enabled?: boolean;
}

interface CollaborationState {
  connected: boolean;
  collaborators: CollaboratorPresence[];
  messages: ChatMessage[];
}

// Generate random color for user
function generateUserColor(): string {
  const colors = [
    '#f7768e', '#ff9e64', '#e0af68', '#9ece6a',
    '#73daca', '#7dcfff', '#7aa2f7', '#bb9af7',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function useCollaboration({
  sessionId,
  userName,
  userColor = generateUserColor(),
  enabled = true,
}: UseCollaborationOptions) {
  const [state, setState] = useState<CollaborationState>({
    connected: false,
    collaborators: [],
    messages: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const userIdRef = useRef<string>(generateId());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname;
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || window.location.port || '3001';
    return `${wsProtocol}://${wsHost}:${wsPort}/ws/collab`;
  }, []);

  // Connect to collaboration WebSocket
  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    const ws = new WebSocket(`${wsUrl}?sessionId=${sessionId}&userId=${userIdRef.current}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setState(prev => ({ ...prev, connected: true }));

      // Send join message
      ws.send(JSON.stringify({
        type: 'collab:join',
        userId: userIdRef.current,
        userName,
        userColor,
      }));

      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'collab:heartbeat' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'collab:presence':
            setState(prev => ({
              ...prev,
              collaborators: message.collaborators.filter(
                (c: CollaboratorPresence) => c.odId !== userIdRef.current
              ),
            }));
            break;

          case 'collab:chat':
            setState(prev => ({
              ...prev,
              messages: [...prev.messages.slice(-99), message.message],
            }));
            break;

          case 'collab:cursor':
            setState(prev => ({
              ...prev,
              collaborators: prev.collaborators.map(c =>
                c.odId === message.userId
                  ? { ...c, cursor: message.cursor }
                  : c
              ),
            }));
            break;

          case 'collab:typing':
            setState(prev => ({
              ...prev,
              collaborators: prev.collaborators.map(c =>
                c.odId === message.userId
                  ? { ...c, isTyping: message.isTyping }
                  : c
              ),
            }));
            break;
        }
      } catch (error) {
        console.error('Failed to parse collaboration message:', error);
      }
    };

    ws.onclose = () => {
      setState(prev => ({ ...prev, connected: false }));

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Attempt reconnect
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('Collaboration WebSocket error:', error);
    };
  }, [sessionId, userName, userColor, enabled, getWsUrl]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Send chat message
  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    const message: ChatMessage = {
      id: generateId(),
      userId: userIdRef.current,
      userName,
      userColor,
      content,
      timestamp: Date.now(),
    };

    wsRef.current.send(JSON.stringify({
      type: 'collab:chat',
      message,
    }));

    // Add to local state immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages.slice(-99), message],
    }));
  }, [userName, userColor]);

  // Update cursor position
  const updateCursor = useCallback((line: number, column: number) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'collab:cursor',
      cursor: { line, column },
    }));
  }, []);

  // Set typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'collab:typing',
      isTyping,
    }));
  }, []);

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connected: state.connected,
    collaborators: state.collaborators,
    messages: state.messages,
    sendMessage,
    updateCursor,
    setTyping,
    userId: userIdRef.current,
    userName,
    userColor,
  };
}
