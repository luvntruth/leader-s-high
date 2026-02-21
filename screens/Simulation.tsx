
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

  const isLastModelMessage = (idx: number) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model') return i === idx;
    }
    return false;
  };

  // Derived State for Analysis Completion
  const isAnalysisComplete = useMemo(() => {
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    return userMsgCount >= ANALYSIS_COMPLETE_THRESHOLD;
  }, [messages]);

  // Background ambient effect based on Trust Level
  const ambientStyle = useMemo(() => {
    const intensity = Math.min(0.25, trustState.trust / 250);
    const color = trustState.trust > 70 ? '74, 222, 128' : '0, 242, 255';
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

  // HP 바 색상 (Trust Level → 게임 HP 컬러)
  const hpColor = trustState.trust > 70 ? '#4ade80' : trustState.trust > 40 ? '#00F2FF' : trustState.trust > 20 ? '#f97316' : '#ef4444';
  const emotionLabel = trustState.trust <= 20 ? '강한 반발' : trustState.trust <= 40 ? '경계 중' : trustState.trust <= 55 ? '유보적' : trustState.trust <= 70 ? '수용 중' : trustState.trust <= 85 ? '열린 대화' : '설득 완료';

  return (
    <div className="h-[100dvh] flex flex-col bg-navy-deep text-white font-manrope overflow-hidden relative">

      {/* ── 사무실 배경 그라디언트 ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #060B18 0%, #0a1020 40%, #060B18 100%)' }} />
        {/* 미세 그리드 패턴 */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(rgba(0,242,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />
        {/* 신뢰도 기반 Ambient glow */}
        <div className="absolute inset-0 transition-all duration-1000" style={ambientStyle} />
      </div>

      {/* ── 게임 헤더 ── */}
      <header className="flex items-center px-4 py-3 bg-navy-deep/90 backdrop-blur-xl border-b border-white/8 z-30 shrink-0 gap-3 relative">
        {/* 뒤로가기 */}
        <button onClick={() => navigate(-1)} className="p-2 text-primary/70 hover:text-primary active:scale-90 transition-all">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>

        {/* 캐릭터 네임플레이트 + HP 바 */}
        <div className="flex-1 min-w-0">
          {/* 상단: 이름 + 감정 상태 */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="size-7 rounded-full overflow-hidden border-2 transition-all duration-500 shrink-0"
              style={{ borderColor: avatarGlow.color, boxShadow: `0 0 8px ${avatarGlow.color}60` }}>
              <img src={avatarUrl} alt={config.name} className="size-full object-cover" />
            </div>
            <span className="text-sm font-black tracking-tight truncate">{config.name}</span>
            <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded text-slate-400 uppercase shrink-0">{characterInfo.role}</span>
            <span className="text-[11px] shrink-0">{emotionEmoji}</span>
            {/* 감정 상태 레이블 */}
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 transition-all duration-700"
              style={{ color: hpColor, borderColor: `${hpColor}50`, background: `${hpColor}15` }}>
              {emotionLabel}
            </span>
          </div>

          {/* HP 바 스타일 Trust Gauge */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[13px] shrink-0" style={{ color: hpColor }}>favorite</span>
            <div className="flex-1 h-2.5 bg-navy-mid rounded-full overflow-hidden border border-white/10">
              <div className="h-full rounded-full transition-all duration-1000 hp-bar-glow"
                style={{ width: `${trustState.trust}%`, backgroundColor: hpColor, color: hpColor, boxShadow: `0 0 10px ${hpColor}` }} />
            </div>
            <span className="text-[11px] font-black tabular-nums shrink-0" style={{ color: hpColor }}>{trustState.trust}</span>
          </div>
        </div>

        {/* 우측 버튼들 */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowBriefing(!showBriefing)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 border text-[9px] font-bold uppercase tracking-widest transition-all ${
              showBriefing ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-[12px]">menu_book</span>
            브리핑
          </button>
          <button
            onClick={() => navigate('/feedback', { state: { transcript: messages, scenario: config.scenario, sosTipHistory } })}
            className={`text-[9px] font-black px-3 py-2 rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${
              isAnalysisComplete
                ? 'bg-green-500 text-black border-green-400 animate-pulse shadow-neon-green'
                : 'bg-primary/10 text-primary border-primary/20'
            }`}
          >
            {isAnalysisComplete && <span className="material-symbols-outlined text-[11px]">check</span>}
            {isAnalysisComplete ? '분석 완료' : '종료'}
          </button>
        </div>
      </header>

      {/* ── 미션 브리핑 패널 ── */}
      {showBriefing && (
        <div className="bg-navy-card/95 backdrop-blur-md border-b border-primary/20 p-4 animate-in slide-in-from-top duration-300 shrink-0 z-20 max-h-[30vh] overflow-y-auto hide-scrollbar relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] bg-primary/10 px-2 py-1 rounded border border-primary/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">military_tech</span>
              Mission Brief
            </span>
            <span className="text-[9px] font-bold text-slate-500 italic">Theory: {missionBriefing.theory}</span>
          </div>
          <p className="text-[12px] text-white/90 font-bold leading-relaxed italic mb-3">
            "{missionBriefing.idealState}"
          </p>
          <div className="space-y-1.5">
            {missionBriefing.tasks.map((task, i) => (
              <div key={i} className="flex gap-2 items-start bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="material-symbols-outlined text-primary text-[13px] mt-0.5 shrink-0">check_circle</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">{task}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 비주얼 노벨 채팅 영역 ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar z-10 relative">
        <div className="p-4 space-y-5 pb-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

              {/* ── AI (팀원) 메시지 ── */}
              {msg.role === 'model' ? (
                <div className="flex items-end gap-3 max-w-[90%] animate-speech-in">
                  {/* 캐릭터 아바타 */}
                  <div className={`shrink-0 flex flex-col items-center gap-1 ${isLastModelMessage(idx) ? 'animate-avatar-entrance' : ''}`}>
                    <div className={`rounded-full overflow-hidden border-[3px] transition-all duration-700 ${isLastModelMessage(idx) ? 'size-16 animate-glow-pulse' : 'size-11'}`}
                      style={{ borderColor: avatarGlow.color, boxShadow: isLastModelMessage(idx) ? avatarGlow.shadow : 'none' }}>
                      <img src={avatarUrl} alt={characterInfo.name} className="size-full object-cover bg-navy-card" />
                    </div>
                    {isLastModelMessage(idx) && (
                      <div className="text-center animate-in fade-in duration-500">
                        <p className="text-[10px] font-black text-white whitespace-nowrap">{characterInfo.name}</p>
                        <p className="text-[8px] font-bold whitespace-nowrap" style={{ color: hpColor }}>{characterInfo.role}</p>
                      </div>
                    )}
                  </div>

                  {/* 비주얼 노벨 말풍선 */}
                  <div className="relative speech-tail-left">
                    <div className={`p-4 rounded-2xl rounded-bl-none backdrop-blur-sm border transition-all duration-500 ${
                      isLastModelMessage(idx)
                        ? 'bg-navy-mid/95 border-white/15 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
                        : 'bg-navy-card/80 border-white/8'
                    }`}>
                      {isLastModelMessage(idx) && (
                        <p className="text-[9px] font-black mb-2 tracking-widest uppercase" style={{ color: hpColor }}>
                          {characterInfo.name} · {emotionLabel}
                        </p>
                      )}
                      <p className={`leading-relaxed whitespace-pre-wrap ${isLastModelMessage(idx) ? 'text-[14px] text-white' : 'text-[13px] text-slate-300'}`}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── 유저 (팀장) 메시지 ── */
                <div className="max-w-[78%] animate-speech-in-right">
                  <div className="relative speech-tail-right">
                    <div className="p-4 rounded-2xl rounded-br-none bg-primary/20 border border-primary/40 shadow-[0_4px_20px_rgba(0,242,255,0.1)]">
                      <p className="text-[9px] font-black text-primary/70 mb-1.5 uppercase tracking-widest">팀장 (나)</p>
                      <p className="text-[14px] text-white leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 로딩 인디케이터 */}
          {isLoading && (
            <div className="flex items-end gap-3 animate-speech-in">
              <div className="size-11 rounded-full overflow-hidden border-[3px] animate-wiggle shrink-0"
                style={{ borderColor: avatarGlow.color, boxShadow: avatarGlow.shadow }}>
                <img src={avatarUrl} alt={characterInfo.name} className="size-full object-cover bg-navy-card" />
              </div>
              <div className="bg-navy-card/90 p-4 rounded-2xl rounded-bl-none border border-white/10 flex gap-2 items-center speech-tail-left">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                ))}
                <span className="text-[10px] text-slate-500 ml-1">생각 중...</span>
              </div>
            </div>
          )}

          {/* Trust 힌트 */}
          {trustState.nextHint && messages.length > 0 && (
            <div className="flex justify-center animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-accent-neon/5 border border-accent-neon/20 rounded-full px-4 py-1.5 flex items-center gap-2 max-w-[90%]">
                <span className="material-symbols-outlined text-accent-neon text-xs animate-pulse shrink-0">lightbulb</span>
                <span className="text-[10px] font-bold text-slate-300">{trustState.nextHint}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 입력 영역 ── */}
      <div className="px-4 py-3 bg-navy-deep/95 border-t border-white/8 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shrink-0 z-30">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {/* AI 코칭 버튼 */}
          <button onClick={handleSOS} className="flex flex-col items-center gap-0.5 shrink-0 active:scale-90 transition-all">
            <div className="size-11 rounded-2xl bg-primary/10 text-primary border border-primary/30 flex items-center justify-center pulse-cyan">
              <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
            </div>
            <span className="text-[7px] font-black text-primary uppercase tracking-wide">코칭</span>
          </button>

          {/* 텍스트 입력 */}
          <div className="relative flex-1 flex items-end bg-navy-mid border border-white/10 rounded-2xl p-1 focus-within:border-primary/50 transition-colors shadow-card">
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full bg-transparent border-none px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none resize-none hide-scrollbar max-h-[100px] leading-relaxed"
              placeholder="팀원에게 말하세요..."
              value={inputText}
              disabled={isLoading}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(inputText))}
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="mb-0.5 size-9 bg-primary rounded-xl flex items-center justify-center shadow-neon-cyan active:scale-90 transition-all disabled:opacity-20 shrink-0"
            >
              <span className="material-symbols-outlined text-navy-deep text-sm font-black">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SOS AI 코칭 모달 ── */}
      {showSOS && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end" onClick={() => setShowSOS(false)}>
          <div
            className="w-full bg-navy-card rounded-t-[2rem] p-6 max-h-[88vh] overflow-y-auto hide-scrollbar animate-in slide-in-from-bottom-20 border-t border-primary/20 shadow-[0_-8px_40px_rgba(0,242,255,0.1)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/15 rounded-full mb-6 mx-auto" />

            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-5">
              <div className="size-8 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                <span className="material-symbols-outlined text-primary text-[16px]">auto_fix_high</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">AI 코칭 브리프</h3>
                <p className="text-[9px] text-primary/70 font-bold uppercase tracking-widest">Strategic Coaching Session</p>
              </div>
            </div>

            {isGeneratingSOS ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="size-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-sm font-bold text-slate-400">전략을 분석 중입니다...</p>
              </div>
            ) : sosTip ? (
              <div className="w-full max-w-lg mx-auto space-y-4 pb-8">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/8">
                  <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest mb-2">상황 인사이트</p>
                  <p className="text-sm font-bold text-white leading-relaxed">"{sosTip.insight}"</p>
                </div>
                <div className="bg-accent-neon/5 p-5 rounded-2xl border border-accent-neon/20">
                  <p className="text-[10px] font-black text-accent-neon/70 uppercase tracking-widest mb-2">추천 전략</p>
                  <p className="text-[13px] text-slate-200 leading-relaxed">{sosTip.suggestion}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">즉시 사용 가능한 대화 스크립트</p>
                  <div className="space-y-2">
                    {sosTip.magicPhrases.map((phrase, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setShowSOS(false); handleSend(phrase); }}
                        className="w-full text-left bg-white/5 hover:bg-primary/10 border border-white/8 hover:border-primary/30 p-4 rounded-xl flex gap-3 items-start active:scale-[0.98] transition-all"
                      >
                        <span className="material-symbols-outlined text-primary text-sm font-black shrink-0 mt-0.5">chat_bubble</span>
                        <p className="text-[13px] font-bold text-white flex-1 leading-relaxed">{phrase}</p>
                        <span className="material-symbols-outlined text-slate-600 text-xs shrink-0 mt-0.5">send</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-3 block">sentiment_dissatisfied</span>
                <p className="text-sm mb-3">분석할 대화가 부족합니다.</p>
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
