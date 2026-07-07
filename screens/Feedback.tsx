
import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { createGeminiClient } from '../src/lib/geminiClient';
import { getCharacterAvatar, getCharacterInfo, getAvatarGlowColor } from '../services/characterAvatars';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import { analyticsService } from '../services/analyticsService';
import { diagnose, DIM_LABEL, type DimensionKey } from '../services/diagnosisService';
import { REPORT_PAYMENT_OPTION } from '../services/paymentService';
import DiagnosisRadar from '../components/DiagnosisRadar';
import ShareCard from '../components/ShareCard';
import { SCENARIOS } from '../constants';

interface EvaluationData {
  summary: string;
  strengths: { title: string; desc: string }[];
  improvements: { title: string; desc: string }[];
  modelAnswers: { situation: string; bestResponse: string; why: string }[];
  theoryInsight: {
    theoryName: string;
    scienceBase: string;
    practicalApply: string;
  };
  actionItems: string[];
  coachingSkills: {
    empathyExpression: number;
    questionSkill: number;
    emotionControl: number;
    activeListening: number;
    actionGuidance: number;
  };
  metrics: {
    sbiScore: number;
    empathyIndex: number;
    outcomeSuccess: number;
  };
  radarChart: {
    trust: number;
    motivation: number;
    conflict: number;
    decision: number;
    strategy: number;
  };
  // ── Spec v3 §6: 풀 리포트(플레이북) 전용 필드 — 풀 리포트 모드에서만 생성됨 ──
  /** Section 2: 3단계 대화 전략 분석 (도입/본론/마무리) */
  phaseStrategy?: {
    intro: { userQuote: string; analysis: string; improvement: string };
    mainPoint: { userQuote: string; analysis: string; improvement: string };
    closing: { userQuote: string; analysis: string; improvement: string };
  };
  /** Section 3: Golden Scripts — 결정적 순간 3개 */
  goldenScripts?: {
    situation: string;       // 어떤 상황이었는지
    userSaid: string;        // 사용자가 실제로 한 말 인용
    betterAlternative: string; // 더 강력한 대안 발화
    whyStronger: string;     // 왜 이게 더 강한가 (심리적 근거)
  }[];
  /** Section 4: 심리 트리거 분석 */
  psychTriggers?: {
    /** 신뢰도 급상승 구간 (turn, userSaid, trustDelta, trigger) */
    reactionTurnpoints: { turn: number; userSaid: string; trustChange: string; trigger: string }[];
    /** 놓친 기회 (turn, situation, idealResponse) */
    lostOpportunities: { turn: number; situation: string; idealResponse: string }[];
  };
  /** Section 5: 전문가 코치 총평 */
  coachOverview?: {
    /** 강점 프로파일 — 점수 기반 핵심 3가지 */
    strengthProfile: { skill: string; score: number; evidence: string }[];
    /** 다음에 반드시 연습해야 할 3가지 (현재 vs 목표 + 추천 시나리오) */
    nextPracticeTop3: { focus: string; current: string; goal: string; recommendedScenario: string }[];
  };
  // ── Tier 1 고도화 (2026-05) — 풀 리포트 깊이 강화 ──
  /** Section 6: 7일 행동 플랜 — 매일 1개 구체 행동 */
  weekActionPlan?: {
    day1: { focus: string; action: string };
    day2: { focus: string; action: string };
    day3: { focus: string; action: string };
    day4: { focus: string; action: string };
    day5: { focus: string; action: string };
    day6: { focus: string; action: string };
    day7: { focus: string; action: string };
  };
  /** Section 7: 재도전 가이드 — 같은 시나리오 재플레이 시 */
  retryGuide?: {
    oneThingToChange: string;
    expectedOutcome: string;
    watchOutFor: string;
  };
  /** Section 8: 다음 시나리오 추천 + 추천 이유 */
  recommendedNextScenario?: {
    scenarioTitle: string;
    whyThisOne: string;
    difficulty: string;
  };
  /** Section 9: 이론 깊이 적용 — 2-3개 이론 교차 적용 */
  theoryDeepDive?: {
    theories: {
      name: string;
      applied: string;
      nextTime: string;
    }[];
  };
}

const getRank = (v: number) => {
  if (v >= 90) return { rank: 'S', cls: 'rank-s' };
  if (v >= 75) return { rank: 'A', cls: 'rank-a' };
  if (v >= 60) return { rank: 'B', cls: 'rank-b' };
  if (v >= 40) return { rank: 'C', cls: 'rank-c' };
  return { rank: 'D', cls: 'rank-d' };
};

const FREE_SCENARIOS = ['late-comer', 'boundaries', 'team-clash'];

