---
id: k-ccc-websocket-routing
title: "WebSocket 경로 기반 라우팅 아키텍처"
type: implementation
status: current
created: '2025-12-16T00:00:00.000Z'
updated: '2025-12-29T04:00:00.000Z'
links:
  - k-ccc-architecture
  - k-ccc-overview
tags:
  - websocket
  - routing
  - architecture
  - collaboration
codeRefs:
  - src/server/websocket/WsServer.ts
---

# WebSocket 경로 기반 라우팅 아키텍처

## 배경/문제

터미널이 표시되지 않는 문제 발생. WsServer가 모든 WebSocket 연결을 터미널로 처리하여 Collaboration WebSocket(`/ws/collab`)이 작동하지 않았습니다.

## 검토한 대안

1. **쿼리 파라미터 기반 분기**: 기존 구조 유지하지만 확장성 제한
2. **별도 WebSocket 서버**: 완전한 분리하지만 포트 추가
3. **HTTP 서버 기반 upgrade 라우팅**: 표준 패턴 ✓

## 최종 결정

HTTP 서버 기반 upgrade 이벤트에서 경로별 라우팅.

## 라우팅 구조

```
/ws          -> 터미널 WebSocket (PTY I/O)
/ws/collab   -> Collaboration WebSocket
                - presence: 참여자 상태
                - chat: 실시간 채팅
                - cursor: 커서 위치 공유
```

## 구현

```typescript
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

  if (pathname === '/ws') {
    terminalWss.handleUpgrade(request, socket, head, (ws) => {
      terminalWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/collab') {
    collabWss.handleUpgrade(request, socket, head, (ws) => {
      collabWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});
```

## 교훈

- 단일 포트에서 다중 WebSocket 서비스 운영 가능
- HTTP upgrade 이벤트를 직접 처리하면 유연한 라우팅 구현
- 표준 패턴을 따르면 향후 확장이 용이
