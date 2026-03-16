# instant-coaching Design

## 1. 구현 개요

Simulation 화면에 "즉시 코칭" 기능 추가. 사용자가 버튼을 클릭하면 마지막 1턴(사용자 발언 + AI 응답)을 경량 AI로 분석하여 긍정/부정 영향, 대안, 팁을 즉시 표시.

## 2. 파일 변경 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `services/trustLevelService.ts` | 수정 | `getInstantCoaching()` 함수 추가 |
| `screens/Simulation.tsx` | 수정 | 코칭 버튼 + 카드 UI + 상태 관리 추가 |

**신규 파일 없음** — 기존 파일 2개만 수정.

## 3. 서비스 설계: `getInstantCoaching()`

### 3.1 위치
`services/trustLevelService.ts`에 static 메서드 추가

### 3.2 인터페이스

```typescript
export interface InstantCoachingInput {
  userMessage: string;        // 사용자의 마지막 발언
  modelResponse: string;      // AI 팀원의 마지막 응답
  scenarioContext: string;    // "상황: {title}, 팀원: {name}({generation})"
  currentTrust: number;       // 현재 신뢰도 (0-100)
}

export interface InstantCoachingResult {
  positiveImpact: string;      // 긍정적 영향 (60자 이내)
  negativeRisk: string;        // 부정적 영향/리스크 (60자 이내)
  estimatedTrustDelta: number; // 예상 신뢰 변화 (-10 ~ +5)
  betterAlternative: string;   // 더 나은 표현 제안
  tip: string;                 // 핵심 팁 (40자 이내)
}
```

### 3.3 경량 시스템 프롬프트

```
당신은 리더십 코칭 전문가입니다. 리더의 발언 1개와 팀원의 반응 1개를 분석하여 즉시 피드백을 제공합니다.

[규칙]
1. 모든 내용은 한국어로 작성
2. positiveImpact: 이 발언이 신뢰/관계에 미치는 긍정적 영향 (1문장, 60자 이내)
3. negativeRisk: 이 발언의 잠재적 리스크나 놓친 기회 (1문장, 60자 이내). 리스크 없으면 "특별한 리스크 없음"
4. estimatedTrustDelta: 이 발언으로 인한 예상 신뢰 변화 (-10 ~ +5 정수)
5. betterAlternative: 같은 의도를 더 효과적으로 전달하는 대안 표현 (직접 인용 형태)
6. tip: 핵심 코칭 팁 (1문장, 40자 이내)
7. JSON만 출력, 설명/마크다운 금지
```

### 3.4 Gemini 호출 설정

```typescript
{
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: INSTANT_COACHING_PROMPT,
    temperature: 0.3,
    responseMimeType: 'application/json',
    responseSchema: { /* InstantCoachingResult 스키마 */ }
  }
}
```

## 4. UI 설계

### 4.1 코칭 버튼

**위치**: 입력 영역 우측, 전송 버튼과 SOS 버튼 사이

```
[SOS 🧠] [입력창...] [💡 코칭] [전송 ▶]
```

**스타일**:
- 배경: `#f59e0b` (앰버) / 호버: `#d97706`
- 아이콘: `tips_and_updates` (Material Icon)
- 비활성: 메시지 없거나 로딩 중일 때 `opacity: 0.5`, `pointer-events: none`
- 로딩: 버튼 내 스피너 표시

### 4.2 코칭 카드

**위치**: 메시지 목록 최하단, 가장 최근 AI 응답 아래에 삽입

**구조**:
```tsx
{showCoaching && instantCoaching && (
  <div className="coaching-card" style={{
    margin: '8px 16px',
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  }}>
    <div className="coaching-header">
      <span>💡 즉시 코칭</span>
      <button onClick={toggleCoaching}>▲ 접기</button>
    </div>
    <div className="coaching-body">
      <p>✅ {instantCoaching.positiveImpact}</p>
      <p>⚠️ {instantCoaching.negativeRisk}</p>
      <p>📊 예상 신뢰 변화: <span style={{color: delta > 0 ? '#4ade80' : '#ef4444'}}>
        {delta > 0 ? '+' : ''}{instantCoaching.estimatedTrustDelta}
      </span></p>
      <p>💬 "{instantCoaching.betterAlternative}"</p>
      <p>🎯 {instantCoaching.tip}</p>
    </div>
  </div>
)}
```

**접기/펼치기 동작**:
- 버튼 클릭 시 코칭 카드 자동 펼침
- 접기 버튼으로 숨김
- 새 코칭 요청 시 이전 카드 대체 + 자동 펼침

### 4.3 상태 관리 (Simulation.tsx 추가 상태)

```typescript
const [instantCoaching, setInstantCoaching] = useState<InstantCoachingResult | null>(null);
const [isCoachingLoading, setIsCoachingLoading] = useState(false);
const [showCoaching, setShowCoaching] = useState(false);
```

### 4.4 핸들러

```typescript
const handleInstantCoaching = async () => {
  if (isCoachingLoading) return;

  const userMessages = messages.filter(m => m.role === 'user');
  const lastUser = userMessages[userMessages.length - 1];
  const lastModelIdx = messages.findLastIndex(m => m.role === 'model' && !m.isError);
  const lastModel = messages[lastModelIdx];

  if (!lastUser || !lastModel) return;

  setIsCoachingLoading(true);
  setShowCoaching(true);

  try {
    const result = await TrustLevelService.getInstantCoaching({
      userMessage: lastUser.text,
      modelResponse: lastModel.text,
      scenarioContext: `상황: ${scenario?.title}, 팀원: ${config.name}(${config.generation})`,
      currentTrust: trustState.trust
    });

    if (result) {
      setInstantCoaching(result);
    }
  } catch (err) {
    console.error('Instant coaching failed:', err);
  } finally {
    setIsCoachingLoading(false);
  }
};
```

## 5. 구현 순서

| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | `InstantCoachingInput/Result` 인터페이스 추가 | trustLevelService.ts |
| 2 | 경량 프롬프트 상수 추가 | trustLevelService.ts |
| 3 | `getInstantCoaching()` static 메서드 구현 | trustLevelService.ts |
| 4 | 코칭 상태 3개 추가 | Simulation.tsx |
| 5 | `handleInstantCoaching()` 핸들러 추가 | Simulation.tsx |
| 6 | 코칭 버튼 UI 추가 (입력 영역) | Simulation.tsx |
| 7 | 코칭 카드 UI 추가 (메시지 영역) | Simulation.tsx |

## 6. API 비용 분석

| 항목 | 기존 scoreTrustLevel | 신규 getInstantCoaching |
|------|---------------------|------------------------|
| 시스템 프롬프트 | ~3000 토큰 (141줄) | ~200 토큰 (7줄) |
| 입력 컨텍스트 | 10개 메시지 (~1500 토큰) | 2개 메시지 (~300 토큰) |
| 상태 정보 | 복잡 (5차원 + 이벤트) | 단순 (신뢰도 숫자만) |
| 출력 | ~500 토큰 (이벤트 배열) | ~150 토큰 (5개 필드) |
| **합계** | ~5000 토큰/호출 | **~650 토큰/호출** |
| **자동/수동** | 자동 (3턴마다) | 수동 (버튼 클릭) |
