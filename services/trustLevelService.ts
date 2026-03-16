
import { GoogleGenAI } from "@google/genai";
import { createGeminiClient } from '../src/lib/geminiClient';

const TRUST_LEVEL_SYSTEM_PROMPT = `당신은 "Trust Level(대화 품질) 스코어링 엔진"입니다.
이 점수는 감정적 신뢰 그 자체가 아니라, 대화에서 관찰되는 '신뢰를 형성/훼손하는 행동 단서(trust cues)'와 상대 반응을 기반으로 한 0~100의 '대화 품질 점수'입니다.
목표: 사용자가 대화 중 쉽게 납득하도록, 점수 변화의 이유와 근거를 함께 제공합니다.

[세션 초기값 규칙]
- 매 세션 Trust Level은 반드시 30에서 시작합니다.
- state.prev_trust가 없거나 state.is_new_session=true이면 prev_trust=30으로 간주합니다.
- 첫 산출 trust는 항상 prev_trust=30을 기준으로 변화합니다.

[INPUT]
- mode: "chat" 또는 "voice"
- transcript: 대화 기록 배열. 각 원소는 {"turn_id":<int>, "speaker":"user|other","text":"..."} 입니다.
  - turn_id는 1부터 시작하는 정수.
  - user = 앱 사용자(리더/화자)
  - other = 상대(팀원/대화상대)
  - voice 모드에서도 user와 other 발화가 모두 포함됩니다.
  - voice 모드에서 비언어 단서가 있으면 [silence:3s], [overlap], [sigh] 등 메타 태그로 표기될 수 있음.
- state:
  - prev_trust: (선택) 직전 Trust Level (0~100)
  - prev_dimensions: (선택) 직전 5차원 점수 객체. 미제공 시 모두 30.
  - is_new_session: (선택) true/false
  - prev_stage: (선택) "S1|S2|S3|S4". 미제공 시 "S1".
  - recent_events: (선택) 최근 10개 이내 이벤트 로그 배열. 형식: "FAMILY:EVENT_CODE"
  - optional_context: (선택) 대화 목적/역할/상황 요약

[OUTPUT]
반드시 JSON만 출력(설명/마크다운 금지).
**중요: 숫자 양수 값에 절대 '+' 기호를 붙이지 마시오 (예: +2가 아니라 2로 표기).**
{
  "trust": <int 0..100>,
  "delta": <int -15..8>,
  "dimensions": {
    "psychological_safety": <int 0..100>,
    "understanding_alignment": <int 0..100>,
    "autonomy_fairness": <int 0..100>,
    "integrity_consistency": <int 0..100>,
    "competence_support": <int 0..100>
  },
  "events": [
    {
      "family": "<FAMILY>",
      "code": "<EVENT_CODE>",
      "impact": <int -15..8>,
      "reason_short": "<UI 1줄 한국어(60자 이내)>",
      "evidence": { "turn_ids":[<int>], "snippet":"<90자 이내 인용/요약>" }
    }
  ],
  "recent_events_out": ["<FAMILY>:<EVENT_CODE>", ...],
  "stage": {
    "level": "S1|S2|S3|S4",
    "cap_limit": <int 0..100>,
    "cap_applied": <true|false>,
    "promotion_reason": "<승격 시 근거 1줄, 없으면 null>",
    "demotion_reason": "<강등 시 근거 1줄, 없으면 null>"
  },
  "next_hint": "<다음 점수 상승을 위한 1줄 조언(한국어, 60자 이내)>"
}

[정합성 원칙]
1) 행동 증거 기반: transcript에서 확인되는 단서가 있을 때만 점수 변화.
2) 상승은 점진적(+1~+4 중심), 하락은 빠르게(-4~-10 중심). 한 호출 최대 +8, 최소 -15.
3) 반복 감쇠(diminishing returns): recent_events에 동일 FAMILY가 반복되면 상승폭을 강하게 감쇠(특히 초반).
4) voice 모드: ASR 잡음(음…, 반복, 끊김)은 의미 판단에서 제외. 문장이 불완전/모호하면 상승폭을 줄이고, 하락은 '명백한 위협/비난/모욕'이 있을 때만 크게 준다. [silence:Ns] 5초 이상은 불편함 신호로 간주하되 단독 감점하지 않고 다른 부정 이벤트와 함께일 때만 -1 추가. [overlap]은 LISTEN:E_NO_LISTENING 판단의 보조 근거로만 사용.
5) 허구 금지: transcript에 없는 내용을 지어내지 않는다. 불확실하면 보수적으로 평가한다.
6) events는 최소 1개, 최대 6개까지만 출력(가장 영향 큰 것 위주).

[심리학/뇌과학 기반 5차원 프레임]
- psychological_safety(초기값 30): 비난/조롱/압박 없이 말할 수 있는 안전감
- understanding_alignment(초기값 30): 경청/반영/요약/정렬 확인으로 이해가 맞춰지는 정도
- autonomy_fairness(초기값 30): 자율성/공정성/존중/예측가능성 신호(통제/불공정/모욕은 감소)
- integrity_consistency(초기값 30): 정직함, 기준/약속의 일관성, 책임 회피 없음
- competence_support(초기값 30): 실질적 도움/지원/장벽 제거 + 과도한 처방/일방성은 감점

5차원 변동 규칙:
- 차원당 한 호출 변동폭 최대 ±10, 값은 0~100 클램프.
- 이벤트→차원 매핑:
  LISTEN, EMPATHY → psychological_safety(70%), understanding_alignment(100%)
  AUTONOMY_FAIR → autonomy_fairness(100%), psychological_safety(50%)
  INTEGRITY → integrity_consistency(100%)
  SUPPORT, CLARITY → competence_support(100%)
  THREAT → psychological_safety(-100%), autonomy_fairness(-70%)
  OTHER_SIGNAL → psychological_safety(±50%), understanding_alignment(±50%)

[상대 반응(other) 반영 규칙]
- other가 이해/수용/협력 신호를 명확히 보이면 understanding_alignment 및 psychological_safety에 +1~+2 보너스 가능.
- other가 방어/거부/위축/불공정 호소를 명확히 보이면 psychological_safety 및 autonomy_fairness에 -2~-6 감점 가능.
- other의 불만은 합리적일 수 있으므로, user의 원인 이벤트와 함께 있을 때 감점을 크게 준다.
- other가 단답/침묵이면 확정적 해석을 피하고 감점은 작게(-1~-3)만 준다.

[Stage + Cap]
S1(기본 안전) → cap 60
S2(이해 정렬) → cap 75
S3(협력적 전진) → cap 90
S4(고도화) → cap 100

Stage 승격(recent_events_out 누적 기반):
- S1→S2: LISTEN:E_OPEN_QUESTION, LISTEN:E_REFLECT_SUMMARY, LISTEN:E_ALIGN_CHECK, EMPATHY:E_VALIDATE_EMOTION 중 2개 이상 서로 다른 이벤트 존재
- S2→S3: AUTONOMY_FAIR:E_AUTONOMY_SUPPORT, CLARITY:E_CLARIFY_EXPECTATION, NEXT_STEP:E_SHARED_NEXT_STEP, OTHER_SIGNAL:E_OTHER_ACCEPTS 중 2개 이상 서로 다른 이벤트 존재
- S3→S4: NEXT_STEP:E_FOLLOWUP_PLAN 1개 이상 존재
한 호출에 2단계 이상 승격 불가.

Stage 강등:
- THREAT 이벤트 발생 시 1단계 강등.
- trust가 cap - 25 이하로 하락 시 trust에 맞는 stage로 재판정.

[Phase 판정]
- early: is_new_session=true 또는 transcript 총 턴 수 < 6
- mid: 턴 수 6~14
- late: 턴 수 ≥ 15

Phase별 변동 상한: early(+4/-10, 치명시 -15), mid(+6/-12, 치명시 -15), late(+8/-15).

스무딩: THREAT 없으면 delta=round(raw_delta×0.85). THREAT 있으면 delta=raw_delta.
조합 보너스(+2)는 스무딩 후 가산(phase 상한 이내).

조합 보너스 조건:
A) LISTEN:E_OPEN_QUESTION + LISTEN:E_REFLECT_SUMMARY + LISTEN:E_ALIGN_CHECK
B) AUTONOMY_FAIR:E_AUTONOMY_SUPPORT + NEXT_STEP:E_SHARED_NEXT_STEP
C) CLARITY:E_CLARIFY_EXPECTATION + OTHER_SIGNAL:E_OTHER_ACCEPTS

Anti-gaming(계열 반복 감쇠): early=0, mid=50%, late=70%. EMPATHY 단독 반복은 어떤 phase든 최대 +1.

종료 직전 완결성: 마무리 신호가 있는데 NEXT_STEP 계열이 없으면 META:E_NO_NEXT_STEP_STRONG(-6).

[EVENT 사전]
LISTEN: E_OPEN_QUESTION(+2), E_REFLECT_SUMMARY(+2), E_ALIGN_CHECK(+1), E_NO_LISTENING(-4~-8)
EMPATHY: E_VALIDATE_EMOTION(+1~+2), E_APPRECIATION(+1)
AUTONOMY_FAIR: E_AUTONOMY_SUPPORT(+2), E_FAIRNESS_SIGNAL(+1~+2), E_OVERCONTROL(-5~-9), E_UNFAIRNESS(-6~-10)
CLARITY: E_CLARIFY_EXPECTATION(+1~+3), E_VAGUE_REQUEST(-4~-6)
NEXT_STEP: E_SHARED_NEXT_STEP(+2~+3), E_FOLLOWUP_PLAN(+3), E_NO_NEXT_STEP(-4~-6)
SUPPORT: E_SUPPORT_OFFER_SPECIFIC(+2), E_ADVICE_ONLY(-3~-6)
INTEGRITY: E_REPAIR_ATTEMPT(+2), E_INCONSISTENCY(-5~-9)
THREAT: E_JUDGMENT_LABEL(-8~-12), E_THREAT_PRESSURE(-8~-15), E_STATUS_HIT(-6~-10), E_FACT_INTERPRET_MIX(-4~-7)
OTHER_SIGNAL: E_OTHER_ACCEPTS(+1~+2), E_OTHER_DEFENSIVE(-2~-6)
META: E_COMBO_BONUS(+2), E_NO_NEXT_STEP_STRONG(-6)

이제 [INPUT]을 분석하여 JSON만 출력하라.`;

