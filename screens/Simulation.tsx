
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Chat, Type } from "@google/genai";
import { TrustLevelService, TrustLevelOutput, InstantCoachingResult } from '../services/trustLevelService';
import { getMissionBriefing, getOpeningLine } from '../services/missionBriefings';
import { EmotionStateMachine } from '../services/emotionStateMachine';
import { createGeminiClient } from '../src/lib/geminiClient';
import { getAiErrorMessage, getInitErrorMessage } from '../src/lib/geminiErrors';
import { getCharacterAvatar, getCharacterInfo, getAvatarGlowColor, getEmotionEmoji, DEFAULT_CHARACTERS } from '../services/characterAvatars';
import { HPBar, TacticalCircularTimer, StatInline, TacticalTrendChart } from '../components/GameUIComponents';
import { useAuth } from '../contexts/AuthContext';
import { usageService } from '../services/usageService';
import { dbService } from '../services/dbService';
import { analyticsService } from '../services/analyticsService';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
  isStreaming?: boolean;
}

interface SOSTip {
  insight: string;
  suggestion: string;
  magicPhrases: string[];
}

const ANALYSIS_COMPLETE_THRESHOLD = 12; // user turns required (보스 지시사항)
const TRUST_SCORING_INTERVAL = 4; // user turns between scoring

// 감정 상태를 Trust Level에 따라 결정하는 함수
function getEmotionState(trust: number): { state: string; description: string } {
  if (trust <= 20) return { state: '강한 반발', description: '매우 방어적이고 적대적입니다. 대화를 회피하거나 공격적으로 반응합니다. 팀장의 말을 신뢰하지 않습니다.' };
  if (trust <= 40) return { state: '경계/방어', description: '경계심을 갖고 있으며 쉽게 마음을 열지 않습니다. 짧고 방어적인 답변을 하며 속마음을 드러내지 않습니다.' };
  if (trust <= 55) return { state: '유보적 관망', description: '아직 판단을 유보하고 있습니다. 팀장의 진심을 시험하듯 반응하며, 조심스럽게 자기 생각을 꺼내기 시작합니다.' };
  if (trust <= 70) return { state: '점진적 수용', description: '팀장의 말에 일부 공감하기 시작합니다. 여전히 조심스럽지만 자신의 상황이나 어려움을 조금씩 이야기합니다.' };
  if (trust <= 85) return { state: '열린 대화', description: '솔직하게 속마음을 이야기하며, 팀장과 함께 해결책을 찾으려 합니다. 건설적인 대화가 가능합니다.' };
  return { state: '설득/합의', description: '팀장을 신뢰하며 적극적으로 협력합니다. 스스로 개선 방안을 제안하고 변화에 동의합니다.' };
}

// Trust Level과 감정 상태를 반영한 동적 시스템 프롬프트
function buildSystemPrompt(config: any, scenario: any, trustState: any): string {
  const emotion = getEmotionState(trustState.trust);

  return `당신은 팀원 '${config.name}'입니다.
[상황] ${scenario?.title}
[배경] ${scenario?.description}
[세대] ${config.generation}
[소통 스타일] 맥락 의존도: ${config.contextStyle ?? 50}/100, 감정 중심도: ${config.driverStyle ?? 50}/100

[현재 감정 상태: ${emotion.state}] (신뢰도: ${trustState.trust}/100)
${emotion.description}

[반응 규칙]
1. 현재 감정 상태에 맞게 자연스럽게 반응하세요.
2. 팀장이 공감하고 경청하면 점차 마음을 열어가세요. 하지만 급격한 태도 변화는 하지 마세요.
3. 팀장이 일방적으로 지시하거나 무시하면 더 방어적으로 변하세요.
4. 한국 직장 문화의 뉘앙스를 반영하세요 (예: 직접 반박보다는 한숨, 침묵, 돌려 말하기 등).
5. 2~4문장으로 현실적으로 대답하되, 상대방이 더 이야기할 수 있도록 자연스럽게 여지를 남기거나 되묻는 표현을 포함하세요. (예: "…그런데 솔직히 말씀드리면", "팀장님은 어떻게 생각하세요?" 등)
6. 가끔 침묵하거나 "…네, 뭐…" 같은 모호한 반응도 자연스럽습니다.
7. 상황에 맞는 구체적인 배경(야근, 업무량, 동료 관계 등)을 언급하며 대화를 풍성하게 만드세요.`;
}

