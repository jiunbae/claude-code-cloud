'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Terminal as XTerminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import type { TerminalKind } from '@/types';
import { MobileKeyboard } from './MobileKeyboard';

interface TerminalProps {
  sessionId: string;
  wsUrl?: string;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  readOnly?: boolean;
  terminal?: TerminalKind;
  onFullscreenChange?: (isFullscreen: boolean) => void;
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
  onFullscreenChange,
}: TerminalProps) {
  const effectiveWsUrl = wsUrl || getDefaultWsUrl();
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectEnabledRef = useRef(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'disconnected'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState<number | 'auto'>('auto');

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
      const labelMap: Record<TerminalKind, string> = {
        shell: 'Terminal',
        claude: 'Claude',
        codex: 'Codex',
      };
      const label = labelMap[terminal];
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
            // Write scrollback history (join for better performance)
            // Use write callback to ensure scrollToBottom runs after rendering
            if (Array.isArray(message.data) && message.data.length > 0) {
              const scrollbackContent = message.data.join('\r\n') + '\r\n';
              xtermRef.current?.write(scrollbackContent, () => xtermRef.current?.scrollToBottom());
            } else {
              xtermRef.current?.scrollToBottom();
            }
            break;

          case 'session:status':
            {
              const statusLabelMap: Record<TerminalKind, string> = {
                shell: 'Shell',
                claude: 'Claude Code',
                codex: 'Codex',
              };
              const statusLabel = statusLabelMap[terminal];
              if (message.status === 'running') {
                xtermRef.current?.writeln(
                  `\x1b[32m● ${statusLabel} started\x1b[0m`
                );
              } else if (message.status === 'idle') {
                xtermRef.current?.writeln(
                  `\x1b[33m● ${statusLabel} exited (code: ${message.exitCode ?? 'unknown'})\x1b[0m`
                );
              }
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

  // Mobile keyboard handlers
  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'terminal:input', data }));
    }
  }, []);

  const handleMobileKeyPress = useCallback((key: string) => {
    sendInput(key);
  }, [sendInput]);

  const handleMobileSpecialKey = useCallback((key: 'Tab' | 'Escape' | 'Enter') => {
    const keyMap: Record<string, string> = {
      Tab: '\t',
      Escape: '\x1b',
      Enter: '\r',
    };
    sendInput(keyMap[key]);
  }, [sendInput]);

  const handleMobileCtrlKey = useCallback((key: string) => {
    // Ctrl+key sends the character code - 64 (for uppercase) or - 96 (for lowercase)
    const ctrlChar = String.fromCharCode(key.toUpperCase().charCodeAt(0) - 64);
    sendInput(ctrlChar);
  }, [sendInput]);

  const handleMobileArrowKey = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // Arrow keys use ANSI escape sequences
    const arrowMap: Record<string, string> = {
      up: '\x1b[A',
      down: '\x1b[B',
      right: '\x1b[C',
      left: '\x1b[D',
    };
    sendInput(arrowMap[direction]);
  }, [sendInput]);

  // Fullscreen and height adjustment
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      onFullscreenChange?.(next);
      // Trigger resize after state change
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fitAndNotifyResize());
      });
      return next;
    });
  }, [onFullscreenChange, fitAndNotifyResize]);

  const adjustHeight = useCallback(
    (delta: number) => {
      setTerminalHeight((prev) => {
        if (prev === 'auto') {
          // Get current height from container
          const currentHeight = containerRef.current?.offsetHeight ?? 400;
          return Math.max(200, Math.min(window.innerHeight - 100, currentHeight + delta));
        }
        return Math.max(200, Math.min(window.innerHeight - 100, prev + delta));
      });
      requestAnimationFrame(() => fitAndNotifyResize());
    },
    [fitAndNotifyResize]
  );

  const resetHeight = useCallback(() => {
    setTerminalHeight('auto');
    requestAnimationFrame(() => fitAndNotifyResize());
  }, [fitAndNotifyResize]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        onFullscreenChange?.(false);
        requestAnimationFrame(() => fitAndNotifyResize());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onFullscreenChange, fitAndNotifyResize]);

  // Compute container styles
  const containerStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }
    : terminalHeight !== 'auto'
      ? { height: terminalHeight }
      : {};

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${isFullscreen ? '' : 'flex-1 h-full min-h-0'}`}
      style={containerStyle}
    >
      {/* Terminal Header - Mobile Optimized */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
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
          {/* Height controls */}
          <div className="hidden sm:flex items-center gap-1 border-r border-gray-600 pr-2 mr-1">
            <button
              onClick={() => adjustHeight(-100)}
              className="p-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 rounded transition-colors"
              title="Decrease height"
              aria-label="Decrease height"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => adjustHeight(100)}
              className="p-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 rounded transition-colors"
              title="Increase height"
              aria-label="Increase height"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            {terminalHeight !== 'auto' && (
              <button
                onClick={resetHeight}
                className="p-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 rounded transition-colors"
                title="Reset height"
                aria-label="Reset height"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
          {/* Font size controls */}
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
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:px-3 sm:py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
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
      <div ref={terminalRef} className="flex-1 bg-[#1a1b26] overflow-hidden min-h-0" />

      {/* Mobile Keyboard - shown only on mobile and when not read-only */}
      {!readOnly && (
        <MobileKeyboard
          onKeyPress={handleMobileKeyPress}
          onSpecialKey={handleMobileSpecialKey}
          onCtrlKey={handleMobileCtrlKey}
          onArrowKey={handleMobileArrowKey}
        />
      )}
    </div>
  );
}
