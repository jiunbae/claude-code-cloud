# 성능 및 인프라 고도화 방안

> Agent 3 (Claude) 조사 결과
> 조사일: 2025-12-15

---

## 1. 프론트엔드 성능 최적화

### 1.1 번들 사이즈 최적화

#### Next.js 설정 개선
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  experimental: {
    optimizePackageImports: ['@xterm/xterm', '@xterm/addon-fit'],
  },
};
```

#### 동적 Import 확장
```typescript
const FileExplorer = dynamic(
  () => import('@/components/FileExplorer/FileExplorer'),
  { loading: () => <div>Loading...</div>, ssr: false }
);

const Terminal = dynamic(
  () => import('@/components/Terminal/Terminal'),
  { loading: () => <div>Loading...</div>, ssr: false }
);
```

#### 예상 효과
- 초기 번들: 500KB → 300KB (40% 감소)
- FCP: 15-20% 개선
- TTI: 25% 개선

### 1.2 캐싱 전략

#### API 캐시 헤더
```typescript
export async function GET(request: Request) {
  const sessions = sessionStore.getAccessible(userId);
  const response = NextResponse.json(sessions);

  response.headers.set(
    'Cache-Control',
    'public, s-maxage=10, stale-while-revalidate=59'
  );

  return response;
}
```

#### React Query 최적화
```typescript
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSession(sessionId),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
```

---

## 2. 백엔드 성능 최적화

### 2.1 데이터베이스 최적화

#### 연결 풀링 및 Pragma 설정
```typescript
class DatabasePool {
  static getConnection(): Database.Database {
    if (!this.instance) {
      this.instance = new Database(DB_PATH);

      this.instance.pragma('journal_mode = WAL');
      this.instance.pragma('synchronous = NORMAL');
      this.instance.pragma('cache_size = -64000'); // 64MB
      this.instance.pragma('temp_store = MEMORY');
      this.instance.pragma('mmap_size = 30000000000');
      this.instance.pragma('busy_timeout = 5000');
    }
    return this.instance;
  }
}
```

#### Prepared Statements 캐싱
```typescript
private _stmtCache: Map<string, Database.Statement> = new Map();

private getStatement(key: string, sql: string): Database.Statement {
  if (!this._stmtCache.has(key)) {
    this._stmtCache.set(key, this.db.prepare(sql));
  }
  return this._stmtCache.get(key)!;
}
```

#### 인덱스 최적화
```sql
CREATE INDEX idx_sessions_owner_status ON sessions(owner_id, status);
CREATE INDEX idx_sessions_workspace_active ON sessions(workspace_id, last_active_at DESC);
CREATE INDEX idx_sessions_list_view ON sessions(owner_id, status, last_active_at DESC, id, name);
```

### 2.2 WebSocket 최적화

#### 메시지 압축 및 배칭
```typescript
this.wss = new WebSocketServer({
  port,
  perMessageDeflate: {
    zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
    threshold: 1024
  }
});

// 메시지 배칭 (60fps)
this.flushInterval = setInterval(() => this.flushBuffers(), 16);

private flushBuffers(): void {
  this.messageBuffer.forEach((messages, roomKey) => {
    if (messages.length === 0) return;

    const batchedMessage = {
      type: 'terminal:output:batch',
      data: messages.map(m => m.data).join(''),
    };

    this.broadcast(roomKey, batchedMessage);
    this.messageBuffer.set(roomKey, []);
  });
}
```

#### 예상 효과
- 네트워크 대역폭: 50-70% 절감
- 터미널 렌더링: 30% 개선

### 2.3 메모리 관리

#### 메모리 모니터링
```typescript
class MemoryMonitor extends EventEmitter {
  start(intervalMs = 60000): void {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedPercent = usage.heapUsed / v8.getHeapStatistics().heap_size_limit;

      if (heapUsedPercent > 0.9) {
        this.emit('critical', { usage, percent: heapUsedPercent });
        this.forceGC();
      }
    }, intervalMs);
  }
}
```

#### PTY 세션 정리
```typescript
const MAX_OUTPUT_BUFFER_SIZE = 1000;
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

private cleanupStaleSessions(): void {
  const now = Date.now();
  this.sessions.forEach((session, key) => {
    if (session.status === 'idle' && (now - session.lastActivity) > MAX_SESSION_AGE_MS) {
      this.sessions.delete(key);
    }
  });
}
```

---

## 3. 인프라 고도화

### 3.1 CI/CD 파이프라인 강화

#### 멀티 스테이지 CI
```yaml
# .github/workflows/ci.yml
jobs:
  test:
    steps:
      - run: pnpm lint
      - run: pnpm tsc --noEmit
      - run: pnpm build
      - run: pnpm test

  security:
    steps:
      - uses: aquasecurity/trivy-action@master
      - run: pnpm audit --audit-level=high

  docker-build:
    needs: [test, security]
    steps:
      - uses: docker/build-push-action@v6
        with:
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

#### Blue-Green 배포
```yaml
# 배포 스크립트
- name: Deploy with Blue-Green
  script: |
    docker compose pull
    docker compose up -d --scale app=2 app  # 새 컨테이너 시작

    # 헬스체크
    for i in {1..30}; do
      curl -f http://localhost:3000/api/health && break
    done

    docker compose up -d --scale app=1 app  # 이전 컨테이너 제거
```

### 3.2 모니터링/로깅 시스템

#### 구조화된 로깅 (Pino)
```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { env: process.env.NODE_ENV, service: 'claude-code-cloud' },
});
```

