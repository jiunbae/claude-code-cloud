# 기술 아키텍처 고도화 방안

> Agent 1 (Claude) 조사 결과
> 조사일: 2025-12-15

---

## 1. 아키텍처 개선

### 1.1 마이크로서비스 전환 전략

#### 목표 아키텍처
```
┌────────────────────┐
│   API Gateway      │  (Kong, Traefik, NGINX)
│   - Rate Limiting  │
│   - Auth Proxy     │
│   - Load Balancer  │
└────────────────────┘
         │
    ┌────┴────┬────────────┬─────────────┬──────────────┐
    │         │            │             │              │
┌───▼───┐ ┌──▼───┐  ┌────▼─────┐ ┌─────▼──────┐ ┌────▼────┐
│ Auth  │ │ WS   │  │ Session  │ │ Workspace  │ │ File    │
│Service│ │Server│  │ Manager  │ │ Manager    │ │ Service │
└───────┘ └──────┘  └──────────┘ └────────────┘ └─────────┘
```

#### 서비스 분리 계획
1. **Auth Service**: 인증, JWT, 권한 관리
2. **Session Service**: 세션 CRUD, 상태 관리
3. **PTY/WebSocket Service**: 터미널 프로세스, 실시간 I/O
4. **Workspace Service**: 워크스페이스, Git 연동
5. **File Service**: 파일 탐색, 편집

#### 예상 효과
- 서비스별 독립 배포 및 스케일링
- 장애 격리 (한 서비스 장애가 전체에 영향 주지 않음)
- 기술 스택 다양화 가능

### 1.2 이벤트 기반 아키텍처 (EDA)

#### 이벤트 버스 선택
- **RabbitMQ** (권장): 안정성, 메시지 재시도, DLQ
- **Apache Kafka** (대규모): 높은 처리량, 이벤트 스트리밍

#### 이벤트 타입 설계
```typescript
enum EventType {
  SESSION_CREATED = 'session.created',
  SESSION_STARTED = 'session.started',
  SESSION_STOPPED = 'session.stopped',
  WORKSPACE_CREATED = 'workspace.created',
  USER_LOGIN = 'user.login',
  PTY_OUTPUT = 'pty.output',
}
```

### 1.3 API Gateway 패턴

#### Kong Gateway 설정
```yaml
services:
  - name: auth-service
    url: http://auth-service:3000
    routes:
      - paths: [/api/auth]
    plugins:
      - name: rate-limiting
        config: { minute: 100 }

  - name: websocket-service
    url: http://websocket-service:3001
    routes:
      - paths: [/ws]
        protocols: [ws, wss]
```

---

## 2. 데이터베이스 고도화

### 2.1 PostgreSQL 마이그레이션

#### 현재 문제점
- SQLite 단일 파일 기반, 동시성 제한
- WAL 모드로도 쓰기 처리량 낮음
- 분산 환경 확장 어려움

