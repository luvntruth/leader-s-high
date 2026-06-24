# 시뮬레이션 게임화 설계 (접근 B: 전술 카드 + 콤보 + 위기 모먼트) — v2

- 날짜: 2026-06-24 (v2: 스펙 리뷰 반영)
- 상태: 설계 승인 대기 → (승인 후) 구현계획
- 관련: `screens/Simulation.tsx`, `components/GameUIComponents.tsx`, `services/trustLevelService.ts`, `services/emotionStateMachine.ts`, `services/missionBriefings.ts`
- v2 변경: 스펙 리뷰(critic)에서 발견한 C1(스코어링 간격), M1(모바일 상태 일부 이미 존재), M2(buildSystemPrompt 1회 호출) 등을 반영.

## 1. 문제 정의
사용자 피드백: "시뮬레이션이 늘어지고 재미가 하나도 없다." 진단: **순간순간의 플레이 루프**가 비어 있음:
1. **타격감 부족** — 내 발화가 먹혔는지 즉각 와닿지 않음.
2. **긴장·위기감 부재** — 결정적 순간이 없음.
3. **단조로운 입력(agency 부재)** — 빈 칸에 글만 씀.

### 코드 진단 (v2 정정)
- 점수 엔진(`trustLevelService.ts`)은 턴마다 `delta`(-15..8), `events[]`(reason_short/impact), `stage`(S1~S4), `goalAchievements`(도입/전환/합의)를 산출.
- **그러나 `Simulation.tsx:34` `TRUST_SCORING_INTERVAL = 4`** — 4턴마다 1회만 스코어링. 무료 5턴이면 **스코어링 1회(4턴째)**, 유료 10턴이면 2회(4,8턴). → `goalAchievements`·`delta`가 거의 흐르지 않음. **(리뷰 C1)**
- 모바일에 **이미** compact status(`:1052-1092`: 아바타·신뢰 HP바·감정 라벨·턴 카운터)와 briefing bottom-sheet(`:1317-1405`: 목표 3개·강점/약점)가 존재. **(리뷰 M1 — "모바일에 아무것도 없다"는 틀림)** 실제 모바일 누락분: **전투로그(events reason_short)·스테이지 칩·턴별 전술 피드백**.
- 플로팅 "+N TRUST"(`:823`)·화면 플래시(`:802-812`)는 `fixed`라 모바일에도 표시.
- `buildSystemPrompt`(`:487`)는 chat 초기화 시 **1회만** 호출. 매 턴 의도 주입은 `handleSend`의 `contextPrefix`(`:452-453`, emotionMachine.buildEmotionContext) 패턴으로만 가능. **(리뷰 M2)**
- 감정 표기 이원화: 표시용 `getEmotionState(trust)` 6단계(`:37-43`, `:277`) vs `emotionStateMachine` 7상태. **전술 적합도 표는 사용자에게 보이는 `getEmotionState` 기준(trust 밴드)으로 통일.** (리뷰 Open Q)

## 2. 확정된 결정 (브레인스토밍)
- **접근 B**: 자유 입력 유지 + 전술 카드 + 콤보 + 위기 모먼트.
- **하이브리드** 플레이: 자유 타이핑 핵심 유지.
- **전술 카드 = 의도 태그만** (스캐폴드/단독전송 미채택).
- 우선순위: 타격감 + 긴장 + 플레이 (메타 보상/성장은 후순위).

## 3. 핵심 해법 (v2): 즉시 피드백을 스코어링에서 분리
리뷰 C1의 근본 해결 — **전술 적합도·콤보·타격감은 매 턴 클라이언트에서 즉시 판정**한다. 무거운 `scoreTrustLevel`(4턴 간격, AI 호출)과 **분리**하여, 스코어링 빈도와 무관하게 매 턴 플레이가 살아 있게 한다.
- 추가로 **`TRUST_SCORING_INTERVAL`을 세션 길이에 맞게 조정**: 무료(5턴) 2, 유료(10턴) 2~3 → 트러스트 delta 연출도 세션당 2~5회 발생. (단독으론 부족 → 위 즉시 피드백이 주력)
- `goalAchievements`(도입·전환·합의)는 스코어링 시점에만 갱신되므로 **핵심 재미를 여기에 걸지 않는다.** 달성되면 BREAKTHROUGH로 축하하되(보너스), 매 턴 재미는 전술/콤보/감정 반응이 책임진다.