export interface TrustLevelInput {
  mode: 'chat' | 'voice';
  transcript: Array<{ turn_id: number; speaker: 'user' | 'other'; text: string }>;
  state: {
    prev_trust?: number;
    prev_dimensions?: {
      psychological_safety: number;
      understanding_alignment: number;
      autonomy_fairness: number;
      integrity_consistency: number;
      competence_support: number;
    };
    is_new_session?: boolean;
    prev_stage?: 'S1' | 'S2' | 'S3' | 'S4';
    recent_events?: string[];
    optional_context?: string;
  };
}

export interface TrustLevelOutput {
  trust: number;
  delta: number;
  dimensions: {
    psychological_safety: number;
    understanding_alignment: number;
    autonomy_fairness: number;
    integrity_consistency: number;
    competence_support: number;
  };
  events: Array<{
    family: string;
    code: string;
    impact: number;
    reason_short: string;
    evidence: { turn_ids: number[]; snippet: string };
    change?: string; // e.g., "+3"
    dimension?: string; // e.g., "신뢰도"
  }>;
  recent_events_out: string[];
  stage: {
    level: 'S1' | 'S2' | 'S3' | 'S4';
    cap_limit: number;
    cap_applied: boolean;
    promotion_reason: string | null;
    demotion_reason: string | null;
  };
  next_hint: string;
}

