---
id: k-ccc-overview
title: "Claude Code Cloud - Project Overview"
type: planning
status: current
created: '2025-12-29T03:49:00.000Z'
updated: '2025-12-29T03:49:00.000Z'
links:
  - k-ccc-architecture
  - k-ccc-enhancement-plan
tags:
  - overview
  - claude-code
  - self-host
  - terminal
codeRefs:
  - "src/app/"
  - "src/components/"
  - "src/server/"
---

# Claude Code Cloud - Project Overview

## Description

Run Claude Code in the cloud with web-based terminal access. A self-hostable service that provides terminal mirroring, session management, file explorer, and collaboration features.

## Features

- **Terminal Mirroring**: Real-time Claude Code output via WebSocket
- **Session Management**: Create, start, stop, and delete sessions with SQLite persistence
- **File Explorer**: Browse and preview project files with syntax highlighting
- **Collaboration**: Share sessions with token-based links and see participants
- **Web Interface**: Modern React-based UI with xterm.js terminal
- **Docker Support**: Easy deployment with Docker Compose

## Tech Stack

### Frontend
- Next.js 15, React 19, Tailwind CSS
- xterm.js for terminal emulation
- Zustand for state management
- TanStack Query for data fetching

### Backend
- Node.js, WebSocket (ws), node-pty
- SQLite (better-sqlite3) for persistence

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API routes
│   ├── session/[id]/      # Session detail page
│   └── page.tsx           # Home page
├── components/
│   ├── Collaboration/     # ShareDialog, ParticipantList
│   ├── FileExplorer/      # File tree, preview
│   ├── Session/           # Session cards, modals
│   └── Terminal/          # xterm.js terminal
├── server/
│   ├── collaboration/     # Share tokens
│   ├── files/             # File system manager
│   ├── pty/              # PTY process management
│   ├── session/          # SQLite session storage
│   └── websocket/        # WebSocket server
└── stores/               # Zustand stores
```

## Development Phases (Completed)

- [x] Phase 1: Terminal Mirroring (Core MVP)
- [x] Phase 2: Session Management (SQLite persistence)
- [x] Phase 3: File Explorer
- [x] Phase 4: Collaboration Features
