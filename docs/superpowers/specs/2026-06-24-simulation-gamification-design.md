# 시뮬레이션 게임화 설계 (접근 B: 전술 카드 + 콤보 + 위기 모먼트)

- 날짜: 2026-06-24
- 상태: 설계 승인 대기 → (승인 후) 구현계획
- 관련: `screens/Simulation.tsx`, `components/GameUIComponents.tsx`, `services/trustLevelService.ts`, `services/emotionStateMachine.ts`, `services/missionBriefings.ts`

## 1. 문제 정의
사용자 피드백: "시뮬레이션이 늘어지고 재미가 하나도 없다." 진단 결과 **순간순간의 플레이 루프**가 비어 있음 — 구체적으로 세 가지:
1. **타격감 부족** — 내 발화가 먹혔는지 즉각 와닿지 않음.
2. **긴장·위기감 부재** — 실패해도 별 일 없고 결정적 순간이 없음.
3. **단조로운 입력(agency 부재)** — 빈 칸에 글만 씀. '플레이'하는 느낌이 없음.

### 결정적 코드 진단
게임 연출의 상당수가 **이미 구현돼 있으나 데스크톱 전용**이다:
- `screens/Simulation.tsx:823` 플로팅 "+N TRUST" 텍스트, `:804-811` red/blue 전체화면 플래시 → `fixed`라 **모바일에도 표시됨**.
- 그러나 **전투로그(`events[].reason_short`)·3목표(도입·전환·합의 `goalAchievements`)·신뢰 HP바·감정·스테이지(S1~S4)** 는 전부 `<aside className="hidden sm:flex">`(`:848`) = **데스크톱 전용**. 광고 트래픽 대다수인 모바일 사용자는 채팅 말풍선만 보고 게임 상태가 전혀 안 보인다.
- 점수 엔진(`trustLevelService.ts`)은 이미 턴마다 `delta`(-15..8), `events[]`(family/code/impact/`reason_short`/evidence), `stage`(S1~S4 + promotion/demotion_reason), `goalAchievements`(tacticalGoals 3개 판정: 도입/전환/합의)를 산출한다. 즉 게임화 데이터 배관은 대부분 존재한다.

## 2. 확정된 결정 (브레인스토밍)
- **접근 B** 채택: 자유 입력 유지 + 전술 카드 + 콤보 + 위기 모먼트.
- **플레이 모델: 하이브리드** — 자유 타이핑(실전 화법 연습 가치)을 핵심으로 유지.
- **전술 카드 동작: 의도 태그만** — 카드는 "이번 한 수의 의도"만 설정. 문장은 사용자가 직접 작성. AI·채점이 그 의도를 기준으로 반응·보상. (스캐폴드 자동완성·카드단독전송 미채택 → 연습 가치 보존)
- 우선순위 축: 타격감 + 긴장 + 플레이 (메타 보상/성장은 후순위).

## 3. 설계: 세 기둥

### ① 모바일 게임 HUD (숨겨진 상태 노출) — 재활용
- 모바일(`<sm`)에서 채팅 영역 상단에 **컴팩트 HUD**: 신뢰 `HPBar`(size sm) + 감정 이모지/라벨 + 스테이지 칩(S1~S4) + 3목표 점 3개(도입/전환/합의).
- HUD 탭 → **bottom-sheet**로 전투로그(`events[].reason_short` + impact 아이콘)와 5차원 미니 레이더 펼침.
- 데스크톱 aside는 그대로 유지. HUD는 `sm:hidden`으로 모바일 전용 분기.
- 데이터: 기존 `trustState`, `events`, `goalAchievements`, `emotionData` 재사용. **신규 데이터 없음.**

### ② 전술 카드 (agency 핵심) — 신규
- 입력창(composer) 위에 시나리오별 **전술 칩 3~4개**. 소스: `missionBriefings`에 시나리오별 `tactics` 정의 추가(없으면 기본 세트).
- 기본 전술 세트(프레임워크 기반): `공감`(정서 반영), `사실 짚기`(SBI: 행동·영향 사실화), `열린 질문`(자율성 자극), `인정`(강점·노력 인정).
- 동작(**의도 태그만**): 칩 탭 → 입력창에 "이번 한 수: 공감" 배지 부착(토글). 전송 시:
  - `buildSystemPrompt`에 "사용자가 이번 턴 '<전술>' 의도로 말함" 한 줄 추가 → NPC가 의도에 맞춰 반응(연출 풍부화, 선택적).
  - `scoreTrustLevel` input에 `chosenTactic` 전달(로그/근거용, 점수 산식 자체는 기존 유지).