const Feedback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { transcript, scenario, sosTipHistory, trustDimensions } = location.state || {};
  // ── 대화 유형 진단 — 시뮬레이션 실측 5차원(trustLevelService)에서 결정적 판정.
  //    새로고침 등으로 trustDimensions 가 없으면 null → 기존 간략 배너로 폴백.
  const diagnosis = useMemo(() => diagnose(trustDimensions), [trustDimensions]);
  // Spec v3 §5.4/§5.5: 게스트(profile=null) 는 반드시 간략 리포트.
  // 과거 `profile?.plan !== 'free'` 는 게스트에게 true 를 반환해 풀 리포트가 노출되던 버그.
  const isPaidPlan = !!profile && profile.plan !== 'free';
  // 단건 플레이북 구매 직후 진입 — 무료 플랜/게스트라도 구매한 풀 리포트를 즉시 표시
  const forceFullReport = (location.state as any)?.forceFullReport === true;

  const [isFullReport, setIsFullReport] = useState(isPaidPlan || forceFullReport);
  const [isAnalysing, setIsAnalysing] = useState(true);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const charInfo = getCharacterInfo(scenario?.id, scenario?.memberName);
  const avatarUrl = getCharacterAvatar(scenario?.memberName || '팀원', scenario?.id);

  const fetchWithRetry = async (fn: () => Promise<any>, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        console.error(`Attempt ${i + 1} failed:`, err);
        if (i === retries - 1) throw err;
        const delay = Math.pow(2, i + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const performEvaluation = async () => {
    if (!transcript || transcript.length === 0) {
      navigate('/');
      return;
    }

    // 재방문(마이페이지 → 구매한 플레이북 → 보기) — 저장된 풀 리포트가 있으면 AI 재생성 없이 즉시 표시
    const savedEvaluation = (location.state as any)?.savedEvaluation;
    if (savedEvaluation && (savedEvaluation.phaseStrategy || savedEvaluation.goldenScripts || savedEvaluation.coachOverview)) {
      setEvaluation(savedEvaluation as EvaluationData);
      setIsAnalysing(false);
      return;
    }

    setIsAnalysing(true);
    setError(null);

    try {
      const ai = createGeminiClient();
      const briefPromptSuffix = !isFullReport ? `
        [간략 리포트 모드 — 무료 체험]
        무료 체험 사용자입니다. "맛보기지만 확실한 가치"를 주되, 깊은 전략 분석은 풀 리포트로 남겨두세요.
        ${diagnosis ? `[대화 유형 진단 — 이미 판정됨, 변경 금지]
        이 사용자의 대화 유형은 시스템이 "${diagnosis.typeName}" (급소 차원: ${diagnosis.gap.label}, 강점 차원: ${diagnosis.strength.label})으로 이미 판정했습니다.
        - summary 와 improvements 를 이 유형의 프레임으로 서술하고, "${diagnosis.typeName}"이라는 유형명을 summary 에서 정확히 1회 언급하세요.
        - 다른 유형명을 만들거나 판정을 뒤집지 마세요.` : ''}
        아래를 반드시 지키세요:
        - summary: 이 리더만의 고유한 대화 패턴을 짚는 3문장. "전반적으로 잘했다" 같은 일반론 절대 금지. 사용자의 실제 발화 1개를 인용하여 구체적으로.
        - strengths: 가장 강한 강점 정확히 1개. 실제 발화("...")를 인용해 근거 제시.
        - improvements: 가장 임팩트 큰 개선점 정확히 1개. desc 안에 "다음엔 이렇게 말해보세요: '...'" 형태로, 그 자리에서 그대로 따라 말할 수 있는 구체적 대안 문장 1개를 반드시 포함.
        - modelAnswers: 가장 결정적이었던 상황 1개. bestResponse 는 회의실에서 그대로 소리 내어 말할 수 있는 자연스러운 실전 문장.
        - actionItems: "오늘 또는 다음 면담에서 당장 실천할 행동" 정확히 1개. 추상적 조언("공감하세요") 금지. 구체적 행동("다음 1:1 첫 30초를 '요즘 어떠세요?' 질문으로 시작하세요")으로.
        - coachingSkills: 실제 대화에서 관찰된 행동의 빈도와 질을 기준으로 0~100 사이로 정직하게 채점. 절대 일괄 50점으로 채우지 마세요.
        - radarChart: 실제 대화 내용을 기준으로 0~100 사이로 채점. 절대 일괄 50점으로 채우지 마세요.
        - scienceInsight: 빈 객체 생성 (theoryName, scienceBase, practicalApply 모두 빈 문자열) — 이론 심화는 풀 리포트 전용.
        - phaseStrategy, goldenScripts, psychTriggers, coachOverview, weekActionPlan, retryGuide, recommendedNextScenario, theoryDeepDive: 모두 생략 (풀 리포트 전용).
      ` : `
        [풀 리포트 (플레이북) 모드 — Spec v3 §6]
        유료 사용자/단건 구매자입니다. 아래 5개 추가 필드를 모두 충실히 채우세요:

        15. phaseStrategy: 전체 대화를 도입(초반)/본론(중반)/마무리(후반) 3단계로 균등 분할하여 분석.
            - 각 단계마다 userQuote(해당 단계에서 사용자의 가장 결정적 발화 1개 인용),
              analysis(왜 효과적/비효과적이었는지 2-3문장 분석),
              improvement(개선 가능한 1가지 제안 1-2문장)
            - 비난조 금지, 코치적 어조 유지

        16. goldenScripts: 이번 대화에서 결정적 순간 3개를 골라 각각:
            - situation: "팀원이 ~ 식으로 방어할 때" 같은 상황 묘사
            - userSaid: 사용자가 실제로 한 말 그대로 인용 ("..." 형태)
            - betterAlternative: 그 자리에서 쓸 수 있는 더 강력한 실전 발화 (2-3문장)
            - whyStronger: 왜 이 대안이 더 강한지 심리학/리더십 이론으로 설명 (2-3문장)

        17. psychTriggers: 심리 트리거 분석
            - reactionTurnpoints: 신뢰도가 급상승한 순간 2-3개. 각 항목 { turn(번호), userSaid(인용), trustChange(예: "+13"), trigger(이름: "팀 관점 전환" 등) }
            - lostOpportunities: 더 잘할 수 있었던 순간 1-2개. 각 항목 { turn, situation, idealResponse(이상적 대응) }

        18. coachOverview: 전문가 코치 총평
            - strengthProfile: 강점 3가지. 각 { skill(예: "공감적 경청"), score(0-100), evidence(대화 기록 인용 근거) }
            - nextPracticeTop3: 다음에 반드시 연습해야 할 3가지. 각 { focus(연습 영역), current(현재 수준 1문장), goal(목표 수준 1문장), recommendedScenario(추천 시나리오 ID 또는 한국어 명칭) }

        19. 새 필드의 모든 인용("...") 은 transcript 의 실제 사용자 발화에서 가져오세요. 가공/생성 금지.
        20. 새 필드의 어조는 "전문 리더십 코치" 톤. 평가가 아닌 코칭 관점.

        21. weekActionPlan: 7일 행동 플랜. day1(월) 부터 day7(일) 까지 매일 1가지 구체적 연습 행동.
            - 각 day: { focus(짧은 영역 이름, 5단어 이내), action(구체 행동 1문장. "내일 회의에서 첫 30초를 침묵으로 시작해보세요" 처럼 즉시 실천 가능한 행동) }
            - 7일 모두 다른 영역/다른 행동. 점진적 난이도 상승 (월: 가벼운 관찰 → 일: 어려운 실전 대화).
            - 이번 시뮬레이션의 약점(improvements) 과 연결된 영역 우선 선택.

        22. retryGuide: 같은 시나리오를 다시 한다면 가이드
            - oneThingToChange: 이번 대화에서 단 1가지만 바꾼다면 가장 임팩트 큰 1개. 구체적 발화/행동 (2-3문장)
            - expectedOutcome: 그것을 바꿨을 때 상대방의 반응이 어떻게 달라질지 예측 (2-3문장)
            - watchOutFor: 재도전 시 빠지기 쉬운 함정 1개 (1-2문장)

        23. recommendedNextScenario: 이 사용자의 약점을 고려한 다음 추천 시뮬레이션
            - scenarioTitle: 시나리오 제목 (한국어. 예: "원격근무 동기부여 저하", "신입사원 온보딩")
            - whyThisOne: 왜 이 시나리오가 이 사용자에게 필요한지 (2-3문장. 이번 약점과 연결)
            - difficulty: "쉬움" / "보통" / "도전" 중 하나

        24. theoryDeepDive: 2-3개의 심리학/리더십 이론을 교차 적용
            - 단일 이론(theoryInsight) 보다 다층 분석. 서로 다른 관점의 이론 선택.
            - theories 배열에 2개 이상. 각 항목: { name(이론명 한국어), applied(이번 대화에서 어떻게 작용/실패했는지 2-3문장), nextTime(다음에 의도적으로 적용하는 구체적 방법 2-3문장) }
            - 예: "심리적 안전감 이론", "자기결정성 이론", "변혁적 리더십", "SBI 피드백 모델", "비폭력 대화(NVC)"

        [풀 리포트 공통 — 즉시 실천 가능성 최우선]
        25. 모든 "대안 문장 / 추천 발화 / 실천 행동"은 추상적 조언이 아니라, 회의실에서 그대로 소리 내어 말하거나 오늘 바로 실행할 수 있는 구체적 형태여야 합니다.
            - 나쁜 예: "공감을 표현하세요", "경청이 중요합니다", "신뢰를 쌓으세요"
            - 좋은 예: "철수씨, 요즘 일이 많이 몰렸죠. 그 얘기부터 들어볼게요." / "내일 1:1 첫 30초는 침묵으로 두고 상대가 먼저 말을 꺼내게 하세요."
        26. 모든 추천 발화는 한국 직장에서 실제로 쓰는 자연스러운 구어체 존댓말로 작성하세요. 번역 투/문어체/지시문체 금지.
        27. betterAlternative, idealResponse, oneThingToChange, weekActionPlan.action 등 실천 항목은 "무엇을 왜"가 아니라 "정확히 어떤 말/행동을"에 초점을 두세요.
      `;

      const prompt = `
        당신은 대한민국 최고의 리더십 코치입니다. 리더를 위한 시뮬레이션 결과 리포트를 생성하세요.

        대화 기록: ${JSON.stringify(transcript)}
        시나리오: ${scenario?.title} - ${scenario?.description}

        [절대 준수 사항 - 어길 시 시스템 오류로 간주함]
        1. 모든 필드(제목, 설명, 요약 등)는 100% 한국어로만 작성하세요.
        2. 영어를 단 한 단어도 사용하지 마세요. (예: 'Directness' -> '직설적 소통', 'Fairness' -> '공정성' 등으로 번역)
        3. 'Wait', 'Refining', 'Reasoning', 'Okay' 같은 당신의 내부 사고 과정이나 사설을 절대 출력 결과에 포함하지 마세요. 오직 리더를 위한 최종 조언만 담으세요.
        4. '잘한 점(strengths)'과 '개선점(improvements)'은 각각 명확한 제목(title)과 2문장 내의 정제된 한국어 설명(desc)으로 작성하세요.
        5. 이론 명칭(theoryName)은 반드시 한국어 명칭으로만 작성하세요. (예: '심리적 안전감', '자기결정성 이론' 등)
        6. 이론 설명(scienceBase)은 학술적 용어를 배제하고 2문장 이내로 매우 간결하게 한국어로 작성하세요.
        7. 현업 적용 가이드(practicalApply)는 리더가 내일 당장 사무실에서 실천할 수 있는 1개의 구체적 행동 지침을 한국어로 작성하세요.
        8. 모든 결과는 지정된 JSON 스키마를 엄격히 따르며, JSON 데이터 외의 텍스트는 출력하지 마세요.

        [구체성 강화 규칙 - 매우 중요]
        9. 강점과 개선점 분석 시, 반드시 사용자의 실제 발화를 직접 인용("..." 형태)하여 근거를 제시하세요.
           - 좋은 예: "팀장님이 '그 부분이 힘들었겠네요'라고 말한 부분에서 공감 능력이 돋보였습니다."
           - 나쁜 예: "공감 능력이 좋습니다." (근거 없이 일반적)
        10. 모범 스크립트(modelAnswers)의 situation 필드에는 사용자가 실제로 했던 발화를 인용하고, bestResponse에서 그 상황에서의 더 나은 대안을 제시하세요.
        11. summary는 이 리더만의 고유한 대화 패턴을 짚어주세요. "전반적으로 잘했다" 같은 일반적 평가는 금지합니다.
        12. coachingSkills 점수는 대화 기록에서 관찰된 구체적 행동 빈도와 질을 기준으로 0~100 사이로 채점하세요.
        13. leadershipType은 대화 패턴을 분석하여 다음 4가지 중 하나를 정확히 선택하세요:
            - "coaching": 질문과 경청 중심으로 팀원의 생각을 이끌어내는 스타일
            - "directing": 명확한 지시와 기준 제시 중심 스타일
            - "delegating": 팀원에게 자율성을 부여하고 신뢰하는 스타일
            - "participating": 함께 논의하고 의견을 구하는 스타일
        14. communicationPattern은 사용자의 전체 발화를 분석하여 각 비율을 0~100으로 채점하세요 (합계 100):
            - questionRatio: 질문형 발화의 비율
            - empathyRatio: 공감/이해 표현의 비율
            - directiveRatio: 지시/명령/요청의 비율
            - listeningRatio: 반영/요약/확인의 비율
        ${briefPromptSuffix}
      `;

      const response = await fetchWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          // thinking 비활성 + (풀 리포트 시) 전용 필드 required 강제 조합:
          // 프로덕션 실측 57.6s → 31.6s, 필드 누락 없음. thinking만 끄면 optional
          // 필드(goldenScripts 등)를 통째로 생략하므로 required 강제가 반드시 동반돼야 함.
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              strengths: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING }
                  },
                  required: ['title', 'desc']
                }
              },
              improvements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING }
                  },
                  required: ['title', 'desc']
                }
              },
              modelAnswers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    situation: { type: Type.STRING },
                    bestResponse: { type: Type.STRING },
                    why: { type: Type.STRING }
                  },
                  required: ['situation', 'bestResponse', 'why']
                }
              },
              theoryInsight: {
                type: Type.OBJECT,
                properties: {
                  theoryName: { type: Type.STRING },
                  scienceBase: { type: Type.STRING },
                  practicalApply: { type: Type.STRING }
                },
                required: ['theoryName', 'scienceBase', 'practicalApply']
              },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              coachingSkills: {
                type: Type.OBJECT,
                properties: {
                  empathyExpression: { type: Type.INTEGER },
                  questionSkill: { type: Type.INTEGER },
                  emotionControl: { type: Type.INTEGER },
                  activeListening: { type: Type.INTEGER },
                  actionGuidance: { type: Type.INTEGER }
                },
                required: ['empathyExpression', 'questionSkill', 'emotionControl', 'activeListening', 'actionGuidance']
              },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  sbiScore: { type: Type.INTEGER },
                  empathyIndex: { type: Type.INTEGER },
                  outcomeSuccess: { type: Type.INTEGER }
                }
              },
              radarChart: {
                type: Type.OBJECT,
                properties: {
                  trust: { type: Type.INTEGER },
                  motivation: { type: Type.INTEGER },
                  conflict: { type: Type.INTEGER },
                  decision: { type: Type.INTEGER },
                  strategy: { type: Type.INTEGER }
                }
              },
              leadershipType: { type: Type.STRING },
              communicationPattern: {
                type: Type.OBJECT,
                properties: {
                  questionRatio: { type: Type.NUMBER },
                  empathyRatio: { type: Type.NUMBER },
                  directiveRatio: { type: Type.NUMBER },
                  listeningRatio: { type: Type.NUMBER },
                },
                required: ['questionRatio', 'empathyRatio', 'directiveRatio', 'listeningRatio']
              },
              // ── Spec v3 §6: 풀 리포트 전용 필드 (모두 optional) ──
              phaseStrategy: {
                type: Type.OBJECT,
                properties: {
                  intro: {
                    type: Type.OBJECT,
                    properties: {
                      userQuote: { type: Type.STRING },
                      analysis: { type: Type.STRING },
                      improvement: { type: Type.STRING },
                    },
                  },
                  mainPoint: {
                    type: Type.OBJECT,
                    properties: {
                      userQuote: { type: Type.STRING },
                      analysis: { type: Type.STRING },
                      improvement: { type: Type.STRING },
                    },
                  },
                  closing: {
                    type: Type.OBJECT,
                    properties: {
                      userQuote: { type: Type.STRING },
                      analysis: { type: Type.STRING },
                      improvement: { type: Type.STRING },
                    },
                  },
                },
              },
              goldenScripts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    situation: { type: Type.STRING },
                    userSaid: { type: Type.STRING },
                    betterAlternative: { type: Type.STRING },
                    whyStronger: { type: Type.STRING },
                  },
                  required: ['situation', 'userSaid', 'betterAlternative', 'whyStronger'],
                },
              },
              psychTriggers: {
                type: Type.OBJECT,
                properties: {
                  reactionTurnpoints: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        turn: { type: Type.INTEGER },
                        userSaid: { type: Type.STRING },
                        trustChange: { type: Type.STRING },
                        trigger: { type: Type.STRING },
                      },
                    },
                  },
                  lostOpportunities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        turn: { type: Type.INTEGER },
                        situation: { type: Type.STRING },
                        idealResponse: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
              coachOverview: {
                type: Type.OBJECT,
                properties: {
                  strengthProfile: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        skill: { type: Type.STRING },
                        score: { type: Type.INTEGER },
                        evidence: { type: Type.STRING },
                      },
                    },
                  },
                  nextPracticeTop3: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        focus: { type: Type.STRING },
                        current: { type: Type.STRING },
                        goal: { type: Type.STRING },
                        recommendedScenario: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
              // ── Tier 1 고도화 (2026-05) — 풀 리포트 깊이 강화 ──
              weekActionPlan: {
                type: Type.OBJECT,
                properties: {
                  day1: { type: Type.OBJECT, properties: { focus: { type: Type.STRING }, action: { type: Type.STRING } } },
                  day2: { type: Type.OBJECT, properties: { focus: { type: Type.STRING }, action: { type: Type.STRING } } },
                  day3: { type: Type.OBJECT, properties: { focus: { type: Type.STRING }, action: { type: Type.STRING } } },
                  day4: { type: Type.OBJECT, properties: { focus: { type: Type.STRING }, action: { type: Type.STRING } } },
                  day5: { type: Type.OBJECT, properties: { focus: { type: Type.STRING }, action: { type: Type.STRING } } },
                  day6: { type: Type.OBJECT, properties: { focus: { type: Type.STRING }, action: { type: Type.STRING } } },
                  day7: { type: Type.OBJECT, properties: { focus: { type: Type.STRING }, action: { type: Type.STRING } } },
                },
              },
              retryGuide: {
                type: Type.OBJECT,
                properties: {
                  oneThingToChange: { type: Type.STRING },
                  expectedOutcome: { type: Type.STRING },
                  watchOutFor: { type: Type.STRING },
                },
              },
              recommendedNextScenario: {
                type: Type.OBJECT,
                properties: {
                  scenarioTitle: { type: Type.STRING },
                  whyThisOne: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                },
              },
              theoryDeepDive: {
                type: Type.OBJECT,
                properties: {
                  theories: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        applied: { type: Type.STRING },
                        nextTime: { type: Type.STRING },
                      },
                      required: ['name', 'applied', 'nextTime'],
                    },
                  },
                },
              },
            },
            required: [
              'summary', 'strengths', 'improvements', 'modelAnswers', 'theoryInsight', 'actionItems', 'coachingSkills', 'metrics', 'radarChart', 'leadershipType', 'communicationPattern',
              // 풀 리포트는 전용 필드도 필수로 — thinking 비활성 시 optional 필드가 생략되는 것 방지
              ...(isFullReport ? ['phaseStrategy', 'goldenScripts', 'psychTriggers', 'coachOverview', 'weekActionPlan', 'retryGuide', 'recommendedNextScenario', 'theoryDeepDive'] : []),
            ]
          }
        }
      }));

      const text = response.text;
      if (!text) {
        throw new Error("AI 엔진으로부터 응답을 받지 못했습니다.");
      }

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const evalResult: EvaluationData = JSON.parse(cleanJson);
      setEvaluation(evalResult);
      analyticsService.track('report_view', { scenario_id: scenario?.id, is_full: isFullReport }, user?.id);
      // 진단 유형 노출 이벤트 — 유형별 결제 전환 비교용 (growth 대시보드)
      if (!isFullReport && diagnosis) {
        analyticsService.track('diagnosis_type_shown', analyticsService.withAttribution({
          diagnosis_type: diagnosis.typeName,
          gap_dimension: diagnosis.gap.key,
          gap_score: diagnosis.gap.score,
          scenario_id: scenario?.id,
          is_guest: !user,
        }), user?.id);
      }

      const historyItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        scenarioTitle: scenario?.title || '자율 시뮬레이션',
        memberName: scenario?.memberName || '팀원',
        transcript: transcript,
        evaluation: evalResult,
        scenario: scenario,
        sosTipHistory: sosTipHistory || [],
        memo: '',
        tags: [] as string[]
      };

      // DB 저장 (인증된 사용자)
      if (user) {
        const targetSimId = (location.state as any)?.simId as string | undefined;
        const feedbackFields = {
          // sosTipHistory 를 feedback 에 포함해 저장 — 기록(HistoryDetail) SOS 탭이 이 값을 읽음
          feedback: { ...evalResult, sosTipHistory: sosTipHistory || [] } as unknown as Record<string, unknown>,
          coaching_skills: evalResult.coachingSkills as unknown as Record<string, number>,
          radar_chart: evalResult.radarChart as unknown as Record<string, number>,
          leadership_type: (evalResult as any).leadershipType || null,
          communication_pattern: (evalResult as any).communicationPattern || null,
        };
        if (targetSimId) {
          // 단건 플레이북 구매 레코드에 풀 리포트 저장 → 재방문 시 재생성 없이 동일 화면 표시
          await dbService.updateHistoryFeedback(targetSimId, feedbackFields).catch(() => {});
        } else {
          // 일반 시뮬레이션 완료 흐름 — 가장 최근 레코드 업데이트
          const recentHistory = await dbService.getHistory(user.id, 1);
          if (recentHistory.length > 0) {
            const latest = recentHistory[0];
            await dbService.updateHistoryFeedback(latest.id, feedbackFields).catch(() => {});
          }
        }
      }

      // localStorage 폴백 (비인증 또는 백업)
      const existing = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
      localStorage.setItem('leadershigh_history', JSON.stringify([historyItem, ...existing]));

    } catch (err: any) {
      console.error("Critical Evaluation Error:", err);
      setError(`심층 리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.`);
    } finally {
      setIsAnalysing(false);
    }
  };

  useEffect(() => {
    performEvaluation();
  }, [transcript]);

  useEffect(() => {
    if (!evaluation || isFullReport) return;
    analyticsService.track('report_pro_bridge_view', analyticsService.withAttribution({
      source: 'report_pro_bridge',
      scenario_id: scenario?.id,
      is_guest: !user,
      offer: user ? 'pro_plan' : 'golden_playbook',
    }), user?.id);
  }, [evaluation, isFullReport, scenario?.id, user]);

  const saveGuestTranscriptForPurchase = () => {
    localStorage.setItem('leadershigh_guest_transcript', JSON.stringify({
      transcript,
      scenario,
      sosTipHistory,
    }));
  };

  const handleReportProBridgeClick = (target: 'pricing' | 'playbook') => {
    analyticsService.track('report_pro_bridge_click', analyticsService.withAttribution({
      source: 'report_pro_bridge',
      scenario_id: scenario?.id,
      target,
      is_guest: !user,
      diagnosis_type: diagnosis?.typeName ?? null,
    }), user?.id);

    if (target === 'pricing') {
      navigate('/pricing', { state: { from: '/feedback', bridge: 'report_pro' } });
      return;
    }

    // 로그인 사용자 — 가입 우회, ₩3,900 단건 결제로 직행 (첫 결제 마찰 최소화)
    if (user) {
      navigate('/purchase/playbook', { state: { transcript, scenario, sosTipHistory, evaluation } });
      return;
    }

    saveGuestTranscriptForPurchase();
    navigate('/signup', { state: { from: '/feedback', intent: 'golden-script', transcript, scenario, sosTipHistory, evaluation, guest: true, source: 'report_pro_bridge' } });
  };

  // ── 로딩 화면: 대화 결과 분석 중 ──
  if (isAnalysing) {
    return (
      <div className="min-h-[100dvh] bg-[#060B18] command-center-bg flex flex-col items-center justify-center p-8 text-center font-manrope relative overflow-hidden">
        {/* 스캔 라인 */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,242,255,0.03) 2px, rgba(0,242,255,0.03) 4px)' }} />

        {/* 아바타 + 스캔 이펙트 */}
        <div className="relative mb-10">
          <div className="size-28 rounded-full overflow-hidden border-2 border-primary/40 animate-pulse" style={{ boxShadow: '0 0 30px rgba(0,242,255,0.4), 0 0 60px rgba(0,242,255,0.15)' }}>
            <img src={avatarUrl} alt={charInfo.name} className="size-full object-cover bg-navy-card" />
          </div>
          <div className="absolute inset-0 rounded-full animate-hologram-scan opacity-50" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary/20 border border-primary/30 px-3 py-1 rounded-full">
            <span className="text-primary text-[11px] font-black uppercase tracking-widest">Analyzing</span>
          </div>
        </div>

        <h2 className="text-xl font-black text-white mb-3 uppercase tracking-[0.2em]" style={{ textShadow: '0 0 20px rgba(0,242,255,0.5)' }}>
          대화 결과를 분석하고 있습니다
        </h2>
        <p className="text-slate-500 text-xs max-w-xs leading-relaxed font-medium mb-8">
          {charInfo.name} {charInfo.role}와의 대화를 바탕으로 바로 적용할 수 있는 피드백을 정리하고 있습니다.
        </p>
        <div className="flex items-center gap-1.5">
          {[0, 0.15, 0.3, 0.45].map((d, i) => (
            <div key={i} className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── 에러 화면 ──
  if (error || !evaluation) {
    return (
      <div className="min-h-[100dvh] bg-[#060B18] command-center-bg flex flex-col items-center justify-center p-8 text-center font-manrope">
        <div className="size-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
        </div>
        <h2 className="text-sm font-bold text-white mb-2 leading-relaxed max-w-sm">{error || "리포트 데이터를 불러올 수 없습니다."}</h2>
        <p className="text-xs text-slate-500 mb-8">시스템 오류가 발생했습니다. 재시도해주세요.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={performEvaluation}
            className="w-full px-8 py-4 bg-primary text-navy-deep font-black rounded-2xl shadow-neon-cyan active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            재시도
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full px-8 py-4 bg-white/5 text-slate-400 font-bold rounded-2xl active:scale-95 transition-all text-sm"
          >
            기지 복귀
          </button>
        </div>
      </div>
    );
  }

  // ── 전체 평균 점수 계산 ──
  const avgScore = Math.round(
    (evaluation.metrics.empathyIndex + evaluation.metrics.sbiScore + evaluation.metrics.outcomeSuccess) / 3
  );
  const overallRank = getRank(avgScore);

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[#060B18] command-center-bg text-white font-manrope pb-[calc(128px+env(safe-area-inset-bottom))] hide-scrollbar">

      {/* ── 대화 유형 진단 (무료·간략 리포트) — 광고 '진단' 앵글과 제품 경험 일치 ── */}
      {!isFullReport && diagnosis && (
        <section className="px-5 pt-6 pb-2 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-amber-400 text-[12px] font-black uppercase tracking-[0.2em]">AI 대화 진단 결과</p>
            <span className="text-slate-500 text-[10px] border border-white/10 rounded-full px-2.5 py-0.5">무료 진단</span>
          </div>

          <p className="text-slate-400 text-sm">당신의 리더십 대화 유형은</p>
          <h2 className="text-3xl font-black tracking-tight mt-1">
            <span className="text-amber-400">{diagnosis.typeName}</span> 리더
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed mt-2">“{diagnosis.identity}”</p>

          {/* 레이더 + 점수 범례 */}
          <div className="mt-4 rounded-2xl bg-slate-900/60 border border-white/5 p-4">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">5가지 신뢰 차원</p>
            <div className="flex justify-center">
              <DiagnosisRadar dims={diagnosis.dims} gapKey={diagnosis.gap.key} strengthKey={diagnosis.strength.key} size={232} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {(Object.keys(DIM_LABEL) as DimensionKey[]).map((k) => {
                const isGap = k === diagnosis.gap.key;
                const isStr = k === diagnosis.strength.key;
                return (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className={isGap ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                      {DIM_LABEL[k]}{isGap ? ' ⚑' : ''}
                    </span>
                    <span className={`font-black tabular-nums ${isGap ? 'text-amber-300' : isStr ? 'text-teal-300' : 'text-slate-200'}`}>
                      {diagnosis.dims[k]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 강점 / 급소 */}
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-teal-400/20 bg-teal-400/5 p-4">
              <p className="text-teal-300 text-[12px] font-black uppercase tracking-widest mb-1">✓ 당신의 강점</p>
              <p className="text-white text-[15px] font-bold">{diagnosis.strength.title}</p>
              <p className="text-slate-400 text-[13px] leading-relaxed mt-1">{diagnosis.strength.desc}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
              <p className="text-amber-400 text-[12px] font-black uppercase tracking-widest mb-1">⚑ 당신의 급소</p>
              <p className="text-white text-[15px] font-bold">{diagnosis.gap.title}</p>
              <p className="text-slate-400 text-[13px] leading-relaxed mt-1">{diagnosis.gap.desc}</p>
            </div>
          </div>

          {/* 처방 잠금 — 호기심 갭 */}
          <div className="mt-4 rounded-2xl border border-dashed border-amber-400/35 bg-gradient-to-b from-amber-400/5 to-transparent p-4">
            <p className="text-amber-400 text-[13px] font-black mb-3">🔒 이 진단의 처방은 풀 리포트에서</p>
            <ul className="space-y-2.5">
              <li className="flex gap-2.5 text-[13px] text-slate-200">
                <span className="text-slate-600 shrink-0">🔒</span>
                <span><b className="font-bold">「{diagnosis.typeName}」이 놓치는 3가지</b> — <span className="text-slate-500 blur-[3px] select-none">방향 전환의 타이밍, 합의 없는 종료…</span></span>
              </li>
              <li className="flex gap-2.5 text-[13px] text-slate-200">
                <span className="text-slate-600 shrink-0">🔒</span>
                <span><b className="font-bold">다시 말할 문장 (골든 스크립트)</b> — <span className="text-slate-500 blur-[3px] select-none">“충분히 들었어요. 그럼 이렇게…”</span></span>
              </li>
              <li className="flex gap-2.5 text-[13px] text-slate-200">
                <span className="text-slate-600 shrink-0">🔒</span>
                <span><b className="font-bold">7일 교정 플랜</b> — <span className="text-slate-500 blur-[3px] select-none">매일 한 문장씩 바꾸는 훈련…</span></span>
              </li>
            </ul>
          </div>

          {/* CTA — 1차: ₩3,900 단건 / 2차: Pro */}
          <div className="mt-4">
            <button
              onClick={() => handleReportProBridgeClick('playbook')}
              className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[15px] py-4 transition-colors"
            >
              「{diagnosis.typeName}」의 처방전 받기 · ₩{REPORT_PAYMENT_OPTION.amount.toLocaleString()}
              <span className="block text-[10px] font-bold text-amber-900 mt-0.5">지금 이 대화 1건에 대한 상세 처방</span>
            </button>
            <button
              onClick={() => handleReportProBridgeClick('pricing')}
              className="w-full text-slate-400 text-[13px] font-bold py-3"
            >
              또는 <span className="text-amber-300">Pro로 모든 진단 무제한 →</span>
            </button>
            <button
              onClick={() => navigate(user ? '/missions' : '/onboarding')}
              className="w-full text-slate-500 text-[11px] py-1"
            >
              이 유형이 아니라고 생각되면? <span className="underline underline-offset-2">다른 시나리오로 증명해보세요</span>
            </button>
            <p className="text-center text-[10px] text-slate-600 mt-2 leading-relaxed">
              현직 HR·조직개발(OD) 전문가가 설계한 진단 · 안전 결제 · 7일 내 100% 환불
            </p>
          </div>
        </section>
      )}

      {/* ── 폴백: 진단 불가(새로고침 등으로 5차원 유실) 시 기존 안내 배너 ── */}
      {!isFullReport && !diagnosis && user && (
        <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 border-b border-amber-500/20 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-amber-400 text-xs font-semibold">간략 리포트입니다</p>
              <p className="text-white text-sm font-black mt-1">이 대화에서 놓친 3가지를 풀 리포트로 확인하세요</p>
            </div>
            <button onClick={() => handleReportProBridgeClick('pricing')} className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 text-[12px] font-black hover:bg-amber-400 transition-colors">
              Pro로 보기
            </button>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            무료 리포트는 핵심 1개만 보여줍니다. 이번 면담 전에 풀 리포트로 전략 정리하기, 내 답변의 위험 표현 분석, 다시 말할 문장까지 이어서 확인하세요.
          </p>
        </div>
      )}

      {/* ── 게스트: 체험 리포트 안내 배너 (진단 불가 시에만) ── */}
      {!user && !diagnosis && (
        <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between">
          <p className="text-amber-400 text-xs font-semibold">체험 리포트 · 간략 버전</p>
          <span className="text-slate-500 text-[10px]">풀 리포트는 회원 전용</span>
        </div>
      )}

      {/* ── QUEST CLEAR 배너 ── */}
      <section className="relative py-16 px-6 text-center overflow-hidden">
        {/* 배경 글로우 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[400px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(0,242,255,0.3), transparent 70%)' }} />
        </div>

        {/* 상단 작은 태그 */}
        <div className="relative z-10 flex items-center justify-center gap-2 mb-6">
          <span className="bg-primary/10 border border-primary/30 text-primary px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.3em]">
            {scenario?.category || '리더십 훈련'}
          </span>
        </div>

        {/* QUEST CLEAR */}
        <h1 className="relative z-10 text-5xl md:text-6xl font-black italic uppercase tracking-tight mb-4 animate-quest-clear"
          style={{ textShadow: '0 0 40px rgba(0,242,255,0.5), 0 0 80px rgba(0,242,255,0.2)' }}>
          <span className="text-primary">Quest</span> <span className="text-white">Clear!</span>
        </h1>

        {/* 퀘스트 이름 */}
        <p className="relative z-10 text-sm font-bold text-slate-400 mb-8">
          {scenario?.title || '시뮬레이션'} 완료
        </p>

        {/* 아바타 + 정보 */}
        <div className="relative z-10 flex items-center justify-center gap-4">
          <div className="size-16 rounded-xl overflow-hidden border-2 border-primary/40 shrink-0"
            style={{ boxShadow: '0 0 20px rgba(0,242,255,0.3)' }}>
            <img src={avatarUrl} alt={charInfo.name} className="size-full object-cover bg-navy-card" />
          </div>
          <div className="text-left">
            <p className="text-lg font-black">{charInfo.name} <span className="text-slate-500 text-xs font-medium">{charInfo.role}</span></p>
            <p className="text-xs text-slate-500 font-medium">{scenario?.description?.substring(0, 40)}...</p>
          </div>
        </div>

        {/* 종합 랭크 */}
        <div className="relative z-10 mt-8 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
          <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">종합 등급</span>
          <span className={`text-4xl font-black italic ${overallRank.cls}`}>{overallRank.rank}</span>
          <span className="text-sm font-bold text-slate-400">{avgScore}점</span>
        </div>

        {/* 리더십 유형 */}
        {(evaluation as any)?.leadershipType && (
          <div className="relative z-10 mt-4 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
            <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">리더십 유형</span>
            <span className="text-2xl">
              {(evaluation as any).leadershipType === 'coaching' ? '🎯' :
               (evaluation as any).leadershipType === 'directing' ? '📋' :
               (evaluation as any).leadershipType === 'delegating' ? '🤝' : '💬'}
            </span>
            <span className="text-base font-bold text-white">
              {(evaluation as any).leadershipType === 'coaching' ? '코칭형' :
               (evaluation as any).leadershipType === 'directing' ? '지시형' :
               (evaluation as any).leadershipType === 'delegating' ? '위임형' : '참여형'}
            </span>
          </div>
        )}
      </section>

      <main className="px-6 space-y-10 lg:max-w-4xl lg:mx-auto">

        {/* ── 사령관 브리핑 (Summary) ── */}
        <section className="bg-gradient-to-br from-[#161D2F] to-[#0D1525] border border-primary/20 p-8 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-8xl text-primary">verified_user</span>
          </div>
          <h3 className="text-[12px] font-black text-primary uppercase tracking-[0.3em] mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-xs">description</span>
            대화 요약
          </h3>
          <p className="text-lg font-bold leading-[1.8] text-white/90 italic">"{evaluation.summary}"</p>

          {/* 3대 지표 XP바 */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
            {[
              { label: '공감도', value: evaluation.metrics.empathyIndex, icon: 'favorite', color: 'bg-pink-500', glow: 'rgba(236,72,153,0.5)' },
              { label: '전달력', value: evaluation.metrics.sbiScore, icon: 'record_voice_over', color: 'bg-blue-500', glow: 'rgba(59,130,246,0.5)' },
              { label: '성공률', value: evaluation.metrics.outcomeSuccess, icon: 'emoji_events', color: 'bg-amber-500', glow: 'rgba(245,158,11,0.5)' }
            ].map((m, i) => {
              const r = getRank(m.value);
              return (
                <div key={i} className="text-center">
                  <span className="material-symbols-outlined text-lg text-slate-500 mb-1 block">{m.icon}</span>
                  <p className="text-[11px] font-black text-slate-500 uppercase mb-2">{m.label}</p>
                  <div className="text-2xl font-black italic mb-2">{m.value}<span className="text-sm text-slate-600">%</span></div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`}
                      style={{ width: `${m.value}%`, boxShadow: `0 0 8px ${m.glow}`, animation: 'count-up-bar 1.5s ease-out' }} />
                  </div>
                  <span className={`text-[12px] font-black italic mt-1 block ${r.cls}`}>{r.rank}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 크리티컬 히트 / 데미지 리포트 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 잘한 점 → 크리티컬 히트 */}
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-emerald-500/20 battle-card-glow transition-all duration-300">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-6 flex items-center gap-2 text-emerald-400">
              <span className="size-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">bolt</span>
              </span>
              잘한 점
            </h3>
            <div className="space-y-5">
              {evaluation.strengths.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-7 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[12px] font-black border border-emerald-500/20">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white mb-1">{s.title}</h4>
                    <p className="text-[15px] text-slate-400 leading-relaxed font-medium">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 개선점 → 데미지 리포트 */}
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-red-500/20 battle-card-glow transition-all duration-300">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-6 flex items-center gap-2 text-red-400">
              <span className="size-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">heart_broken</span>
              </span>
              개선할 점
            </h3>
            <div className="space-y-5">
              {evaluation.improvements.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-7 shrink-0 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-[12px] font-black border border-red-500/20">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white mb-1">{s.title}</h4>
                    <p className="text-[15px] text-slate-400 leading-relaxed font-medium">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── SKILL STATUS (코칭 역량) ── */}
        {evaluation.coachingSkills && (
          <section className="bg-navy-card p-8 rounded-[2.5rem] border border-white/10">
            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] mb-7 flex items-center gap-2 text-white">
              <span className="size-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <span className="material-symbols-outlined text-sm">psychology</span>
              </span>
              코칭 역량 요약
            </h3>
            <div className="space-y-4">
              {[
                { key: 'empathyExpression', label: '공감 표현', icon: 'favorite', color: 'bg-pink-500', glow: 'rgba(236,72,153,0.4)' },
                { key: 'questionSkill', label: '질문 기술', icon: 'help', color: 'bg-blue-500', glow: 'rgba(59,130,246,0.4)' },
                { key: 'emotionControl', label: '감정 조절', icon: 'balance', color: 'bg-purple-500', glow: 'rgba(147,51,234,0.4)' },
                { key: 'activeListening', label: '경청력', icon: 'hearing', color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.4)' },
                { key: 'actionGuidance', label: '행동 유도', icon: 'trending_up', color: 'bg-amber-500', glow: 'rgba(245,158,11,0.4)' },
              ].map((skill) => {
                const value = (evaluation.coachingSkills as any)[skill.key] || 0;
                const r = getRank(value);
                return (
                  <div key={skill.key} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="flex items-center gap-2 w-24 shrink-0">
                        <span className="material-symbols-outlined text-slate-500 text-sm">{skill.icon}</span>
                        <span className="text-[11px] font-bold text-slate-300">{skill.label}</span>
                      </div>
                      <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${skill.color} rounded-full`}
                          style={{ width: `${value}%`, boxShadow: `0 0 6px ${skill.glow}`, animation: 'count-up-bar 1.5s ease-out' }} />
                      </div>
                      <div className="flex items-center gap-2 w-16 justify-end">
                        <span className="text-base font-black text-white">{value}</span>
                        <span className={`text-xs font-black italic ${r.cls}`}>{r.rank}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 전문가 코칭 플레이북 (모범 답변 비교) ── */}
        <section className="space-y-5">
          <h3 className="text-lg font-black tracking-tight px-2 flex items-center gap-3">
            <span className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </span>
            전문가 코칭 플레이북
          </h3>
          <div className="space-y-5">
            {evaluation.modelAnswers.map((item, idx) => (
              <div key={idx} className="bg-[#1C1F26] border border-amber-500/15 p-6 rounded-[2rem] relative overflow-hidden battle-card-glow transition-all duration-300">
                {/* 상황 */}
                <div className="mb-5">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">replay</span>
                    상황 리플레이
                  </p>
                  <p className="text-[15px] text-slate-300 italic font-medium leading-relaxed">"{item.situation}"</p>
                </div>

                {/* 비교 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {/* 나의 발화 */}
                  <div className="bg-red-500/5 border border-red-500/15 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-red-400 text-xs">person</span>
                      <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">나의 발화</p>
                    </div>
                    <p className="text-[15px] text-slate-300 leading-relaxed">"{item.situation}"</p>
                  </div>

                  {/* 추천 답변 */}
                  <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-amber-400 text-xs">auto_awesome</span>
                      <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest">추천 답변</p>
                    </div>
                    <p className="text-[15px] text-white font-bold leading-relaxed">"{item.bestResponse}"</p>
                  </div>
                </div>

                {/* 코치 코멘트 */}
                <div className="bg-white/5 p-3 rounded-xl flex gap-3 items-start">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5 shrink-0">lightbulb</span>
                  <p className="text-[13px] text-slate-400 leading-relaxed font-medium">{item.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: 3단계 대화 전략 (Spec v3 §6) — 풀 리포트 전용 ── */}
        {isFullReport && evaluation.phaseStrategy && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-white/10">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-white">
              <span className="size-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-sm">timeline</span>
              </span>
              3단계 대화 전략 분석
            </h3>
            <div className="space-y-5">
              {[
                { key: 'intro', label: 'Phase 1 · 도입 (신뢰 구축)', turns: '초반', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                { key: 'mainPoint', label: 'Phase 2 · 본론 (핵심 메시지 전달)', turns: '중반', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
                { key: 'closing', label: 'Phase 3 · 마무리 (합의·다음 스텝)', turns: '후반', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
              ].map(({ key, label, turns, color }) => {
                const phase = (evaluation.phaseStrategy as any)?.[key];
                if (!phase) return null;
                return (
                  <div key={key} className={`rounded-2xl border p-5 ${color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-black uppercase tracking-widest">{label}</p>
                      <span className="text-[10px] font-bold opacity-70">{turns}</span>
                    </div>
                    {phase.userQuote && (
                      <div className="mb-3 bg-white/5 rounded-xl p-3">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">당신이 한 말</p>
                        <p className="text-[15px] text-white italic leading-relaxed">"{phase.userQuote}"</p>
                      </div>
                    )}
                    {phase.analysis && (
                      <div className="mb-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">AI 분석</p>
                        <p className="text-[15px] text-slate-300 leading-relaxed">{phase.analysis}</p>
                      </div>
                    )}
                    {phase.improvement && (
                      <div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">개선 여지</p>
                        <p className="text-[15px] text-slate-400 leading-relaxed">{phase.improvement}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Section 3: Golden Scripts — 결정적 순간 3개 (풀 리포트 전용) ── */}
        {isFullReport && evaluation.goldenScripts && evaluation.goldenScripts.length > 0 && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-amber-500/20">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-amber-400">
              <span className="size-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
              </span>
              Golden Scripts · 결정적 순간 실전 문장
            </h3>
            <div className="space-y-5">
              {evaluation.goldenScripts.map((g, i) => (
                <div key={i} className="rounded-2xl border border-amber-500/15 bg-[#1C1F26] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="size-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 text-xs font-black">{i + 1}</span>
                    <p className="text-sm font-bold text-amber-300">{g.situation}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">당신이 한 말</p>
                      <p className="text-[15px] text-slate-300 italic leading-relaxed">"{g.userSaid}"</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-1">더 강력한 대안</p>
                      <p className="text-[15px] text-white font-bold leading-relaxed">"{g.betterAlternative}"</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="material-symbols-outlined text-amber-400 text-sm mt-0.5 shrink-0">lightbulb</span>
                      <p className="text-[13px] text-slate-400 leading-relaxed">{g.whyStronger}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 4: 심리 트리거 분석 (풀 리포트 전용) ── */}
        {isFullReport && evaluation.psychTriggers && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-pink-500/20">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-pink-400">
              <span className="size-7 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">psychology_alt</span>
              </span>
              심리 트리거 분석
            </h3>
            {evaluation.psychTriggers.reactionTurnpoints && evaluation.psychTriggers.reactionTurnpoints.length > 0 && (
              <div className="mb-6">
                <p className="text-[12px] font-black text-emerald-400 uppercase tracking-widest mb-3">반응 전환점 · 신뢰도 급상승</p>
                <div className="space-y-2">
                  {evaluation.psychTriggers.reactionTurnpoints.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                      <span className="text-[12px] font-black text-emerald-400 mt-0.5 shrink-0">턴 {t.turn}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-slate-200 italic mb-1 truncate">"{t.userSaid}"</p>
                        <p className="text-[12px] text-slate-500">트리거: <span className="text-emerald-400 font-bold">{t.trigger}</span> · {t.trustChange}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {evaluation.psychTriggers.lostOpportunities && evaluation.psychTriggers.lostOpportunities.length > 0 && (
              <div>
                <p className="text-[12px] font-black text-amber-400 uppercase tracking-widest mb-3">놓친 기회 · 더 잘할 수 있었던 순간</p>
                <div className="space-y-3">
                  {evaluation.psychTriggers.lostOpportunities.map((l, i) => (
                    <div key={i} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[12px] font-black text-amber-400">턴 {l.turn}</span>
                        <span className="text-[12px] text-slate-400">{l.situation}</span>
                      </div>
                      <p className="text-[15px] text-slate-300 leading-relaxed">
                        <span className="text-amber-400 font-bold">이상적 대응: </span>"{l.idealResponse}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Section 5: 코치 총평 (풀 리포트 전용) ── */}
        {isFullReport && evaluation.coachOverview && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-purple-500/20">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-purple-400">
              <span className="size-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">workspace_premium</span>
              </span>
              전문가 코치 총평
            </h3>
            {evaluation.coachOverview.strengthProfile && evaluation.coachOverview.strengthProfile.length > 0 && (
              <div className="mb-6">
                <p className="text-[12px] font-black text-purple-300 uppercase tracking-widest mb-3">강점 프로파일</p>
                <div className="space-y-2">
                  {evaluation.coachOverview.strengthProfile.map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-base font-black text-white">{s.skill}</p>
                        <span className="text-sm font-black text-purple-400">{s.score}</span>
                      </div>
                      <p className="text-[13px] text-slate-400 leading-relaxed">{s.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {evaluation.coachOverview.nextPracticeTop3 && evaluation.coachOverview.nextPracticeTop3.length > 0 && (
              <div>
                <p className="text-[12px] font-black text-purple-300 uppercase tracking-widest mb-3">다음에 반드시 연습해야 할 3가지</p>
                <div className="space-y-3">
                  {evaluation.coachOverview.nextPracticeTop3.map((n, i) => (
                    <div key={i} className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="size-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 text-[12px] font-black">{i + 1}</span>
                        <p className="text-base font-bold text-white">{n.focus}</p>
                      </div>
                      <p className="text-[13px] text-slate-400 mb-1">현재: <span className="text-slate-300">{n.current}</span></p>
                      <p className="text-[13px] text-slate-400 mb-2">목표: <span className="text-purple-300">{n.goal}</span></p>
                      {n.recommendedScenario && (
                        <p className="text-[12px] text-slate-500">추천 시나리오: <span className="text-amber-400 font-bold">{n.recommendedScenario}</span></p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Section 6: 7일 행동 플랜 (Tier 1 고도화) — 풀 리포트 전용 ── */}
        {isFullReport && evaluation.weekActionPlan && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-indigo-500/20">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-indigo-300">
              <span className="size-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
              </span>
              7일 행동 플랜 · 다음 주 매일 실천
            </h3>
            <p className="text-[13px] text-slate-400 mb-4 leading-relaxed">
              한 번에 다 바꾸려 하지 마세요. 매일 하나씩, 작은 행동을 반복해야 습관이 됩니다.
            </p>
            <div className="space-y-2">
              {[
                { key: 'day1', label: '월요일', dim: '#7C8AFF' },
                { key: 'day2', label: '화요일', dim: '#8BA2FF' },
                { key: 'day3', label: '수요일', dim: '#9BB8FF' },
                { key: 'day4', label: '목요일', dim: '#A5C5FF' },
                { key: 'day5', label: '금요일', dim: '#B0D2FF' },
                { key: 'day6', label: '토요일', dim: '#BBDFFF' },
                { key: 'day7', label: '일요일', dim: '#C5EAFF' },
              ].map(({ key, label, dim }) => {
                const day = (evaluation.weekActionPlan as any)?.[key];
                if (!day) return null;
                return (
                  <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="shrink-0 w-12 text-center">
                      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: dim }}>{label}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {day.focus && (
                        <p className="text-[12px] font-black text-indigo-300 uppercase tracking-widest mb-1">{day.focus}</p>
                      )}
                      {day.action && (
                        <p className="text-[15px] text-slate-200 leading-relaxed">{day.action}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Section 7: 재도전 가이드 (Tier 1 고도화) — 풀 리포트 전용 ── */}
        {isFullReport && evaluation.retryGuide && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-orange-500/20">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-orange-300">
              <span className="size-7 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                <span className="material-symbols-outlined text-sm">refresh</span>
              </span>
              같은 시나리오 재도전 가이드
            </h3>
            <p className="text-[13px] text-slate-400 mb-4 leading-relaxed">
              이번 대화에서 단 1가지만 바꾼다면 — 가장 임팩트가 큰 1개를 추렸습니다.
            </p>
            <div className="space-y-4">
              {evaluation.retryGuide.oneThingToChange && (
                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/15">
                  <p className="text-[12px] font-black text-orange-400 uppercase tracking-widest mb-2">바꿀 단 1가지</p>
                  <p className="text-base text-white font-bold leading-relaxed">{evaluation.retryGuide.oneThingToChange}</p>
                </div>
              )}
              {evaluation.retryGuide.expectedOutcome && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-[12px] font-black text-emerald-400 uppercase tracking-widest mb-2">예상되는 변화</p>
                  <p className="text-[15px] text-slate-200 leading-relaxed">{evaluation.retryGuide.expectedOutcome}</p>
                </div>
              )}
              {evaluation.retryGuide.watchOutFor && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex gap-3 items-start">
                  <span className="material-symbols-outlined text-amber-400 text-base mt-0.5 shrink-0">warning</span>
                  <div>
                    <p className="text-[12px] font-black text-amber-400 uppercase tracking-widest mb-1">주의할 함정</p>
                    <p className="text-[15px] text-slate-300 leading-relaxed">{evaluation.retryGuide.watchOutFor}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Section 8: 다음 추천 시나리오 (Tier 1 고도화) — 풀 리포트 전용 ── */}
        {isFullReport && evaluation.recommendedNextScenario && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-teal-500/20">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-teal-300">
              <span className="size-7 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400">
                <span className="material-symbols-outlined text-sm">trending_flat</span>
              </span>
              다음 추천 시나리오
            </h3>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-base font-black text-white">{evaluation.recommendedNextScenario.scenarioTitle}</p>
                {evaluation.recommendedNextScenario.difficulty && (
                  <span className="text-[12px] font-black px-2 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {evaluation.recommendedNextScenario.difficulty}
                  </span>
                )}
              </div>
              {evaluation.recommendedNextScenario.whyThisOne && (
                <p className="text-[15px] text-slate-300 leading-relaxed">{evaluation.recommendedNextScenario.whyThisOne}</p>
              )}
            </div>
          </section>
        )}

        {/* ── Section 9: 이론 깊이 적용 (Tier 1 고도화) — 풀 리포트 전용 ── */}
        {isFullReport && evaluation.theoryDeepDive && evaluation.theoryDeepDive.theories && evaluation.theoryDeepDive.theories.length > 0 && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-emerald-500/20">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-emerald-300">
              <span className="size-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-sm">stacks</span>
              </span>
              이론 깊이 적용 · 다층 관점
            </h3>
            <p className="text-[13px] text-slate-400 mb-4 leading-relaxed">
              하나의 이론만으로는 부족합니다. 같은 대화를 여러 렌즈로 본 분석입니다.
            </p>
            <div className="space-y-4">
              {evaluation.theoryDeepDive.theories.map((t, i) => (
                <div key={i} className="rounded-2xl border border-emerald-500/15 bg-[#0E1820] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="size-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs font-black">{i + 1}</span>
                    <p className="text-base font-black text-emerald-300">{t.name}</p>
                  </div>
                  {t.applied && (
                    <div className="mb-3 bg-white/[0.03] rounded-xl p-3">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">이번 대화에 적용 시</p>
                      <p className="text-[15px] text-slate-200 leading-relaxed">{t.applied}</p>
                    </div>
                  )}
                  {t.nextTime && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
                      <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-1">다음에 의도적으로 쓰는 법</p>
                      <p className="text-[15px] text-white font-bold leading-relaxed">{t.nextTime}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── NEW SKILL UNLOCKED (이론 인사이트) ── */}
        <section className="bg-gradient-to-br from-[#0D1525] to-[#161D2F] border border-primary/30 p-8 rounded-[2.5rem] relative overflow-hidden animate-skill-unlock">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-8xl text-primary">auto_awesome</span>
          </div>

          {/* NEW SKILL 배너 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-primary text-xl">school</span>
            </div>
            <div>
              <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mb-0.5">New Skill Unlocked</p>
              <p className="text-lg font-black text-white">{evaluation.theoryInsight.theoryName}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 font-medium leading-relaxed mb-6">
            {evaluation.theoryInsight.scienceBase}
          </p>

          {/* 현업 적용 가이드 */}
          <div className="bg-[#0A0F1D]/60 p-5 rounded-2xl border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-7 rounded-lg bg-accent-neon/20 flex items-center justify-center text-accent-neon border border-accent-neon/20">
                <span className="material-symbols-outlined text-sm">bolt</span>
              </div>
              <p className="text-[12px] font-black text-accent-neon uppercase tracking-[0.2em]">현업 적용 가이드</p>
            </div>
            <p className="text-sm text-white font-bold leading-relaxed italic">
              "{evaluation.theoryInsight.practicalApply}"
            </p>
          </div>
        </section>

        {/* ── 액션 아이템 ── */}
        {evaluation.actionItems && evaluation.actionItems.length > 0 && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-white/10">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-white">
              <span className="size-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-sm">checklist</span>
              </span>
              오늘부터 바로 실천할 행동
            </h3>
            <div className="space-y-3">
              {evaluation.actionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="size-5 shrink-0 rounded bg-primary/10 flex items-center justify-center text-primary text-[11px] font-black mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{item}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Report → Pro Bridge: 완료한 대화 기반 결제 유도 ── */}
        {!isFullReport && evaluation && (
          <section className="bg-gradient-to-br from-amber-500/12 via-[#101827] to-cyan-500/10 border border-amber-500/25 p-6 rounded-[2rem] relative overflow-hidden">
            <div className="absolute -right-10 -top-10 size-36 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 mb-4">
                <span className="material-symbols-outlined text-amber-400 text-sm">lock_open</span>
                <span className="text-[12px] font-black text-amber-300 uppercase tracking-[0.18em]">Full Report Bridge</span>
              </div>
              <h2 className="text-xl font-black text-white leading-tight mb-3 break-keep">
                {evaluation.improvements?.[0]?.title ? (
                  <>방금 드러난 당신의 약점, <span className="text-amber-400">"{evaluation.improvements[0].title}"</span><br />풀 리포트가 정확히 어떻게 고칠지 알려드립니다</>
                ) : (
                  <>이 대화에서 놓친 결정적 순간들, 지금 바로 확인하세요</>
                )}
              </h2>
              <p className="text-sm text-slate-300 leading-7 mb-5">
                간략 리포트는 방향만 짚어줍니다. 풀 리포트는 <span className="text-white font-bold">당신의 실제 발화</span>를 기준으로 약점·위험 표현·다시 말할 문장, 그리고 <span className="text-white font-bold">오늘부터 7일 실천 플랜</span>까지 정리합니다.
              </p>
              <div className="grid gap-3 mb-5">
                {[
                  ['약점 정밀 분석 + 바로 쓸 해결 문장', '방어심을 키운 표현과 놓친 질문 타이밍을 짚고, 다음엔 그대로 따라 말할 대안 문장을 드립니다.'],
                  ['결정적 순간 3개의 더 강력한 대안 (Golden Scripts)', '신뢰가 흔들린 바로 그 순간, 어떻게 말했어야 하는지 실전 문장으로.'],
                  ['오늘부터 7일, 매일 실천할 행동 플랜', '월~일 하루 1가지씩, 당장 사무실에서 실행할 수 있는 구체적 행동.'],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-400 text-base mt-0.5 shrink-0">check_circle</span>
                    <div>
                      <p className="text-base font-black text-white mb-1">{title}</p>
                      <p className="text-[15px] text-slate-400 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleReportProBridgeClick(user ? 'pricing' : 'playbook')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <span className="material-symbols-outlined text-base">{user ? 'workspace_premium' : 'auto_awesome'}</span>
                {user ? '내 약점 풀 리포트 열기 · Pro/Ultra →' : '이번 대화 풀 리포트 받기 (₩3,900) →'}
              </button>
              <p className="text-center text-[12px] text-slate-500 mt-3">
                {user ? '프로 10일 ₩8,900부터 · 결제 전 가격표에서 기간·플랜을 다시 확인할 수 있습니다.' : '회원가입 후 이번 결과를 보존하고 바로 결제를 이어갑니다.'}
              </p>
            </div>
          </section>
        )}

        {/* ── 무료 플랜: 블러 처리된 풀 리포트 프리뷰 ── */}
        {!isFullReport && evaluation && (
          <section className="px-6 py-8">
            <div className="relative rounded-2xl border border-amber-500/20 overflow-hidden">
              {/* 블러 처리된 프리뷰 콘텐츠 */}
              <div className="p-6 filter blur-sm select-none pointer-events-none">
                <h3 className="text-lg font-bold text-white mb-4">모범 스크립트</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-800/40">
                    <p className="text-slate-400 text-sm">상황: "팀원이 방어적으로 반응할 때..."</p>
                    <p className="text-white text-sm mt-1">모범 답변: "그 부분이 걱정되셨을 수 있겠네요. 제가 이해한 게 맞는지..."</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/40">
                    <p className="text-slate-400 text-sm">상황: "팀원이 침묵할 때..."</p>
                    <p className="text-white text-sm mt-1">모범 답변: "혹시 더 말씀하고 싶은 부분이 있으시면..."</p>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mt-6 mb-4">5차원 역량 레이더 차트</h3>
                <div className="h-48 bg-slate-800/40 rounded-xl flex items-center justify-center">
                  <span className="text-slate-500">레이더 차트 영역</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-6 mb-4">과학적 근거 분석</h3>
                <div className="p-3 rounded-xl bg-slate-800/40">
                  <p className="text-amber-400 text-sm font-semibold">심리적 안전감 이론</p>
                  <p className="text-slate-400 text-sm mt-1">에이미 에드먼드슨의 연구에 따르면...</p>
                </div>
              </div>

              {/* 오버레이 — 게스트는 플레이북 구매 경로(아래 하단 카드와 완전 일치)
                  Spec v3 §5.4: "가입하고 전체 보기" 가 하단 "플레이북 구매" 와 동일 기능이라 혼란 → 라벨 통일 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
                <div className="text-4xl mb-3">🔒</div>
                <h4 className="text-white font-bold text-lg mb-1">
                  {user ? '당신의 약점과 해결 문장이 여기 있어요' : '전체 결과는 플레이북 구매로'}
                </h4>
                <p className="text-slate-400 text-xs mb-4 text-center max-w-xs">
                  약점 해결 문장 · 결정적 순간 대안 · 7일 실천 플랜까지<br/>
                  {user ? '프로 / 울트라 플랜에서 무제한 확인하세요' : '₩3,900 · 이 시뮬레이션의 풀 리포트 즉시 제공'}
                </p>
                {user ? (
                  <button onClick={() => handleReportProBridgeClick('pricing')} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm transition-colors">
                    프로 플랜 보기 →
                  </button>
                ) : (
                  <button
                    onClick={() => handleReportProBridgeClick('playbook')}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm transition-colors inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">credit_card</span>
                    플레이북 구매하기 (₩3,900)
                  </button>
                )}
                {!user && (
                  <p className="text-slate-500 text-[10px] mt-3">가입하지 않으면 이번 결과는 다시 열 수 없어요</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── 다음 도전 / RETURN TO BASE 버튼 ── */}
        <div className="pt-6 space-y-4">
          {/* 무료 플랜 사용자: 다음 시나리오 안내 */}
          {!isFullReport && (() => {
            const currentIdx = FREE_SCENARIOS.indexOf(scenario?.id);
            const isLastFree = currentIdx === FREE_SCENARIOS.length - 1;
            const hasNext = currentIdx >= 0 && currentIdx < FREE_SCENARIOS.length - 1;
            const nextScenarioId = hasNext ? FREE_SCENARIOS[currentIdx + 1] : null;
            const nextScenario = nextScenarioId ? SCENARIOS.find(s => s.id === nextScenarioId) : null;

            if (isLastFree) {
              return (
                <div className="text-center space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                    <p className="text-amber-400 text-lg font-black mb-2">3개 시나리오를 모두 완료했습니다!</p>
                    <p className="text-slate-400 text-xs">나의 리더십 역량을 종합 분석해보세요.</p>
                  </div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full bg-amber-500 text-slate-900 py-5 rounded-[2rem] font-black active:scale-[0.98] transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    나의 리더십 분석 보기
                    <span className="text-lg">&rarr;</span>
                  </button>
                </div>
              );
            }

            if (hasNext && nextScenario) {
              return (
                <button
                  onClick={() => navigate('/setup', { state: { scenario: nextScenario, ...(!user && { guest: true }) } })}
                  className="w-full bg-amber-500 text-slate-900 py-5 rounded-[2rem] font-black active:scale-[0.98] transition-all text-sm tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  다음 도전: {nextScenario.title}
                  <span className="text-lg">&rarr;</span>
                </button>
              );
            }

            return null;
          })()}

          {/* SNS 공유 카드 */}
          {evaluation?.radarChart && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">리더십 카드 공유</h3>
              <ShareCard
                radarChart={evaluation.radarChart}
                leadershipType={(evaluation as any).leadershipType || null}
                userId={user?.id}
              />
            </div>
          )}

          {/* ── 게스트 전환 유도: 전문가 코칭 플레이북 + 요금제 업그레이드 ──
              Spec v3 §5.4: 게스트 Feedback 에 3개 CTA 명시
              ① 플레이북 단건 구매 (₩3,900) — 즉시 가치 제공, 낮은 가격 진입
              ② 프로 플랜 구독 — 반복 훈련 유저에게
              ③ 다음 무료 시나리오 계속 (이미 위쪽 블록에 있음) */}
          {!user ? (
            <div className="space-y-4">
              {/* ① 전문가 코칭 플레이북 단건 구매 (₩3,900) */}
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">auto_awesome</span>
                  <h3 className="text-amber-400 font-black text-sm">이번 결과 전문가 코칭 플레이북 받기</h3>
                  <span className="ml-auto text-amber-300 font-black text-sm">₩3,900</span>
                </div>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                  이번 대화의 <span className="text-white font-semibold">3단계 전략·상황별 핵심 문장·심리 트리거 분석·코치 총평</span>을 풀 리포트로 받아보세요. 회원가입 후 바로 구매 가능.
                </p>
                <button
                  onClick={() => handleReportProBridgeClick('playbook')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 text-sm font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">credit_card</span>
                  플레이북 구매하기 (₩3,900)
                </button>
              </div>

              {/* ② 프로 플랜 구독 */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-cyan-400 text-lg">rocket_launch</span>
                  <h3 className="text-cyan-400 font-black text-sm">반복 훈련이 필요하다면 — 플랜 구독</h3>
                </div>
                <p className="text-slate-400 text-xs mb-4">
                  프로 플랜은 <span className="text-white font-semibold">20개 시나리오 · 풀 리포트 무제한 · 이전 기록 비교</span>까지 포함됩니다. 단건 구매보다 훨씬 경제적.
                </p>
                <button
                  onClick={() => handleReportProBridgeClick('pricing')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500/80 to-cyan-600/60 text-white text-sm font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                  요금제 보기 →
                </button>
              </div>

              <button
                onClick={() => navigate('/landing')}
                className="w-full py-3 text-slate-500 text-xs hover:text-slate-400 transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/missions')}
              className="w-full bg-primary text-navy-deep py-6 rounded-[2rem] font-black shadow-neon-cyan active:scale-[0.98] transition-all text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">swords</span>
              퀘스트로 돌아가기
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Feedback;
