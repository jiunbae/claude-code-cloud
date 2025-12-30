'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { APP_NAME } from '@/config';

type ScreenshotTab = 'terminal' | 'files' | 'dashboard';

export function LandingPage() {
  const router = useRouter();
  const [activeScreenshot, setActiveScreenshot] = useState<ScreenshotTab>('terminal');

  const screenshots: Record<ScreenshotTab, { src: string; label: string; description: string }> = {
    terminal: {
      src: '/screenshots/terminal.png',
      label: 'Claude Terminal',
      description: 'AI-powered coding with Claude',
    },
    files: {
      src: '/screenshots/files.png',
      label: 'File Explorer',
      description: 'Browse and edit your project files',
    },
    dashboard: {
      src: '/screenshots/dashboard.png',
      label: 'Dashboard',
      description: 'Manage sessions and workspaces',
    },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-auto">
      {/* Hero Section */}
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-transparent to-transparent pointer-events-none" />

        {/* Navigation */}
        <nav className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/jung-hunsoo/claude-code-cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="View on GitHub"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
            </a>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Login
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Cloud-Native AI Development
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            Run{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Claude Code
            </span>
            <br />
            in the Cloud
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Powerful AI-powered coding sessions in your browser.
            No local setup required. Collaborate in real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02]"
            >
              Get Started Free
            </button>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold text-lg transition-all border border-gray-700"
            >
              Learn More
            </a>
          </div>

          {/* Screenshot Preview */}
          <div className="mt-16 sm:mt-20 relative">
            {/* Tab buttons */}
            <div className="flex justify-center gap-2 mb-4">
              {(Object.keys(screenshots) as ScreenshotTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveScreenshot(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeScreenshot === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {screenshots[tab].label}
                </button>
              ))}
            </div>

            {/* Screenshot container */}
            <div className="relative rounded-xl border border-gray-700 shadow-2xl shadow-black/50 overflow-hidden bg-gray-950">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent z-10 pointer-events-none" />
              <Image
                src={screenshots[activeScreenshot].src}
                alt={screenshots[activeScreenshot].description}
                width={1280}
                height={800}
                className="w-full h-auto"
                priority
              />
            </div>
            <p className="mt-4 text-gray-500 text-sm">{screenshots[activeScreenshot].description}</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-gray-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need for{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                AI-powered development
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Cloud-based Claude Code sessions with powerful collaboration features
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="p-6 sm:p-8 bg-gray-900/50 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors group">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-500/20 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Cloud-Native</h3>
              <p className="text-gray-400 leading-relaxed">
                No installation required. Access your development environment from any browser, anywhere.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 sm:p-8 bg-gray-900/50 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors group">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time Collaboration</h3>
              <p className="text-gray-400 leading-relaxed">
                Share sessions with your team. Watch AI-assisted coding in real-time with live terminal sharing.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 sm:p-8 bg-gray-900/50 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Persistent Workspaces</h3>
              <p className="text-gray-400 leading-relaxed">
                Your projects stay where you left them. Resume work instantly with persistent cloud storage.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 sm:p-8 bg-gray-900/50 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors group">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-orange-500/20 transition-colors">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure Environment</h3>
              <p className="text-gray-400 leading-relaxed">
                Isolated containers for each session. Your code runs in a secure, sandboxed environment.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 sm:p-8 bg-gray-900/50 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors group">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-cyan-500/20 transition-colors">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Full IDE Experience</h3>
              <p className="text-gray-400 leading-relaxed">
                Integrated terminal, file explorer, and code editor. Everything you need in one place.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 sm:p-8 bg-gray-900/50 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors group">
              <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-pink-500/20 transition-colors">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Setup</h3>
              <p className="text-gray-400 leading-relaxed">
                Create a session and start coding in seconds. Pre-configured environments ready to go.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to start coding with AI?
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Create your free account and launch your first Claude Code session in minutes.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02]"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
