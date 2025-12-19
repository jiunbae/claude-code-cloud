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

### Quick Start (Self-Host)

Self-host를 처음 시작하는 분들을 위한 단계별 가이드입니다.

#### 1. 저장소 클론

```bash
git clone https://github.com/your-repo/claude-code-cloud.git
cd claude-code-cloud
```

#### 2. 환경 설정

```bash
# 환경 변수 파일 복사
cp .env.example .env
chmod 600 .env
```

`.env` 파일을 편집하여 필수 값들을 설정합니다:

```env
# 필수: JWT 서명용 시크릿 (최소 32자 권장)
JWT_SECRET=$(openssl rand -base64 32)

# 필수: 작업 디렉토리 경로
WORKSPACE_ROOT=/path/to/your/workspace

# 필수: 관리자 계정
ADMIN_EMAIL=admin@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password-here

# 권장: 호스트 사용자와 동일한 UID/GID (파일 권한 문제 방지)
PUID=$(id -u)
PGID=$(id -g)

# 런타임 선택: Claude 사용 시 필요 (빌드에는 불필요)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# 런타임 선택: Codex 사용 시 필요
OPENAI_API_KEY=sk-xxxxx
```

> **Note**: API 키는 빌드 시점에는 필요하지 않습니다. 서비스 실행 후 Claude/Codex 세션을 시작할 때 필요합니다.

#### 3. 서비스 시작

```bash
# Docker Compose로 실행
docker compose up -d

# 로그 확인
docker compose logs -f

# 헬스체크 확인
curl http://localhost:13000/api/health
```

#### 4. 접속

브라우저에서 `http://localhost:13000`으로 접속하여 설정한 관리자 계정으로 로그인합니다.

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

## Security

### Production 환경 보안 설정

Self-host 환경에서 보안을 강화하기 위한 권장 설정입니다.

#### 1. 강력한 시크릿 사용

```bash
# JWT_SECRET 생성 (최소 32자)
openssl rand -base64 32

# 관리자 비밀번호도 강력하게 설정
openssl rand -base64 16
```

#### 2. HTTPS 설정 (Reverse Proxy)

프로덕션 환경에서는 반드시 HTTPS를 사용하세요.

**Nginx 예시:**

```nginx
server {
    listen 443 ssl http2;
    server_name claude.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/claude.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/claude.yourdomain.com/privkey.pem;

    # Web UI
    location / {
        proxy_pass http://localhost:13000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:13001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

**WebSocket 환경 변수 설정:**

```env
NEXT_PUBLIC_WS_PROTOCOL=wss
NEXT_PUBLIC_WS_HOST=claude.yourdomain.com
NEXT_PUBLIC_WS_PORT=443
NEXT_PUBLIC_WS_PATH=/ws
```

#### 3. 방화벽 설정

외부에서 직접 포트 접근을 차단하고 reverse proxy만 허용합니다.

```bash
# UFW 예시
sudo ufw allow 443/tcp    # HTTPS
sudo ufw deny 13000/tcp   # 직접 접근 차단
sudo ufw deny 13001/tcp   # WebSocket 직접 접근 차단
```

#### 4. API 키 보호

- `.env` 파일 권한을 `600`으로 설정하여 소유자만 읽을 수 있도록 합니다
- API 키를 Git에 커밋하지 마세요 (`.gitignore`에 `.env` 포함)
- 환경 변수 대신 볼륨 마운트 방식을 사용할 수 있습니다:

```env
ANTHROPIC_CONFIG=/path/to/.anthropic  # api_key 파일이 있는 디렉토리
```

#### 5. 컨테이너 권한

- 가능하면 PUID/PGID를 일반 사용자로 설정합니다 (root 아님)
- 워크스페이스에 대한 접근 권한을 최소화합니다

## Troubleshooting

### 자주 발생하는 문제와 해결 방법

#### 파일 권한 오류 (EACCES)

**증상:** `/home/nodejs/.claude` 또는 워크스페이스 접근 시 권한 오류

**해결:**
```bash
# 호스트 사용자의 UID/GID 확인
id -u  # PUID
id -g  # PGID

# .env 파일에 설정
PUID=1000  # 실제 값으로 변경
PGID=1000  # 실제 값으로 변경

# 컨테이너 재시작
docker compose down && docker compose up -d
```

#### WebSocket 연결 실패

**증상:** 터미널이 연결되지 않음, WebSocket 오류

**해결:**
1. WebSocket 포트가 열려있는지 확인:
   ```bash
   curl -i http://localhost:13001
   ```

2. Reverse proxy 사용 시 WebSocket 환경 변수 확인:
   ```env
   NEXT_PUBLIC_WS_PROTOCOL=wss  # HTTPS 사용 시
   NEXT_PUBLIC_WS_HOST=your-domain.com
   NEXT_PUBLIC_WS_PORT=443
   NEXT_PUBLIC_WS_PATH=/ws
   ```

3. Nginx/Traefik WebSocket 프록시 설정 확인 (Upgrade 헤더 필요)

#### Claude CLI 응답 없음

**증상:** 세션 시작 후 Claude가 응답하지 않음

**해결:**
1. API 키 확인:
   ```bash
   docker compose exec app env | grep ANTHROPIC
   ```

2. Claude CLI 작동 확인:
   ```bash
   docker compose exec app claude --version
   ```

3. 네트워크 연결 확인:
   ```bash
   docker compose exec app curl -I https://api.anthropic.com
   ```

#### 데이터베이스 오류

**증상:** 세션 목록이 로드되지 않음, 500 오류

**해결:**
```bash
# 데이터 볼륨 확인
docker volume inspect claude-code-cloud_claude-data

# 로그에서 SQLite 오류 확인
docker compose logs app | grep -i sqlite

# 필요시 데이터베이스 재생성 (주의: 데이터 손실)
docker compose down -v
docker compose up -d
```

#### 컨테이너 시작 실패

**증상:** 컨테이너가 즉시 종료됨

**해결:**
```bash
# 로그 확인
docker compose logs app

# 헬스체크 비활성화하고 디버그
docker compose run --rm --entrypoint sh app

# 이미지 재빌드
docker compose build --no-cache
```

#### 메모리 부족

**증상:** 컨테이너가 OOMKilled 상태로 종료

**해결:**
docker-compose.yml에 메모리 제한 추가:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 4G
```

### 로그 확인 방법

```bash
# 전체 로그
docker compose logs -f

# 최근 100줄
docker compose logs --tail 100

# 특정 시간 이후
docker compose logs --since 1h
```

## Development Phases

- [x] **Phase 1**: Terminal Mirroring (Core MVP)
- [x] **Phase 2**: Session Management (SQLite persistence)
- [x] **Phase 3**: File Explorer
- [x] **Phase 4**: Collaboration Features

## License

MIT