const Simulation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  // Setup.tsx에서 { name, generation, contextStyle, driverStyle, scenario } 형태로 전달됨
  const state = location.state as any;
  const isGuest = !user && state?.guest === true;
  const simulationStartTime = useRef(Date.now());

  // 1. scenario 정보 추출 (Setup.tsx에서 { scenario, initialTrust } 로 전달함)
  const scenario = state?.scenario || { id: 'late-comer', title: '지각하는 팀원 피드백', description: '출근 시간을 자주 어기는 팀원에게 피드백을 전달하세요.', memberName: '김철수' };
  // 난이도별 초기 신뢰도: S등급(high)=25, A등급(medium)=45, B등급(low)=65
  const initialTrust: number = state?.initialTrust ?? 45;

  // 2. config 구성 (state 자체에 정보가 있거나, scenario.memberName을 활용)
  const config = useMemo(() => {
    const name = state?.name || scenario?.memberName || '김철수';
    // characterAvatars.ts의 getCharacterInfo를 사용하여 기본 캐릭터 정보 가져오기
    const info = getCharacterInfo(scenario?.id, name);

    return {
      ...info,
      generation: state?.generation || scenario?.generation || 'Gen Z',
      contextStyle: state?.contextStyle || 50,
      driverStyle: state?.driverStyle || 50
    };
  }, [state, scenario]);

  const [messages, setMessages] = useState<Message[]>(() => [
    { role: 'model', text: getOpeningLine(scenario?.id, config?.name), timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [isGeneratingSOS, setIsGeneratingSOS] = useState(false);
  const [sosTip, setSosTip] = useState<SOSTip | null>(null);
  const [sosTipHistory, setSosTipHistory] = useState<{ tip: SOSTip; turnIndex: number; timestamp: string }[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [usageDenied, setUsageDenied] = useState<string | null>(null);

  // 사용량 확인 가드 + 시뮬레이션 시작 이벤트
  useEffect(() => {
    if (!user || !profile) {
      // 게스트 모드: 사용량 체크 없이 sim_start 이벤트만 기록
      if (isGuest) {
        analyticsService.track('sim_start', analyticsService.withAttribution({ scenario_id: scenario?.id, plan: 'free', guest: true }));
      }
      return;
    }
    usageService.canStartSimulation(user.id, profile.plan).then(result => {
      if (!result.allowed) {
        setUsageDenied(result.reason || '사용 제한에 도달했습니다.');
      } else {
        usageService.recordUsage(user.id, 'simulation').catch(() => {});
        analyticsService.track('sim_start', analyticsService.withAttribution({ scenario_id: scenario?.id, plan: profile.plan }), user.id);
      }
    }).catch(() => {
      // DB 접근 실패 시에도 시뮬레이션은 허용 (graceful degradation)
    });
  }, [user, profile]);

  // Instant Coaching State
  const [instantCoaching, setInstantCoaching] = useState<InstantCoachingResult | null>(null);
  const [isCoachingLoading, setIsCoachingLoading] = useState(false);
  const [showCoaching, setShowCoaching] = useState(false);
  const coachingCacheRef = useRef<Map<string, InstantCoachingResult>>(new Map());
  const [mobileComposerOffset, setMobileComposerOffset] = useState(0);
  const [mobileComposerHeight, setMobileComposerHeight] = useState(140);
  const [showMobileBriefing, setShowMobileBriefing] = useState(false);

  // Trust Level State Management
  const [trustState, setTrustState] = useState<{
    trust: number;
    delta: number;
    dimensions: TrustLevelOutput['dimensions'];
    stage: 'S1' | 'S2' | 'S3' | 'S4';
    recentEvents: string[];
    lastEvents: TrustLevelOutput['events'];
    nextHint: string;
    trustHistory: number[];
  }>({
    trust: initialTrust,
    delta: 0,
    dimensions: {
      psychological_safety: initialTrust,
      understanding_alignment: initialTrust,
      autonomy_fairness: initialTrust,
      integrity_consistency: initialTrust,
      competence_support: initialTrust
    },
    stage: 'S1',
    recentEvents: [],
    lastEvents: [],
    nextHint: "대화를 시작하여 팀원과의 신뢰를 쌓아보세요.",
    trustHistory: [initialTrust]
  });

  // 전술 목표 달성 상태 (AI 판정 기반)
  const [goalAchievements, setGoalAchievements] = useState<boolean[]>([false, false, false]);

  // Dramatic UI State
  const [screenEffect, setScreenEffect] = useState<'none' | 'damage' | 'heal'>('none');
  const [combatTexts, setCombatTexts] = useState<Array<{ id: number; value: number }>>([]);
  const effectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const combatIdRef = useRef(0);

  // Ref to track latest trustState for async callbacks (avoids stale closures)
  const trustStateRef = useRef(trustState);
  trustStateRef.current = trustState;

  const mountedRef = useRef(true);

  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const emotionMachine = useRef(new EmotionStateMachine(initialTrust));
  const lastUserMessageRef = useRef<string>('');
  const firstTurnTrackedRef = useRef(false);

  // Cleanup on unmount — 시뮬레이션 이탈 트래킹
  const isCompleteRef = useRef(false);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (!isCompleteRef.current) {
        analyticsService.track('sim_abandon', analyticsService.withAttribution({
          scenario_id: scenario?.id,
          message_count: messages.length,
          last_trust: trustState.trust,
          guest: isGuest,
        }), user?.id);
      }
    };
  }, []);

  // 캐릭터 정보 & 아바타
  const characterInfo = useMemo(() => getCharacterInfo(scenario?.id, config.name), [scenario, config.name]);
  const avatarUrl = useMemo(() => getCharacterAvatar(config.name, scenario?.id), [config.name, scenario]);
  const avatarGlow = useMemo(() => getAvatarGlowColor(trustState.trust), [trustState.trust]);
  const emotionEmoji = useMemo(() => getEmotionEmoji(trustState.trust), [trustState.trust]);
  const emotionData = useMemo(() => getEmotionState(trustState.trust), [trustState.trust]);
  const emotionLabel = emotionData.state;
  const hpColor = trustState.trust > 70 ? '#4ade80' : trustState.trust > 30 ? '#00f2ff' : '#ef4444';

  // Derived State for Analysis Completion
  const isAnalysisComplete = useMemo(() => {
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    return userMsgCount >= ANALYSIS_COMPLETE_THRESHOLD;
  }, [messages]);

  // Background ambient effect based on Trust Level
  const ambientStyle = useMemo(() => {
    const isCritical = trustState.trust < 40;
    const intensity = Math.min(0.3, trustState.trust / 200);
    const color = trustState.trust > 70 ? '74, 222, 128' : isCritical ? '239, 68, 68' : '0, 242, 255';

    return {
      background: `radial-gradient(circle at 50% 120%, rgba(${color}, ${intensity}) 0%, transparent 70%)`,
      animation: isCritical ? 'pulse-red 2s infinite' : 'none'
    };
  }, [trustState.trust]);

  const missionBriefing = useMemo(() => getMissionBriefing(scenario?.id), [scenario]);

  const fetchWithRetry = async (fn: () => Promise<any>, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (i === retries - 1) throw err;
        const delay = Math.pow(2, i + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Trust scoring as a dedicated effect, triggered by message count changes
  const lastScoredMsgCount = useRef(0);

  useEffect(() => {
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    const lastMsg = messages[messages.length - 1];

    // Only score after a model response and when enough turns have passed
    if (messages.length < 2 || !lastMsg || lastMsg.role !== 'model') return;

    const turnsSinceScored = userMsgCount - lastScoredMsgCount.current;
    if (turnsSinceScored < TRUST_SCORING_INTERVAL) return;

    lastScoredMsgCount.current = userMsgCount;

    const transcriptSlice = messages.slice(-10).map((m, idx) => ({
      turn_id: idx + 1,
      speaker: m.role === 'model' ? 'other' as const : 'user' as const,
      text: m.text
    }));

    const currentTrust = trustStateRef.current;

    TrustLevelService.scoreTrustLevel({
      mode: 'chat',
      transcript: transcriptSlice,
      state: {
        prev_trust: currentTrust.trust,
        prev_dimensions: currentTrust.dimensions,
        prev_stage: currentTrust.stage,
        recent_events: currentTrust.recentEvents,
        is_new_session: false,
        optional_context: `상황: ${scenario?.title}, 팀원: ${config.name}(${config.generation})`
      },
      tacticalGoals: missionBriefing.tasks
    }).then(score => {
      if (score && mountedRef.current) {
        // 감정 상태 머신 업데이트
        const emotionUpdate = emotionMachine.current.update(score.trust);
        if (emotionUpdate.stateChanged) {
          console.log(`[Emotion] ${emotionUpdate.previousState} → ${emotionUpdate.newState}`);
        }

        setTrustState(prev => ({
          trust: score.trust,
          delta: score.delta,
          dimensions: score.dimensions,
          stage: score.stage.level,
          recentEvents: score.recent_events_out,
          lastEvents: score.events,
          nextHint: score.next_hint,
          trustHistory: [...prev.trustHistory, score.trust].slice(-10) // 최근 10개 유지
        }));

        // 전술 목표 달성 업데이트 (비가역적: true → true 유지)
        if (score.goalAchievements && Array.isArray(score.goalAchievements)) {
          setGoalAchievements(prev => prev.map((achieved, i) => achieved || score.goalAchievements![i] || false));
        }

        // HOSTILE 도달 시 시뮬레이션 강제 종료 (신뢰도 15 이하)
        if (score.trust <= 15) {
          isCompleteRef.current = true;
          setMessages(prev => {
            const failMessages = [...prev, {
              role: 'model' as const,
              text: '(팀원이 자리에서 일어나며) 더 이상 대화할 의미가 없는 것 같습니다. 실례하겠습니다.',
              timestamp: new Date(),
            }];
            setTimeout(() => {
              navigate('/feedback', {
                state: { transcript: failMessages, scenario, sosTipHistory },
              });
            }, 1500);
            return failMessages;
          });
          return;
        }

        // Dramatic UI Trigger
        if (score.delta !== 0) {
          // 1. Floating Text
          const newId = combatIdRef.current++;
          setCombatTexts(prev => [...prev, { id: newId, value: score.delta }]);
          setTimeout(() => {
            setCombatTexts(prev => prev.filter(t => t.id !== newId));
          }, 2000);

          // 2. Screen Effect
          if (score.delta < -5) {
            setScreenEffect('damage');
          } else if (score.delta > 3) {
            setScreenEffect('heal');
          }

          if (effectTimeoutRef.current) clearTimeout(effectTimeoutRef.current);
          effectTimeoutRef.current = setTimeout(() => {
            setScreenEffect('none');
          }, 1000);
        }
      }
    }).catch(err => {
      console.error("Trust scoring failed:", err);
    });
  }, [messages, scenario, config.name, config.generation]);

  const handleSend = async (text: string, isSilent = false) => {
    if (!text.trim() || !chatRef.current) return;
    if (!isSilent && isLoading) return;

    if (!isSilent) {
      lastUserMessageRef.current = text;

      if (!firstTurnTrackedRef.current) {
        firstTurnTrackedRef.current = true;
        analyticsService.track('simulation_first_turn', analyticsService.withAttribution({
          scenario_id: scenario?.id,
          guest: isGuest,
          plan: profile?.plan || 'free',
        }), user?.id);
      }

      setMessages(prev => [...prev, { role: 'user', text, timestamp: new Date() }]);
      setInputText('');
    }

    setIsLoading(true);
    try {
      // EmotionStateMachine의 상세 컨텍스트를 메시지에 주입
      const emotionContext = emotionMachine.current.buildEmotionContext(trustStateRef.current.trust);
      const contextPrefix = `[시스템 참고 - 사용자에게 보여주지 말 것]\n${emotionContext}\n[사용자 발화]\n`;

      const response = await fetchWithRetry(() => chatRef.current!.sendMessage({ message: contextPrefix + text }));
      const responseText = response.text || '';

      setMessages(prev => [
        ...prev,
        { role: 'model', text: responseText, timestamp: new Date() } as Message
      ]);

    } catch (error: any) {
      console.error('[Simulation] sendMessage failed:', error);
      const detail = error?.message || error?.statusText || String(error);
      const errMsg = getAiErrorMessage({
        status: error?.status,
        detail,
      });
      setMessages(prev => [...prev, {
        role: 'model',
        text: errMsg,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const initializeChat = async () => {
    try {
      setInitError(null);

      const ai = createGeminiClient();
      const systemInstruction = buildSystemPrompt(config, scenario, trustStateRef.current);

      const openingUserText = `안녕하세요, ${config.name}님. 잠깐 이야기 좀 나눌까요?`;
      const openingModelText = getOpeningLine(scenario?.id, config.name);

      setMessages([
        { role: 'model', text: openingModelText, timestamp: new Date() }
      ]);

      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction, temperature: 0.8, thinkingConfig: { thinkingBudget: 0 } },
        history: [
          { role: 'user', parts: [{ text: openingUserText }] },
          { role: 'model', parts: [{ text: openingModelText }] }
        ]
      });

    } catch (err) {
      setInitError(getInitErrorMessage(err));
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeChat();
    }
  }, []);

  const handleRetry = () => {
    if (!lastUserMessageRef.current) return;
    // 오류 메시지 제거 후 재전송 (user 메시지는 이미 존재)
    setMessages(prev => prev.filter(m => !m.isError));
    handleSend(lastUserMessageRef.current, true);
  };

  const handleInstantCoaching = async () => {
    if (isCoachingLoading) return;

    const userMessages = messages.filter(m => m.role === 'user');
    const lastUser = userMessages[userMessages.length - 1];
    const lastModelIdx = messages.findLastIndex(m => m.role === 'model' && !m.isError);
    const lastModel = lastModelIdx >= 0 ? messages[lastModelIdx] : null;

    if (!lastUser || !lastModel) return;

    // 캐시 키: 사용자 메시지 + AI 응답의 앞 50자
    const cacheKey = `${lastUser.text.slice(0, 80)}|${lastModel.text.slice(0, 50)}`;
    const cached = coachingCacheRef.current.get(cacheKey);
    if (cached) {
      setInstantCoaching(cached);
      setShowCoaching(true);
      return;
    }

    setIsCoachingLoading(true);
    setShowCoaching(true);
    setInstantCoaching(null);

    try {
      const result = await TrustLevelService.getInstantCoaching({
        userMessage: lastUser.text,
        modelResponse: lastModel.text,
        scenarioContext: `상황: ${scenario?.title}, 팀원: ${config.name}(${config.generation})`,
        currentTrust: trustState.trust
      });

      if (result) {
        console.log('[InstantCoaching] 결과 설정 완료');
        setInstantCoaching(result);
        coachingCacheRef.current.set(cacheKey, result);
        if (result.estimatedTrustDelta !== 0) {
          setTrustState(prev => ({
            ...prev,
            trust: Math.max(0, Math.min(100, prev.trust + result.estimatedTrustDelta)),
            delta: result.estimatedTrustDelta,
            trustHistory: [...prev.trustHistory, Math.max(0, Math.min(100, prev.trust + result.estimatedTrustDelta))].slice(-10),
          }));
        }
      } else {
        console.log('[InstantCoaching] 결과 null - 폴백 표시');
        setInstantCoaching({
          positiveImpact: '코칭 분석에 실패했습니다.',
          negativeRisk: '잠시 후 다시 시도해주세요.',
          estimatedTrustDelta: 0,
          betterAlternative: '',
          tip: '대화를 계속 진행하세요.'
        });
      }
    } catch (err) {
      console.error('[InstantCoaching] failed:', err);
      setInstantCoaching({
        positiveImpact: '코칭 응답을 받지 못했습니다.',
        negativeRisk: '네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.',
        estimatedTrustDelta: 0,
        betterAlternative: '',
        tip: '대화를 계속 진행하며 다시 시도해보세요.'
      });
    } finally {
      console.log('[InstantCoaching] 로딩 해제');
      setIsCoachingLoading(false);
    }
  };

  const handleSOS = async () => {
    if (isGeneratingSOS) return;

    setShowSOS(true);

    if (messages.length === 0) {
      setSosTip(null);
      return;
    }

    setIsGeneratingSOS(true);
    setSosTip(null);

    try {
      const ai = createGeminiClient();

      const recentMsgs = messages.slice(-6).map(m => `${m.role === 'user' ? '리더' : config.name}: ${m.text}`).join('\n');
      const emotionInfo = getEmotionState(trustStateRef.current.trust);
      const briefing = getMissionBriefing(scenario?.id);
      const prompt = `당신은 한국 직장 리더십 전문 코치입니다. 아래 맥락을 바탕으로 리더에게 실전적이고 구체적인 코칭을 JSON으로 제공하세요.

[시나리오] ${scenario?.title}
[배경] ${scenario?.description}
[팀원 프로필] 이름: ${config.name}, 세대: ${config.generation}, 소통 스타일: 맥락 의존도 ${config.contextStyle ?? 50}/100, 감정 중심도 ${config.driverStyle ?? 50}/100
[현재 신뢰도] ${trustStateRef.current.trust}/100 (감정 상태: ${emotionInfo.state})
[감정 설명] ${emotionInfo.description}
${briefing ? `[적용 심리 프레임워크] ${briefing.theory}\n[미션 목표] ${briefing.tasks?.join(' / ') || ''}\n[팀원 심리 상태] ${briefing.statusSummary?.psychState || ''}\n[이상적 결과] ${briefing.idealState || ''}` : ''}

[최근 대화]
${recentMsgs}

다음 규칙을 지켜 응답하세요:
1. insight: 현재 대화에서 리더가 놓치고 있는 핵심 포인트 1문장 (심리 프레임워크 기반)
2. suggestion: ${config.name}의 세대·성격·현재 감정 상태를 고려한 구체적 행동 가이드 2문장
3. magicPhrases: 리더가 바로 사용할 수 있는 자연스러운 한국어 추천 발화 3개. 각 발화는 반드시:
   - ${config.name}의 이름이나 구체적 상황을 포함할 것
   - 형식적이거나 교과서적인 표현 금지 (예: "함께 논의할 준비가 되어 있습니다" 같은 표현 절대 사용 금지)
   - 실제 한국 직장에서 팀장이 할 법한 자연스러운 말투로 작성
   - 각 발화는 서로 다른 접근법(공감형, 질문형, 제안형)을 사용할 것`;

      console.log('[SOS] 코칭 요청 시작');
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                insight: { type: Type.STRING, description: "핵심 통찰 1문장" },
                suggestion: { type: Type.STRING, description: "행동 가이드 2문장" },
                magicPhrases: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "추천 발화 3개"
                }
              },
              required: ['insight', 'suggestion', 'magicPhrases']
            }
          }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Coaching timeout')), 12000))
      ]);

      console.log('[SOS] 응답 수신 완료');
      const responseText = (response as any).text;
      if (!responseText) throw new Error("Empty response");

      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.insight && parsed.suggestion && Array.isArray(parsed.magicPhrases)) {
        setSosTip(parsed);
        setSosTipHistory(prev => [...prev, {
          tip: parsed,
          turnIndex: messages.filter(m => m.role === 'user').length,
          timestamp: new Date().toISOString()
        }]);
      } else {
        throw new Error("Invalid response format");
      }

    } catch (error) {
      console.error("[SOS] AI Coaching Error:", error);
      setSosTip({ insight: '코칭 응답을 받지 못했습니다.', suggestion: '잠시 후 다시 시도해주세요. 네트워크 상태를 확인해보세요.', magicPhrases: [] });
    } finally {
      setIsGeneratingSOS(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    if (scrollRef.current) {
      const isDesktop = window.innerWidth >= 640;
      const offset = isDesktop ? 180 : 0;
      scrollRef.current.scrollTop = Math.max(0, scrollRef.current.scrollHeight - scrollRef.current.clientHeight + offset);
    }
  }, [messages, mobileComposerHeight, mobileComposerOffset, inputText]);

  useEffect(() => {
    const updateMobileLayout = () => {
      const composerHeight = composerRef.current?.offsetHeight ?? 140;
      setMobileComposerHeight(composerHeight);

      const vv = window.visualViewport;
      if (window.innerWidth >= 640 || !vv) {
        setMobileComposerOffset(0);
        return;
      }

      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setMobileComposerOffset(keyboardHeight);
    };

    updateMobileLayout();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateMobileLayout);
    vv?.addEventListener('scroll', updateMobileLayout);
    window.addEventListener('resize', updateMobileLayout);

    return () => {
      vv?.removeEventListener('resize', updateMobileLayout);
      vv?.removeEventListener('scroll', updateMobileLayout);
      window.removeEventListener('resize', updateMobileLayout);
    };
  }, [inputText, showSOS, sosTip, isGeneratingSOS, showCoaching, instantCoaching]);

  // 사용량 제한 — 무료 플랜 소진 시 업그레이드 유도
  if (usageDenied) {
    if (profile?.plan === 'free') {
      navigate('/upgrade', { replace: true });
      return null;
    }
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2">사용 제한</h2>
          <p className="text-slate-400 text-sm mb-6">{usageDenied}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm">홈으로</button>
            <button onClick={() => navigate('/pricing')} className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-semibold text-sm">플랜 업그레이드</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dramatic UI Overlays */}
      {screenEffect === 'damage' && (
        <>
          <div className="fixed inset-0 pointer-events-none z-[60] animate-red-flash bg-red-500/20" />
          <div className="fixed inset-0 pointer-events-none z-[50] vignette-danger" />
        </>
      )}
      {screenEffect === 'heal' && (
        <>
          <div className="fixed inset-0 pointer-events-none z-[60] animate-blue-flash bg-cyan-500/10" />
          <div className="fixed inset-0 pointer-events-none z-[50] vignette-safe" />
        </>
      )}

      {/* 게스트 모드 배지 */}
      {isGuest && (
        <div className="fixed top-3 right-3 z-50 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold tracking-wide">
          체험 모드
        </div>
      )}

      {/* Floating Combat Texts */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[70]">
        {combatTexts.map(ct => (
          <div
            key={ct.id}
            className={`absolute font-black text-4xl whitespace-nowrap animate-combat-text ${ct.value > 0 ? 'text-cyan-400 game-glow-text' : 'text-red-500 text-shadow-lg'
              }`}
          >
            {ct.value > 0 ? `+${ct.value}` : ct.value} TRUST
          </div>
        ))}
      </div>

      <div className={`min-h-[100dvh] bg-[#060B18] text-white font-manrope relative flex flex-col sm:flex-row ${screenEffect === 'damage' ? 'animate-shake' : ''}`}>

        {/* ── BACKGROUND FX ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(rgba(0,242,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,255,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060B18]/50 to-[#060B18]" />
          <div className="absolute inset-0 transition-opacity duration-1000" style={ambientStyle} />
        </div>

        {/* ── LEFT PANEL: TACTICAL STATUS (30%) ── */}
        <aside className="hidden sm:flex w-full lg:w-[28%] bg-black/40 backdrop-blur-3xl border-r border-white/5 z-20 flex-col shrink-0 min-h-0">
          <header className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">west</span>
              </button>
              <div>
                <h1 className="text-base lg:text-lg font-black tracking-[0.2em] text-primary uppercase">대화 화면</h1>
                <p className="text-sm lg:text-base font-bold text-slate-500 uppercase tracking-widest mt-0.5">시나리오: {scenario?.title?.split(' ')[0] || 'LEADER_SIM'}</p>
              </div>
            </div>
            <div className="size-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00F2FF]" />
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-6 space-y-4 lg:space-y-5 hide-scrollbar">
            {/* Target Profile & Trust (웅장하게 복구) */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative group/avatar">
                  <div className={`size-20 rounded-[1.5rem] overflow-hidden border-2 transition-all duration-700 relative ${avatarGlow.animationClass}`}
                    style={{ borderColor: avatarGlow.borderColor, boxShadow: avatarGlow.shadow }}>
                    <img src={avatarUrl} alt={config.name} className="size-full object-cover scale-110 group-hover/avatar:scale-125 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-7 bg-[#0f172a] rounded-xl border border-white/20 flex items-center justify-center text-lg shadow-2xl">
                    {emotionEmoji}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[1.45rem] lg:text-[1.65rem] font-black tracking-tight flex items-center gap-2">
                    {config.name}
                    <span className="size-2 rounded-full" style={{ backgroundColor: characterInfo.themeColor }} />
                  </h2>
                  <p className="text-sm lg:text-[15px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded inline-block mt-1">
                    {characterInfo.role} / {config.generation}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="[&_*]:!text-sm lg:[&_*]:!text-[15px]">
                  <HPBar value={trustState.trust} label="신뢰도 레벨" colorClass={trustState.trust > 70 ? 'bg-green-400' : trustState.trust > 30 ? 'bg-primary' : 'bg-red-500'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="[&_*]:!text-sm lg:[&_*]:!text-[15px]"><StatInline icon="psychology" label="정렬도" value={`${trustState.dimensions.understanding_alignment}%`} /></div>
                  <div className="[&_*]:!text-sm lg:[&_*]:!text-[15px]"><StatInline icon="shield" label="심리적 안전감" value={`${trustState.dimensions.psychological_safety}%`} /></div>
                </div>
              </div>
            </section>

            {/* 상태 요약 REPORT (복구) */}
            <section className="bg-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <span className="material-symbols-outlined text-4xl">analytics</span>
              </div>
              <h3 className="text-sm lg:text-base font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-primary/20 pb-2">
                대화 상대 요약
              </h3>

              <div className="space-y-4">
                <p className="text-[15px] lg:text-[17px] font-bold text-white leading-relaxed italic border-l-4 border-primary/40 pl-3">
                  "{missionBriefing.statusSummary.psychState}"
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs lg:text-sm font-black text-emerald-500/80 uppercase tracking-widest mb-2">핵심 강점</p>
                    <ul className="space-y-1.5">
                      {missionBriefing.statusSummary.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-sm lg:text-[15px] text-slate-300 flex items-center gap-2 leading-snug">
                          <span className="text-xs text-emerald-500">●</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs lg:text-sm font-black text-rose-500/80 uppercase tracking-widest mb-2">취약 요소</p>
                    <ul className="space-y-1.5">
                      {missionBriefing.statusSummary.weaknesses.slice(0, 3).map((w, i) => (
                        <li key={i} className="text-sm lg:text-[15px] text-slate-300 flex items-center gap-2 leading-snug">
                          <span className="text-xs text-rose-500">○</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* 핵심 수행 과제 — 단계별 클리어 */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm lg:text-base font-black text-slate-400 uppercase tracking-widest mb-3">이번 대화에서 볼 포인트</h3>
              <div className="space-y-3">
                {missionBriefing.tasks?.map((task: string, i: number) => {
                  const isCleared = goalAchievements[i] || false;
                  const isActive = !isCleared && (i === 0 || goalAchievements[i - 1] || false);
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 items-start text-sm lg:text-[15px] leading-relaxed rounded-xl px-3 py-2 transition-all duration-700 ${
                        isCleared
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : isActive
                            ? 'bg-primary/10 border border-primary/30'
                            : 'bg-transparent border border-transparent'
                      }`}
                    >
                      <div className={`size-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500 ${
                        isCleared
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : isActive
                            ? 'bg-primary/20 border border-primary/50 animate-pulse'
                            : 'bg-white/5 border border-white/15'
                      }`}>
                        <span className={`material-symbols-outlined text-xs ${
                          isCleared ? 'text-white' : isActive ? 'text-primary' : 'text-slate-600'
                        }`}>
                          {isCleared ? 'check' : isActive ? 'arrow_forward' : 'lock'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`transition-colors duration-500 ${
                          isCleared
                            ? 'text-emerald-300 line-through decoration-emerald-500/40'
                            : isActive
                              ? 'text-slate-200'
                              : 'text-slate-600'
                        }`}>{task}</span>
                        {isCleared && (
                          <span className="ml-2 text-xs font-black text-emerald-400 uppercase tracking-widest">Clear</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${(goalAchievements.filter(Boolean).length / 3) * 100}%` }}
                  />
                </div>
                <span className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {goalAchievements.filter(Boolean).length}/{missionBriefing.tasks?.length || 3} Done
                </span>
              </div>
            </section>

            {/* Analysis Dashboard (웅장하게) */}
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-5">
                <h3 className="text-sm lg:text-base font-black text-slate-500 uppercase tracking-widest mb-3">신뢰도 추이</h3>
                <div className="h-24">
                  <TacticalTrendChart data={trustState.trustHistory} color={trustState.trust < 40 ? '#ef4444' : '#00F2FF'} />
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <h3 className="text-sm lg:text-base font-black text-slate-500 uppercase tracking-widest">대화 변화 로그</h3>
                <div className="space-y-3">
                  {trustState.lastEvents.length > 0 ? trustState.lastEvents.slice(-3).map((event, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${event.impact >= 0 ? 'bg-game-xp/20 text-game-xp' : 'bg-game-hp/20 text-game-hp'}`}>
                        <span className="material-symbols-outlined">{event.impact >= 0 ? 'trending_up' : 'trending_down'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs lg:text-sm font-black text-white truncate pr-2 uppercase tracking-wide">{event.reason_short}</span>
                          <span className={`text-xs lg:text-sm font-black ${event.impact >= 0 ? 'text-game-xp' : 'text-game-hp'}`}>{event.impact >= 0 ? `+${event.impact}` : event.impact}</span>
                        </div>
                        <p className="text-[11px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest">{event.family}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-sm font-bold text-slate-600 italic">대화 흐름을 분석하는 중입니다...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <footer className="p-4 lg:p-5 border-t border-white/5 flex items-center gap-3">
            <TacticalCircularTimer value={messages.filter(m => m.role === 'user').length * (100 / ANALYSIS_COMPLETE_THRESHOLD)} label={`${messages.filter(m => m.role === 'user').length}/${ANALYSIS_COMPLETE_THRESHOLD}`} subLabel="대화 수" />
            <div className="flex-1">
              <button
                onClick={async () => {
                  // DB에 시뮬레이션 결과 저장 (인증된 사용자)
                  if (user) {
                    const durationSec = Math.round((Date.now() - simulationStartTime.current) / 1000);
                    await dbService.saveSimulation({
                      user_id: user.id,
                      org_id: profile?.org_id || null,
                      scenario_id: scenario?.id || 'unknown',
                      scenario_title: scenario?.title || '',
                      scenario_category: scenario?.category || null,
                      character_name: config.name,
                      character_generation: config.generation || null,
                      transcript: messages.map(m => ({ role: m.role, text: m.text })),
                      message_count: messages.length,
                      duration_seconds: durationSec,
                      final_trust: trustState.trust,
                      trust_history: trustState.trustHistory,
                      trust_dimensions: trustState.dimensions || null,
                      feedback: null,
                      coaching_skills: null,
                      radar_chart: null,
                      leadership_type: null,
                      communication_pattern: null,
                      memo: '',
                      tags: [],
                    }).catch(err => console.error('시뮬레이션 DB 저장 실패:', err));
                  }
                  isCompleteRef.current = true;
                  const durationMs = Date.now() - simulationStartTime.current;
                  analyticsService.track('sim_complete', analyticsService.withAttribution({
                    scenario_id: scenario?.id,
                    duration: Math.round(durationMs / 1000),
                    final_trust: trustState.trust,
                    message_count: messages.length,
                    guest: isGuest,
                  }), user?.id);

                  if (isGuest) {
                    // 게스트: 결과 리포트 → 골든 스크립트 → 요금제 업그레이드 퍼널
                    navigate('/feedback', { state: { transcript: messages, scenario, sosTipHistory, isGuest: true } });
                  } else {
                    navigate('/feedback', { state: { transcript: messages, scenario, sosTipHistory } });
                  }
                }}
                disabled={!isAnalysisComplete}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${isAnalysisComplete
                  ? 'bg-primary text-black shadow-neon-cyan hover:scale-[1.05] active:scale-[0.95]'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                  }`}
              >
                결과 리포트
              </button>
            </div>
          </footer>
        </aside>

        {/* ── RIGHT AREA: MAIN BATTLE HUD ── */}
        <main className="flex-1 flex flex-col relative z-10 min-h-0">

          {/* Mobile compact status */}
          <div className="sm:hidden sticky top-0 z-30 px-3 pt-3">
            <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-xl overflow-hidden border border-white/10 shrink-0" style={{ boxShadow: avatarGlow.shadow }}>
                    <img src={avatarUrl} alt={config.name} className="size-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">{config.name}</span>
                      <span className="text-base shrink-0">{emotionEmoji}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{characterInfo.role} · {config.generation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowMobileBriefing(true)}
                    className="px-2.5 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-200"
                  >
                    <span className="material-symbols-outlined text-sm">list_alt</span>
                    목표
                  </button>
                  <button onClick={() => navigate(-1)} className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-base">west</span>
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${trustState.trust > 70 ? 'bg-green-400' : trustState.trust > 30 ? 'bg-primary' : 'bg-red-500'}`} style={{ width: `${trustState.trust}%` }} />
                </div>
                <span className="text-[11px] font-black text-white shrink-0">신뢰 {trustState.trust}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span>{emotionLabel}</span>
                <span>{messages.filter(m => m.role === 'user').length}/{ANALYSIS_COMPLETE_THRESHOLD}</span>
              </div>
            </div>
          </div>

          {/* HUD Overlay Info */}
          <div className="absolute top-6 left-6 right-6 z-30 justify-between pointer-events-none hidden sm:flex">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">현재 감정 지수</span>
              <span className="text-sm font-black" style={{ color: hpColor }}>{emotionLabel}</span>
            </div>
          </div>

          {/* Message HUD Area */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 lg:px-7 pt-4 sm:pt-24 lg:pt-20 sm:pb-32 lg:pb-64 space-y-4 sm:space-y-8 lg:space-y-6 scroll-smooth hide-scrollbar"
            style={{ paddingBottom: window.innerWidth < 640 ? `${mobileComposerHeight + mobileComposerOffset + 20}px` : undefined }}
          >
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%] lg:max-w-[82%] group">
                  <div className={`flex items-center gap-2 mb-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className={`text-xs lg:text-[13px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-primary' : 'text-slate-500'}`}>
                      {msg.role === 'user' ? '나' : config.name}
                    </span>
                    <span className="text-[10px] font-bold text-white/20 uppercase tabular-nums">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`
                  relative p-5 rounded-3xl backdrop-blur-md border transition-all duration-300
                  ${msg.role === 'user'
                      ? 'bg-primary/10 border-primary/30 rounded-tr-sm shadow-[0_4px_20px_rgba(0,242,255,0.1)]'
                      : 'bg-white/5 border-white/10 rounded-tl-sm'}
                  ${msg.isError ? 'bg-red-500/10 border-red-500/30 text-red-400' : ''}
                `}>
                    <p className="text-[16px] lg:text-[18px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {/* Corner Accents */}
                    <div className={`absolute top-0 ${msg.role === 'user' ? 'right-0' : 'left-0'} p-1.5 opacity-40`}>
                      <div className={`w-2 h-2 border-t border-${msg.role === 'user' ? 'r' : 'l'} rounded-sm border-white/30`} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-sm p-6 max-w-[85%]">
                  <div className="flex gap-2">
                    <div className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Instant Coaching Card */}
            {showCoaching && (
              <div className="mx-2 animate-in slide-in-from-bottom-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-sm">tips_and_updates</span>
                      <span className="text-sm font-black text-amber-400 uppercase tracking-widest">Instant Coaching</span>
                    </div>
                    <button onClick={() => setShowCoaching(false)} className="text-slate-500 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  {isCoachingLoading ? (
                    <div className="flex items-center justify-center py-4 gap-3">
                      <div className="size-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] font-bold text-amber-400/70 uppercase tracking-widest animate-pulse">Analyzing your response...</span>
                    </div>
                  ) : instantCoaching ? (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400 text-base mt-0.5">✅</span>
                        <p className="text-[15px] text-slate-300 leading-relaxed">{instantCoaching.positiveImpact}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 text-base mt-0.5">⚠️</span>
                        <p className="text-[15px] text-slate-300 leading-relaxed">{instantCoaching.negativeRisk}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 text-base">📊</span>
                        <span className="text-[14px] text-slate-400">예상 신뢰 변화:</span>
                        <span className={`text-[16px] font-black ${instantCoaching.estimatedTrustDelta > 0 ? 'text-emerald-400' : instantCoaching.estimatedTrustDelta < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {instantCoaching.estimatedTrustDelta > 0 ? '+' : ''}{instantCoaching.estimatedTrustDelta}
                        </span>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 border border-amber-500/10">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-300 text-base mt-0.5">💬</span>
                          <p className="text-[15px] text-amber-200/90 leading-relaxed italic">"{instantCoaching.betterAlternative}"</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 pt-1">
                        <span className="text-cyan-400 text-base mt-0.5">🎯</span>
                        <p className="text-[14px] font-bold text-cyan-300">{instantCoaching.tip}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* ── ACTION INPUT DASHBOARD ── */}
          <div ref={composerRef} className="fixed sm:absolute bottom-0 sm:bottom-3 lg:bottom-4 left-0 right-0 sm:left-6 sm:right-6 z-40 bg-navy-mid/95 sm:bg-navy-mid/80 backdrop-blur-2xl border-t sm:border border-white/10 rounded-t-[1.4rem] sm:rounded-[1.6rem] lg:rounded-[1.8rem] p-3 sm:p-3 lg:p-3.5 flex flex-col gap-2 sm:gap-2.5 shadow-[0_-10px_30px_rgba(0,0,0,0.25)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.5)] mt-2 sm:mt-0 pb-[calc(12px+env(safe-area-inset-bottom))] sm:pb-3"
            style={{ transform: window.innerWidth < 640 && mobileComposerOffset > 0 ? `translateY(-${mobileComposerOffset}px)` : undefined }}>

            {/* Action Suggested / SOS Area */}
            {sosTip && showSOS && !isGeneratingSOS && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">auto_fix_high</span>
                    <span className="text-sm font-black text-primary uppercase tracking-widest italic">전술 지원 추천 (SOS)</span>
                  </div>
                  <button onClick={() => setShowSOS(false)} className="text-slate-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <p className="text-[15px] font-bold text-white mb-4 leading-relaxed">"{sosTip.suggestion}"</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {sosTip.magicPhrases.map((phrase, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setShowSOS(false); handleSend(phrase); }}
                      className="bg-[#0f172a] hover:bg-primary/10 border border-white/5 hover:border-primary/30 p-3 rounded-xl text-left transition-all active:scale-95 flex items-start gap-2 group"
                    >
                      <span className="material-symbols-outlined text-xs text-slate-600 group-hover:text-primary transition-colors mt-0.5">bolt</span>
                      <span className="text-[14px] font-bold flex-1 whitespace-normal leading-snug">{phrase}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="flex flex-col gap-2.5 sm:gap-2">
              <div className="bg-black/40 rounded-[1.4rem] sm:rounded-[1.5rem] border border-white/5 px-3 py-1.5 sm:py-1.5 lg:py-1.5 flex items-end gap-2 focus-within:border-primary/40 transition-all">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  className="flex-1 min-w-0 bg-transparent border-none px-3 py-1.5 sm:py-1.5 lg:py-1.5 text-base lg:text-[18px] text-white placeholder-slate-600 outline-none resize-none hide-scrollbar min-h-[52px] sm:min-h-[42px] lg:min-h-[46px] max-h-[120px] leading-relaxed"
                  placeholder="메시지를 입력하세요..."
                  value={inputText}
                  disabled={isLoading}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(inputText))}
                />
                <button
                  onClick={() => handleSend(inputText)}
                  disabled={!inputText.trim() || isLoading}
                  className="size-11 bg-white/5 hover:bg-primary hover:text-navy-deep rounded-2xl flex items-center justify-center transition-all disabled:opacity-20 shrink-0 mb-1"
                >
                  <span className="material-symbols-outlined text-base font-black">send</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm items-center sm:gap-3">
                <button
                  onClick={handleSOS}
                  disabled={isGeneratingSOS}
                  className={`h-11 rounded-2xl px-4 flex items-center justify-center gap-2 transition-all ${isGeneratingSOS ? 'bg-primary/20 animate-pulse' : 'bg-primary text-navy-deep shadow-neon-cyan active:scale-95'}`}
                >
                  <span className="material-symbols-outlined text-lg font-black">
                    {isGeneratingSOS ? 'sync' : 'psychology'}
                  </span>
                  <span className="text-sm font-black whitespace-nowrap">SOS 힌트</span>
                </button>

                <button
                  onClick={handleInstantCoaching}
                  disabled={isCoachingLoading || messages.filter(m => m.role === 'user').length === 0 || isLoading}
                  className={`h-11 rounded-2xl px-4 flex items-center justify-center gap-2 transition-all ${
                    isCoachingLoading
                      ? 'bg-amber-500/20 animate-pulse'
                      : 'bg-amber-500 text-navy-deep shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-95 disabled:opacity-30 disabled:shadow-none'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg font-black">
                    {isCoachingLoading ? 'sync' : 'tips_and_updates'}
                  </span>
                  <span className="text-sm font-black whitespace-nowrap">즉시 코칭</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* ── MOBILE BRIEFING SHEET ── */}
        {showMobileBriefing && (
          <div className="sm:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileBriefing(false)}>
            <div
              className="absolute left-0 right-0 bottom-0 rounded-t-[2rem] border-t border-white/10 bg-[#0B1020] px-4 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] max-h-[78vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white">사용자 정보 및 대화 목표</h3>
                <button
                  onClick={() => setShowMobileBriefing(false)}
                  className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-14 rounded-2xl overflow-hidden border border-white/10 shrink-0" style={{ boxShadow: avatarGlow.shadow }}>
                    <img src={avatarUrl} alt={config.name} className="size-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white truncate">{config.name}</span>
                      <span className="text-lg shrink-0">{emotionEmoji}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400">{characterInfo.role} · {config.generation}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">현재 감정: {emotionLabel}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>신뢰도</span>
                    <span>{trustState.trust}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full ${trustState.trust > 70 ? 'bg-green-400' : trustState.trust > 30 ? 'bg-primary' : 'bg-red-500'}`} style={{ width: `${trustState.trust}%` }} />
                  </div>
                </div>
              </section>

              <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3">대화 상대 요약</h4>
                <p className="text-sm font-bold text-white leading-relaxed mb-4">{missionBriefing.statusSummary.psychState}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">강점</p>
                    <ul className="space-y-1.5">
                      {missionBriefing.statusSummary.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-slate-300 leading-relaxed">• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">취약 요소</p>
                    <ul className="space-y-1.5">
                      {missionBriefing.statusSummary.weaknesses.slice(0, 3).map((w, i) => (
                        <li key={i} className="text-xs text-slate-300 leading-relaxed">• {w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3">핵심 전술 목표</h4>
                <div className="space-y-2.5">
                  {missionBriefing.tasks?.map((task: string, i: number) => {
                    const isCleared = goalAchievements[i] || false;
                    return (
                      <div key={i} className={`rounded-xl border px-3 py-3 ${isCleared ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/[0.02]'}`}>
                        <div className="flex items-start gap-2">
                          <span className={`material-symbols-outlined text-sm mt-0.5 ${isCleared ? 'text-emerald-400' : 'text-slate-500'}`}>{isCleared ? 'check_circle' : 'radio_button_unchecked'}</span>
                          <span className={`text-sm leading-relaxed ${isCleared ? 'text-emerald-200' : 'text-slate-200'}`}>{task}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>진행도</span>
                  <span>{goalAchievements.filter(Boolean).length}/{missionBriefing.tasks?.length || 3}</span>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ── INIT ERROR OVERLAY ── */}
        {initError && (
          <div className="fixed inset-0 z-[100] bg-[#060B18]/95 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="max-w-sm w-full bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center">
              <div className="size-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 scale-animate">
                <span className="material-symbols-outlined text-red-400 text-4xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">System Critical Failure</h3>
              <p className="text-base text-slate-300 mb-4 leading-relaxed">전술 시스템 연결에 실패했습니다. AI 프로세서와의 동기화를 재시도하십시오.</p>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed break-words">{initError}</p>
              <button
                onClick={() => { initialized.current = false; initializeChat(); }}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                Re-initialize
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYZING SOS OVERLAY ── */}
        {showSOS && isGeneratingSOS && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              <div className="relative size-24">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 bg-primary/20 rounded-full animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-primary font-black tracking-[0.25em] uppercase text-sm animate-pulse">대화 흐름을 분석하고 있습니다</p>
                <p className="text-slate-500 text-[10px] font-bold uppercase mt-2">조금만 기다려주세요</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Simulation;
