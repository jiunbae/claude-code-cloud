# UX 및 기능 고도화 방안

> Agent 2 (Claude) 조사 결과
> 조사일: 2025-12-15

---

## 1. 터미널 UX 개선

### 1.1 멀티 탭/분할 터미널

#### 구현 방안
- 각 탭마다 독립적인 `terminal-${index}` 식별자
- `react-split-pane`으로 수평/수직 분할
- 탭 닫기, 이름 변경, 재정렬

```typescript
export function MultiTerminal({ sessionId }) {
  const [tabs, setTabs] = useState([{ id: 0, name: 'Claude', type: 'claude' }]);

  return (
    <TabContainer>
      {tabs.map(tab => (
        <Tab key={tab.id}>
          <Terminal sessionId={sessionId} terminal={tab.type} />
        </Tab>
      ))}
    </TabContainer>
  );
}
```

#### 기술적 고려사항
- xterm.js WebGL 컨텍스트 제한 (16~32개)
- 해결: Canvas 렌더러 대체

### 1.2 터미널 테마 커스터마이징

#### 지원 테마
- Tokyo Night (현재)
- Dracula
- Solarized Dark
- GitHub Dark
- Monokai

```typescript
const themes = {
  'tokyo-night': { background: '#1a1b26', foreground: '#a9b1d6' },
  'dracula': { background: '#282a36', foreground: '#f8f8f2' },
};

// localStorage 저장
const [theme, setTheme] = useState(
  localStorage.getItem('terminal-theme') || 'tokyo-night'
);
```

### 1.3 키보드 단축키 시스템

```typescript
const shortcuts = {
  'ctrl+t': () => createNewTerminal(),
  'ctrl+w': () => closeCurrentTerminal(),
  'ctrl+tab': () => switchToNextTab(),
  'ctrl+shift+d': () => splitTerminalHorizontal(),
  'ctrl+shift+e': () => splitTerminalVertical(),
  'ctrl+shift+f': () => toggleFullscreen(),
  'ctrl+?': () => showShortcutsModal(),
};
```

### 1.4 명령어 히스토리/자동완성

- Tab 키 자동완성
- Ctrl+R 히스토리 검색
- 자주 사용하는 명령어 북마크
- AI 기반 명령어 제안 (Claude API)

---

## 2. 코드 에디터 통합

### 2.1 Monaco Editor 통합

#### 선택 이유
- VS Code와 동일한 에디터 엔진
- 뛰어난 TypeScript/JavaScript 지원
- React 19 호환 (@monaco-editor/react v4.7.0)
- Next.js 통합 간편

```typescript
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div>Loading editor...</div>
});

export function CodeEditor({ filePath }) {
  return (
    <MonacoEditor
      height="100%"
      language={detectLanguage(filePath)}
      theme="vs-dark"
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        automaticLayout: true,
        formatOnPaste: true,
      }}
    />
  );
}
```

### 2.2 실시간 코드 편집

#### 충돌 해결 전략
1. **Pessimistic Locking**: 한 명만 편집 (간단)
2. **Optimistic Locking**: 마지막 저장 승리 (충돌 위험)
3. **CRDT**: Yjs 라이브러리 (복잡하지만 강력)

```typescript
import { MonacoBinding } from 'y-monaco';
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const ytext = ydoc.getText('monaco');

const binding = new MonacoBinding(
  ytext,
  editor.getModel(),
  new Set([editor]),
  provider.awareness
);
```

### 2.3 Git Diff 시각화

```typescript
import { DiffView } from '@git-diff-view/react';

export function GitDiffViewer({ sessionId, filePath }) {
  const [diffData, setDiffData] = useState([]);

  return (
    <DiffView
      diffFile={diffData}
      renderContent={(content) => (
        <SyntaxHighlighter language="typescript">
          {content}
        </SyntaxHighlighter>
      )}
    />
  );
}
```

### 2.4 문법 강조 및 자동완성

#### 지원 언어
- JavaScript/TypeScript (기본)
- Python, Go, Rust, Java
- HTML/CSS/JSON
- Markdown (미리보기 포함)

---

## 3. 협업 기능 강화

### 3.1 실시간 화면 공유

```typescript
export function ScreenShareProvider({ sessionId }) {
  const startScreenShare = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false
    });

    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    stream.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, stream);
    });
  };
}
```

#### 보안 고려사항
- HTTPS 필수
- TURN 서버 구성
- owner/editor만 공유 가능

### 3.2 채팅/음성 통화

```typescript
export function ChatPanel({ sessionId }) {
  const [messages, setMessages] = useState([]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
      </div>
      <ChatInput onSend={(text) => sendMessage({ type: 'chat:message', text })} />
    </div>
  );
}

export function VoiceChat({ sessionId }) {
  const startVoiceChat = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true }
    });
    // WebRTC 연결
  };
}
```

### 3.3 코드 리뷰 기능

```typescript
interface CodeComment {
  id: string;
  filePath: string;
  line: number;
  author: string;
  content: string;
  resolved: boolean;
  replies: CodeCommentReply[];
}

// Monaco Decoration으로 주석 표시
editor.deltaDecorations([], [
  {
    range: new monaco.Range(comment.line, 1, comment.line, 1),
    options: {
      glyphMarginClassName: 'comment-glyph',
      hoverMessage: { value: comment.content }
    }
  }
]);
```