// --- Instant Coaching (경량 즉시 피드백) ---

export interface InstantCoachingInput {
  userMessage: string;
  modelResponse: string;
  scenarioContext: string;
  currentTrust: number;
}

export interface InstantCoachingResult {
  positiveImpact: string;
  negativeRisk: string;
  estimatedTrustDelta: number;
  betterAlternative: string;
  tip: string;
}

const INSTANT_COACHING_PROMPT = `당신은 리더십 코칭 전문가입니다. 리더의 발언 1개와 팀원의 반응 1개를 분석하여 즉시 피드백을 제공합니다.

[규칙]
1. 모든 내용은 한국어로 작성
2. positiveImpact: 이 발언이 신뢰/관계에 미치는 긍정적 영향 (1문장, 60자 이내)
3. negativeRisk: 이 발언의 잠재적 리스크나 놓친 기회 (1문장, 60자 이내). 리스크 없으면 "특별한 리스크 없음"
4. estimatedTrustDelta: 이 발언으로 인한 예상 신뢰 변화 (-10 ~ 5 정수). 양수에 + 기호 붙이지 마시오.
5. betterAlternative: 같은 의도를 더 효과적으로 전달하는 대안 표현 (직접 인용 형태)
6. tip: 핵심 코칭 팁 (1문장, 40자 이내)
7. JSON만 출력, 설명/마크다운 금지`;

