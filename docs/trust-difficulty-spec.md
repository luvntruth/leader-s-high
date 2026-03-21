# 신뢰도 & 난이도 시스템 명세

## 1. 난이도별 초기 신뢰도

시나리오의 `intensity` 필드에 따라 시뮬레이션 시작 시 초기 신뢰도가 결정됩니다.

| 난이도 | intensity | 초기 신뢰도 | 시작 감정 상태 | 체감 |
|--------|-----------|:--------:|:----------:|------|
| S등급 | `high` | **25** | 경계/방어 | 어려움 (팀원이 적대적) |
| A등급 | `medium` | **45** | 유보적 관망 | 보통 |
| B등급 | `low` | **65** | 점진적 수용 | 쉬움 (팀원이 협조적) |

## 2. 데이터 흐름

```
constants.tsx (SCENARIOS)
  └─ intensity: 'high' | 'medium' | 'low'
       ↓
Setup.tsx
  └─ trustLevel = high→25, medium→45, low→65
  └─ UI: 원형 게이지로 초기 신뢰 지수 표시
  └─ navigate('/simulation', { state: { scenario, initialTrust } })
       ↓
Simulation.tsx
  ├─ trustState.trust = initialTrust (동적)
  ├─ 5차원 dimensions = 모두 initialTrust
  ├─ EmotionStateMachine(initialTrust)
  └─ trustHistory = [initialTrust]
       ↓
trustLevelService.ts
  └─ scoreTrustLevel({ state: { prev_trust: currentTrust } })
  └─ 4턴마다 Gemini로 신뢰도 재산정
       ↓
emotionStateMachine.ts
  └─ trust → 감정 상태 7단계 변환
  └─ AI 팀원의 어조/반응 결정
```

## 3. 감정 상태 7단계

| Trust 범위 | 상태 | AI 팀원 반응 |
|-----------|------|-----------|
| 0~15 | HOSTILE (적대) | 대화 거부, 공격적 |
| 16~30 | DEFENSIVE (방어) | 짧은 답변, 벽 세움 |
| 31~45 | GUARDED (경계) | 조심스러운 관망 |
| 46~60 | NEUTRAL (중립) | 판단 유보, 시험 |
| 61~75 | OPENING (개방) | 점차 마음을 열기 시작 |
| 76~90 | COOPERATIVE (협력) | 솔직한 대화, 함께 해결 |
| 91~100 | CONVINCED (설득됨) | 적극 협력, 변화 동의 |

## 4. 점수 산정 (trustLevelService)

- **측정 주기**: 사용자 발화 4턴마다
- **5차원 프레임**:
  - psychological_safety: 심리적 안전감
  - understanding_alignment: 이해/정렬
  - autonomy_fairness: 자율성/공정성
  - integrity_consistency: 진정성/일관성
  - competence_support: 역량/지원
- **변동폭 제한**: 차원당 ±10/호출, Phase별 상한 적용
- **Phase**: early(<6턴), mid(6~14턴), late(≥15턴)

## 5. 리더십 유형 분석 (피드백 시)

시뮬레이션 완료 후 Gemini가 대화 전문을 분석하여 추출:

| 유형 | 설명 |
|------|------|
| coaching (코칭형) | 질문과 경청으로 팀원의 잠재력을 끌어내는 리더 |
| directing (지시형) | 명확한 방향과 기준을 제시하는 리더 |
| delegating (위임형) | 팀원을 신뢰하고 자율성을 부여하는 리더 |
| participating (참여형) | 함께 논의하고 합의를 이끄는 리더 |

## 6. 대화 패턴 분석 (피드백 시)

| 지표 | 설명 |
|------|------|
| questionRatio | 질문형 발화 비율 (0~100) |
| empathyRatio | 공감/이해 표현 비율 |
| directiveRatio | 지시/명령 비율 |
| listeningRatio | 경청/반영 비율 |

합계 = 100

## 7. 관련 파일

| 파일 | 역할 |
|------|------|
| `constants.tsx` | 40개 시나리오 + intensity 정의 |
| `screens/Setup.tsx` | 초기 신뢰도 계산 + 전달 |
| `screens/Simulation.tsx` | 시뮬레이션 엔진, 신뢰도 추적 |
| `services/trustLevelService.ts` | Gemini 기반 신뢰도 채점 |
| `services/emotionStateMachine.ts` | 감정 상태 7단계 변환 |
| `screens/Feedback.tsx` | 리더십 유형 + 대화 패턴 분석 |
| `src/types/database.ts` | LeadershipType, CommunicationPattern 타입 |
