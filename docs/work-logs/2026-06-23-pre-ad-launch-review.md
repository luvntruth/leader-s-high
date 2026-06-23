# 2026-06-23 · 광고 집행 전 전체 점검 + 결제 Blocker 수정

> 카카오페이 가맹점 심사 완료 후 유료 광고 집행을 앞두고, 결제·인증·AI·퍼널·모바일 전 영역을 병렬 정밀 검토하고, 발견된 결제 차단 결함 3건을 코드로 수정한 기록.

---

## 1. 점검 방법
- 4개 영역(결제·인증 / AI 프록시·에러처리 / 퍼널·전환추적 / UI·모바일 회귀)을 병렬 서브에이전트로 코드 근거(file:line) 기반 정밀 검토.
- 기반 확인: `npm run build` exit 0(tsc+vite, worker 포함) · 로컬 main ↔ origin/main 동기화 · KV `RATE_LIMIT` 바인딩 존재(wrangler.toml:15-17) · Meta Pixel+내부 analytics+Clarity 3중 측정.

## 2. 발견 요약 (등급별)

### 🔴 Blocker (결제 — 전부 수정 완료)
- **B1. `plan` CHECK 제약이 `'ultra'` 거부** — `001_schema.sql:14,34`이 `('free','pro','enterprise')`로 남아 `002`의 enterprise→ultra 전환을 반영 못함. 울트라(₩29,900) 결제 시 PortOne 성공하나 `profiles.plan='ultra'` PATCH가 CHECK 위반 → "결제됐으나 활성화 실패". **직접 확인 완료.**
- **B2. verify-payment 멱등/귀속 검증 부재** — `worker/index.ts` handleVerifyPayment가 status=PAID+금액만 확인. 동일 paymentId 반복 호출로 만료일 무한연장 / 타계정 적용 가능.
- **B3. 모바일 redirect 검증 실패 시 복구 불가** — `paymentService.ts:316`이 검증 전 `clearPendingPayment()` → 1회 실패 시 paymentId 유실, 재시도 불가.

### 🟡 Must-Verify
- **V1. Vertex 피드백 리포트 E2E** — 12턴 후 피드백이 거대 `responseSchema` 사용(Feedback.tsx:257), worker가 body 패스스루(index.ts:1058). Vertex 스키마 호환은 코드로 보장 불가 → 프로덕션 실측 필요.

### 🟠 High (5건 수정 완료 / H3 분리)
- **H1. [수정]** og:image/twitter:image 추가(index.html + public/og-image.png 1200x1500) → 공유 미리보기 정상.
- **H2. [수정]** 결제 의도 auth 후 자동 재개 — PlansSection resumeOptionId + 상단 "결제 이어가기" CTA, Pricing 전달.
- H3. [분리] Purchase 이벤트 클라이언트 단독(서버 Meta CAPI 없음) → 별도 작업(Meta 토큰·webhook 필요).
- **H4. [수정]** Vertex 토큰 실패·5xx → 한국어 폴백(geminiErrors.ts), 영어 detail 직노출 제거.
- **H5. [수정]** trust/coaching에 429/5xx/과부하/타임아웃 지수 백오프 재시도(withGeminiRetry).
- **H6. [수정]** HistoryDetail 하단 CTA 모바일 하단바 가림 → footer mb-16 lg:mb-0.

### ⚪ Medium/Low
첫 턴 AI 실패 인게임 폴백 부재 · 플랜 만료 강등 부재 · `pricing_view` Meta ViewContent 미발화 · Purchase value 0원 전송 가능(Pricing.tsx:48) · on_auth 트리거 견고화 · 메인 청크 743KB(gzip 191KB) · metadata.json 음성 문구 잔존 · AdminDashboard dead import.

### ✅ 회귀 없음
시뮬 데스크톱 재설계↔모바일 fixed composer 공존 · 빠른시작 칩 키보드 비충돌 · 12턴 모바일 리포트 버튼 유지 · 6/15 반응형(Pricing/Missions/Profile 등) 유지 · 퍼널 전 단계 이벤트+UTM attribution.

## 3. 수정 내용 (이번 커밋)
- **B1**: `supabase/migrations/012_fix_plan_check_ultra.sql` 신설 — profiles·organizations CHECK를 `('free','pro','ultra')`로 교체(+잔존 enterprise 정리).
- **B2**: `supabase/migrations/013_processed_payments.sql` 신설(payment_id PK, RLS on) + `worker/index.ts` handleVerifyPayment에 ①인증 필수 가드 ②멱등/귀속 사전검증(기처리=멱등성공, 타계정=409) ③성공 후 processed_payments 기록 추가.
- **B3**: `services/paymentService.ts` completeRedirectedPayment 재작성 — 성공/취소 시에만 pending 정리, 검증 실패 시 pending 유지·재시도(시도 5회 상한). `PendingPayment.attempts` 필드 추가.

## 4. 검증
- `npm run build` exit 0 (tsc+vite, worker 포함).
- `npx vitest run` — 18 파일 68개 테스트 통과.

## 5. 🚀 배포 필요 (코드 외 — 미적용 시 수정 무효)
1. **Supabase**: `012`, `013` 마이그레이션을 프로덕션 DB에 적용. (012 미적용 시 울트라 여전히 실패, 013 미적용 시 worker가 멱등 INSERT 실패 로그만 남고 차단 약화.)
2. **Worker**: `cd worker && npx wrangler deploy` — B2 로직 반영.
3. **Frontend**: main push → Vercel 자동 배포 — B3 반영.
4. **검증**: 실제 울트라 결제 1회 → 플랜 'ultra' 반영 확인 / 모바일 결제 1회 → 복귀·반영 확인 / 동일 paymentId 재호출 시 멱등(만료일 미연장) 확인.

## 6. 커밋
- `b875203` fix: 결제 차단 결함 3건 (B1·B2·B3)
- `809bf22` fix: High 이슈 5건 (H1·H2·H4·H5·H6)
- 브랜치 `fix/payment-blockers-pre-ad-launch` (origin 미push)

## 7. 남은 작업 (광고 켜기 전/직후)
- [ ] **V1 Vertex 피드백 리포트 프로덕션 E2E 실측** (광고 전 필수 — 코드로 보장 불가).
- [ ] H3 Meta CAPI(서버 Purchase) — ROAS 정확도 (Meta 액세스 토큰·결제 webhook 연동 필요).
- [ ] Medium/Low: 첫 턴 AI 실패 인게임 폴백 · 플랜 만료 강등 · pricing_view ViewContent · Purchase value 0원 방지 · 메인 청크 코드분할 · metadata.json 갱신.