// Singleton GoogleGenAI instance - reused across calls
let aiInstance: GoogleGenAI | null = null;

function getAIInstance(): GoogleGenAI {
  if (!aiInstance) aiInstance = createGeminiClient();
  return aiInstance;
}

function isValidTrustOutput(obj: unknown): obj is TrustLevelOutput {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.trust === 'number' &&
    typeof o.delta === 'number' &&
    typeof o.next_hint === 'string' &&
    o.dimensions != null && typeof o.dimensions === 'object' &&
    Array.isArray(o.events) &&
    Array.isArray(o.recent_events_out) &&
    o.stage != null && typeof o.stage === 'object'
  );
}

export const TrustLevelService = {
  async scoreTrustLevel(input: TrustLevelInput): Promise<TrustLevelOutput | null> {
    if (input.transcript.length === 0) return null;

    const ai = getAIInstance();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: JSON.stringify(input),
        config: {
          systemInstruction: TRUST_LEVEL_SYSTEM_PROMPT,
          temperature: 0.2,
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (!text) return null;

      // Clean up markdown code blocks if present
      let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

      // Fix plus signs only in JSON numeric values (not inside string values)
      // Match ": +N" patterns that are clearly numeric fields
      cleaned = cleaned.replace(/":\s*\+(\d+)/g, '": $1');

      const output = JSON.parse(cleaned);

      if (!isValidTrustOutput(output)) {
        console.error("TrustLevelService: Invalid response structure");
        return null;
      }

      return output;
    } catch (error) {
      console.error("TrustLevelService Error:", error);
      return null;
    }
  },

  async getInstantCoaching(input: InstantCoachingInput): Promise<InstantCoachingResult | null> {
    const ai = getAIInstance();

    try {
      const userContent = JSON.stringify({
        userMessage: input.userMessage,
        modelResponse: input.modelResponse,
        context: input.scenarioContext,
        currentTrust: input.currentTrust
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userContent,
        config: {
          systemInstruction: INSTANT_COACHING_PROMPT,
          temperature: 0.3,
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (!text) return null;

      let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      cleaned = cleaned.replace(/":\s*\+(\d+)/g, '": $1');

      const output = JSON.parse(cleaned);

      if (
        typeof output.positiveImpact !== 'string' ||
        typeof output.negativeRisk !== 'string' ||
        typeof output.estimatedTrustDelta !== 'number' ||
        typeof output.betterAlternative !== 'string' ||
        typeof output.tip !== 'string'
      ) {
        console.error("InstantCoaching: Invalid response structure");
        return null;
      }

      return output as InstantCoachingResult;
    } catch (error) {
      console.error("InstantCoaching Error:", error);
      return null;
    }
  }
};
