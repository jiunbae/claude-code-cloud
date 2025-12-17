# Claude Code Cloud

Run Claude Code in the cloud with web-based terminal access.

## Features

- **Terminal Mirroring**: Real-time Claude Code output via WebSocket
- **Session Management**: Create, start, stop, and delete sessions with SQLite persistence
- **File Explorer**: Browse and preview project files with syntax highlighting
- **Collaboration**: Share sessions with token-based links and see participants
- **Web Interface**: Modern React-based UI with xterm.js terminal
- **Docker Support**: Easy deployment with Docker Compose

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, xterm.js
- **Backend**: Node.js, WebSocket (ws), node-pty
- **Database**: SQLite (better-sqlite3)
- **State Management**: Zustand, TanStack Query

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- Claude Code CLI installed (host dev)
  - `npm install -g @anthropic-ai/claude-code`
  - Docker images built from this repo now include the CLI automatically, so no extra step is needed when running with `docker compose`.

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

This starts:
- Next.js on http://localhost:3000
- WebSocket server on ws://localhost:3001

### Production (Docker)

```bash
# Build and run with Docker Compose
docker compose up -d

# Or for development with hot reload
docker compose --profile dev up

# Rebuild image after updates (ensures Claude CLI is baked in)
docker compose build --pull

# If you see EACCES for /home/nodejs/.claude in the container, set PUID/PGID to match the host user
PUID=$(id -u) PGID=$(id -g) docker compose up -d
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API routes
│   │   ├── health/        # Health check endpoint
│   │   ├── join/          # Share link validation
│   │   └── sessions/      # Session CRUD + start/stop/files/share/participants
│   ├── join/[token]/      # Join session via share link
│   ├── session/[id]/      # Session detail page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page (session list)
├── components/
│   ├── Collaboration/     # ShareDialog, ParticipantList
│   ├── FileExplorer/      # File tree, file preview
│   ├── Layout/            # Header, layout components
│   ├── Session/           # Session cards, modals
│   └── Terminal/          # xterm.js terminal component
├── hooks/                 # Custom React hooks
├── server/
│   ├── collaboration/     # Share tokens, participants
│   ├── files/             # File system manager
│   ├── pty/              # PTY process management
│   ├── session/          # SQLite session storage
│   └── websocket/        # WebSocket server
├── stores/               # Zustand stores
└── types/                # TypeScript type definitions
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
- `DELETE /api/sessions/:id/share` - Delete share token(s)
- `GET /api/sessions/:id/participants` - List participants
- `POST /api/sessions/:id/participants` - Join session
- `DELETE /api/sessions/:id/participants` - Leave session
- `GET /api/join/:token` - Validate share token

### WebSocket

Connect to `ws://localhost:3001?sessionId=<id>` for terminal I/O.

**Client → Server:**
- `terminal:input` - Send input to terminal
- `terminal:resize` - Resize terminal
- `terminal:signal` - Send signal (SIGINT, SIGTERM)

**Server → Client:**
- `terminal:output` - Terminal output data
- `session:status` - Session status changes
- `session:error` - Error messages

## Configuration

### Quick Start

```bash
# Copy the example environment file
cp .env.example .env
chmod 600 .env

# Edit .env and set your API keys and other settings
# Then start the service
docker compose up -d
```

### API Keys

Claude Code Cloud requires API keys for the AI services:

**Method 1: Environment Variables (Recommended)**

Set in your `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx    # For Claude Code
OPENAI_API_KEY=sk-xxxxx           # For Codex (optional)
```

**Method 2: File Mount**

Mount credentials directory using the `ANTHROPIC_CONFIG` environment variable:

```bash
# In your .env file
ANTHROPIC_CONFIG=/path/to/.anthropic  # Directory containing api_key file
```

The directory should contain a file named `api_key` with your Anthropic API key.

**Priority**: Environment variables take precedence over file-based credentials.

### Environment Variables

All configurable options are managed through environment variables, loaded from a `.env` file in the project root. Copy `.env.example` to `.env` to get started.

Below is a reference for all available variables:

```env
# === Required ===
# A secure, random string for signing JWTs.
JWT_SECRET=your-secure-jwt-secret-here

# The root directory on the HOST machine that will be mounted into the container
# for Claude Code to access.
WORKSPACE_ROOT=/your/workspace/path

# === Admin Account (created on first startup) ===
ADMIN_EMAIL=admin@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password-here

# === API Keys ===
# Set API keys directly (recommended for most users)
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# === Volume Mounts (alternative to API keys above) ===
# For file-based credentials, set the HOST path to mount into the container.
# ANTHROPIC_CONFIG=/path/to/.anthropic  # Directory containing api_key file

# === Claude CLI Settings ===
# Claude CLI configuration directory (for settings, not API key)
# CLAUDE_CONFIG=/path/to/.claude

# === User/Group IDs ===
# Match these to your host user's UID/GID to avoid file permission issues
# in the mounted workspace. Use `id -u` and `id -g` on your host to find them.
PUID=1000
PGID=1000

# === Optional: Git Clone Credentials (for private repos) ===
# Use a personal access token for HTTPS cloning.
#GIT_CLONE_TOKEN=ghp_xxxxx
#GIT_CLONE_USERNAME=x-access-token

# === Optional: WebSocket (for reverse proxy setup) ===
# Configure if you are running behind a reverse proxy.
#NEXT_PUBLIC_WS_PROTOCOL=wss
#NEXT_PUBLIC_WS_HOST=your-domain.com
#NEXT_PUBLIC_WS_PORT=443
#NEXT_PUBLIC_WS_PATH=/ws

# === Optional: Timezone ===
# Sets the container timezone. See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
# Defaults to UTC if unset.
#TZ=Asia/Seoul
```

## Development Phases

- [x] **Phase 1**: Terminal Mirroring (Core MVP)
- [x] **Phase 2**: Session Management (SQLite persistence)
- [x] **Phase 3**: File Explorer
- [x] **Phase 4**: Collaboration Features

## License

MIT
