'use client';

import { useMemo, useCallback } from 'react';
import type { FileContent } from '@/types';

interface FilePreviewProps {
  file: FileContent | null;
  loading?: boolean;
  error?: string | null;
  sessionId?: string;
  shareToken?: string | null;
}

export default function FilePreview({ file, loading, error, sessionId, shareToken }: FilePreviewProps) {
  const handleDownload = useCallback(async () => {
    if (!file || !sessionId) return;

    const params = new URLSearchParams({ path: file.path });
    if (shareToken) params.set('token', shareToken);

    const url = `/api/sessions/${sessionId}/files/download?${params}`;

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = file.path.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    // Delay cleanup to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  }, [file, sessionId, shareToken]);

  const language = useMemo(() => {
    if (!file) return 'text';

    const ext = file.path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
    };

    return langMap[ext || ''] || 'text';
  }, [file]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>Select a file to preview</p>
        </div>
      </div>
    );
  }

  if (file.binary) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p>Binary file ({file.mimeType})</p>
          <p className="text-sm text-gray-600 mt-1">
            {formatFileSize(file.size)}
          </p>
          {sessionId && (
            <button
              onClick={handleDownload}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
          )}
        </div>
      </div>
    );
  }

  const fileName = file.path.split('/').pop() || file.path;

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      {/* File header - Mobile Optimized */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          <span className="text-gray-300 truncate">{fileName}</span>
          <span className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded ${
            language === 'typescript' || language === 'tsx' ? 'bg-blue-500/20 text-blue-400' :
            language === 'javascript' || language === 'jsx' ? 'bg-yellow-500/20 text-yellow-400' :
            language === 'python' ? 'bg-green-500/20 text-green-400' :
            language === 'json' ? 'bg-emerald-500/20 text-emerald-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>{language}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </span>
          {sessionId && (
            <button
              onClick={handleDownload}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
              title="Download file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* File content - Mobile Optimized */}
      <div className="flex-1 overflow-auto">
        <pre className="p-3 sm:p-4 text-xs sm:text-sm font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
          <code>{file.content}</code>
        </pre>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