## 4. 세 기둥

### ① 모바일 게임 상태 보강 (기존 확장) — v2 축소
- 기존 mobile compact status(`:1052-1092`)에 **스테이지 칩(S1~S4)** + **최근 전투로그 1줄**(`events[0].reason_short`) 추가. 신규 풀HUD를 만들지 않고 **기존 블록 확장**.
- 기존 mobile briefing sheet(`:1317-1405`)에 **전투로그 전체 + 5차원 미니 레이더** 탭 추가(이미 목표 3개 노출 중).
- 데스크톱 aside 무변경. 신규 데이터 없음.

### ② 전술 카드 (agency 핵심) — 신규, v2 구현경로 확정
- composer 영역에 시나리오별 **전술 칩 3~4개**. 기본 세트(프레임워크): `공감`·`사실 짚기(SBI)`·`열린 질문`·`인정`. 소스: 신규 `getTactics(scenarioId)`(missionBriefings; 시나리오별 미정의 시 기본 세트 폴백). 기존 `getOpeningSuggestions`(빈 입력 빠른시작 칩)와는 **별개 역할**로 명확히 구분(전술=의도 토글, 빠른시작=문장 예시).
- 배치: **기존 빠른시작 칩과 동일 위치/패턴**(`:1246` composer 상단, 입력 비었을 때). 칩 높이를 `mobileComposerHeight`(`:749`) 계산에 포함시켜 키보드 올라와도 메시지 가림 없게. (리뷰 누락 항목)
- 동작(**의도 태그만**): 칩 탭 → "이번 한 수: 공감" 배지 토글. 전송 시:
  - `handleSend`의 `contextPrefix`에 `[이번 턴 의도: <전술>]` 한 줄 추가(emotionContext 뒤) → NPC가 의도에 맞춰 반응. **(buildSystemPrompt 아님 — M2)**
  - `scoreTrustLevel` 프롬프트 변경은 **하지 않음**(점수 분포 회귀 리스크 회피 — M3). 전술은 연출/콤보용으로만 사용, 점수는 기존 내용 기반 산식 유지.
- **턴별 전술 이력**: `tacticHistory: Tactic[]` ref에 누적(인덱스=user 턴). 즉시 피드백·콤보 계산에 사용.

### ③ 전술 적합도 / 콤보 (매 턴 클라이언트 즉시) — 신규
- 정적 표 `TACTIC_EFFECTIVENESS[trustBand][tactic] = 'crit' | 'good' | 'weak'`. `trustBand`는 표시용 `getEmotionState` 기준(예: 강반발/방어/경계/중립/우호/협력).
  - 예: 낮은 신뢰(반발·방어) → `공감`·`인정` crit, `사실 짚기` weak, `열린 질문` good. 중립·경계 → `열린 질문`·`공감` good. 우호·협력 → `사실 짚기`·`인정` crit.
- 전송 즉시(스코어링 무관) 현재 trust 밴드 × 선택 전술 → 적합도 산출 → 연출:
  - `crit` → **CRITICAL** 대형 플로팅 + 콤보 +1.
  - `good` → 일반 긍정 연출 + 콤보 +1.
  - `weak` → "역효과 주의" 표시 + 콤보 리셋.
  - 전술 미선택 턴 → 콤보 유지(증감 없음).
- **콤보 정의(리뷰 모호성 해소)**: 매 user 턴(전술 선택 시)마다 즉시 판정 → 콤보는 스코어링이 아니라 **턴 단위**. 무료 5턴에도 최대 5콤보 가능.
- 적합도는 카드 선택 **전에 노출하지 않음**(긴장 유지, 결과로만 학습).
- **answer-key 우려 완화(리뷰 Skeptic)**: 표는 binary 정답이 아니라 soft(crit/good/weak) 경향이며, 실제 trust delta는 여전히 내용 기반 AI 채점이 결정. Phase 2에서 trust 추이·반복에 따라 적합도에 변주(노이즈/맥락) 추가 검토. MVP에서는 "상황에 맞는 프레임워크 선택"이라는 학습 가치로 수용.

