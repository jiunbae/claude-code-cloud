'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for Terminal (SSR disabled)
const Terminal = dynamic(() => import('./Terminal'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  ),
});

interface TerminalTab {
  id: string;
  name: string;
  type: 'shell';
}

interface MultiTabTerminalProps {
  sessionId: string;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export default function MultiTabTerminal({ sessionId, onStatusChange }: MultiTabTerminalProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'shell-1', name: 'Terminal 1', type: 'shell' },
  ]);
  const [activeTabId, setActiveTabId] = useState('shell-1');
  const [tabCounter, setTabCounter] = useState(1);

  const addTab = useCallback(() => {
    const newId = `shell-${tabCounter + 1}`;
    setTabCounter((c) => c + 1);
    setTabs((prev) => [...prev, { id: newId, name: `Terminal ${tabCounter + 1}`, type: 'shell' }]);
    setActiveTabId(newId);
  }, [tabCounter]);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        if (newTabs.length === 0) {
          // Always keep at least one tab
          const newId = `shell-${tabCounter + 1}`;
          setTabCounter((c) => c + 1);
          setActiveTabId(newId);
          return [{ id: newId, name: `Terminal ${tabCounter + 1}`, type: 'shell' }];
        }
        if (activeTabId === tabId) {
          // Switch to the previous tab or the first available
          const idx = prev.findIndex((t) => t.id === tabId);
          const newActiveIdx = Math.max(0, idx - 1);
          setActiveTabId(newTabs[newActiveIdx]?.id || newTabs[0].id);
        }
        return newTabs;
      });
    },
    [activeTabId, tabCounter]
  );

  const renameTab = useCallback((tabId: string, newName: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, name: newName.trim() || t.name } : t))
    );
  }, []);

  // Memoize active tab to prevent unnecessary re-renders
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto">
        <div className="flex items-center flex-1 min-w-0">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onClick={() => setActiveTabId(tab.id)}
              onClose={() => closeTab(tab.id)}
              onRename={(name) => renameTab(tab.id, name)}
              showClose={tabs.length > 1}
            />
          ))}
        </div>
        <button
          onClick={addTab}
          className="flex-shrink-0 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="New Terminal"
          aria-label="New Terminal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Terminal Content - render all tabs but only show active */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 flex flex-col ${tab.id === activeTabId ? '' : 'hidden'}`}
          >
            <Terminal
              sessionId={sessionId}
              terminal="shell"
              onStatusChange={tab.id === activeTabId ? onStatusChange : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface TabButtonProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
  showClose: boolean;
}

function TabButton({ tab, isActive, onClick, onClose, onRename, showClose }: TabButtonProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tab.name);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setEditName(tab.name);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editName.trim() && editName !== tab.name) {
      onRename(editName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditName(tab.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-1 px-3 py-2 text-sm cursor-pointer border-r border-gray-700 transition-colors ${
        isActive
          ? 'bg-gray-700 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200'
      }`}
      onClick={onClick}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-20 px-1 py-0.5 text-xs bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="truncate max-w-[100px]"
          onDoubleClick={handleDoubleClick}
          title="Double-click to rename"
        >
          {tab.name}
        </span>
      )}
      {showClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`ml-1 p-0.5 rounded hover:bg-gray-600 ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}
          title="Close Terminal"
          aria-label="Close Terminal"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
