'use client';

import { useCallback, useState } from 'react';

interface MobileKeyboardProps {
  onKeyPress: (key: string) => void;
  onSpecialKey: (key: 'Tab' | 'Escape' | 'Enter') => void;
  onCtrlKey: (key: string) => void;
  onArrowKey: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export function MobileKeyboard({
  onKeyPress,
  onSpecialKey,
  onCtrlKey,
  onArrowKey,
}: MobileKeyboardProps) {
  const [isCtrlActive, setIsCtrlActive] = useState(false);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isCtrlActive) {
        onCtrlKey(key);
        setIsCtrlActive(false);
      } else {
        onKeyPress(key);
      }
    },
    [isCtrlActive, onKeyPress, onCtrlKey]
  );

  const toggleCtrl = useCallback(() => {
    setIsCtrlActive((prev) => !prev);
  }, []);

  const buttonClass = `
    flex items-center justify-center
    min-w-[40px] h-10 px-2
    bg-gray-800 hover:bg-gray-700 active:bg-gray-600
    text-gray-300 text-sm font-medium
    rounded-lg transition-colors
    select-none touch-manipulation
  `;

  const modifierClass = (active: boolean) => `
    flex items-center justify-center
    min-w-[40px] h-10 px-2
    ${active ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}
    text-sm font-medium
    rounded-lg transition-colors
    select-none touch-manipulation
  `;

  const arrowClass = `
    flex items-center justify-center
    w-10 h-10
    bg-gray-800 hover:bg-gray-700 active:bg-gray-600
    text-gray-300
    rounded-lg transition-colors
    select-none touch-manipulation
  `;

  return (
    <div className="lg:hidden bg-gray-900 border-t border-gray-700 p-2 space-y-2">
      {/* Row 1: Modifier keys and common keys */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={toggleCtrl}
          className={modifierClass(isCtrlActive)}
          aria-pressed={isCtrlActive}
        >
          Ctrl
        </button>
        <button onClick={() => onSpecialKey('Tab')} className={buttonClass}>
          Tab
        </button>
        <button onClick={() => onSpecialKey('Escape')} className={buttonClass}>
          Esc
        </button>
        <div className="w-px h-6 bg-gray-700 mx-1" />
        <button onClick={() => handleKeyPress('/')} className={buttonClass}>
          /
        </button>
        <button onClick={() => handleKeyPress('-')} className={buttonClass}>
          -
        </button>
        <button onClick={() => handleKeyPress('_')} className={buttonClass}>
          _
        </button>
        <button onClick={() => handleKeyPress('.')} className={buttonClass}>
          .
        </button>
      </div>

      {/* Row 2: Arrow keys and Ctrl shortcuts */}
      <div className="flex items-center justify-between">
        {/* Ctrl shortcuts */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onCtrlKey('c')}
            className={`${buttonClass} text-red-400 hover:text-red-300`}
            title="Ctrl+C (Interrupt)"
          >
            ^C
          </button>
          <button
            onClick={() => onCtrlKey('d')}
            className={buttonClass}
            title="Ctrl+D (EOF)"
          >
            ^D
          </button>
          <button
            onClick={() => onCtrlKey('z')}
            className={buttonClass}
            title="Ctrl+Z (Suspend)"
          >
            ^Z
          </button>
          <button
            onClick={() => onCtrlKey('l')}
            className={buttonClass}
            title="Ctrl+L (Clear)"
          >
            ^L
          </button>
          <button
            onClick={() => onCtrlKey('r')}
            className={buttonClass}
            title="Ctrl+R (Search history)"
          >
            ^R
          </button>
        </div>

        {/* Arrow keys */}
        <div className="flex items-center gap-1">
          {/* Left arrow */}
          <button
            onClick={() => onArrowKey('left')}
            className={arrowClass}
            aria-label="Left arrow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Up/Down column */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onArrowKey('up')}
              className={arrowClass}
              aria-label="Up arrow (previous command)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => onArrowKey('down')}
              className={arrowClass}
              aria-label="Down arrow (next command)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Right arrow */}
          <button
            onClick={() => onArrowKey('right')}
            className={arrowClass}
            aria-label="Right arrow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
