# 사용자 인증 및 계정 시스템 구현 계획

## 개요

Claude Code Cloud에 로컬 계정 기반 다중 사용자 인증 시스템을 추가합니다.

### 요구사항
- **인증 방식**: 로컬 계정 (이메일/비밀번호 회원가입)
- **사용자 규모**: 다중 사용자 지원
- **세션 소유권**: 각 사용자가 자신의 세션만 관리

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Browser                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Login Page  │ │ Register    │ │ Dashboard   │           │
│  │             │ │ Page        │ │ (Protected) │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
              │ JWT Token (Cookie)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Auth API    │ │ Middleware  │ │ Session API │           │
│  │ (register,  │ │ (JWT verify)│ │ (filtered   │           │
│  │  login)     │ │             │ │  by owner)  │           │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘           │
│         │               │               │                   │
│         ▼               ▼               ▼                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    SQLite Database                      ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐ ││
│  │  │ users   │ │sessions │ │share_   │ │session_access │ ││
│  │  │         │ │(+owner) │ │tokens   │ │               │ ││
│  │  └─────────┘ └─────────┘ └─────────┘ └───────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 데이터베이스 스키마

### 1. users 테이블 (신규)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- nanoid(12)
  email TEXT UNIQUE NOT NULL,             -- 로그인 ID
  username TEXT UNIQUE NOT NULL,          -- 표시 이름
  password_hash TEXT NOT NULL,            -- bcrypt 해시
  created_at TEXT NOT NULL,               -- ISO 8601
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  is_active INTEGER DEFAULT 1             -- 계정 활성화 상태
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### 2. sessions 테이블 수정

```sql
-- 기존 테이블에 컬럼 추가
ALTER TABLE sessions ADD COLUMN owner_id TEXT;
ALTER TABLE sessions ADD COLUMN is_public INTEGER DEFAULT 0;

-- 외래키 (SQLite는 ALTER로 추가 불가, 마이그레이션 필요)
-- owner_id REFERENCES users(id) ON DELETE CASCADE

CREATE INDEX idx_sessions_owner ON sessions(owner_id);
```

### 3. session_access 테이블 (신규, 선택적)

```sql
-- 다른 사용자에게 세션 접근 권한 부여
CREATE TABLE session_access (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL,               -- 'view' | 'interact' | 'admin'
  granted_at TEXT NOT NULL,
  granted_by TEXT,                        -- 권한 부여한 사용자
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(session_id, user_id)
);
```

---

## API 엔드포인트

### 인증 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 정보 |
| PATCH | `/api/auth/me` | 프로필 수정 |
| POST | `/api/auth/change-password` | 비밀번호 변경 |

### 인증 플로우

```
┌──────────┐     POST /auth/register      ┌──────────┐
│  Client  │ ──────────────────────────▶  │  Server  │
│          │     {email, username, pw}    │          │
│          │                              │          │
│          │  ◀──────────────────────────  │          │
│          │     Set-Cookie: auth_token   │          │
└──────────┘                              └──────────┘

┌──────────┐     POST /auth/login         ┌──────────┐
│  Client  │ ──────────────────────────▶  │  Server  │
│          │     {email, password}        │          │
│          │                              │          │
│          │  ◀──────────────────────────  │          │
│          │     Set-Cookie: auth_token   │          │
└──────────┘     + user data              └──────────┘
```

---

## JWT 토큰 구조

```typescript
interface JWTPayload {
  userId: string;      // 사용자 ID
  email: string;       // 이메일
  username: string;    // 사용자명
  iat: number;         // 발급 시간
  exp: number;         // 만료 시간 (7일)
}
```

### 토큰 저장 방식
- **HttpOnly Cookie**: XSS 공격 방지
- **Secure Flag**: HTTPS에서만 전송 (프로덕션)
- **SameSite=Lax**: CSRF 방지

---

## 파일 구조

