'use client';

import { useState, useCallback } from 'react';
import type { FileNode } from '@/types';

interface FileTreeProps {
  node: FileNode;
  onFileSelect: (path: string) => void;
  selectedPath?: string;
  level?: number;
  sessionId?: string;
  shareToken?: string | null;
  rootPath?: string;
}

const FileIcon = ({ type, name }: { type: 'file' | 'directory'; name: string }) => {
  if (type === 'directory') {
    return (
      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }

  // File icons based on extension
  const ext = name.split('.').pop()?.toLowerCase();
  const iconColors: Record<string, string> = {
    ts: 'text-blue-500',
    tsx: 'text-blue-500',
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    json: 'text-green-500',
    md: 'text-gray-400',
    css: 'text-pink-500',
    html: 'text-orange-500',
    py: 'text-green-400',
    rs: 'text-orange-600',
    go: 'text-cyan-500',
  };

  const color = iconColors[ext || ''] || 'text-gray-500';

  return (
    <svg className={`w-4 h-4 ${color}`} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export default function FileTree({
  node,
  onFileSelect,
  selectedPath,
  level = 0,
  sessionId,
  shareToken,
  rootPath,
}: FileTreeProps) {
  const [expanded, setExpanded] = useState(level < 2);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'directory') {
      setExpanded((prev) => !prev);
    }
  }, [node.type]);

  const handleSelect = useCallback(() => {
    onFileSelect(node.path);
  }, [node.path, onFileSelect]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessionId) return;

    // Calculate relative path from root
    const effectiveRoot = rootPath || '';
    const relativePath = effectiveRoot ? node.path.replace(effectiveRoot + '/', '') : node.path;

    const params = new URLSearchParams({ path: relativePath });
    if (shareToken) params.set('token', shareToken);
    if (node.type === 'directory') params.set('zip', 'true');

    const url = `/api/sessions/${sessionId}/files/download?${params}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = node.type === 'directory' ? `${node.name}.zip` : node.name;
    document.body.appendChild(link);
    link.click();
    // Delay cleanup to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  }, [sessionId, shareToken, node.path, node.name, node.type, rootPath]);

  const isSelected = selectedPath === node.path;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 px-2 py-2 sm:py-1.5 cursor-pointer rounded-lg mx-1 text-sm transition-colors active:bg-gray-600/50 hover:bg-gray-700/50 ${
          isSelected ? 'bg-blue-900/50 text-blue-300' : 'text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleSelect}
      >
        {node.type === 'directory' && (
          <button
            onClick={handleToggle}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 rounded"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        {node.type === 'file' && <span className="w-5" />}
        <FileIcon type={node.type} name={node.name} />
        <span className="truncate flex-1">{node.name}</span>
        {sessionId && (
          <button
            onClick={handleDownload}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-600 rounded transition-all"
            title={node.type === 'directory' ? 'Download as ZIP' : 'Download'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {node.type === 'directory' && expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTree
              key={child.path}
              node={child}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              level={level + 1}
              sessionId={sessionId}
              shareToken={shareToken}
              rootPath={rootPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
