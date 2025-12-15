'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, CollaboratorPresence } from '@/hooks/useCollaboration';

interface ChatProps {
  messages: ChatMessage[];
  collaborators: CollaboratorPresence[];
  onSendMessage: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  currentUserId: string;
}

export default function Chat({
  messages,
  collaborators,
  onSendMessage,
  onTyping,
  currentUserId,
}: ChatProps) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const newFromOthers = newMessages.filter(m => m.userId !== currentUserId);
      setUnreadCount(prev => prev + newFromOthers.length);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, isOpen, currentUserId]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Handle input change with typing indicator
  const handleInputChange = useCallback((value: string) => {
    setInput(value);

    if (onTyping) {
      onTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  }, [onTyping]);

  // Handle send
  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    onSendMessage(input.trim());
    setInput('');

    if (onTyping) {
      onTyping(false);
    }
  }, [input, onSendMessage, onTyping]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get typing users
  const typingUsers = collaborators.filter(c => c.isTyping);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className={`relative p-3 rounded-full shadow-lg transition-colors ${
          isOpen
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-700 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">Team Chat</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {collaborators.length + 1} online
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-white rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${
                    msg.userId === currentUserId ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: msg.userColor }}
                  >
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`flex flex-col max-w-[70%] ${
                      msg.userId === currentUserId ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-xs text-gray-500 mb-0.5">
                      {msg.userName} · {formatTime(msg.timestamp)}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-lg text-sm ${
                        msg.userId === currentUserId
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-3 py-1 text-xs text-gray-400">
              {typingUsers.map(u => u.name).join(', ')}{' '}
              {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
