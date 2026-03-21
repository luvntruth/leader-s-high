# Plan: saas-launch-fix

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | SaaS 출시 필수 수정 (Phase 1) |
| 시작일 | 2026-03-21 |
| 예상 기간 | 1일 |
| 우선순위 | Critical |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 결제 미작동, 보안 취약점, 사용량 무제한, 비밀번호 복구 불가, SEO 부재로 SaaS 출시 불가 |
| **Solution** | Worker 보안 강화 + 사용량 검증 활성화 + 비밀번호 재설정 + SEO 메타태그 추가 |
| **Function UX Effect** | Free 플랜 제한 실제 적용, 비밀번호 분실 복구, 소셜 공유 시 미리보기 표시 |
| **Core Value** | 안전하고 지속 가능한 SaaS 서비스로 시장 출시 가능 상태 확보 |

---

## 1. 배경 및 목표

### 1.1 현황
- Vercel + Cloudflare Worker 배포 완료
- 인증(로그인/회원가입/로그아웃) 작동
- 시뮬레이션 → 피드백 핵심 플로우 작동
- **그러나** 보안 감사 결과 CRITICAL 3건, HIGH 4건 발견

### 1.2 목표
Phase 1 수정 완료 후 **SaaS MVP 출시 가능 상태** 달성

---

## 2. 구현 범위

### Step 1: Worker 보안 강화 (CRITICAL)
**파일**: `worker/index.ts`, `worker/wrangler.toml`

- [ ] JWT 우회 제거: `SUPABASE_JWT_SECRET` 미설정 시 에러 반환 (개발 모드 제거)
- [ ] CORS: 기본 `ALLOWED_ORIGIN`을 프로덕션 URL로 변경
- [ ] Stripe Webhook 서명 검증 로직 구현 (HMAC-SHA256)
- [ ] Stripe 플랜 동기화: webhook에서 profiles.plan 실제 업데이트
- [ ] Customer Portal: customerId를 JWT userId로 DB 조회하도록 변경
- [ ] Rate Limit KV 미설정 시 기본 제한 적용 (무제한 방지)

### Step 2: 사용량 제한 실제 검증 (MUST)
**파일**: `screens/Simulation.tsx`

- [ ] `usageService.canStartSimulation()` 결과로 실제 차단 구현
- [ ] 제한 초과 시 "업그레이드" 안내 UI 표시
- [ ] Setup 화면에서도 진입 전 사전 검증

### Step 3: 비밀번호 재설정 (MUST)
**파일**: `screens/ResetPassword.tsx` (신규), `screens/Login.tsx`, `App.tsx`

- [ ] Login 화면에 "비밀번호를 잊으셨나요?" 링크 추가
- [ ] 이메일 입력 → resetPassword() 호출 화면
- [ ] /reset-password 라우트 등록
- [ ] 토큰 검증 + 새 비밀번호 입력 화면

### Step 4: SEO 메타태그 + Favicon (MUST)
**파일**: `index.html`

- [ ] og:title, og:description, og:image 추가
- [ ] twitter:card 메타태그 추가
- [ ] description 메타태그 추가
- [ ] favicon.ico + apple-touch-icon 설정

### Step 5: Lazy Loading 적용 (HIGH)
**파일**: `App.tsx`

- [ ] React.lazy() + Suspense로 14개 화면 코드 분할
- [ ] 번들 1.5MB → ~700KB 목표

---

## 3. 구현 순서

```
Step 1 (Worker 보안) → Step 2 (사용량 검증) → Step 3 (비밀번호) → Step 4 (SEO) → Step 5 (Lazy Loading)
```

Step 1이 가장 critical하며 다른 단계와 독립적으로 진행 가능.

---

## 4. 제외 범위

- Stripe 실제 상품/가격 생성 (Stripe Dashboard에서 수동 설정)
- Google OAuth 설정 (별도 PDCA)
- 모바일 최적화 (Phase 2)
- TypeScript strict 모드 (Phase 3)

---

## 5. 검증 기준

| 항목 | 기준 |
|------|------|
| Worker 보안 | JWT 없이 API 호출 시 401 반환 |
| 사용량 제한 | Free 사용자 일 1회 초과 시 차단 확인 |
| 비밀번호 재설정 | 이메일 발송 → 재설정 완료 E2E |
| SEO | 소셜 공유 시 OG 미리보기 표시 |
| Lazy Loading | 번들 크기 800KB 이하 |
| 빌드 | `npm run build` 성공 |