```
/src
├── app/
│   ├── (auth)/                          # 인증 그룹 라우트
│   │   ├── login/
│   │   │   └── page.tsx                 # 로그인 페이지
│   │   ├── register/
│   │   │   └── page.tsx                 # 회원가입 페이지
│   │   └── layout.tsx                   # 인증 레이아웃 (비로그인용)
│   │
│   ├── (protected)/                     # 보호된 라우트 그룹
│   │   ├── layout.tsx                   # 인증 체크 레이아웃
│   │   ├── page.tsx                     # 대시보드 (기존 page.tsx 이동)
│   │   └── session/
│   │       └── [id]/
│   │           └── page.tsx             # 세션 상세
│   │
│   └── api/
│       └── auth/
│           ├── register/
│           │   └── route.ts             # POST 회원가입
│           ├── login/
│           │   └── route.ts             # POST 로그인
│           ├── logout/
│           │   └── route.ts             # POST 로그아웃
│           └── me/
│               └── route.ts             # GET/PATCH 프로필
│
├── server/
│   └── auth/
│       ├── UserStore.ts                 # 사용자 DB 작업
│       ├── jwt.ts                       # JWT 생성/검증
│       ├── password.ts                  # bcrypt 해싱
│       └── middleware.ts                # 인증 미들웨어 헬퍼
│
├── components/
│   └── Auth/
│       ├── LoginForm.tsx                # 로그인 폼
│       ├── RegisterForm.tsx             # 회원가입 폼
│       ├── AuthGuard.tsx                # 클라이언트 인증 체크
│       └── UserMenu.tsx                 # 헤더 사용자 메뉴
│
├── hooks/
│   └── useAuth.ts                       # 인증 상태 훅
│
├── stores/
│   └── authStore.ts                     # Zustand 인증 스토어
│
└── types/
    └── auth.ts                          # 인증 관련 타입
```

---

## 구현 상세

### 1. UserStore 클래스

```typescript
// /src/server/auth/UserStore.ts
class UserStore {
  // 사용자 생성
  create(email: string, username: string, passwordHash: string): User;

  // 이메일로 조회
  getByEmail(email: string): User | null;

  // ID로 조회
  getById(id: string): User | null;

  // 사용자명으로 조회
  getByUsername(username: string): User | null;

  // 프로필 업데이트
  update(id: string, updates: Partial<User>): User | null;

  // 마지막 로그인 시간 업데이트
  updateLastLogin(id: string): void;

  // 비밀번호 변경
  updatePassword(id: string, newPasswordHash: string): boolean;
}
```

### 2. JWT 유틸리티

```typescript
// /src/server/auth/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

export function signToken(payload: JWTPayload): string;
export function verifyToken(token: string): JWTPayload | null;
export function getTokenFromCookies(cookies: RequestCookies): string | null;
```

### 3. 비밀번호 해싱

```typescript
// /src/server/auth/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string>;
export async function verifyPassword(password: string, hash: string): Promise<boolean>;
```

### 4. 인증 미들웨어 헬퍼

```typescript
// /src/server/auth/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// API 라우트에서 사용
export async function requireAuth(request: NextRequest): Promise<{
  user: User;
  userId: string;
} | NextResponse>;

// 세션 접근 권한 확인
export async function requireSessionAccess(
  userId: string,
  sessionId: string,
  permission: 'view' | 'interact' | 'admin'
): Promise<boolean>;
```

### 5. 클라이언트 인증 훅

```typescript
// /src/hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 현재 사용자 조회
  const fetchUser = async () => { ... };

  // 로그인
  const login = async (email: string, password: string) => { ... };

  // 회원가입
  const register = async (email: string, username: string, password: string) => { ... };

  // 로그아웃
  const logout = async () => { ... };

  return { user, loading, login, register, logout, isAuthenticated: !!user };
}
```

---

## UI 컴포넌트

### 로그인 페이지

```
┌─────────────────────────────────────┐
│         Claude Code Cloud           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Email                        │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Password                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │         Sign In              │   │
│  └─────────────────────────────┘   │
│                                     │
│  Don't have an account? Register    │
└─────────────────────────────────────┘
```

### 회원가입 페이지

```
┌─────────────────────────────────────┐
│         Create Account              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Username                     │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Email                        │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Password                     │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Confirm Password             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       Create Account         │   │
│  └─────────────────────────────┘   │
│                                     │
│  Already have an account? Sign In   │
└─────────────────────────────────────┘
```

### 헤더 사용자 메뉴

