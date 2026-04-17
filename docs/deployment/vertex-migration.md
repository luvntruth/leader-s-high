# Vertex AI 마이그레이션 배포 체크리스트

**목적**: Cloudflare Worker 프록시가 `generativelanguage.googleapis.com` 대신 `us-central1-aiplatform.googleapis.com` (Vertex AI) 로 요청하도록 전환하여 **한국 등 차단 지역의 `FAILED_PRECONDITION`** 을 구조적으로 해결.

> 코드 변경은 이미 완료되어 있습니다. 본 문서는 GCP/Wrangler 측 **운영 세팅**만 다룹니다.

---

## 0. 사전 준비

| 항목 | 확인 |
|------|------|
| 결제 가능한 GCP 빌링 계정 연결된 프로젝트 | GCP Console → 프로젝트 선택 |
| `gcloud` CLI 설치·인증 | `gcloud auth login && gcloud config set project <PROJECT_ID>` |
| Cloudflare 계정 접근 (wrangler 로그인) | `npx wrangler whoami` → 이메일 확인 |
| 저장소 clone 및 `worker/` 디렉토리 위치 확인 | `ls worker/index.ts worker/wrangler.toml` |

---

## 1. GCP Vertex AI API 활성화

```bash
gcloud services enable aiplatform.googleapis.com
```

---

## 2. 서비스 계정(SA) 생성 + 권한 부여

```bash
# SA 생성
gcloud iam service-accounts create lh-vertex \
  --display-name="Leader's High Vertex Proxy"

# 이메일 확인 (이후 단계에서 사용)
export SA_EMAIL="lh-vertex@$(gcloud config get-value project).iam.gserviceaccount.com"
echo "$SA_EMAIL"

# Vertex AI 최소 권한 (aiplatform.user — 모델 호출만 허용)
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/aiplatform.user"
```

---

## 3. 키 발급

```bash
# 임시 위치에 JSON 키 생성
gcloud iam service-accounts keys create /tmp/sa.json \
  --iam-account="$SA_EMAIL"

# 파일 생성 확인 (client_email, private_key 포함되어야 함)
head -c 200 /tmp/sa.json
```

> ⚠️ 이 파일은 **절대 git 에 커밋하지 않음**. 4단계 완료 후 즉시 파기.

---

## 4. Cloudflare Worker 시크릿 등록

```bash
cd worker
npx wrangler secret put VERTEX_SA_JSON < /tmp/sa.json
```

**등록 확인**:
```bash
npx wrangler secret list | grep VERTEX_SA_JSON
```

**키 파일 즉시 파기**:
```bash
shred -u /tmp/sa.json 2>/dev/null || rm -P /tmp/sa.json   # macOS 는 rm -P
```

---

## 5. `worker/wrangler.toml` 프로젝트 ID 업데이트

`worker/wrangler.toml` 편집:

```toml
# Vertex AI (기본 경로)
GCP_PROJECT_ID  = "<여기에_실제_GCP_PROJECT_ID>"   # ← 수정
VERTEX_LOCATION = "us-central1"
```

수정 후 커밋 & 푸시.

---

## 6. Worker 배포

```bash
cd worker
npx wrangler deploy
```

출력에 `Uploaded leaders-high-proxy`, 엔드포인트 URL 확인.

---

## 7. 검증 ① — Health 엔드포인트

```bash
curl -s https://leaders-high-proxy.luvntruth.workers.dev/health | jq .
```

**기대 응답**:
```json
{
  "ok": true,
  "mode": "vertex"
}
```

`"mode": "legacy"` 가 나오면 `VERTEX_SA_JSON` 또는 `GCP_PROJECT_ID` 누락. 4·5 단계 재확인.

---

## 8. 검증 ② — 한국 IP 실측 (E2E)

1. 한국 회선 브라우저(또는 VPN 미사용 일반 집·사무실 망)에서 `https://leader-s-high.vercel.app` 접속.
2. 로그인 없이 **게스트 모드**로 시나리오 1개 선택 → Setup → Simulation 진입.
3. 메시지 1건 전송.
4. **2–4 초 내 AI 캐릭터 응답 수신** 확인.
5. DevTools Network 탭에서:
   - `POST …/v1beta/models/gemini-2.5-flash:generateContent` → `200 OK`
   - 응답 body 에 `candidates[0].content.parts[0].text` 존재
6. 새 터미널에서 실시간 로그 관찰:
   ```bash
   cd worker && npx wrangler tail --format=pretty
   ```
   5분 동안 `FAILED_PRECONDITION` 문자열이 **0건** 이어야 통과.

---

## 9. 검증 ③ — SOS/즉시 코칭 / 신뢰도 스코어링

아래 3가지 모두 Vertex 경유해도 정상이어야 함.

| 기능 | 검증 방법 |
|------|----------|
| **Trust Scoring** | 시뮬레이션에서 4턴 이상 대화 → 신뢰도 차트에 점수 업데이트 |
| **SOS 힌트** | "SOS 힌트" 버튼 → 3개 magicPhrases JSON 응답 |
| **즉시 코칭** | "즉시 코칭" 버튼 → positiveImpact / negativeRisk / estimatedTrustDelta 채워짐 |
| **Feedback 리포트** | 12턴 완주 → 최종 피드백 페이지에 코칭 리포트 생성 |

---

## 10. 롤백 (긴급)

Vertex 측 이슈가 발견되고 즉시 서비스를 돌려야 할 때:

```bash
cd worker
echo "false" | npx wrangler secret put USE_VERTEX
```

→ 다음 요청부터 즉시 레거시 경로(`generativelanguage.googleapis.com`) 사용. 이 경우 한국 사용자는 다시 `FAILED_PRECONDITION` 을 볼 수 있으므로 원인 수정 후 복귀 권장.

복귀:
```bash
echo "true" | npx wrangler secret put USE_VERTEX
# 또는 시크릿 삭제 (기본값이 Vertex 이므로 삭제만으로도 복귀)
npx wrangler secret delete USE_VERTEX
```

---

## 11. 비용 관측 (선택, 런치 후)

- GCP Console → **Billing** → **Reports** → filter by service = **Vertex AI API**.
- 모델 `gemini-2.5-flash` 기준 대략적 단가 (2026-04 us-central1):
  - Input: $0.075 / 1M tokens
  - Output: $0.30 / 1M tokens
- 시뮬 1회 평균: 12턴 × (800 input + 400 output) ≈ 14.4k tokens → **~ $0.005 / 회**.
- Pro 유저 1일 1회 기준 월 활성 100명 → 월 ~$15.

---

## 체크리스트 (최종)

- [ ] Vertex AI API 활성화
- [ ] SA 생성 + `aiplatform.user` 부여
- [ ] 키 발급 후 Worker 시크릿 등록
- [ ] `/tmp/sa.json` 파기
- [ ] `wrangler.toml` `GCP_PROJECT_ID` 업데이트·커밋
- [ ] `wrangler deploy` 성공
- [ ] `/health` → `mode:"vertex"`
- [ ] 한국 IP 브라우저 시뮬 완주
- [ ] `wrangler tail` 5분 무오류
- [ ] Trust/SOS/Coaching/Feedback 모두 Vertex 경유 정상
