# 랜딩 레포 Meta Pixel 스캐폴딩 적용 가이드

## 대상 레포
`https://github.com/luvntruth/leaders-high-landing.git`

## 변경 요약

| 파일 | 변경 |
|------|------|
| `src/app/layout.tsx` | `NEXT_PUBLIC_META_PIXEL_ID` 설정 시 Meta Pixel base script + `<noscript>` fallback 자동 주입. 미설정 시 비활성. |
| `src/app/page.tsx` | `generateMetadata({searchParams})` 로 `?lp=practice|diagnosis|new-manager` 별 `<title>` / `<meta description>` / `og:*` 차별화. |
| `src/app/landing-content.tsx` | `SERVICE_URL` 상수를 `NEXT_PUBLIC_SERVICE_URL` env 로 전환. `trackEvent()` 내부에 `fbq('trackCustom', name, payload)` 발사 추가. |
| `.env.example` | 환경변수 2종 템플릿 신규. |
| `README.md` | 배포/variant/추적 가이드 신규. |

## 적용 절차

### 옵션 A — patch 파일로 일괄 적용 (권장)

```bash
cd /path/to/leaders-high-landing
git checkout main
git pull
git checkout -b feat/meta-pixel

# 메인 앱 레포에서 복사해온 패치 적용
git apply /path/to/leader-s-high/docs/deployment/landing-meta-pixel.patch

# 신규 파일(.env.example, README.md) 누락 시 수동 추가 필요 (패치는 tracked 파일만 커버)
#   → `/path/to/leader-s-high/docs/deployment/` 에서 .env.example 과 README.md 를 참고해 수동 작성 가능

git status            # 변경사항 확인
npm install           # 의존성 (이미 설치돼 있으면 스킵)
npm run build         # 로컬 빌드 검증
npm run dev           # http://localhost:3000/?lp=practice 확인
```

### 옵션 B — 수동 편집

네 파일 내용은 아래 "파일 전문" 섹션 참고.

## Vercel 환경변수 등록

Vercel 대시보드 → Project → Settings → Environment Variables:

| Key | Value (예시) | 환경 |
|-----|-------------|------|
| `NEXT_PUBLIC_META_PIXEL_ID` | `1234567890123456` | Production + Preview |
| `NEXT_PUBLIC_SERVICE_URL` | `https://leader-s-high.vercel.app/#/onboarding` | Production |
| `NEXT_PUBLIC_SERVICE_URL` | `https://leader-s-high-git-staging.vercel.app/#/onboarding` | Preview |

**주의**: `NEXT_PUBLIC_*` prefix 는 클라이언트 번들에 포함되므로 민감한 값 금지. Pixel ID 는 공개되어도 무방 (Meta 가 광고주 ID 로 사용).

## 검증 체크리스트

### Pixel 설치 확인
- [ ] 배포 후 `https://leaders-high-landing.vercel.app/` 접속
- [ ] Chrome DevTools → Network 탭 필터 `tr/?id=`
- [ ] `https://www.facebook.com/tr/?id=<PIXEL_ID>&ev=PageView` 요청 1건 확인 (상태 200)
- [ ] 크롬 확장 "Meta Pixel Helper" 설치 시 녹색 아이콘 + `1 Pixel found`

### Variant 메타데이터 차별화 확인
- [ ] `?lp=practice` 페이지 소스 → `<title>팀원과의 어려운 대화, 연습하면 달라집니다...`
- [ ] `?lp=diagnosis` → `<title>꼬인 면담, AI 와 다시 진단...`
- [ ] `?lp=new-manager` → `<title>신임 팀장의 첫 면담 연습...`
- [ ] 각각 `<meta property="og:description">` 도 다름

### CTA 클릭 트래킹 확인
- [ ] 아무 CTA 버튼 클릭
- [ ] Network 탭에 `tr/?id=<PIXEL_ID>&ev=cta_click&...` 추가 요청 (trackCustom 은 `ev=` 에 이벤트명이 옴)
- [ ] Meta Events Manager 의 Test Events 에서 "cta_click" 표시 (실시간)

### 미설정 시 회귀 없음 확인
- [ ] `NEXT_PUBLIC_META_PIXEL_ID` 없는 Preview 브랜치에서 페이지 로드 → JS 에러 0건
- [ ] `window.fbq` 는 undefined 이지만 `trackEvent()` 호출은 예외 없이 동작

## Meta 광고 크리에이티브 URL 규약

```
https://leaders-high-landing.vercel.app/?lp=<VARIANT>
  &utm_source=meta
  &utm_medium=cpc
  &utm_campaign=spring2026
  &utm_content=<AD_NAME>
```

예:
- `?lp=practice&utm_source=meta&utm_medium=cpc&utm_campaign=spring2026&utm_content=practice_v1`
- `?lp=diagnosis&utm_source=meta&utm_medium=cpc&utm_campaign=spring2026&utm_content=diagnosis_v1`
- `?lp=new-manager&utm_source=meta&utm_medium=cpc&utm_campaign=spring2026&utm_content=new_manager_v1`

CTA 클릭 시 메인 앱(`leader-s-high.vercel.app`) 으로 `lp` + `utm_*` + `cta` 가 그대로 전달되어 `services/analyticsService.ts` 의 `withAttribution()` 이 수신합니다.

## Patch 파일 위치

`docs/deployment/landing-meta-pixel.patch` — 메인 앱 레포에 보관. 랜딩 레포의 3개 tracked 파일(`layout.tsx`, `page.tsx`, `landing-content.tsx`) 변경만 포함.

신규 파일 `.env.example` 과 `README.md` 는 패치에 포함되지 않으므로, 위 "파일 전문" 또는 메인 앱 레포의 `docs/deployment/` 내 원본을 직접 복사하세요. (현재 문서 하단 링크 추가 권장.)
