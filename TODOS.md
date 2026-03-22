# TODOS

## Phase 2 준비

### Vitest + React Testing Library 도입
- **What:** 테스트 프레임워크 설정 + 결제 로직 단위 테스트
- **Why:** Phase 2에서 사용자 확대 시 결제 버그는 치명적. 10명 검증 단계에서는 수동 테스트로 충분하지만, 확대 시 자동화 필수.
- **Context:** Vite 프로젝트이므로 Vitest가 자연스러운 선택. paymentService의 결제 분기 (성공/실패/취소), report_purchases INSERT, simulation_history feedback UPDATE가 핵심 테스트 대상.
- **Depends on:** Phase 1 완료 후

---

## CEO Review (2026-03-22) — 시장 성공 가능성 검토

### [P1] Gemini 피드백 생성 실패 처리
- **What:** 피드백 화면에서 Gemini가 malformed JSON/빈 응답을 반환할 때 재시도 로직(3회) + 사용자 안내 메시지
- **Why:** 12턴 대화 후 피드백이 안 나오면 사용자 경험이 완전히 망가짐. 수요 검증 전 반드시 해결 필요.
- **Context:** `screens/Feedback.tsx`에서 Gemini 호출 후 JSON 파싱 실패 시 현재 에러 처리 없음.
- **Effort:** S (human: ~2일 / CC: ~15분)
- **Depends on:** 없음 — 즉시 착수 가능

### [P2] Gemini Rate Limit (429) 처리
- **What:** 시뮬레이션/피드백에서 Gemini API 429 응답 시 exponential backoff 재시도
- **Why:** 동시 사용자 증가 시 rate limit 도달 가능. 현재는 500 에러로 표시됨.
- **Context:** `screens/Simulation.tsx`, `screens/Feedback.tsx`의 Gemini 호출부
- **Effort:** S (human: ~2일 / CC: ~15분)
- **Depends on:** 없음

### [P2] 누적 역량 대시보드
- **What:** 사용자의 시뮬레이션 이력을 기반으로 5차원 역량 성장 추이 시각화
- **Why:** "이번 달 공감 능력 +12점" 같은 성장 피드백이 리텐션의 핵심 드라이버
- **Context:** `simulation_history`의 `trust_dimensions`, `coaching_skills` 데이터 활용. `screens/Insights.tsx` 확장.
- **Effort:** M (human: ~1주 / CC: ~30분)
- **Depends on:** Phase 1 검증 완료 + 충분한 이력 데이터 축적

### [P3] billingService.ts Stripe 레거시 정리
- **What:** `billingService.ts`의 Stripe 코드 제거 + `database.ts`의 `stripe_customer_id`/`stripe_subscription_id` 필드 정리
- **Why:** 포트원 단일화 완료 상태에서 Stripe 흔적이 남아있으면 혼란 유발
- **Context:** 결제 보안(Spec #5) 구현 후, RLS 변경과 함께 정리하면 효율적
- **Effort:** S (human: ~1일 / CC: ~15분)
- **Depends on:** 결제 보안 Worker 검증 구현 완료

### [P3] 커뮤니티 기능 설계
- **What:** 익명 시뮬레이션 공유 ("이 상황에서 나는 이렇게 했는데, 당신이라면?") MVP 설계
- **Why:** ChatGPT 대비 최대 차별화 요소. 동료 리더 피드백은 AI가 대체 불가.
- **Context:** 디자인 문서 Phase 3 참조. 콜드 스타트 문제 해결이 핵심.
- **Effort:** L (human: ~3주 / CC: ~2시간)
- **Depends on:** Phase 1 수요 검증 완료 + MAU 500+ 달성

### [P3] B2B 파일럿 검토
- **What:** HR/교육기관 대상 파일럿 프로그램 설계 — 기업용 관리자 대시보드 + 팀 단위 리포트
- **Why:** Phase 1 킬 조건(리포트 전환율 <2%) 충족 시 B2C→B2B2C 피봇 검토
- **Context:** `screens/AdminDashboard.tsx` 기존 코드 활용 가능. B2B는 높은 LTV + 낮은 이탈률.
- **Effort:** M (human: ~2주 / CC: ~1시간)
- **Depends on:** Phase 1 킬 조건 판정