#### Prometheus 메트릭
```typescript
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
});

export const wsConnectionsActive = new Gauge({
  name: 'websocket_connections_active',
});

export const ptySessionsActive = new Gauge({
  name: 'pty_sessions_active',
});
```

#### Grafana + Prometheus + Loki
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}

  loki:
    image: grafana/loki:latest

  promtail:
    image: grafana/promtail:latest
```

### 3.3 자동 스케일링

#### 수평 확장 아키텍처
```yaml
# docker-compose.scale.yml
services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf

  app:
    deploy:
      replicas: 3
      resources:
        limits: { cpus: '2', memory: 2G }
        reservations: { cpus: '0.5', memory: 512M }

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb
```

#### Redis 기반 세션 공유
```typescript
class WebSocketCluster {
  async broadcastToSession(sessionId: string, message: any) {
    await redis.publish(`session:${sessionId}:broadcast`, JSON.stringify(message));
  }

  constructor() {
    redis.subscribe('session:*:broadcast', (channel, message) => {
      const sessionId = channel.split(':')[1];
      const clients = this.getClientsForSession(sessionId);
      clients.forEach(ws => ws.send(message));
    });
  }
}
```

---

## 4. 비용 최적화

### 4.1 컨테이너 경량화

#### Alpine 기반 멀티스테이지 빌드
```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ git

FROM base AS deps
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS runner
RUN apk add --no-cache curl git procps tini
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node_modules/.bin/concurrently", "next start", "tsx src/server/websocket-server.ts"]
```

#### 예상 효과
- 이미지 크기: 2GB → 800MB (60% 감소)
- 빌드 시간: 40% 단축

### 4.2 리소스 제한

```yaml
services:
  app:
    deploy:
      resources:
        limits: { cpus: '2', memory: 2G, pids: 100 }
        reservations: { cpus: '0.5', memory: 512M }
    environment:
      - NODE_OPTIONS=--max-old-space-size=1536
```

### 4.3 스토리지 관리

#### 로그 로테이션
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        compress: "true"
```

#### 데이터베이스 정리 스케줄러
```typescript
class CleanupScheduler {
  private async runCleanup(): Promise<void> {
    // 90일 이상 오래된 세션 삭제
    db.prepare(`
      DELETE FROM sessions
      WHERE status = 'idle' AND last_active_at < ?
    `).run(ninetyDaysAgo.toISOString());

    // VACUUM
    db.pragma('incremental_vacuum(10000)');
  }
}
```

---

## 5. 장애 대응

### 5.1 헬스체크 강화

```typescript
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    disk: ComponentHealth;
    memory: ComponentHealth;
  };
}

export async function GET(request: Request) {
  const health = {
    status: 'healthy',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      disk: await checkDisk(),
      memory: checkMemory(),
    }
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
```

### 5.2 자동 복구 메커니즘

#### 프로세스 감시
```typescript
class ProcessMonitor extends EventEmitter {
  setupHandlers(): void {
    process.on('uncaughtException', (error) => this.handleCrash(error));
    process.on('unhandledRejection', (reason) => this.handleCrash(reason));
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  private handleCrash(error: Error): void {
    this.crashCount++;
    if (this.crashCount >= 5) process.exit(1);
    this.emit('crash', { error, crashCount: this.crashCount });
  }
}
```

#### 서킷 브레이커
```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN' && Date.now() < this.nextAttemptTime) {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### 5.3 백업 전략

#### 자동 백업 스케줄러
```typescript
class BackupScheduler {
  start(): void {
    // 매 6시간
    new CronJob('0 */6 * * *', () => this.createBackup('frequent'));
    // 매일 자정
    new CronJob('0 0 * * *', () => this.createBackup('daily'));
    // 매주 일요일
    new CronJob('0 2 * * 0', () => this.createBackup('weekly'));
  }

  private async createBackup(type: string): Promise<void> {
    await DatabasePool.backup(backupPath);
    await execAsync(`gzip ${backupPath}`);
    await this.cleanupOldBackups(type);
  }
}
```

#### 보관 정책
- frequent: 2일
- daily: 30일
- weekly: 90일

### 5.4 재해 복구 체크리스트

1. **장애 평가**: 범위, 영향 사용자, 우선순위
2. **즉시 조치**: 알림, 상태 페이지, 로그 수집
3. **DB 복구**: 백업 복원, 서비스 재시작
4. **검증**: 헬스체크, 기능 테스트
5. **사후 조치**: RCA, 재발 방지

---

## 종합 요약

### 우선순위별 로드맵

| Phase | 항목 | 기간 | 효과 |
|-------|------|------|------|
| 1 | 동적 import, 캐시 헤더 | 1-2주 | 30% 성능 향상 |
| 1 | DB 풀링, 헬스체크 | 1-2주 | 안정성 20% |
| 2 | Redis 캐싱 | 2-4주 | DB 부하 60% 감소 |
| 2 | 모니터링 (Prometheus) | 2-4주 | 완전한 관찰성 |
| 3 | 수평 확장 (Redis Pub/Sub) | 1-2개월 | 처리량 300% |
| 3 | 컨테이너 경량화 | 1-2주 | 이미지 60% 감소 |
| 4 | Kubernetes | 2-3개월 | 자동 스케일링 |

### 예상 효과

| 지표 | 현재 | 개선 후 | 변화 |
|------|------|---------|------|
| API 응답 | 200ms | 80ms | 60% 개선 |
| 동시 연결 | 100 | 500 | 400% 증가 |
| 이미지 크기 | 2GB | 800MB | 60% 감소 |
| 메모리 | 1.5GB | 900MB | 40% 감소 |
| 가용성 | 99% | 99.9% | - |
| 복구 시간 | 1시간 | 15분 | 75% 단축 |
