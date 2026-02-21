
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { TrustLevelService, TrustLevelOutput } from '../services/trustLevelService';
import { getMissionBriefing, getOpeningLine } from '../services/missionBriefings';
import { EmotionStateMachine } from '../services/emotionStateMachine';
import { createGeminiClient } from '../src/lib/geminiClient';
import { getCharacterAvatar, getCharacterInfo, getAvatarGlowColor, getEmotionEmoji } from '../services/characterAvatars';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

interface SOSTip {
  insight: string;
  suggestion: string;
  magicPhrases: string[];
}

const ANALYSIS_COMPLETE_THRESHOLD = 7; // user turns required
const TRUST_SCORING_INTERVAL = 3; // user turns between scoring

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
5. 1~3문장으로 짧고 현실적으로 대답하세요. 지나치게 극단적이거나 드라마틱하지 않게 해주세요.
6. 가끔 침묵하거나 "…네, 뭐…" 같은 모호한 반응도 자연스럽습니다.`;
}


const Simulation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state || { name: '이민수', generation: 'Gen Z', contextStyle: 50, driverStyle: 50 };
  const scenario = config.scenario;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [isGeneratingSOS, setIsGeneratingSOS] = useState(false);
  const [sosTip, setSosTip] = useState<SOSTip | null>(null);
  const [sosTipHistory, setSosTipHistory] = useState<{ tip: SOSTip; turnIndex: number; timestamp: string }[]>([]);
  const [showBriefing, setShowBriefing] = useState(true);
  const [initError, setInitError] = useState(false);

  // Trust Level State Management
  const [trustState, setTrustState] = useState<{
    trust: number;
    dimensions: TrustLevelOutput['dimensions'];
    stage: 'S1' | 'S2' | 'S3' | 'S4';
    recentEvents: string[];
    lastEvents: TrustLevelOutput['events'];
    nextHint: string;
  }>({
    trust: 30,
    dimensions: {
      psychological_safety: 30,
      understanding_alignment: 30,
      autonomy_fairness: 30,
      integrity_consistency: 30,
      competence_support: 30
    },
    stage: 'S1',
    recentEvents: [],
    lastEvents: [],
    nextHint: "대화를 시작하여 팀원과의 신뢰를 쌓아보세요."
  });

  // Ref to track latest trustState for async callbacks (avoids stale closures)
  const trustStateRef = useRef(trustState);
  trustStateRef.current = trustState;

  const turnsSinceLastScore = useRef(0);
  const mountedRef = useRef(true);

  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  const emotionMachine = useRef(new EmotionStateMachine(30));

  // Cleanup on unmount
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // 캐릭터 정보 & 아바타
  const characterInfo = useMemo(() => getCharacterInfo(scenario?.id, config.name), [scenario, config.name]);
  const avatarUrl = useMemo(() => getCharacterAvatar(config.name, scenario?.id), [config.name, scenario]);
  const avatarGlow = useMemo(() => getAvatarGlowColor(trustState.trust), [trustState.trust]);
  const emotionEmoji = useMemo(() => getEmotionEmoji(trustState.trust), [trustState.trust]);

  // Derived State for Analysis Completion
  const isAnalysisComplete = useMemo(() => {
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    return userMsgCount >= ANALYSIS_COMPLETE_THRESHOLD;
  }, [messages]);

  // Background ambient effect based on Trust Level
  const ambientStyle = useMemo(() => {
    const intensity = Math.min(0.25, trustState.trust / 250);
    const color = trustState.trust > 70 ? '74, 222, 128' : '49, 130, 246';
    return {
      background: `radial-gradient(circle at 50% 120%, rgba(${color}, ${intensity}) 0%, transparent 60%)`
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
      }
    }).then(score => {
      if (score && mountedRef.current) {
        // 감정 상태 머신 업데이트
        const emotionUpdate = emotionMachine.current.update(score.trust);
        if (emotionUpdate.stateChanged) {
          console.log(`[Emotion] ${emotionUpdate.previousState} → ${emotionUpdate.newState}`);
        }

        setTrustState({
          trust: score.trust,
          dimensions: score.dimensions,
          stage: score.stage.level,
          recentEvents: score.recent_events_out,
          lastEvents: score.events,
          nextHint: score.next_hint
        });
      }
    }).catch(err => {
      console.error("Trust scoring failed:", err);
    });
  }, [messages, scenario, config.name, config.generation]);

  const handleSend = async (text: string, isSilent = false) => {
    if (!text.trim() || !chatRef.current) return;
    if (!isSilent && isLoading) return;

    if (!isSilent) {
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
      setMessages(prev => [...prev, {
        role: 'model',
        text: "시스템 연결이 원활하지 않습니다.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeChat = async () => {
    try {
      setInitError(false);

      const ai = createGeminiClient();
      const systemInstruction = buildSystemPrompt(config, scenario, trustStateRef.current);

      const openingUserText = `안녕하세요, ${config.name}님. 잠깐 이야기 좀 나눌까요?`;
      const openingModelText = getOpeningLine(scenario?.id, config.name);

      setMessages([
        { role: 'model', text: openingModelText, timestamp: new Date() }
      ]);

      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction, temperature: 0.8 },
        history: [
          { role: 'user', parts: [{ text: openingUserText }] },
          { role: 'model', parts: [{ text: openingModelText }] }
        ]
      });

    } catch (err) {
      setInitError(true);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeChat();
    }
  }, []);

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

      const prompt = `
        당신은 리더십 코치입니다. 현재 대화 상황을 분석하여 리더(User)에게 필요한 조언을 제공하세요.

        [대화 내용]
        ${JSON.stringify(messages.slice(-10))}

        [요청 사항]
        위 대화의 흐름, 상대방의 감정 상태, 리더의 대응 방식을 분석하여 다음 JSON 형식으로 응답하세요.
        한국어로 작성하세요.
      `;

      const response = await fetchWithRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insight: { type: Type.STRING, description: "현재 상황에 대한 핵심 통찰 (1문장)" },
              suggestion: { type: Type.STRING, description: "구체적인 행동/태도 가이드 (2문장)" },
              magicPhrases: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "상황을 타개할 수 있는 추천 발화 3가지"
              }
            },
            required: ['insight', 'suggestion', 'magicPhrases']
          }
        }
      }));

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response");

      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.insight && parsed.suggestion && Array.isArray(parsed.magicPhrases)) {
        setSosTip(parsed);
        // SOS 힌트 이력에 저장
        setSosTipHistory(prev => [...prev, {
          tip: parsed,
          turnIndex: messages.filter(m => m.role === 'user').length,
          timestamp: new Date().toISOString()
        }]);
      } else {
        throw new Error("Invalid response format");
      }

    } catch (error) {
      console.error("AI Coaching Error:", error);
      setSosTip(null);
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
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // 마지막 model 메시지인지 확인하는 헬퍼
  const isLastModelMessage = (idx: number) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model') return i === idx;
    }
    return false;
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 text-gray-900 font-manrope overflow-hidden relative transition-colors duration-1000">

      {/* Dynamic Ambient Background based on Trust */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 z-0"
        style={ambientStyle}
      ></div>

      <header className="flex items-center p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 z-30 shrink-0 gap-3 relative">
        <button onClick={() => navigate(-1)} className="p-2 text-primary active:scale-90 transition-transform">
          <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
        </button>
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1.5">
            {/* 헤더에 미니 아바타 표시 */}
            <div
              className="size-7 rounded-full overflow-hidden border-2 transition-all duration-500"
              style={{ borderColor: avatarGlow.color }}
            >
              <img src={avatarUrl} alt={config.name} className="size-full object-cover bg-navy-card" />
            </div>
            <h2 className="text-sm font-bold tracking-tight">{config.name}</h2>
            <span className="text-[9px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">{characterInfo.role}</span>
            <span className="text-[10px]">{emotionEmoji}</span>
          </div>

          {/* Prominent Trust Gauge */}
          <div className="w-full max-w-[220px]">
            <div className="flex justify-between items-end mb-1 px-1">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">handshake</span>
                Trust Level
              </span>
              <span className={`text-base font-black ${trustState.trust > 70 ? 'text-green-400' : 'text-primary'}`}>{trustState.trust}%</span>
            </div>
            <div className="h-2.5 bg-navy-deep rounded-full overflow-hidden border border-gray-200 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${trustState.trust > 70 ? 'bg-green-500 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(49,130,246,0.5)]'}`}
                style={{ width: `${trustState.trust}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={() => setShowBriefing(!showBriefing)}
            className={`mt-2 px-2.5 py-1 rounded-full flex items-center gap-1 border transition-all active:scale-95 ${showBriefing
                ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(49,130,246,0.15)]'
                : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
          >
            <span className="material-symbols-outlined text-[12px]">
              {showBriefing ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {showBriefing ? '미션 브리핑 접기' : '미션 브리핑 보기'}
            </span>
          </button>
        </div>

        <button
          onClick={() => navigate('/feedback', { state: { transcript: messages, scenario: config.scenario, sosTipHistory } })}
          className={`text-[9px] font-black px-3 py-2 rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${isAnalysisComplete
              ? 'bg-green-500 text-white border-green-500 animate-pulse shadow-[0_0_12px_rgba(74,222,128,0.4)]'
              : 'bg-primary/10 text-primary border-primary/20'
            }`}
        >
          {isAnalysisComplete && <span className="material-symbols-outlined text-[11px]">check</span>}
          {isAnalysisComplete ? '분석 완료' : '종료'}
        </button>
      </header>

      {showBriefing && (
        <div className="bg-white/90 backdrop-blur-md border-b border-primary/20 p-4 animate-in slide-in-from-top duration-300 shrink-0 z-20 max-h-[22vh] overflow-y-auto relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-1 rounded border border-primary/20">
              Strategic Mission Guide
            </span>
            <span className="text-[9px] font-bold text-gray-400 italic">Based on {missionBriefing.theory}</span>
          </div>

          <section className="mb-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">이상적 도달 상태</h3>
            <p className="text-[12px] text-gray-900 font-bold leading-relaxed italic">
              "{missionBriefing.idealState}"
            </p>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">수행 과제</h3>
            <div className="space-y-1.5">
              {missionBriefing.tasks.map((task, i) => (
                <div key={i} className="flex gap-2.5 items-start bg-gray-100 p-2 rounded-xl border border-gray-200">
                  <span className="material-symbols-outlined text-primary text-[14px] mt-0.5">check_circle</span>
                  <p className="text-[11px] text-gray-600 font-medium leading-relaxed">{task}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ========== 비주얼 노벨 스타일 대화 영역 ========== */}
      <div ref={scrollRef} className="p-4 space-y-5 flex-1 overflow-y-auto hide-scrollbar z-10 relative pb-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

            {/* ── AI (model) 메시지: 아바타 + 말풍선 ── */}
            {msg.role === 'model' ? (
              <div className="flex items-start gap-3 max-w-[92%] animate-speech-in">
                {/* 캐릭터 아바타 */}
                <div className={`shrink-0 flex flex-col items-center gap-1 ${isLastModelMessage(idx) ? 'animate-avatar-entrance' : ''}`}>
                  <div
                    className={`rounded-full overflow-hidden border-[2.5px] transition-all duration-700 ${isLastModelMessage(idx) ? 'size-16 animate-glow-pulse' : 'size-11'
                      }`}
                    style={{
                      borderColor: avatarGlow.color,
                      boxShadow: isLastModelMessage(idx) ? avatarGlow.shadow : 'none'
                    }}
                  >
                    <img
                      src={avatarUrl}
                      alt={characterInfo.name}
                      className="size-full object-cover bg-navy-card"
                    />
                  </div>
                  {/* 최신 메시지에만 이름표 표시 */}
                  {isLastModelMessage(idx) && (
                    <div className="flex flex-col items-center animate-in fade-in duration-500">
                      <span className="text-[10px] font-black text-gray-900 whitespace-nowrap">
                        {characterInfo.name}
                      </span>
                      <span className="text-[8px] font-bold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap">
                        {characterInfo.role}
                      </span>
                    </div>
                  )}
                </div>

                {/* 말풍선 */}
                <div className="relative speech-tail-left">
                  <div className={`p-4 rounded-2xl rounded-tl-md shadow-card bg-gray-100 border transition-all duration-500 ${isLastModelMessage(idx)
                      ? 'border-gray-200 shadow-card-hover'
                      : 'border-gray-200'
                    }`}>
                    <p className={`leading-relaxed whitespace-pre-wrap ${isLastModelMessage(idx) ? 'text-[14px] text-gray-700' : 'text-[13px] text-gray-600'
                      }`}>{msg.text}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* ── 유저 메시지 ── */
              <div className="max-w-[80%] animate-speech-in-right">
                <div className="relative speech-tail-right">
                  <div className="p-4 rounded-2xl rounded-tr-md shadow-card bg-primary border border-primary text-white">
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-1 mr-1">
                  <span className="text-[9px] text-gray-400 font-medium">
                    팀장 (나)
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 로딩 인디케이터 - 아바타 + 타이핑 */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-speech-in">
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div
                className="size-14 rounded-full overflow-hidden border-[2.5px] animate-wiggle"
                style={{ borderColor: avatarGlow.color, boxShadow: avatarGlow.shadow }}
              >
                <img src={avatarUrl} alt={characterInfo.name} className="size-full object-cover bg-navy-card" />
              </div>
              <span className="text-[10px] font-black text-gray-900">{characterInfo.name}</span>
            </div>
            <div className="bg-white/95 p-4 rounded-2xl rounded-tl-md border border-gray-200 flex gap-1.5 backdrop-blur-sm items-center relative speech-tail-left">
              <div className="size-2 bg-primary rounded-full animate-bounce"></div>
              <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:0.15s]"></div>
              <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:0.3s]"></div>
              <span className="text-[10px] text-gray-400 ml-2 font-medium">입력 중...</span>
            </div>
          </div>
        )}

        {/* Trust Hint Block */}
        {trustState.nextHint && (
          <div className="flex justify-center my-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-accent-neon/5 border border-accent-neon/20 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-neon text-xs animate-pulse">lightbulb</span>
              <span className="text-[10px] font-bold text-gray-600">{trustState.nextHint}</span>
            </div>
          </div>
        )}
      </div>

      {/* ========== 입력 영역 ========== */}
      <div className="p-4 bg-gray-50/95 border-t border-gray-200 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0 z-30">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <button onClick={handleSOS} className="flex flex-col items-center justify-center gap-1 shrink-0">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/40 flex items-center justify-center active:scale-95 shadow-[0_0_15px_rgba(49,130,246,0.1)]">
              <span className="material-symbols-outlined font-black">auto_fix_high</span>
            </div>
            <span className="text-[8px] font-black text-primary uppercase">AI 코칭</span>
          </button>

          <div className="relative flex-1 flex items-end bg-navy-card border border-gray-200 rounded-2xl p-1 focus-within:border-primary/50 transition-colors shadow-lg">
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full bg-transparent border-none px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none resize-none hide-scrollbar max-h-[120px]"
              placeholder="메시지를 입력하세요..."
              value={inputText}
              disabled={isLoading}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(inputText))}
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="mb-1 size-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-neon-cyan active:scale-90 transition-all disabled:opacity-20"
            >
              <span className="material-symbols-outlined text-sm font-black">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========== SOS AI 코칭 모달 ========== */}
      {showSOS && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-md flex items-end" onClick={() => setShowSOS(false)}>
          <div className="w-full bg-navy-card rounded-t-[2.5rem] p-6 max-h-[90%] overflow-y-auto animate-in slide-in-from-bottom-20 border-t border-gray-200 shadow-card" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-100 rounded-full mb-8 mx-auto"></div>
            {isGeneratingSOS ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="size-12 border-3 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-gray-500">전략을 분석 중입니다</p>
              </div>
            ) : sosTip ? (
              <div className="w-full max-w-lg mx-auto space-y-6 pb-10">
                <div className="text-center">
                  <h3 className="text-lg font-black text-gray-900 italic">AI COACHING BRIEF</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-100 p-5 rounded-2xl border border-gray-200">
                    <p className="text-sm font-bold text-gray-700 leading-relaxed text-center">"{sosTip.insight}"</p>
                  </div>
                  <div className="bg-accent-neon/5 p-5 rounded-2xl border border-accent-neon/20">
                    <p className="text-[13px] text-gray-600 leading-relaxed">{sosTip.suggestion}</p>
                  </div>
                  <div className="space-y-2">
                    {sosTip.magicPhrases.map((phrase, idx) => (
                      <button key={idx} onClick={() => { setShowSOS(false); handleSend(phrase); }} className="w-full text-left bg-gray-100 border border-gray-200 p-4 rounded-xl flex gap-3 items-center active:bg-primary/10">
                        <span className="material-symbols-outlined text-primary text-sm font-black">chat_bubble</span>
                        <p className="text-[12px] font-bold text-gray-900 flex-1">{phrase}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400">
                <p className="mb-2">AI가 대화를 분석하지 못했습니다.</p>
                <button onClick={() => setShowSOS(false)} className="text-primary text-xs underline">닫기</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulation;
