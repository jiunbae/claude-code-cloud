---
id: k-ccc-security-decision
title: "API 키 암호화 전략 의사결정 (AES-256-GCM)"
type: decision
status: current
created: '2025-12-15T00:00:00.000Z'
updated: '2025-12-29T04:00:00.000Z'
links:
  - k-ccc-overview
  - k-ccc-architecture
tags:
  - security
  - encryption
  - api-keys
  - aes-gcm
codeRefs:
  - src/server/crypto/SecretStore.ts
decision:
  scope: design
  decisionStatus: accepted
  rationale: "AEAD 보안과 자체 구현 가능성의 균형"
  alternatives:
    - name: "평문 저장"
      description: "암호화 없이 직접 저장"
      pros: ["구현 간단"]
      cons: ["보안 취약", "노출 시 피해 큼"]
      chosen: false
      rejectionReason: "보안 요구사항 미충족"
    - name: "AES-256-CBC"
      description: "널리 사용되는 암호화 방식"
      pros: ["널리 사용됨", "구현 단순"]
      cons: ["Padding Oracle 공격에 취약"]
      chosen: false
      rejectionReason: "알려진 취약점 존재"
    - name: "AES-256-GCM"
      description: "인증된 암호화 (AEAD)"
      pros: ["인증된 암호화", "무결성 보장"]
      cons: ["약간 더 복잡한 구현"]
      chosen: true
    - name: "외부 Key Vault (Vault, AWS KMS)"
      description: "전문 키 관리 서비스 사용"
      pros: ["가장 안전", "감사 로그"]
      cons: ["인프라 복잡성", "비용"]
      chosen: false
      rejectionReason: "현재 규모에서 과도한 복잡성"
  tradeoffs:
    - aspect: "보안 vs 복잡성"
      benefit: "AEAD로 무결성 보장"
      cost: "마스터 키 관리 필요"
      acceptanceReason: "환경변수로 마스터 키 관리 가능"
---

# API 키 암호화 전략 의사결정

## 배경/문제

글로벌 Claude 세션과 유저별 세션을 분리하면서 API 키를 안전하게 저장해야 하는 보안 요구사항.

## 검토한 대안

1. **평문 저장**: 보안 취약
2. **AES-256-CBC**: Padding Oracle 취약
3. **AES-256-GCM**: AEAD로 인증된 암호화 ✓
4. **외부 KMS**: 과도한 복잡성

## 최종 결정

AES-256-GCM + HKDF 기반 자체 암호화 구현.

## 구현 세부사항

```typescript
// 암호화 파라미터
// - IV: 12 bytes (랜덤)
// - Auth Tag: 16 bytes
// - 마스터 키: ENCRYPTION_MASTER_KEY 환경변수

interface EncryptedData {
  iv: string;      // base64
  ciphertext: string;  // base64
  tag: string;     // base64
}
```

## 자격증명 해결 우선순위

1. 세션별 config_env (기존 호환)
2. 유저별 credentials (credential_mode='custom')
3. 글로벌 설정 (global_settings 테이블)
4. 환경변수 (process.env) - 폴백

## 교훈

- AEAD는 단순 암호화보다 무결성까지 보장
- 마스터 키 관리가 보안의 핵심
- 향후 HSM/KMS 전환 가능한 인터페이스 설계 중요
