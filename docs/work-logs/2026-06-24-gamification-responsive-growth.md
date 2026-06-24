# 2026-06-24 · 게임화 + 반응형 + 결제버그 수정 + 광고 퍼널 진단 (세션 기록)

> 광고 집행 전 전체 점검(2026-06-23 log 후속)에서 발견한 결제 차단 결함 수정·배포, 시뮬 게임화 Phase 1 설계·구현(프리뷰), 프로덕션 반응형 수정, 그리고 "7일 광고 결제 0건" 퍼널 진단 착수까지의 기록. **내일 이어서 진행.**

## 1. 프로덕션 반영 완료 (main 머지·배포됨)

### 결제 차단 결함 3건 + High 5건 (PR #13, 머지)
- **B1**: `plan` CHECK 제약이 `'ultra'` 거부 → 울트라 결제 100% 활성화 실패. `supabase/migrations/012_fix_plan_check_ultra.sql`로 `('free','pro','ultra')` 교체. **프로덕션 DB 적용 완료(사용자 SQL Editor).**
- **B2**: verify-payment 멱등성/사용자 귀속 검증 부재 → 만료일 무한연장·타계정 재사용. `013_processed_payments.sql`(payment_id PK) + `worker/index.ts` 검증 추가. **DB 적용 + worker 배포 완료.**
- **B3**: 모바일 redirect 검증 실패 시 pending 선삭제로 복구 불가 → 성공/취소 시에만 정리, 실패 시 유지·재시도(5회). `services/paymentService.ts`.
- **H1** og:image/twitter:image 추가(`public/og-image.png` 1200x1500) · **H2** 결제 의도 auth 후 자동 재개 CTA(PlansSection resumeOptionId) · **H4** Vertex 토큰실패·5xx 한국어 폴백(geminiErrors) · **H5** trust/coaching 429/5xx 백오프(trustLevelService withGeminiRetry) · **H6** HistoryDetail 모바일 footer.

### 시뮬 턴 단축 (PR #14, 머지)
- 무료 체험 5턴 / 유료 10턴 (기존 12턴 고정 → `turnThreshold` 동적). Feedback 단계라벨·Landing·PlansSection 카피도 정합화. `screens/Simulation.tsx`.

### 프로덕션 반응형 Blocker 2 + High 5 (PR #15, 머지)
- **Blocker**: StreakDetail·CustomLab 모바일 하단바 CTA 충돌 → `App.tsx noNavPaths`에 `/streak`,`/custom-lab` 추가.
- **High**: Onboarding 인증버튼 겹침(absolute→플로우)·카드제목 잘림(line-clamp-2 break-keep) / Insights 레이더 viewBox 여백(-15 -15 130 130) / Missions 데스크톱 중복 상단바 숨김 / safe-area 4곳(Profile·TeamOffice모달·HistoryDetail·CustomLab CTA).

### 인프라
- worker Vertex(us-central1) 배포 정상(`/health` ok, mode vertex). KV RATE_LIMIT 바인딩 존재.
- 마이그레이션 012·013 프로덕션 적용 완료.

## 2. 미머지 — 검토 대기 브랜치 `feat/sim-gamification`

시뮬 게임화 Phase 1(접근 B: 전술카드+콤보+위기). **메인 미머지, 프리뷰에서 플레이 가능.**
- 프리뷰 URL(고정 git 별칭): `https://leader-s-high-git-feat-sim-gamification-stony-lees-projects.vercel.app`
- 설계 스펙: `docs/superpowers/specs/2026-06-24-simulation-gamification-design.md` (v2, 리뷰 반영)
- 구현: `services/tacticService.ts`(신규), `components/GameUIComponents.tsx`(TacticChip·ComboBadge), `screens/Simulation.tsx`, `tests/tacticService.test.ts`.
- **핵심 설계**: 전술 적합도·콤보를 매 턴 클라이언트에서 즉시 판정(AI 스코어링과 분리) → 무료 5턴/모바일에서도 매 턴 반응. 전술 4종: 공감·사실짚기(SBI)·열린질문·인정. 신뢰 밴드×전술 적합도 표(crit/good/weak).
- **전술 효용 가시화 추가**: 선택 전 현재상태 코칭(stateHint), 선택 시 "이럴 때 써요"(whenToUse), 전송 후 "왜"(tacticReason).
- ⚠️ **CORS 임시 항목**: `worker/wrangler.toml` ALLOWED_ORIGIN에 프리뷰 git 별칭 추가됨(테스트용, 6768fb8). **런치/머지 시 제거할 것.**
- **상태**: 사용자가 프리뷰에서 첫 플레이 시 AI가 CORS로 막혀(프리뷰 도메인 미허용) → CORS 추가로 해결. UI는 정상 동작 확인. **사용자 본격 피드백 대기 중.**