### ④ 돌파/위기 모먼트 (Phase 2 중심) — 재활용+증폭
- **BREAKTHROUGH**: `stage` 승격 또는 목표 달성 시 전체화면 축포 + "돌파!" + 콤보 보너스(`stage.promotion_reason` 표시).
- **CRISIS**: `stage` 강등 / 감정 급락 시 위기 경보. **HOSTILE 강제종료(`:372-399`, trust≤5)와의 타이밍**: 강제종료 직전 1턴에 "이 한마디로 만회" 연출이 먼저 뜨도록 trust 임계(예: ≤15)에서 CRISIS 선행. (리뷰 누락 항목)

## 5. 데이터 / AI 변경 요약 (v2)
| 구분 | 항목 |
|---|---|
| 재활용(무변경) | `delta`·`events[]`·`stage`·`goalAchievements`·`emotionStateMachine`·`HPBar`·`combatTexts`·플래시·mobile compact status·briefing sheet |
| 변경 | `TRUST_SCORING_INTERVAL`을 세션 길이 기반으로(무료 2/유료 2~3); `handleSend` contextPrefix에 전술 의도 1줄 |
| 신규 | 전술 칩 UI + `chosenTactic`/`tacticHistory` 상태; `TACTIC_EFFECTIVENESS` 표 + 콤보(클라이언트, 매 턴); `getTactics`(missionBriefings); 모바일 compact status에 스테이지·전투로그 추가; BREAKTHROUGH/CRISIS 연출 컴포넌트 |
| **하지 않음** | `buildSystemPrompt` 시그니처 변경, `scoreTrustLevel` 프롬프트 변경(점수 회귀 회피), 선택지 전환, 메타 진행, 사운드, 보스전 풀재구성 |

## 6. 컴포넌트 / 파일 터치포인트
- `components/GameUIComponents.tsx` — 신규: `TacticChip`, `ComboBadge`, `BreakthroughBanner`, `CrisisAlert`.
- `screens/Simulation.tsx` — 전술 칩(composer, 높이 보정), `chosenTactic`/`tacticHistory`, 매 턴 적합도/콤보 판정, contextPrefix 의도 주입, mobile compact status 확장(스테이지·전투로그), 연출 트리거, `TRUST_SCORING_INTERVAL` 조정.
- `services/missionBriefings.ts` — `MissionBriefing.tactics?` + `getTactics()` 폴백.
- 신규 `services/tacticService.ts` — `TACTIC_EFFECTIVENESS` 표 + `evaluateTactic(trust, tactic)` + 콤보 헬퍼. (emotionStateMachine 단일책임 보존 — 리뷰 m3)

## 7. 스코프 / 단계
- **Phase 1 (MVP)**: ① 모바일 상태 보강(스테이지·전투로그) + ② 전술 카드(의도 태그) + ③ 적합도/콤보(매 턴 클라이언트) + `TRUST_SCORING_INTERVAL` 조정. → 무료·모바일에서 매 턴 즉시 게임 체감.
- **Phase 2**: ④ 돌파/위기 본격화 + 전술↔감정 표 변주(answer-key 완화) + 시나리오별 전술 커스터마이즈.

## 8. 테스트
- 단위(`vitest`): `TACTIC_EFFECTIVENESS`/`evaluateTactic` 매핑, 콤보 증감/리셋(턴 단위), `getTactics` 폴백, `TRUST_SCORING_INTERVAL` 세션별 값.
- 회귀: 무료 5턴/유료 10턴 완주, 데스크톱 aside 무변경, 모바일 fixed composer+키보드(:740-769,:1199-1204) 무변경(칩 높이 보정 확인), `npm run build` exit 0, 기존 점수 분포(프롬프트 미변경) 유지.

## 9. Out of Scope (YAGNI)
선택지 기반 전환, 카드 단독 전송, 메타 진행(레벨/수집/언락), 사운드, 보스전 풀 재구성(접근 C), 음성(/voice), 28개 시나리오 전술 전수 커스터마이즈(기본 세트로 시작).
