# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 안내를 제공합니다.

## 명령어

```bash
npm run dev      # 개발 서버 실행 (포트 3000)
npm run build    # TypeScript 검사 + Vite 빌드 → dist/
npm run preview  # 프로덕션 빌드 미리보기
```

린트 및 테스트 스크립트는 설정되어 있지 않습니다.

## 환경 설정

### 프론트엔드 (`.env.local`)

`.env.example`을 `.env.local`로 복사한 후 다음 값을 설정하세요:
- `VITE_API_KEY` — Gemini API 키 (개발 전용, 클라이언트 사이드)
- `VITE_GEMINI_PROXY_URL` — Cloudflare Worker URL (프로덕션)

프로덕션에서는 `geminiClient.ts`가 프록시 URL로 전환되어 API 키가 클라이언트에 노출되지 않습니다.

### Cloudflare Worker (`worker/`)

프로덕션 프록시는 **Vertex AI (`us-central1`)** 엔드포인트로 포워드합니다 (Gemini Developer API 의 국가 차단을 구조적으로 우회).

`worker/wrangler.toml` 의 `[vars]` 에 다음을 설정:
- `GCP_PROJECT_ID` — Vertex AI 가 활성화된 GCP 프로젝트 ID
- `VERTEX_LOCATION` — 기본 `us-central1` (전 지역 수용)

시크릿은 `wrangler secret put` 으로 등록:
- `VERTEX_SA_JSON` — GCP 서비스 계정 JSON 전체 (`roles/aiplatform.user` 권한 필요)
- `GEMINI_API_KEY` — 폴백 경로용 (선택; `USE_VERTEX=false` 시에만 사용)
- `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_KEY`, `STRIPE_*`, `PORTONE_API_SECRET` — 각 기능별 필요

롤백: `wrangler secret put USE_VERTEX` → `false` 로 설정하면 기존 `generativelanguage.googleapis.com` 경로로 즉시 복귀.

## 아키텍처

한국어 AI 리더십 훈련 SPA입니다. 사용자는 시나리오와 캐릭터를 선택한 후, 다양한 성격·세대·감정 상태를 가진 AI 팀원과 리더십 대화를 연습하고, AI가 채점한 피드백을 받습니다.

### 라우팅 & 화면 (`/screens`)

`App.tsx`는 `HashRouter`를 사용합니다. 주요 화면 14개:

| 화면 | 역할 |
|---|---|
| `Home` | 시나리오 퀘스트 카드 대시보드 |
| `Setup` | 시나리오 선택 + AI 캐릭터 설정 |
| `Simulation` | AI 팀원과 텍스트 대화 |
| `Feedback` | 시뮬레이션 후 AI 생성 코칭 리포트 |
| `Insights` | 누적 리더십 역량 레이더 차트 |
| `CustomLab` | 사용자 정의 시나리오 제작 |
| `AdminDashboard` | HR용 조직 분석 대시보드 |
| `Missions` | 미션 목록 및 진행 현황 |
| `Profile` | 사용자 프로필 및 설정 |
| `TeamOffice` | 팀 오피스 — 팀원 현황 및 관계 관리 |
| `StreakDetail` | 연속 학습 기록 상세 |
| `HistoryList` | 시뮬레이션 이력 목록 |
| `HistoryDetail` | 시뮬레이션 이력 상세 보기 |

### 서비스 (`/services`)

핵심 비즈니스 로직이 위치합니다:

- **`geminiLiveService.ts`** — Gemini Live WebSocket 연결 관리. 오디오 인코딩, PCM 스트리밍, 세션 생명주기를 처리합니다.
- **`trustLevelService.ts`** — Gemini를 호출하여 대화 품질을 5개 차원(심리적 안전감, 이해·정렬, 자율성·공정성, 진정성·일관성, 역량·지원)으로 각 0–100 점수를 산출합니다.
- **`emotionStateMachine.ts`** — 신뢰 수준 점수를 NPC 감정 상태(HOSTILE→DEFENSIVE→GUARDED→NEUTRAL→OPENING→COOPERATIVE→CONVINCED, 7단계)로 변환하여 AI 캐릭터의 어조를 결정합니다.
- **`dataService.ts`** — `localStorage`를 통한 모든 데이터 영속성 관리. 키: `leadershigh_org_v4`(팀 데이터), `leadershigh_history`(시뮬레이션 기록).
- **`missionBriefings.ts`** — 시스템 프롬프트 구성에 사용되는 심리 프레임워크(SBI 모델, 자기결정이론).
- **`characterAvatars.ts`** — 시나리오에 매핑된 캐릭터 프로필.

### AI 연동 (`/src/lib/geminiClient.ts`)

다음 두 가지 중 하나를 반환하는 팩토리:
- **개발**: `VITE_API_KEY`를 사용하는 직접 `GoogleGenAI` 클라이언트
- **프로덕션**: `VITE_GEMINI_PROXY_URL`(Cloudflare Worker `/worker`)을 통한 프록시 클라이언트

워커(`worker/index.ts`)는 기본적으로 **Vertex AI (`us-central1`)** 엔드포인트로 포워드합니다 — `generativelanguage.googleapis.com` 의 국가 차단(`FAILED_PRECONDITION`) 을 회피하기 위한 구조적 해결책입니다. 인증은 `VERTEX_SA_JSON` (GCP 서비스 계정 JSON) 으로 생성한 OAuth access token 을 사용하며, HTTP(채팅 API) 트래픽을 Vertex 로 중계합니다. `USE_VERTEX=false` 로 설정 시 레거시 Developer API 경로로 즉시 폴백 가능.

> **Voice Simulation 제거(2026-04)**: `/voice` 라우트는 런치 범위에서 제외되어 App.tsx 에서 Route 엔트리와 VoiceSimulation lazy import 가 주석 처리되어 있습니다. `screens/VoiceSimulation.tsx`, `services/geminiLiveService.ts`, `worker/index.ts` 의 `handleWebSocket` 핸들러는 그대로 보존되어 있어 향후 Vertex Live endpoint 로 이관 후 재활성화 가능합니다.

### 데이터 모델 (`types.ts`, `constants.tsx`)

- `Scenario` — 유형, 난이도, 심리 프레임워크, 대상 캐릭터 프로필을 포함한 리더십 미션
- `constants.tsx`가 `SCENARIOS`를 내보냄 — 40개의 사전 제작 리더십 시나리오 (갈등 해결, 성과 피드백, 팀 동기부여 등)
- 상태 흐름: 시나리오 → 설정 → 시뮬레이션(실시간 신뢰 점수) → 피드백 → 기록 저장

### 공유 컴포넌트 (`/components`)

- `Navigation` — 데스크톱 사이드바 + 모바일 하단 내비게이션 통합 컴포넌트 (`BottomNav`는 deprecated, `Navigation`으로 대체됨)
- `CompetencyRadar` — 5개 신뢰 차원을 위한 Recharts 레이더 차트
- `GameUIComponents` — HP 바, 타이머 등 게임화 UI