#### PostgreSQL 스키마
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    workspace_id UUID REFERENCES workspaces(id),
    status VARCHAR(20) DEFAULT 'idle',
    config JSONB DEFAULT '{}',
    owner_id UUID REFERENCES users(id)
);
```

#### 마이그레이션 전략
1. Phase 1: Read Replica 추가 (SQLite → PostgreSQL 동기화)
2. Phase 2: Write를 PostgreSQL로 전환
3. Phase 3: SQLite 완전 제거

### 2.2 Redis 캐싱 레이어

#### 캐싱 전략
1. **Session 데이터** (TTL: 1시간)
2. **User Profile** (TTL: 5분)
3. **Rate Limiting** (Token Bucket)
4. **WebSocket Pub/Sub** (서버 간 메시지)

```typescript
class SessionCache {
  async get(sessionId: string): Promise<Session | null> {
    const cached = await redis.get(`session:${sessionId}`);
    if (cached) return JSON.parse(cached);

    const session = await db.getSession(sessionId);
    await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));
    return session;
  }
}
```

### 2.3 백업/복원 전략

#### 백업 계층
1. **Continuous**: WAL 아카이빙 (5분마다)
2. **Daily**: pg_dump 전체 백업
3. **Snapshot**: 워크스페이스 파일 S3 백업

---

## 3. 보안 강화

### 3.1 OAuth2.0/OIDC 통합

#### 지원 제공자
- Google (Google Workspace)
- GitHub
- Microsoft (Azure AD)

```typescript
passport.use(
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    let user = await userStore.getByEmail(profile.emails[0].value);
    if (!user) {
      user = await userStore.createFromOAuth({ ... });
    }
    done(null, user);
  })
);
```

### 3.2 RBAC 고도화

#### 역할-권한 모델
```typescript
enum Role {
  VIEWER = 'viewer',
  DEVELOPER = 'developer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

enum Permission {
  SESSION_VIEW = 'session:view',
  SESSION_CREATE = 'session:create',
  SESSION_START = 'session:start',
  WORKSPACE_CREATE = 'workspace:create',
  USER_MANAGE = 'user:manage',
}
```

### 3.3 API Rate Limiting

#### 계층별 제한
1. **IP 기반**: DDoS 방어 (100r/s)
2. **사용자 기반**: 남용 방지
3. **플랜별**: 과금 모델 지원

### 3.4 컨테이너 보안 (PTY 격리)

#### Docker-in-Docker
```typescript
class DockerPtyManager {
  async startSession(sessionId: string, workspacePath: string) {
    const container = await docker.createContainer({
      Image: 'claude-code-sandbox:latest',
      HostConfig: {
        Memory: 512 * 1024 * 1024,
        CpuQuota: 50000,
        NetworkMode: 'none',
        ReadonlyRootfs: true,
        Binds: [`${workspacePath}:/workspace:rw`],
      }
    });
    await container.start();
  }
}
```

---

## 4. 실시간 기능 강화

### 4.1 WebRTC 협업

#### Signaling Server
```typescript
class SignalingServer {
  private rooms = new Map<string, Set<WebSocket>>();

  onMessage(ws, message) {
    switch (message.type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.broadcast(message.sessionId, message, ws);
        break;
    }
  }
}
```

### 4.2 CRDT 실시간 파일 동기화

#### Yjs 기반 구현
```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'wss://collab.example.com',
  `${sessionId}:${filePath}`,
  ydoc
);
```

### 4.3 멀티 커서 지원

- `provider.awareness` 활용
- 원격 사용자 커서 위치 실시간 공유
- Monaco Editor Decoration API로 렌더링

---

## 5. 확장성

### 5.1 Kubernetes 배포

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-code-cloud
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: registry/claude-code-cloud:latest
        resources:
          limits:
            cpu: "2"
            memory: 2Gi

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 70
```

### 5.2 수평 확장 아키텍처

#### Stateless 서비스
- 세션 상태 → Redis
- WebSocket → Redis Pub/Sub
- 파일 스토리지 → S3/MinIO

---

## 종합 로드맵

| Phase | 항목 | 기간 |
|-------|------|------|
| 1 | PostgreSQL + Redis | 1-2개월 |
| 1 | API Gateway + Rate Limiting | 1-2주 |
| 2 | 마이크로서비스 분리 | 2-3개월 |
| 2 | Docker-in-Docker 격리 | 1개월 |
| 3 | WebRTC 협업 | 2개월 |
| 3 | Kubernetes 배포 | 2-3개월 |
| 4 | CRDT 실시간 편집 | 2-3개월 |
| 4 | 다중 리전 배포 | 3개월+ |

---

## 예상 비용

### 인프라 (월간, AWS 기준)
- EKS 클러스터: $150
- EC2 인스턴스 (10x): $500
- RDS PostgreSQL: $350
- ElastiCache Redis: $250
- S3 (1TB): $25
- **총**: ~$1,700/월
