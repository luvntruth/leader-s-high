# 2026-04-08 Mobile UX Audit — Leader's High

## 목적
모바일 환경에서 핵심 사용자 흐름이 막히는 치명 버그를 우선 식별하고, 화면별 수정 우선순위를 정한다.

## 현재 확인된 실문제
1. 로그인 상태 UI 불일치
   - 온보딩에서 사용자명은 보이는데 마이페이지/로그아웃 동선 부재
   - 상태: 수정 완료
2. OAuth 목적별 복귀 불안정
   - callback / app 이중 라우팅
   - 상태: 수정 완료 (정적 검증 완료, 실기기 추가 확인 필요)
3. 모바일 화면에서 아래로 스크롤 불가
   - 상태: 조사 중
   - 현재 최우선 원인 후보: Simulation 레이아웃 구조

## 1차 구조 진단 요약
### 위험 패턴
- `h-screen`, `h-[100dvh]`, `overflow-hidden`, `fixed bottom-0`, `sticky top-0`가 여러 화면에 혼재
- 모바일 하단 고정 네비게이션과 화면별 고정 입력창/헤더가 일관된 safe-area 규칙 없이 공존
- 일부 화면은 전체 컨테이너를 잠그고 내부 스크롤만 허용하는 구조라 모바일 브라우저에서 스크롤/키보드 충돌 가능성 높음

### 가장 의심되는 1순위
#### Simulation.tsx
- 최상위 컨테이너: `h-[100dvh] overflow-hidden`
- 입력 패널: `absolute bottom-6 left-6 right-6`
- 메시지 리스트: 내부 scroll만 사용
- 모바일에서 브라우저 UI, 키보드, safe-area, 하단 바와 충돌 가능성 높음

## 화면별 위험도 분류
### P0 — 즉시 점검/수정
- Simulation
- Feedback
- Profile
- PurchasePlaybook

### P1 — 빠른 점검 필요
- Onboarding
- Missions
- HistoryList
- HistoryDetail
- Setup

### P2 — 후순위 점검
- Landing
- Login
- Signup
- Pricing
- Privacy / Terms / ResetPassword

## 점검 체크리스트
각 화면별로 아래를 본다.
- 세로 스크롤 가능한가
- 하단 CTA / 입력창이 가려지지 않는가
- fixed/sticky 요소가 콘텐츠를 덮지 않는가
- iOS Safari / Android Chrome 계열에서 100vh 문제를 일으키지 않는가
- 로그인/비로그인 상태에서 동선이 일관적인가
- 하단 네비게이션과 콘텐츠 padding-bottom이 맞는가

## 바로 다음 작업
1. Simulation 모바일 스크롤 구조 수정
2. Feedback / Profile의 `h-screen` 및 고정 패널 구조 점검
3. 모바일 공통 레이아웃 규칙 정리