- **전술↔감정 적합도(콤보 판정)는 클라이언트 정적 표로 결정**(AI 변동성 회피, 결정적):
  - `TACTIC_EFFECTIVENESS[emotion][tactic] = 'crit' | 'good' | 'weak'`.
  - 예: HOSTILE/DEFENSIVE → `공감`·`인정` = crit, `사실 짚기` = weak(시기상조), `열린 질문` = good. NEUTRAL/GUARDED → `열린 질문`·`공감` = good. OPENING/COOPERATIVE → `사실 짚기`·`인정` = crit.
- 전송 결과 연출: `delta > 0` 이고 적합도 `crit` → **CRITICAL** 대형 연출 + 콤보 +1. `weak`인데 `delta < 0` → "역효과" 표시. 적합도는 카드 선택 시 미리 힌트로 노출하지 않음(선택의 긴장 유지) — 결과로만 학습.

### ③ 돌파/위기 모먼트 — 재활용 + 증폭
- **BREAKTHROUGH**: `stage` 승격(S1→S2…) 또는 목표 달성(도입→전환→합의) 시 전체화면 축포 + "돌파!" 배너 + 콤보 보너스. (`stage.promotion_reason` 표시)
- **CRISIS**: `stage` 강등 또는 감정 HOSTILE 급락 시 위기 경보 + "이 한마디로 만회" 한 턴 강조(기존 SOS/즉시코칭 연계). (`stage.demotion_reason` 표시)
- **콤보 시스템**: 연속 `delta>0`(또는 적합도 good+) 턴마다 콤보 증가, 음수 델타/`weak` 시 리셋. 콤보가 높을수록 플로팅 텍스트 크기·색·"COMBO xN" 강조.

## 4. 데이터 / AI 변경 요약
| 구분 | 항목 |
|---|---|
| 재활용(무변경) | `delta`, `events[]`, `stage`, `goalAchievements`, `emotionStateMachine`, `HPBar`, `combatTexts`, 화면 플래시 |
| 신규 | (a) 모바일 HUD + bottom-sheet, (b) 전술 카드 UI + `chosenTactic` 상태, (c) `buildSystemPrompt`/`scoreTrustLevel` input에 `chosenTactic` 1줄 추가, (d) `TACTIC_EFFECTIVENESS` 정적 표 + 콤보 상태, (e) BREAKTHROUGH/CRISIS 연출 컴포넌트, (f) `missionBriefings`에 시나리오별 `tactics`(선택, 기본세트 폴백) |

## 5. 컴포넌트 / 파일 터치포인트
- `components/GameUIComponents.tsx` — 신규: `TacticChip`, `MobileBattleHUD`, `BreakthroughBanner`, `CrisisAlert`, `ComboBadge`.
- `screens/Simulation.tsx` — HUD(모바일) 통합, 전술 칩 composer 상단 배치, 콤보·돌파·위기 연출 트리거 연결, `chosenTactic` 전달.
- `services/missionBriefings.ts` — `MissionBriefing.tactics?: TacticDef[]` 추가 + `getTactics(scenarioId)` 폴백.
- `services/trustLevelService.ts` — `scoreTrustLevel` input에 `chosenTactic?` 수용(프롬프트에 반영).
- `services/emotionStateMachine.ts` — `TACTIC_EFFECTIVENESS` 표 위치(또는 신규 `tacticService.ts`).

## 6. 스코프 / 단계
- **Phase 1 (MVP, 우선)**: ① 모바일 HUD + ② 전술 카드(의도 태그 + 적합도 콤보/크리티컬 연출). → 모바일에서 즉시 "게임" 체감.
- **Phase 2**: ③ 돌파/위기 모먼트 본격화 + 전술↔감정 표 정교화 + 시나리오별 전술 커스터마이즈.

## 7. 테스트
- 단위: `TACTIC_EFFECTIVENESS` 매핑, 콤보 증감/리셋 로직, `getTactics` 폴백 — `vitest`.
- 회귀: 무료 5턴/유료 10턴 완주, 데스크톱 aside 무변경, 모바일 fixed composer·키보드 로직 무변경, `npm run build` exit 0.

## 8. Out of Scope (YAGNI)
- 선택지 기반(비주얼노벨) 전환, 카드 단독 전송, 메타 진행(레벨/수집/언락), 사운드, 보스전 풀 재구성(접근 C). 음성(/voice)도 범위 밖.
