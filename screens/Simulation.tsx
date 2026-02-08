
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { TrustLevelService, TrustLevelOutput } from '../services/trustLevelService';

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

  const turnsSinceLastScore = useRef(0);

  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  // Derived State for Analysis Completion (approx. 7 user turns)
  const isAnalysisComplete = useMemo(() => {
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    return userMsgCount >= 7;
  }, [messages]);

  // Background ambient effect based on Trust Level
  const ambientStyle = useMemo(() => {
    const intensity = Math.min(0.25, trustState.trust / 250); // Max opacity 0.25
    const color = trustState.trust > 70 ? '74, 222, 128' : '0, 242, 255'; // Green vs Cyan
    return {
      background: `radial-gradient(circle at 50% 120%, rgba(${color}, ${intensity}) 0%, transparent 60%)`
    };
  }, [trustState.trust]);

  // 리더십 이론에 근거한 전략적 미션 브리핑 도출
  const missionBriefing = useMemo(() => {
    const id = scenario?.id;
    const briefings: Record<string, { theory: string, idealState: string, tasks: string[] }> = {
      'late-comer': {
        theory: "SBI 피드백 모델",
        idealState: "팀원이 지각이 팀 동료들에게 미치는 실질적 영향(Impact)을 인지하고, 자발적인 시간 관리 대안을 제시한 상태",
        tasks: [
          "비난 대신 '관찰된 행동(B)'과 그로 인한 '팀의 비용(I)'을 명확히 전달하세요.",
          "팀원이 자신의 근태가 동료의 심리적 안전감에 주는 영향을 스스로 말하게 유도하세요.",
          "강압적 지시가 아닌, 팀원 스스로 지킬 수 있는 '첫 단추 규칙'을 합의하세요."
        ]
      },
      'low-motivation': {
        theory: "자기결정성 이론 (SDT)",
        idealState: "팀원이 업무의 의미(Meaning)를 재발견하고, 스스로 결정할 수 있는 업무 범위(Autonomy)를 확인하여 활력을 되찾은 상태",
        tasks: [
          "최근 팀원이 느꼈을 고립감이나 무력감에 대해 정서적 공감을 먼저 표현하세요.",
          "팀원이 가장 유능감을 느꼈던 과거의 프로젝트 기여를 환기시키세요.",
          "팀원에게 현재 업무 중 '스스로 주도권을 가질 수 있는 부분'을 선택하게 하세요."
        ]
      },
      'team-clash': {
        theory: "LMX (리더-구성원 교환) 관계 이론",
        idealState: "시니어 팀원이 리더의 전문성을 인정하고, 자신의 노하우를 팀의 자산으로 공유하기로 약속한 '동반자적 관계'로의 전환",
        tasks: [
          "시니어의 과거 경험을 '존중받아야 할 가치'로 명명하며 심리적 장벽을 낮추세요.",
          "리더로서의 의사결정 권한과 시니어로서의 자문 역할을 정중히 구분하세요.",
          "팀 전체의 이익을 위해 시니어가 맡아줄 수 있는 '특별 고문' 역할을 제안하세요."
        ]
      },
      'feedback-defense': {
        theory: "심리적 안전감 프레임워크",
        idealState: "팀원이 피드백을 '공격'이 아닌 '성장 데이터'로 수용하고, 방어 대신 구체적인 지원 요청을 하게 된 상태",
        tasks: [
          "리더 또한 완벽하지 않음을 공유하여(Vulnerability) 대화의 안전감을 확보하세요.",
          "팀원의 방어 뒤에 숨은 '인정 욕구'나 '실패에 대한 공포'를 먼저 짚어주세요.",
          "오류 해결을 위해 리더가 제거해줄 수 있는 장애물을 구체적으로 물어보세요."
        ]
      }
    };

    return briefings[id] || {
      theory: "상황 대응 리더십",
      idealState: "팀원의 현재 역량과 의지에 맞는 리더십 스타일이 적용되어, 목표에 대한 상호 합의가 이루어진 상태",
      tasks: [
        "팀원의 현 상태를 진단하고 지시/코칭/지원/위임 중 가장 적절한 태도를 취하세요.",
        "리더의 기대치(Expectation)를 구체적인 행동 언어로 전달하세요.",
        "정기적인 피드백 루프를 만들기로 합의하여 지속적인 관심을 약속하세요."
      ]
    };
  }, [scenario]);

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
      
      setMessages(prev => {
        const newMessages = [...prev, { role: 'model', text: responseText, timestamp: new Date() } as Message];
        
        // Trigger Trust Scoring Logic after model response
        if (!isSilent) {
            turnsSinceLastScore.current += 1;
            if (turnsSinceLastScore.current >= 3) {
                // Call Scoring API
                const transcriptSlice = newMessages.slice(-10).map((m, idx) => ({
                    turn_id: idx + 1,
                    speaker: m.role === 'model' ? 'other' as const : 'user' as const,
                    text: m.text
                }));

                TrustLevelService.scoreTrustLevel({
                    mode: 'chat',
                    transcript: transcriptSlice,
                    state: {
                        prev_trust: trustState.trust,
                        prev_dimensions: trustState.dimensions,
                        prev_stage: trustState.stage,
                        recent_events: trustState.recentEvents,
                        is_new_session: false,
                        optional_context: `상황: ${scenario?.title}, 팀원: ${config.name}(${config.generation})`
                    }
                }).then(score => {
                    if (score) {
                        setTrustState({
                            trust: score.trust,
                            dimensions: score.dimensions,
                            stage: score.stage.level,
                            recentEvents: score.recent_events_out,
                            lastEvents: score.events,
                            nextHint: score.next_hint
                        });
                        turnsSinceLastScore.current = 0;
                    }
                });
            }
        }
        return newMessages;
      });

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
      setIsLoading(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `
        당신은 팀원 '${config.name}'입니다. 상황: ${scenario?.title}. 페르소나: ${scenario?.description}. 1~2문장으로 짧게 대답하세요.
      `;
      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction, temperature: 0.8 },
      });
      await handleSend(`안녕하세요, ${config.name}님. 잠깐 이야기 좀 나눌까요?`, true);
    } catch (err) {
      setInitError(true);
    } finally {
      setIsLoading(false);
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
    if (messages.length < 3) {
        setSosTip(null);
        return;
    }
    setIsGeneratingSOS(true);
    setSosTip(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `현재 대화를 분석하여 코칭 전략을 JSON으로 응답하세요: ${JSON.stringify(messages.slice(-6))}`;
      const response = await fetchWithRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      }));
      const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      setSosTip(JSON.parse(cleanJson));
    } catch (error) {
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
                <div className="py-20 text-center text-slate-500">대화 데이터가 부족합니다.</div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulation;
