'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { FileContent } from '@/types';

interface CodeEditorProps {
  file: FileContent;
  sessionId: string;
  onSave?: (path: string) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

// Map file extensions to Monaco language IDs
function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    htm: 'html',
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
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    r: 'r',
    lua: 'lua',
    perl: 'perl',
    graphql: 'graphql',
  };
  return langMap[ext || ''] || 'plaintext';
}

export default function CodeEditor({
  file,
  sessionId,
  onSave,
  onClose,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [content, setContent] = useState(file.content || '');
  const [originalContent] = useState(file.content || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fileName = file.path.split('/').pop() || file.path;
  const language = getLanguage(file.path);

  // Update hasChanges when content changes
  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  // handleSave moved up to be available for keyboard shortcuts
  const handleSave = useCallback(async () => {
    if (saving || readOnly) return;

    setSaving(true);
    setError(null);

    try {
      // Calculate relative path from the file path
      const relativePath = file.path;

      const response = await fetch(`/api/sessions/${sessionId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relativePath, content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save file');
      }

      onSave?.(file.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  }, [file.path, content, sessionId, saving, readOnly, onSave]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!readOnly && hasChanges) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, readOnly, handleSave]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
  }, []);

  const handleChange: OnChange = useCallback((value) => {
    setContent(value || '');
    setError(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-gray-300 text-sm truncate">{fileName}</span>
          {hasChanges && (
            <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" title="Unsaved changes" />
          )}
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              language === 'typescript'
                ? 'bg-blue-500/20 text-blue-400'
                : language === 'javascript'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : language === 'python'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-400 truncate max-w-[150px]">{error}</span>}
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              title="Save (Ctrl+S / Cmd+S)"
            >
              {saving ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={content}
          theme="vs-dark"
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
          }}
        />
      </div>
    </div>
  );
}
