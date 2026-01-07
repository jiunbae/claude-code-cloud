'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import FileTree from './FileTree';
import FilePreview from './FilePreview';
import type { FileNode, FileContent } from '@/types';

// Dynamic import for CodeEditor (heavy Monaco bundle)
const CodeEditor = dynamic(() => import('./CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
    </div>
  ),
});

interface FileExplorerProps {
  sessionId: string;
  shareToken?: string | null;
  onFileChange?: (event: { type: string; path: string }) => void;
}

export default function FileExplorer({ sessionId, shareToken }: FileExplorerProps) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  // Default collapsed on mobile (< 640px)
  // Initialize with false to match server render, then update on client
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize mobile state on client mount to avoid hydration mismatch
  useEffect(() => {
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    setCollapsed(mobile);
    setMounted(true);
  }, []);

  // Track window resize for responsive behavior
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (mobile && !collapsed) {
        setCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapsed, mounted]);

  // Fetch file tree
  useEffect(() => {
    const fetchTree = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/files?depth=4`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load files');
        }
        const data = await res.json();
        setTree(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [sessionId]);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (path: string) => {
      setSelectedPath(path);

      // Calculate relative path from project root (using tree root path)
      const rootPath = tree?.path || '';
      const relativePath = rootPath ? path.replace(rootPath + '/', '') : path;

      setFileLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/sessions/${sessionId}/files?path=${encodeURIComponent(relativePath)}`
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load file');
        }

        const data = await res.json();

        // If it's a directory, just update selection
        if (data.type === 'directory') {
          setSelectedFile(null);
          return;
        }

        setSelectedFile(data);

        // Auto-collapse sidebar on mobile after file selection
        if (isMobile) {
          setCollapsed(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
        setSelectedFile(null);
      } finally {
        setFileLoading(false);
      }
    },
    [sessionId, tree?.path, isMobile]
  );

  // Refresh tree
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/files?depth=4`);
      if (!res.ok) throw new Error('Failed to refresh');
      const data = await res.json();
      setTree(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Download all files as ZIP
  const handleDownloadAll = useCallback(() => {
    const params = new URLSearchParams({ zip: 'true' });
    if (shareToken) params.set('token', shareToken);

    const url = `/api/sessions/${sessionId}/files/download?${params}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = 'project.zip';
    document.body.appendChild(link);
    link.click();
    // Delay cleanup to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  }, [sessionId, shareToken]);

  if (loading && !tree) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-900 relative">
      {/* Mobile Overlay Backdrop */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-20 sm:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar - File Tree */}
      <div
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-30' : 'relative'}
          bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-200
          ${collapsed ? (isMobile ? '-translate-x-full w-72' : 'w-10') : (isMobile ? 'translate-x-0 w-72' : 'w-64')}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700">
          {(!collapsed || isMobile) && (
            <span className="text-sm font-medium text-gray-300">Files</span>
          )}
          <div className="flex items-center gap-1">
            {(!collapsed || isMobile) && (
              <>
                <button
                  onClick={handleDownloadAll}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Download all as ZIP"
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
                <button
                  onClick={handleRefresh}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tree */}
        {(!collapsed || isMobile) && (
          <div className="flex-1 overflow-auto py-2">
            {error && !tree ? (
              <div className="px-3 py-2 text-sm text-red-400">{error}</div>
            ) : tree ? (
              <FileTree
                node={tree}
                onFileSelect={handleFileSelect}
                selectedPath={selectedPath || undefined}
                sessionId={sessionId}
                shareToken={shareToken}
                rootPath={tree.path}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Mobile File Toggle Button */}
      {isMobile && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute top-2 left-2 z-10 p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg shadow-lg border border-gray-700 transition-colors"
          title="Show Files"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </button>
      )}

      {/* Main - File Preview or Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile && !selectedFile.binary && editMode ? (
          <CodeEditor
            file={selectedFile}
            sessionId={sessionId}
            onSave={() => {
              // Refresh tree after save
              handleRefresh();
            }}
            onClose={() => setEditMode(false)}
          />
        ) : (
          <>
            {/* Edit Mode Toggle */}
            {selectedFile && !selectedFile.binary && (
              <div className="flex items-center justify-end px-3 py-1 bg-gray-800 border-b border-gray-700">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                    editMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
              </div>
            )}
            <FilePreview
              file={selectedFile}
              loading={fileLoading}
              error={selectedFile ? null : error}
              sessionId={sessionId}
              shareToken={shareToken}
            />
          </>
        )}
      </div>
    </div>
  );
}
