---
id: k-ccc-architecture
title: "Claude Code Cloud - Technical Architecture"
type: planning
status: current
created: '2025-12-29T03:49:00.000Z'
updated: '2025-12-29T03:49:00.000Z'
links:
  - k-ccc-overview
  - k-ccc-enhancement-plan
tags:
  - architecture
  - websocket
  - docker
  - security
codeRefs:
  - "src/server/websocket/"
  - "src/server/pty/"
  - "docker-compose.yml"
---

# Technical Architecture

## Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Frontend (Next.js 15)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Sessions  │  │   Terminal   │  │ File Explorer│   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │ REST API            │ WebSocket           │
    │ Port 13000          │ Port 13001          │
    │                     │                     │
┌───▼─────────────────────▼─────────────────────▼───┐
│              Backend (Node.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Auth   │  │   PTY    │  │   File   │        │
│  │  Service │  │ Manager  │  │ Manager  │        │
│  └──────────┘  └──────────┘  └──────────┘        │
└──────────────────────┬────────────────────────────┘
                       │
              ┌────────┴────────┐
              │     SQLite      │
              │  (WAL mode)     │
              └─────────────────┘
```

## API Endpoints

### Sessions
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/start` - Start Claude Code
- `POST /api/sessions/:id/stop` - Stop Claude Code

### Files
- `GET /api/sessions/:id/files` - Get file tree
- `GET /api/sessions/:id/files?path=<path>` - Get file content

### Collaboration
- `GET /api/sessions/:id/share` - List share tokens
- `POST /api/sessions/:id/share` - Create share token
- `GET /api/sessions/:id/participants` - List participants

### WebSocket Protocol

**Client → Server:**
- `terminal:input` - Send input to terminal
- `terminal:resize` - Resize terminal
- `terminal:signal` - Send signal (SIGINT, SIGTERM)

**Server → Client:**
- `terminal:output` - Terminal output data
- `session:status` - Session status changes
- `session:error` - Error messages

## Security

- JWT-based authentication
- API key protection (environment variables or volume mounts)
- HTTPS via reverse proxy (Nginx)
- Container UID/GID mapping for file permissions
- Rate limiting per user/endpoint