```
┌─────────────────────────────────────────────────────────┐
│ [CC] Claude Code Cloud              [사용자 아바타 ▼]   │
│                                     ┌───────────────┐   │
│                                     │ username      │   │
│                                     │ user@email    │   │
│                                     │───────────────│   │
│                                     │ Settings      │   │
│                                     │ Logout        │   │
│                                     └───────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 보안 고려사항

### 1. 비밀번호 정책
- 최소 8자 이상
- 영문, 숫자 포함 권장
- bcrypt로 해싱 (salt rounds: 12)

### 2. 토큰 보안
- JWT Secret: 최소 32바이트 랜덤 문자열
- HttpOnly Cookie로 저장
- 만료 시간: 7일 (설정 가능)

### 3. API 보안
- 모든 세션 API에 인증 필수
- 세션 소유자만 수정/삭제 가능
- Rate limiting 고려 (추후)

### 4. 입력 검증
- 이메일 형식 검증
- 사용자명: 3-20자, 영문/숫자/언더스코어
- SQL Injection 방지 (parameterized queries)

---

## 환경 변수

```env
# .env.local
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# 기존 변수
DATABASE_PATH=./data/db/claude-cloud.db
WORKSPACE_ROOT=/home/jiun/workspace
```

---

## 구현 순서

### Phase 1: 기반 구축
1. [ ] `bcrypt`, `jsonwebtoken` 패키지 설치
2. [ ] 환경 변수 설정 (.env.local)
3. [ ] 데이터베이스 마이그레이션 (users 테이블, sessions 수정)
4. [ ] UserStore 클래스 구현
5. [ ] JWT 유틸리티 구현
6. [ ] 비밀번호 해싱 유틸리티 구현

### Phase 2: 인증 API
7. [ ] POST /api/auth/register 구현
8. [ ] POST /api/auth/login 구현
9. [ ] POST /api/auth/logout 구현
10. [ ] GET /api/auth/me 구현
11. [ ] 인증 미들웨어 헬퍼 구현

### Phase 3: 기존 API 보호
12. [ ] SessionStore 수정 (owner_id 지원)
13. [ ] GET /api/sessions - 소유자 필터링
14. [ ] POST /api/sessions - owner_id 설정
15. [ ] 기타 세션 API 인증 추가

### Phase 4: 프론트엔드
16. [ ] authStore (Zustand) 구현
17. [ ] useAuth 훅 구현
18. [ ] 로그인 페이지 구현
19. [ ] 회원가입 페이지 구현
20. [ ] AuthGuard 컴포넌트 구현
21. [ ] 라우트 그룹 재구성 ((auth), (protected))
22. [ ] Header에 UserMenu 추가

### Phase 5: WebSocket 인증
23. [ ] WebSocket 연결 시 토큰 검증
24. [ ] 세션 접근 권한 확인

---

## 마이그레이션 전략

기존 데이터가 있는 경우:

```sql
-- 1. users 테이블 생성
CREATE TABLE users (...);

-- 2. 기본 관리자 계정 생성
INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
VALUES ('admin', 'admin@local', 'admin', '<bcrypt_hash>', datetime('now'), datetime('now'));

-- 3. sessions 테이블 수정
ALTER TABLE sessions ADD COLUMN owner_id TEXT DEFAULT 'admin';
ALTER TABLE sessions ADD COLUMN is_public INTEGER DEFAULT 0;

-- 4. 기존 세션을 관리자 소유로 설정
UPDATE sessions SET owner_id = 'admin' WHERE owner_id IS NULL OR owner_id = '';
```

---

## 테스트 계획

### 단위 테스트
- UserStore CRUD 작업
- JWT 생성/검증
- 비밀번호 해싱/검증

### 통합 테스트
- 회원가입 플로우
- 로그인/로그아웃 플로우
- 세션 접근 권한 검증

### E2E 테스트
- 회원가입 → 로그인 → 세션 생성 → 로그아웃
- 다른 사용자 세션 접근 차단 확인

---

## 향후 확장

1. **이메일 인증**: 회원가입 시 이메일 확인
2. **비밀번호 재설정**: 이메일로 재설정 링크 발송
3. **OAuth 연동**: Google, GitHub 로그인 추가
4. **2FA**: TOTP 기반 2단계 인증
5. **세션 관리**: 로그인된 기기 목록, 원격 로그아웃
6. **역할 기반 권한**: admin, user 역할 구분
