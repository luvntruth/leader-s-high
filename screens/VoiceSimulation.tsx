
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { GeminiLiveService, LiveHandlers } from '../services/geminiLiveService';
import { TranscriptionItem } from '../types';
import { TrustLevelService, TrustLevelOutput } from '../services/trustLevelService';

const VoiceSimulation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state || { name: '이민수', generation: 'Gen Z', contextStyle: 50, driverStyle: 50 };
  const scenario = config.scenario;
  
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed'>('idle');
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);
  
  // New States for Visual Feedback with Trust Scoring
  const [trustState, setTrustState] = useState<{
    trust: number;
    dimensions: TrustLevelOutput['dimensions'];
    stage: 'S1' | 'S2' | 'S3' | 'S4';
    recentEvents: string[];
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
    nextHint: ""
  });
  
  const lastAnalyzedIndex = useRef(0);
  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcriptions, trustState.nextHint]);

  // Derived State for Analysis Completion (approx. 12 turns for voice)
  const isAnalysisComplete = useMemo(() => {
    return transcriptions.length >= 12;
  }, [transcriptions]);

  // Update Visual Metrics based on conversation
  useEffect(() => {
    if (transcriptions.length > 0) {
      // Trust Level Scoring Logic
      const newItemsCount = transcriptions.length - lastAnalyzedIndex.current;
      
      if (newItemsCount >= 4) { // Analyze every ~2 turns
         lastAnalyzedIndex.current = transcriptions.length;
         
         const transcriptSlice = transcriptions.slice(-10).map((t, idx) => ({
             turn_id: idx + 1,
             speaker: t.role === 'model' ? 'other' as const : 'user' as const,
             text: t.text
         }));

         TrustLevelService.scoreTrustLevel({
            mode: 'voice',
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
                setTrustState(prev => ({
                    trust: score.trust,
                    dimensions: score.dimensions,
                    stage: score.stage.level,
                    recentEvents: score.recent_events_out,
                    nextHint: score.next_hint
                }));
            }
         });
      }
    }
  }, [transcriptions]);

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

  const startSimulation = useCallback(async () => {
    if (status === 'connecting' || status === 'open') return;
    setError(null);
    setStatus('connecting');

    try {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        if (!await window.aistudio.hasSelectedApiKey()) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
        }
      }
    } catch (e) { console.warn('Key selection skipped'); }
    
    if (!liveServiceRef.current) liveServiceRef.current = new GeminiLiveService();

    const systemInstruction = `
      당신은 한국 리더십 시뮬레이션의 팀원 '${config.name}'입니다. 
      상황: ${scenario?.title}
      페르소나: ${scenario?.description}
      [음성 인터랙션 가이드]
      - 한국어 구어체를 사용하며, 대화는 1~2문장으로 짧게 하세요.
      - 리더의 전략적 접근(Task 수행)이 느껴지면 조금씩 긍정적으로 반응하세요.
    `;

    const handlers: LiveHandlers = {
      onStatusChange: (s) => setStatus(s),
      onTranscription: (role, text) => {
        setTranscriptions(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === role) {
            const updated = [...prev];
            updated[updated.length - 1] = { role, text };
            return updated;
          }
          return [...prev, { role, text }];
        });
      },
      onError: (err) => {
        setError('연결 오류가 발생했습니다.');
        setStatus('idle');
      },
      onClose: () => setStatus('closed'),
    };

    try {
      await liveServiceRef.current.connect(systemInstruction, handlers);
    } catch (err) { setStatus('idle'); }
  }, [config, status, scenario]);

  const saveHistoryAndFinish = () => {
    if (transcriptions.length > 0) {
      const historyItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        scenarioTitle: scenario?.title || '음성 훈련',
        memberName: config.name,
        type: 'voice',
        transcript: transcriptions,
        scenario: scenario
      };
      const existing = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
      localStorage.setItem('leadershigh_history', JSON.stringify([historyItem, ...existing]));
      navigate('/feedback', { state: { transcript: transcriptions, scenario: scenario } });
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    return () => { if (liveServiceRef.current) liveServiceRef.current.disconnect(); };
  }, []);

  return (
    <div className="max-w-md mx-auto h-screen bg-[#0A0F1D] text-white flex flex-col font-manrope overflow-hidden relative">
      <header className="p-5 flex items-center justify-between border-b border-white/5 bg-[#0A0F1D]/80 backdrop-blur-md z-30">
        <button onClick={() => navigate(-1)} className="p-2 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex-1 flex flex-col items-center mx-4">
          <div className="text-center mb-2">
            <h1 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{config.name} • Live</h1>
          </div>
          
          {/* Prominent Trust Gauge */}
          <div className="w-full max-w-[200px]">
             <div className="flex justify-between items-end mb-1 px-1">
                 <span className={`text-[10px] font-bold uppercase tracking-widest ${trustState.trust > 70 ? 'text-green-400' : 'text-primary'}`}>Trust Level</span>
                 <span className={`text-base font-black ${trustState.trust > 70 ? 'text-green-400' : 'text-primary'}`}>{trustState.trust}%</span>
             </div>
             <div className="h-2.5 bg-navy-deep rounded-full overflow-hidden border border-white/10 shadow-inner">
                 <div 
                    className={`h-full rounded-full transition-all duration-1000 ${trustState.trust > 70 ? 'bg-green-400 shadow-[0_0_12px_#4ade80]' : 'bg-primary shadow-[0_0_12px_#00F2FF]'}`}
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
        <div className="w-10"></div>
      </header>

      {showBriefing && (
        <div className="bg-gradient-to-br from-[#161D2F] to-[#0A0F1D] border-b border-primary/20 p-4 animate-in slide-in-from-top duration-500 relative overflow-hidden shrink-0 max-h-[25vh] overflow-y-auto">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-7xl text-primary">military_tech</span>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-1 rounded border border-primary/20">
                Strategy Briefing
              </span>
              <button onClick={() => setShowBriefing(false)} className="text-slate-500 hover:text-white">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <section className="mb-5">
              <h3 className="text-[11px] font-black text-slate-500 uppercase mb-2 tracking-widest">이상적 도달 상태 (Goal)</h3>
              <p className="text-[13px] text-slate-100 font-bold leading-relaxed italic">
                "{missionBriefing.idealState}"
              </p>
            </section>

            <section>
              <h3 className="text-[11px] font-black text-slate-500 uppercase mb-3 tracking-widest flex justify-between">
                수행 과제 <span>Based on {missionBriefing.theory}</span>
              </h3>
              <div className="space-y-2.5">
                {missionBriefing.tasks.map((task, i) => (
                  <div key={i} className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                    <p className="text-[12px] text-slate-300 font-medium leading-relaxed">{task}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-navy-card rounded-full border border-white/10 z-20 shadow-2xl">
          <div className={`size-2 rounded-full ${status === 'open' ? 'bg-accent-neon shadow-[0_0_12px_#00F2FF]' : status === 'connecting' ? 'bg-accent-amber animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {status === 'connecting' ? 'SYNCING...' : status === 'open' ? 'VOICE LIVE' : 'STANDBY'}
          </span>
        </div>

        <div className="flex-1 flex flex-col gap-6 mt-12">
          {/* AI Character Visualizer with Resonance Effect */}
          <div 
             className={`h-[35%] rounded-[3rem] border border-white/5 p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl transition-all duration-1000 ${
                 trustState.trust > 80 ? 'bg-[#0A1A2F] border-primary/30' : 'bg-navy-card'
             }`}
          >
            {status === 'open' ? (
              <div className="relative flex items-center justify-center">
                {/* Resonance Glow Rings using Trust State */}
                <div 
                    className="absolute bg-primary/10 rounded-full animate-ping transition-all duration-500" 
                    style={{ width: `${trustState.trust * 2.5}px`, height: `${trustState.trust * 2.5}px`, opacity: trustState.trust / 200 }}
                ></div>
                <div 
                    className="absolute bg-primary/20 rounded-full animate-pulse transition-all duration-500"
                    style={{ width: `${trustState.trust * 1.8}px`, height: `${trustState.trust * 1.8}px` }}
                ></div>
                <div className={`z-10 bg-primary size-24 rounded-full flex items-center justify-center shadow-neon-cyan transition-all duration-500 ${trustState.trust > 70 ? 'scale-110' : 'scale-100'}`}>
                   <span className="material-symbols-outlined text-4xl text-navy-deep animate-pulse font-black">mic</span>
                </div>
                <div className="absolute -bottom-16 text-center w-full">
                     <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${trustState.trust > 75 ? 'text-primary' : 'text-slate-500'}`}>
                        Team Resonance
                     </p>
                     {trustState.nextHint && (
                         <div className="mt-2 bg-black/50 px-3 py-1 rounded-full inline-block backdrop-blur-md">
                           <p className="text-[10px] text-accent-neon animate-in fade-in slide-in-from-bottom-2">{trustState.nextHint}</p>
                         </div>
                     )}
                </div>
              </div>
            ) : status === 'connecting' ? (
              <div className="text-center">
                <div className="size-14 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">페르소나 연결 중...</p>
              </div>
            ) : (
              <div className="text-center">
                {error && <p className="text-xs text-red-400 mb-6 font-bold px-6 leading-relaxed">{error}</p>}
                <button 
                  onClick={startSimulation}
                  className="bg-primary px-12 py-6 rounded-2xl font-black flex items-center gap-4 shadow-neon-cyan active:scale-95 transition-all text-navy-deep text-sm uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined font-black">play_circle</span>
                  면담 시작
                </button>
              </div>
            )}
          </div>

          {/* Transcript Area */}
          <div ref={scrollRef} className="flex-1 bg-white/5 rounded-[2.5rem] border border-white/10 p-6 overflow-y-auto hide-scrollbar space-y-5">
            {transcriptions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                 <span className="material-symbols-outlined text-5xl mb-3 text-primary">waves</span>
                 <p className="text-[11px] font-black tracking-[0.3em] uppercase">Conversation Feed</p>
              </div>
            ) : (
              transcriptions.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl ${
                    t.role === 'user' 
                      ? 'bg-primary text-navy-deep font-bold rounded-tr-none' 
                      : 'bg-navy-card text-slate-300 rounded-tl-none border border-white/10'
                  }`}>
                    <p className="text-[13px] leading-relaxed">{t.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="p-6 pb-12 flex gap-4 bg-[#0A0F1D]/90 backdrop-blur-xl border-t border-white/5 relative z-40">
        <button onClick={() => navigate('/')} className="flex-1 py-5 rounded-2xl border border-white/10 font-black text-[10px] uppercase tracking-widest text-slate-500">훈련 취소</button>
        <button 
          onClick={saveHistoryAndFinish} 
          disabled={transcriptions.length < 1} 
          className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-neon-cyan disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-2 ${
              isAnalysisComplete 
              ? 'bg-green-400 text-navy-deep shadow-[0_0_15px_#4ade80] animate-pulse' 
              : 'bg-primary text-navy-deep'
          }`}
        >
          {isAnalysisComplete ? '목표 달성 • 분석 보기' : '면담 종료 및 분석'}
        </button>
      </footer>
    </div>
  );
};

export default VoiceSimulation;
