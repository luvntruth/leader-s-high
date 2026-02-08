
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { TrustLevelService, TrustLevelOutput } from '../services/trustLevelService';
import { getMissionBriefing, getOpeningLine } from '../services/missionBriefings';

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

  // Cleanup on unmount
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

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
      const response = await fetchWithRetry(() => chatRef.current!.sendMessage({ message: text }));
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

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `
        당신은 팀원 '${config.name}'입니다. 상황: ${scenario?.title}. 페르소나: ${scenario?.description}. 1~2문장으로 짧게 대답하세요.
      `;

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0A0F1D] text-white font-manrope overflow-hidden relative transition-colors duration-1000">

      {/* Dynamic Ambient Background based on Trust */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 z-0"
        style={ambientStyle}
      ></div>

      <header className="flex items-center p-5 bg-[#0A0F1D]/80 backdrop-blur-xl border-b border-white/5 z-30 shrink-0 gap-4 relative">
        <button onClick={() => navigate(-1)} className="p-2 text-primary active:scale-90 transition-transform">
          <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
        </button>
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold tracking-tight">{config.name}</h2>
            <span className="text-[10px] text-slate-500 font-medium bg-white/5 px-2 py-0.5 rounded uppercase">{config.generation}</span>
          </div>

          {/* Prominent Trust Gauge */}
          <div className="w-full max-w-[240px]">
             <div className="flex justify-between items-end mb-1 px-1">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                     <span className="material-symbols-outlined text-sm">handshake</span>
                     Trust Level
                 </span>
                 <span className={`text-lg font-black ${trustState.trust > 70 ? 'text-green-400' : 'text-primary'}`}>{trustState.trust}%</span>
             </div>
             <div className="h-3 bg-navy-deep rounded-full overflow-hidden border border-white/10 shadow-inner">
                 <div
                    className={`h-full rounded-full transition-all duration-1000 ${trustState.trust > 70 ? 'bg-green-400 shadow-[0_0_15px_#4ade80]' : 'bg-primary shadow-[0_0_15px_#00F2FF]'}`}
                    style={{ width: `${trustState.trust}%` }}
                 ></div>
             </div>
          </div>

          <button
            onClick={() => setShowBriefing(!showBriefing)}
            className={`mt-3 px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition-all active:scale-95 ${
              showBriefing
                ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(0,242,255,0.2)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
             <span className="material-symbols-outlined text-[14px]">
               {showBriefing ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
             </span>
             <span className="text-[10px] font-bold uppercase tracking-widest">
               {showBriefing ? '미션 브리핑 접기' : '미션 브리핑 보기'}
             </span>
          </button>
        </div>

        <button
          onClick={() => navigate('/feedback', { state: { transcript: messages, scenario: config.scenario } })}
          className={`text-[10px] font-black px-4 py-2.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${
              isAnalysisComplete
              ? 'bg-green-500 text-navy-deep border-green-500 animate-pulse shadow-[0_0_15px_#4ade80]'
              : 'bg-primary/10 text-primary border-primary/20'
          }`}
        >
          {isAnalysisComplete && <span className="material-symbols-outlined text-[12px]">check</span>}
          {isAnalysisComplete ? '분석 완료' : '종료'}
        </button>
      </header>

      {showBriefing && (
        <div className="bg-navy-card/80 backdrop-blur-md border-b border-primary/20 p-4 animate-in slide-in-from-top duration-300 shrink-0 z-20 max-h-[25vh] overflow-y-auto relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-1 rounded border border-primary/20">
                Strategic Mission Guide
              </span>
              <span className="text-[9px] font-bold text-slate-500 italic">Based on {missionBriefing.theory}</span>
            </div>

            <section className="mb-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">이상적 도달 상태</h3>
              <p className="text-[12px] text-white font-bold leading-relaxed italic">
                "{missionBriefing.idealState}"
              </p>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">수행 과제</h3>
              <div className="space-y-1.5">
                {missionBriefing.tasks.map((task, i) => (
                  <div key={i} className="flex gap-2.5 items-start bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-primary text-[14px] mt-0.5">check_circle</span>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{task}</p>
                  </div>
                ))}
              </div>
            </section>
        </div>
      )}

      <div ref={scrollRef} className="p-5 space-y-6 flex-1 overflow-y-auto hide-scrollbar z-10 relative pb-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-[1.5rem] shadow-xl backdrop-blur-sm ${
              msg.role === 'user'
                ? 'bg-[#161D2F]/90 border border-primary/30 text-white rounded-tr-none shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                : 'bg-navy-card/90 border border-white/10 text-slate-200 rounded-tl-none shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
            }`}>
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-navy-card/80 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1 backdrop-blur-sm">
              <div className="size-1.5 bg-primary rounded-full animate-bounce"></div>
              <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
            </div>
          </div>
        )}

        {/* Trust Hint Block */}
        {trustState.nextHint && (
          <div className="flex justify-center my-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-accent-neon/5 border border-accent-neon/20 rounded-full px-4 py-1.5 flex items-center gap-2">
               <span className="material-symbols-outlined text-accent-neon text-xs animate-pulse">lightbulb</span>
               <span className="text-[10px] font-bold text-slate-300">{trustState.nextHint}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-[#0A0F1D]/95 border-t border-white/5 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0 z-30">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <button onClick={handleSOS} className="flex flex-col items-center justify-center gap-1 shrink-0">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/40 flex items-center justify-center active:scale-95 shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                <span className="material-symbols-outlined font-black">auto_fix_high</span>
            </div>
            <span className="text-[8px] font-black text-primary uppercase">AI 코칭</span>
          </button>

          <div className="relative flex-1 flex items-end bg-navy-card border border-white/10 rounded-2xl p-1 focus-within:border-primary/50 transition-colors shadow-lg">
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full bg-transparent border-none px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none resize-none hide-scrollbar max-h-[120px]"
              placeholder="메시지를 입력하세요..."
              value={inputText}
              disabled={isLoading}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(inputText))}
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="mb-1 size-10 bg-primary text-navy-deep rounded-xl flex items-center justify-center shadow-neon-cyan active:scale-90 transition-all disabled:opacity-20"
            >
              <span className="material-symbols-outlined text-sm font-black">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>

      {showSOS && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end" onClick={() => setShowSOS(false)}>
          <div className="w-full bg-navy-card rounded-t-[2.5rem] p-6 max-h-[90%] overflow-y-auto animate-in slide-in-from-bottom-20 border-t border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="w-10 h-1 bg-white/10 rounded-full mb-8 mx-auto"></div>
             {isGeneratingSOS ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4">
                 <div className="size-12 border-3 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                 <p className="text-sm font-bold text-slate-400">전략을 분석 중입니다</p>
               </div>
             ) : sosTip ? (
               <div className="w-full max-w-lg mx-auto space-y-6 pb-10">
                  <div className="text-center">
                    <h3 className="text-lg font-black text-white italic">AI COACHING BRIEF</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                        <p className="text-sm font-bold text-slate-100 leading-relaxed text-center">"{sosTip.insight}"</p>
                    </div>
                    <div className="bg-accent-neon/5 p-5 rounded-2xl border border-accent-neon/20">
                        <p className="text-[13px] text-slate-200 leading-relaxed">{sosTip.suggestion}</p>
                    </div>
                    <div className="space-y-2">
                        {sosTip.magicPhrases.map((phrase, idx) => (
                          <button key={idx} onClick={() => { setShowSOS(false); handleSend(phrase); }} className="w-full text-left bg-white/5 border border-white/10 p-4 rounded-xl flex gap-3 items-center active:bg-primary/10">
                            <span className="material-symbols-outlined text-primary text-sm font-black">chat_bubble</span>
                            <p className="text-[12px] font-bold text-white flex-1">{phrase}</p>
                          </button>
                        ))}
                    </div>
                  </div>
               </div>
             ) : (
                <div className="py-20 text-center text-slate-500">
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
