# 2026-07-07 · 광고 집행 전 잔여 게이트 3건 실측 검증

> 6/23 점검 로그(§5·§7)에서 "코드 외 작업"으로 남겨졌던 광고 전 게이트를 프로덕션 환경에서 실측 검증한 기록. 진단 기능 PR #28 과 같은 날 진행.

## 1. 게이트 ① — Supabase 마이그레이션 프로덕션 적용: ✅ 확인

- 프로덕션(`emhroydllqjrbzvuoznh.supabase.co`) REST 프로브 결과:
  - `processed_payments` 테이블 존재 (**013 적용됨** — B2 멱등성 가드 활성)
  - `profiles.plan_started_at` 컬럼 존재 (**014 적용됨**)
  - 대조군(존재하지 않는 테이블)은 PGRST205 반환 — 프로브 유효성 확인
- **012**(plan CHECK `'ultra'`)는 순번상 013·014 와 함께 적용된 것으로 판단. 잔여 확증은 실결제 1회(§4)로.

## 2. 게이트 ② — Vertex 피드백 리포트 E2E (V1): ✅ 통과

- 방법: 프로덕션 워커(`leaders-high-proxy.luvntruth.workers.dev`)에 Feedback.tsx 와 동일한 풀 responseSchema 요청을 게스트 자격(`no-token`) + 서비스 Origin 으로 전송 (브라우저 경로 재현).
- 결과: **57.6초, 9,597자 유효 JSON**. 필수 11개 키 누락 0, 풀 리포트 8개 키(phaseStrategy·goldenScripts·psychTriggers·coachOverview·weekActionPlan·retryGuide·recommendedNextScenario·theoryDeepDive) 전부 존재.
- 6/23 "코드로 보장 불가 → 프로덕션 실측 필요" 항목이 해소됨. Vertex 의 responseSchema 호환성 실증.
- 참고: 워커는 Origin 헤더 미존재 시 403 (CORS 가드 정상 동작 확인).

## 3. 게이트 ③ — 랜딩 Meta Pixel: ✅ 이미 적용·라이브

- 랜딩 레포(`leaders-high-landing`)에 Pixel 패치 머지 완료 상태 (fbq/META_PIXEL/.env.example 존재).
- 라이브 확인: `letmefree.xyz` · `www.letmefree.xyz` · `leaders-high-landing.vercel.app` 3개 도메인 모두 `fbq('init','1253075797006595')` + PageView 발화 — **Vercel env 설정 완료 상태**.
- Variant 메타데이터 차별화 라이브 확인:
  - `?lp=practice` → "팀원과의 어려운 대화, 연습하면 달라집니다"
  - `?lp=diagnosis` → "꼬인 면담, AI 와 다시 진단해보세요"
  - `?lp=new-manager` → "신임 팀장의 첫 면담 연습"
  - 기본(파라미터 없음) = diagnosis (PR #23 결정과 일치)

## 4. 광고 켜기 전 남은 것 (실결제 필요 — 코드/원격으로 검증 불가)

- [ ] 실제 울트라 결제 1회 → `profiles.plan='ultra'` 반영 확인 (012 최종 확증)
- [ ] 모바일 redirect 결제 1회 → 복귀·반영 확인 (B3)
- [ ] 동일 paymentId 재검증 호출 → 멱등(만료일 미연장) 확인 (B2)

## 5. 광고 직후 권장 (차단 아님)

- H3 Meta CAPI(서버 Purchase) — 미구현 상태 유지. iOS/광고차단 환경 ROAS 정확도용.
- `pricing_view` 시 Meta ViewContent 미발화 / Purchase value 0원 방지 — 최적화 신호 품질.
- 진단 기능(PR #28) 머지 → Vercel 배포 → 무료 시뮬 완주 후 진단 섹션 실기기 확인.
