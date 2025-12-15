'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Terminal as XTerminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import type { TerminalKind } from '@/types';

interface TerminalProps {
  sessionId: string;
  wsUrl?: string;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  readOnly?: boolean;
  terminal?: TerminalKind;
}

// Generate default WebSocket URL based on current page location and env vars
function getDefaultWsUrl(): string {
  const defaultPort = 3001;
  if (typeof window === 'undefined') return `ws://localhost:${defaultPort}`;

  const wsProtocol =
    (process.env.NEXT_PUBLIC_WS_PROTOCOL as 'ws' | 'wss' | undefined) ||
    (window.location.protocol === 'https:' ? 'wss' : 'ws');
  const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname;
  const wsPort =
    process.env.NEXT_PUBLIC_WS_PORT ||
    (process.env.NEXT_PUBLIC_WS_HOST
      ? defaultPort.toString()
      : window.location.port || (window.location.protocol === 'https:' ? '443' : '80'));
  const wsPath = process.env.NEXT_PUBLIC_WS_PATH || '/ws';
  const normalizedPath = wsPath.startsWith('/') ? wsPath : wsPath ? `/${wsPath}` : '';

  return `${wsProtocol}://${wsHost}:${wsPort}${normalizedPath}`;
}

export default function Terminal({
  sessionId,
  wsUrl,
  onStatusChange,
  readOnly = false,
  terminal = 'claude',
}: TerminalProps) {
  const effectiveWsUrl = wsUrl || getDefaultWsUrl();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectEnabledRef = useRef(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'disconnected'
  );

  const updateStatus = useCallback(
    (newStatus: 'connecting' | 'connected' | 'disconnected' | 'error') => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  const fitAndNotifyResize = useCallback(() => {
    if (!fitAddonRef.current || !xtermRef.current) return;

    fitAddonRef.current.fit();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'terminal:resize',
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows,
        })
      );
    }
  }, []);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    updateStatus('connecting');

    const ws = new WebSocket(
      `${effectiveWsUrl}?sessionId=${encodeURIComponent(sessionId)}&terminal=${terminal}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      updateStatus('connected');
      const label = terminal === 'shell' ? 'Terminal' : 'Claude';
      xtermRef.current?.writeln(`\x1b[32m● Connected to ${label}\x1b[0m\n`);

      // Send initial resize
      fitAndNotifyResize();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'terminal:output':
            xtermRef.current?.write(message.data);
            break;

          case 'terminal:scrollback':
            // Write scrollback history
            if (Array.isArray(message.data)) {
              message.data.forEach((line: string) => {
                xtermRef.current?.writeln(line);
              });
            }
            break;

          case 'session:status':
            if (message.status === 'running') {
              xtermRef.current?.writeln(
                `\x1b[32m● ${terminal === 'shell' ? 'Shell' : 'Claude Code'} started\x1b[0m`
              );
            } else if (message.status === 'idle') {
              xtermRef.current?.writeln(
                `\x1b[33m● ${terminal === 'shell' ? 'Shell' : 'Claude Code'} exited (code: ${message.exitCode ?? 'unknown'})\x1b[0m`
              );
            }
            break;

          case 'session:error':
            xtermRef.current?.writeln(`\x1b[31m✗ Error: ${message.message}\x1b[0m`);
            break;

          case 'error':
            console.error('WebSocket error:', message);
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      updateStatus('disconnected');
      xtermRef.current?.writeln('\x1b[33m● Disconnected from session\x1b[0m');

      // Reconnect after delay
      setTimeout(() => {
        if (reconnectEnabledRef.current && wsRef.current === ws) {
          connectWebSocket();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateStatus('error');
    };
  }, [sessionId, effectiveWsUrl, terminal, updateStatus, fitAndNotifyResize]);

  // Initialize terminal
  useEffect(() => {
    let mounted = true;
    reconnectEnabledRef.current = true;

    const initTerminal = async () => {
      if (!terminalRef.current || xtermRef.current) return;

      // Dynamic import for SSR compatibility
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      if (!mounted) return;

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1a1b26',
          foreground: '#a9b1d6',
          cursor: '#c0caf5',
          cursorAccent: '#1a1b26',
          selectionBackground: '#33467c',
          black: '#15161e',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#bb9af7',
          cyan: '#7dcfff',
          white: '#a9b1d6',
          brightBlack: '#414868',
          brightRed: '#f7768e',
          brightGreen: '#9ece6a',
          brightYellow: '#e0af68',
          brightBlue: '#7aa2f7',
          brightMagenta: '#bb9af7',
          brightCyan: '#7dcfff',
          brightWhite: '#c0caf5',
        },
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      terminal.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Watch container size changes (tab switches / split panes / etc)
      const handleContainerResize = () => {
        if (resizeRafRef.current !== null) {
          cancelAnimationFrame(resizeRafRef.current);
        }
        resizeRafRef.current = requestAnimationFrame(() => {
          resizeRafRef.current = null;
          fitAndNotifyResize();
        });
      };

      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(handleContainerResize);
        ro.observe(terminalRef.current);
        resizeObserverRef.current = ro;
      }

      // Handle input (if not read-only)
      if (!readOnly) {
        terminal.onData((data) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'terminal:input', data }));
          }
        });
      }

      window.addEventListener('resize', handleContainerResize);

      // Connect WebSocket
      connectWebSocket();

      return () => {
        window.removeEventListener('resize', handleContainerResize);
      };
    };

    initTerminal();

    return () => {
      mounted = false;
      reconnectEnabledRef.current = false;

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }

      wsRef.current?.close();
      wsRef.current = null;
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [readOnly, connectWebSocket, fitAndNotifyResize]);

  // Send signal (e.g., Ctrl+C)
  const sendSignal = useCallback((signal: 'SIGINT' | 'SIGTERM') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'terminal:signal', signal }));
    }
  }, []);

  const adjustFontSize = useCallback(
    (delta: number) => {
      if (!xtermRef.current) return;
      const current = xtermRef.current.options.fontSize ?? 14;
      const next = Math.max(10, Math.min(24, current + delta));
      xtermRef.current.options.fontSize = next;
      // Let xterm apply the new font size before fitting.
      requestAnimationFrame(() => fitAndNotifyResize());
    },
    [fitAndNotifyResize]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Terminal Header - Mobile Optimized */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              status === 'connected'
                ? 'bg-green-500 shadow-sm shadow-green-500/50'
                : status === 'connecting'
                  ? 'bg-yellow-500 animate-pulse shadow-sm shadow-yellow-500/50'
                  : status === 'error'
                    ? 'bg-red-500 shadow-sm shadow-red-500/50'
                    : 'bg-gray-500'
            }`}
          />
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            status === 'connected' ? 'bg-green-500/10 text-green-400' :
            status === 'connecting' ? 'bg-yellow-500/10 text-yellow-400' :
            status === 'error' ? 'bg-red-500/10 text-red-400' :
            'bg-gray-500/10 text-gray-400'
          }`}>
            {status === 'connected' ? 'Connected' :
             status === 'connecting' ? 'Connecting...' :
             status === 'error' ? 'Error' : 'Disconnected'}
          </span>
          <span className="text-xs text-gray-500 truncate max-w-[100px] sm:max-w-[200px] font-mono hidden sm:inline">
            {sessionId}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => adjustFontSize(-1)}
            className="p-2 sm:px-3 sm:py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 rounded-lg transition-colors"
            title="Decrease font size"
            aria-label="Decrease font size"
          >
            A-
          </button>
          <button
            onClick={() => adjustFontSize(1)}
            className="p-2 sm:px-3 sm:py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 rounded-lg transition-colors"
            title="Increase font size"
            aria-label="Increase font size"
          >
            A+
          </button>
          {!readOnly && (
            <>
              <button
                onClick={() => sendSignal('SIGINT')}
                className="p-2 sm:px-3 sm:py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 rounded-lg transition-colors"
                title="Send Ctrl+C (Interrupt)"
              >
                <span className="hidden sm:inline">Ctrl+C</span>
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={() => sendSignal('SIGTERM')}
                className="p-2 sm:px-3 sm:py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors"
                title="Send SIGTERM (Terminate)"
              >
                <span className="hidden sm:inline">Kill</span>
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      {/* Terminal Container */}
      <div ref={terminalRef} className="flex-1 bg-[#1a1b26] overflow-hidden" />
    </div>
  );
}