## 3. 진행 중 — 광고 퍼널 진단 (내일 핵심)

- **목표(/goal)**: 결제 1건 무조건 달성.
- **현황**: 지난 7일 광고 집행 → 결제 0건. 단, **광고 기간 내내 결제/AI/Supabase가 깨져 있었음**(B1·B3·Supabase다운·ES256·카카오페이채널·CORS 모두 이 기간에 발생, 대부분 오늘 수정). → "수요 없음"이 아니라 "결제 경로가 막혀 있었을" 가능성 큼.
- **다음 액션**: 사용자가 /growth 또는 Supabase SQL Editor에서 7일 퍼널 수치를 뽑아 공유 → 최대 누수 구간 진단 → 한 곳 수정.
- **확인용 SQL** (analytics_events: session_id·event_name·created_at·properties):
  - 퍼널 카운트: onboarding_start / sim_start / report_view / signup_start / signup_complete / pricing_view / **checkout_start(결제시도)** / checkout_success(결제완료) — distinct session_id, 최근 7일.
  - 이벤트별 발생수: `GROUP BY event_name ORDER BY n DESC`.
  - **핵심 판정**: `checkout_start > 0` & `checkout_success = 0` 이면 → 결제 시도는 있었으나 (오늘 고친) 버그로 실패 = 광고는 먹혔던 것.
- **무조건 1건 레버(가설)**: ① 결제 실동작 실측(본인 폰 ₩3,900 단건) ② 첫 결제 타깃을 ₩8,900 프로가 아니라 **₩3,900 골든리포트 단건**(피드백 직후 가치 피크)으로 ③ 최대 누수 구간 한 곳 수정.

## 4. 광고 켜기 전 사용자 직접 검증 (미완)
- [ ] 울트라 ₩29,900 결제 1회 → plan 'ultra' 반영 (B1 최종 확인)
- [ ] 모바일 카카오페이 1회 → 복귀·반영 (B3)
- [ ] 시나리오 12턴 완주 → 피드백 리포트 생성 (V1, Vertex responseSchema 실측, **광고 전 필수**)
- [ ] PortOne 테스트 결제 환불

## 5. 후속 (낮은 우선순위)
- 반응형 Medium/Low: Setup `mt-12`·태블릿 `md:` 분기, Simulation 태블릿 좌패널 폭, PlansSection 비교표 모바일 가로스크롤, GrowthDashboard 합계카드 grid-cols-3, Profile 탭 높이, window.innerWidth 직접참조.
- H3 서버 Meta Conversions API(ROAS 정확도), 플랜 만료 강등, 메인 청크 코드분할, metadata.json 갱신.
- 게임화 Phase 2: 돌파(BREAKTHROUGH)·위기(CRISIS) 연출, 적합도 표 변주(암기 방지), 시나리오별 전술.

## 6. 브랜치/PR 상태
- `main`: 최신 `8406c2b`(PR #15 머지). 프로덕션 배포 Ready.
- `feat/sim-gamification`: 최신 `6768fb8`. 미머지(프리뷰). 게임화 + CORS 임시.
- PR #13·#14·#15 머지 완료. 게임화 PR은 아직 미생성(피드백 후 결정).
