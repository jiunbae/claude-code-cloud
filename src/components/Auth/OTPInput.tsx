'use client';

import { useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OTPInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
}: OTPInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(
    () => value.replace(/\D/g, '').slice(0, length).split(''),
    [value, length]
  );

  const focusInput = (index: number) => {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  };

  const updateValue = (index: number, nextDigits: string) => {
    const current = value.replace(/\D/g, '').slice(0, length).split('');

    if (!nextDigits) {
      if (index < current.length) {
        current.splice(index, 1);
      }
      onChange(current.join(''));
      return;
    }

    const incoming = nextDigits.split('');
    current.splice(index, incoming.length, ...incoming);
    const nextValue = current.join('').slice(0, length);
    onChange(nextValue);
  };

  const handleChange = (index: number, nextValue: string) => {
    const sanitized = nextValue.replace(/\D/g, '');
    updateValue(index, sanitized);

    if (sanitized) {
      const nextIndex = Math.min(index + sanitized.length, length - 1);
      requestAnimationFrame(() => focusInput(nextIndex));
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }
  };

  return (
    <div className=\"flex items-center gap-2\">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type=\"text\"
          inputMode=\"numeric\"
          pattern=\"[0-9]*\"
          autoComplete=\"one-time-code\"
          maxLength={length}
          value={digits[index] || ''}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className=\"w-10 h-12 text-center text-lg font-semibold bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500\"
        />
      ))}
    </div>
  );
}