### 3.4 팀 워크스페이스

```typescript
interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  workspaces: Workspace[];
}

interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
}
```

---

## 4. 대시보드 개선

### 4.1 활동 로그/감사 추적

```typescript
interface ActivityLog {
  id: string;
  userId: string;
  sessionId: string;
  action: 'session.created' | 'file.edited' | 'user.joined';
  metadata: Record<string, any>;
  timestamp: Date;
}

// 필터링 옵션
// - 시간 범위, 사용자별, 활동 타입별
```

### 4.2 사용량 통계 및 차트

```typescript
import { LineChart, BarChart, PieChart } from 'recharts';

export function UsageDashboard() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <StatsCard title="Active Sessions" value={stats.activeSessions} />
      <LineChart data={sessionHistory}>
        <Line dataKey="sessions" stroke="#8884d8" />
      </LineChart>
      <PieChart data={storageData}>
        <Pie dataKey="value" />
      </PieChart>
    </div>
  );
}
```

### 4.3 알림 시스템

```typescript
type NotificationType =
  | 'session.invited'
  | 'comment.mention'
  | 'session.error'
  | 'system.maintenance';

export function NotificationCenter() {
  return (
    <Popover>
      <PopoverTrigger>
        <button>
          {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        {notifications.map(n => <NotificationItem notification={n} />)}
      </PopoverContent>
    </Popover>
  );
}
```

### 4.4 세션 템플릿

```typescript
const templates = [
  {
    name: 'Node.js Project',
    description: 'Express.js + TypeScript starter',
    files: [
      { path: 'package.json', content: '...' },
      { path: 'tsconfig.json', content: '...' },
    ]
  },
  {
    name: 'Python Data Science',
    files: [{ path: 'requirements.txt', content: 'pandas\nnumpy' }]
  },
  {
    name: 'React App',
    files: [{ path: 'vite.config.ts', content: '...' }]
  }
];
```

---

## 5. 모바일/태블릿 지원

### 5.1 반응형 UI 개선

```typescript
export function MobileTerminal({ sessionId }) {
  return (
    <div className="flex flex-col h-screen">
      <MobileHeader />
      <SwipeableTabs>
        <Tab label="Claude"><Terminal terminal="claude" /></Tab>
        <Tab label="Files"><MobileFileExplorer /></Tab>
        <Tab label="Chat"><ChatPanel /></Tab>
      </SwipeableTabs>
      <MobileActionBar />
    </div>
  );
}
```

### 5.2 터치 제스처 지원

```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => setActiveTab(Math.min(activeTab + 1, tabs.length - 1)),
  onSwipedRight: () => setActiveTab(Math.max(activeTab - 1, 0)),
  preventScrollOnSwipe: true,
});

const gestures = {
  'swipe-left': 'Next tab',
  'swipe-right': 'Previous tab',
  'pinch-zoom': 'Adjust font size',
  'long-press': 'Context menu',
};
```

### 5.3 PWA 지원

#### next-pwa 설정
```typescript
// next.config.ts
import withPWA from 'next-pwa';

export default withPWA({
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
  }
});
```

#### Web App Manifest
```typescript
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Claude Code Cloud',
    short_name: 'Claude Code',
    display: 'standalone',
    background_color: '#1a1b26',
    theme_color: '#3b82f6',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ],
    shortcuts: [
      { name: 'New Session', url: '/?action=new-session' }
    ]
  };
}
```

#### 설치 프롬프트
```typescript
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  return showInstall && (
    <div className="fixed bottom-4 bg-blue-600 p-4 rounded-lg">
      <button onClick={() => deferredPrompt.prompt()}>Install</button>
    </div>
  );
}
```

---

## 구현 우선순위

### Phase 1 (1-2개월)
| 항목 | 효과 |
|------|------|
| 멀티 탭 터미널 | 높은 사용자 요구 |
| 터미널 테마 | 빠른 구현, 높은 만족도 |
| 키보드 단축키 | 생산성 향상 |
| PWA 지원 | 모바일 접근성 |

### Phase 2 (2-3개월)
| 항목 | 효과 |
|------|------|
| Monaco Editor | 핵심 기능 |
| Git Diff 시각화 | 코드 리뷰 준비 |
| 실시간 편집 | 협업 기초 |
| 자동완성 | 개발자 경험 |

### Phase 3 (2-3개월)
| 항목 | 효과 |
|------|------|
| 채팅 시스템 | 간단, 높은 효용 |
| 코드 리뷰 | 에디터 통합 후 |
| 화면 공유 | 복잡하지만 강력 |
| 음성 통화 | 선택적 |

### Phase 4 (1-2개월)
| 항목 | 효과 |
|------|------|
| 활동 로그 | 감사 추적 |
| 사용량 통계 | 운영 인사이트 |
| 알림 시스템 | 사용자 참여 |
| 세션 템플릿 | 온보딩 개선 |

---

## 참고 자료

- [Monaco Editor React](https://www.npmjs.com/package/@monaco-editor/react)
- [xterm.js Docs](https://xtermjs.org/)
- [React WebRTC Guide](https://www.videosdk.live/developer-hub/webrtc/react-webrtc-video-call)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [git-diff-view/react](https://www.npmjs.com/package/@git-diff-view/react)
